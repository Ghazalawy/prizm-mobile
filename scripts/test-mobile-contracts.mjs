import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const workspace = path.resolve(import.meta.dirname, "..");

function moduleRegistryKeys() {
  const filename = path.join(workspace, "lib/module-registry.ts");
  const source = fs.readFileSync(filename, "utf8");
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declaration = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((item) => ts.isIdentifier(item.name) && item.name.text === "MODULES");
  assert.ok(declaration && declaration.initializer && ts.isArrayLiteralExpression(declaration.initializer), "MODULES registry must be an array literal");
  return declaration.initializer.elements.flatMap((element) => {
    if (!ts.isObjectLiteralExpression(element)) return [];
    const property = element.properties.find((item) => ts.isPropertyAssignment(item) && item.name.getText(file).replace(/[\"']/g, "") === "key");
    if (!property || !ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.initializer)) return [];
    return [property.initializer.text];
  });
}

function loadTypeScriptModule(relativePath, imports = {}) {
  const filename = path.join(workspace, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  const wrapper = vm.runInThisContext(`(function (exports, module, require) { ${compiled}\n})`, {
    filename,
  });
  wrapper(module.exports, module, (name) => {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected runtime import ${name} in ${relativePath}`);
  });
  return module.exports;
}

const { isInvalidTokenResponse } = loadTypeScriptModule("lib/auth-response.ts");
const { safePostAuthRoute } = loadTypeScriptModule("lib/post-auth-route.ts");
const { taskRelationSummary, taskRelationTypeLabel } = loadTypeScriptModule("lib/task-display.ts");
const { serializeDirectFilterGroup, serializeModuleFilterGroup, serializePerfexFilterGroup } = loadTypeScriptModule("lib/filters.ts");
const authEvents = loadTypeScriptModule("lib/auth-events.ts");
const routing = loadTypeScriptModule("lib/native-routing.ts", {
  "react-native": { Linking: { openURL: async () => undefined } },
  "expo-router": { router: { push: () => undefined } },
  "react-native-toast-message": { __esModule: true, default: { show: () => undefined } },
  "./config": { BASE_URL: "https://ms.prizm-energy.com/MS" },
});
const nativeIntent = loadTypeScriptModule("app/+native-intent.ts", {
  "../lib/native-routing": routing,
});
const secureValues = new Map();
const secureOptions = new Map();
let biometricPromptOptions = null;
const biometric = loadTypeScriptModule("lib/biometric.ts", {
  "expo-local-authentication": {
    hasHardwareAsync: async () => true,
    isEnrolledAsync: async () => true,
    authenticateAsync: async (options) => {
      biometricPromptOptions = options;
      return { success: true };
    },
  },
  "expo-secure-store": {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "when-unlocked-this-device-only",
    getItemAsync: async (key, options) => {
      if (options) secureOptions.set(`get:${key}`, options);
      return secureValues.get(key) ?? null;
    },
    setItemAsync: async (key, value, options) => {
      secureValues.set(key, value);
      if (options) secureOptions.set(`set:${key}`, options);
    },
    deleteItemAsync: async (key) => { secureValues.delete(key); },
  },
});

assert.equal(isInvalidTokenResponse(401, { status: false, message: "Unauthenticated" }, true), true);
assert.equal(isInvalidTokenResponse(403, { status: false, message: "Forbidden" }, true), false);
assert.equal(isInvalidTokenResponse(403, { status: false, message: "Signature verification failed" }, true), false);
assert.equal(isInvalidTokenResponse(419, { status: false, message: "CSRF token mismatch" }, true), false);
assert.equal(isInvalidTokenResponse(404, { status: false, message: "Signature verification failed" }, true), true);
assert.equal(isInvalidTokenResponse(404, { status: false, message: "Wrong number of segments" }, true), true);
assert.equal(isInvalidTokenResponse(404, { status: false, message: "Unknown API method" }, true), false);
assert.equal(isInvalidTokenResponse(401, { status: false, message: "Token Time Expire." }, true), true);
assert.equal(isInvalidTokenResponse(401, { status: false, message: "Token expired" }, false), false);

assert.equal(taskRelationTypeLabel("erp_dev"), "ERP Work");
assert.equal(taskRelationSummary({ rel_type: "erp_dev", rel_id: "12" }), undefined);
assert.equal(taskRelationSummary({ rel_type: "erp_dev", rel_id: "12", rel_name: "Mobile parity" }), "Mobile parity");
assert.equal(taskRelationSummary({ rel_type: "project", rel_id: "42", rel_name: "Solar Farm" }), "Project · Solar Farm");

await biometric.saveBiometricCredentials("qa@prizm-energy.com", "device-secret");
assert.equal(await biometric.isBiometricAvailable(), true);
assert.equal(await biometric.isBiometricEnabled(), true);
assert.equal(await biometric.hasBiometricCredentials(), true);
assert.equal(secureOptions.get("set:prizm_biometric_credentials")?.requireAuthentication, true);
assert.equal(
  secureOptions.get("set:prizm_biometric_credentials")?.keychainAccessible,
  "when-unlocked-this-device-only",
);
assert.deepEqual(await biometric.getBiometricCredentials(), {
  email: "qa@prizm-energy.com",
  password: "device-secret",
});
assert.equal(secureOptions.get("get:prizm_biometric_credentials")?.requireAuthentication, true);
assert.equal(await biometric.promptBiometric(), true);
assert.equal(biometricPromptOptions?.disableDeviceFallback, false);
assert.equal(await biometric.keepBiometricCredentialsForAccount("other@prizm-energy.com"), false);
assert.equal(await biometric.hasBiometricCredentials(), false, "cross-account login must clear the old fingerprint vault");

const serialized = serializePerfexFilterGroup({
  match_type: "or",
  rules: [
    { id: "name", type: "TextRule", operator: "not_contains", value: "test" },
    { id: "amount", type: "NumberRule", operator: "between", value: "10..20" },
    { id: "date", type: "DateRule", operator: "dynamic", value: "today", hasDynamicValue: true },
    { id: "status", type: "MultiSelectRule", operator: "not_in", value: ["4", "5"] },
    { id: "description", type: "TextRule", operator: "is_empty", value: "" },
    { id: "ignored", type: "TextRule", operator: "equal", value: "" },
  ],
});
const payload = JSON.parse(serialized.filters);
assert.equal(payload.match_type, "or");
assert.equal(payload.rules.length, 5);
assert.deepEqual(payload.rules[1].value, ["10", "20"]);
assert.equal(payload.rules[2].has_dynamic_value, true);
assert.deepEqual(payload.rules[3].value, ["4", "5"]);
assert.equal(payload.rules[4].value, "");
assert.deepEqual(serializePerfexFilterGroup({ match_type: "and", rules: [] }), {});

assert.deepEqual(
  serializeDirectFilterGroup({
    match_type: "and",
    rules: [{ id: "active", type: "MultiSelectRule", operator: "in", value: ["0"] }],
  }),
  { active: "0" },
  "the customer Inactive chip must produce active=0 instead of a web-table filters payload",
);
assert.deepEqual(
  serializeDirectFilterGroup(
    {
      match_type: "and",
      rules: [{ id: "active", type: "MultiSelectRule", operator: "in", value: ["1", "0"] }],
    },
    {
      statusField: "active",
      statusValues: ["1", "0"],
      allStatusesParams: { include_inactive: "1" },
    },
  ),
  { include_inactive: "1" },
  "selecting every customer status must lift the API's active-only default",
);

const projectMultiStatus = serializeModuleFilterGroup(
  {
    match_type: "and",
    rules: [{ id: "status", type: "MultiSelectRule", operator: "in", value: ["3", "5"] }],
  },
  { supportsAdvancedFilters: true },
);
assert.deepEqual(
  JSON.parse(projectMultiStatus.filters),
  {
    match_type: "and",
    rules: [{
      id: "status",
      type: "MultiSelectRule",
      operator: "in",
      value: ["3", "5"],
      has_dynamic_value: false,
    }],
  },
  "On Hold plus Cancelled must remain a two-value status rule",
);

for (const scenario of [
  {
    match_type: "and",
    rules: [
      { id: "status", type: "MultiSelectRule", operator: "in", value: ["3", "5"] },
      { id: "billing_type", type: "SelectRule", operator: "equal", value: "3" },
    ],
  },
  {
    match_type: "or",
    rules: [
      { id: "status", type: "MultiSelectRule", operator: "in", value: ["3", "5"] },
      { id: "clientid", type: "NumberRule", operator: "equal", value: "132" },
    ],
  },
  {
    match_type: "and",
    rules: [
      { id: "status", type: "MultiSelectRule", operator: "not_in", value: ["1", "2"] },
      { id: "deadline", type: "DateRule", operator: "between", value: ["2024-01-01", "2026-12-31"] },
    ],
  },
]) {
  const encoded = serializeModuleFilterGroup(scenario, { supportsAdvancedFilters: true });
  assert.deepEqual(JSON.parse(encoded.filters), {
    match_type: scenario.match_type,
    rules: scenario.rules.map((rule) => ({ ...rule, has_dynamic_value: false })),
  });
}

let invalidTokenEvents = 0;
authEvents.setInvalidTokenHandler(() => { invalidTokenEvents += 1; });
const staleGeneration = authEvents.getSessionGeneration();
authEvents.resetInvalidTokenDebounce();
const currentGeneration = authEvents.getSessionGeneration();
authEvents.notifyInvalidToken(staleGeneration);
assert.equal(invalidTokenEvents, 0, "a response from the previous login must not clear the fresh session");
authEvents.notifyInvalidToken(currentGeneration);
assert.equal(invalidTokenEvents, 1, "the current session's explicit JWT failure must reach AuthContext immediately");
authEvents.setInvalidTokenHandler(null);

assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/credit_notes/list_credit_notes/42"),
  "/(tabs)/erp/credit_notes/42",
);
assert.equal(
  routing.resolveIncomingAppLink("https://ms.prizm-energy.com/MS/admin/projects/view/42"),
  "/(tabs)/projects/42",
  "an Android App Link must be rewritten to the native project screen",
);
assert.equal(
  routing.resolveIncomingAppLink(
    "https://ms.prizm-energy.com/MS/przpurchase/Payment_Request/view_payment_request/1211",
  ),
  "/(tabs)/approvals/payment_request/1211",
  "a Payment Request web link must be rewritten to its native approval screen",
);
assert.equal(
  routing.resolveIncomingAppLink("https://ms.prizm-energy.com/MS/admin/dashboard"),
  "/(tabs)/erp",
  "an unmatched ERP URL must stay inside the app on the native ERP hub",
);
assert.equal(
  routing.resolveIncomingAppLink("https://example.com/external"),
  "https://example.com/external",
  "non-Prizm URLs must not be captured by the ERP rewrite",
);
assert.equal(
  nativeIntent.redirectSystemPath({
    path: "https://ms.prizm-energy.com/MS/admin/invoices/list_invoices/17",
    initial: true,
  }),
  "/(tabs)/invoices/17",
  "cold-start ERP links must reach their native record",
);

const appConfig = JSON.parse(fs.readFileSync(path.join(workspace, "app.json"), "utf8"));
const appLinkFilter = appConfig.expo.android.intentFilters?.find(
  (item) => item.action === "VIEW" && item.autoVerify === true,
);
assert.ok(appLinkFilter, "Android App Links must use a verified VIEW intent filter");
assert.ok(appLinkFilter.category.includes("BROWSABLE") && appLinkFilter.category.includes("DEFAULT"));
assert.ok(
  appLinkFilter.data.some(
    (item) => item.scheme === "https" && item.host === "ms.prizm-energy.com" && !item.path && !item.pathPrefix,
  ),
  "the verified intent filter must capture the complete production host",
);
assert.ok(
  appLinkFilter.data.some(
    (item) => item.scheme === "http" && item.host === "ms.prizm-energy.com" && !item.path && !item.pathPrefix,
  ),
  "plain HTTP links must enter the app before the web server redirects to HTTPS",
);
assert.equal(
  safePostAuthRoute("/approvals/payment_request/1211"),
  "/approvals/payment_request/1211",
  "a Payment Request App Link must survive password or biometric sign-in",
);
assert.equal(safePostAuthRoute(["/projects/42"]), "/projects/42");
assert.equal(safePostAuthRoute("https://example.com/phish"), "/(tabs)");
assert.equal(safePostAuthRoute("//example.com/phish"), "/(tabs)");
const assetLinks = JSON.parse(
  fs.readFileSync(path.join(workspace, "public/.well-known/assetlinks.json"), "utf8"),
);
assert.equal(assetLinks[0].target.package_name, appConfig.expo.android.package);
assert.match(assetLinks[0].target.sha256_cert_fingerprints[0], /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/);
assert.equal(routing.routeForModuleRecord("credit_note", 42), "/(tabs)/erp/credit_notes/42");
assert.equal(routing.routeForModuleList("credit_notes"), "/(tabs)/erp/credit_notes");
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/subscriptions/edit/17"),
  "/(tabs)/erp/subscriptions/17",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/contacts/contact/8"),
  "/(tabs)/erp/contacts/8",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/announcements/view/6"),
  "/(tabs)/erp/announcements/6",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/estimate_request/view/9"),
  "/(tabs)/erp/estimate_requests/9",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/estimate_request/form/12"),
  "/(tabs)/erp/estimate_request_forms/12",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/estimate_request/forms"),
  "/(tabs)/erp/estimate_request_forms",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/estimate_request/statuses"),
  "/(tabs)/erp/estimate_request_statuses",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/todo/get_by_id/4"),
  "/(tabs)/erp/todos/4",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/advanceleads/advanceleads"),
  "/(tabs)/erp/advance_leads",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/advanceleads/advanceleads/view/19"),
  "/(tabs)/erp/advance_leads/19",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/dewa_contacts/add_dewa_contact/15"),
  "/(tabs)/erp/dewa_contacts/15",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/prizmsubscription/prizmsubscription/edit_subscription/23"),
  "/(tabs)/erp/documents/23",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/materials/Kits"),
  "/(tabs)/erp/material_kits",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/materials/Material_Categories"),
  "/(tabs)/erp/material_categories",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/materials/ItemClassification"),
  "/(tabs)/erp/unspsc_commodities",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/materials/ItemClassification/manage_commodity/441"),
  "/(tabs)/erp/unspsc_commodities/441",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/materials/Kits/items/19"),
  "/(tabs)/erp/material_kits/19",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/technicalinquiries/Boq_Management/boq_tree"),
  "/(tabs)/erp/cost_calculations",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/technicalinquiries/Boq_Management/boq_tree_builder"),
  "/(tabs)/erp/cost_calculations/new",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/technicalinquiries/Boq_Management/boq_tree_edit/31"),
  "/(tabs)/erp/cost_calculations/31",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/si_custom_status/statuses/projects"),
  "/(tabs)/erp/custom_statuses",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/si_custom_status/statuses/tasks"),
  "/(tabs)/erp/custom_statuses",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/detail_asset/11"),
  "/(tabs)/erp/fixed_equipment/11",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/locations"),
  "/(tabs)/erp/fixed_equipment_locations",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/detail_locations/7"),
  "/(tabs)/erp/fixed_equipment_locations/7",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/detail_accessories/3"),
  "/(tabs)/erp/fixed_equipment_accessories/3",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/consumables"),
  "/(tabs)/erp/fixed_equipment_consumables",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/detail_components/4"),
  "/(tabs)/erp/fixed_equipment_components/4",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/detail_licenses/12?tab=seat"),
  "/(tabs)/erp/fixed_equipment_licenses/12",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/detail_predefined_kits/57"),
  "/(tabs)/erp/fixed_equipment_predefined_kits/57",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/detail_request/81?process=choose"),
  "/(tabs)/erp/fixed_equipment_requests/81",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/requested"),
  "/(tabs)/erp/fixed_equipment_requests",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/checkout_managements"),
  "/(tabs)/erp/fixed_equipment_checkout_history",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/view_audit_request/9?process=choose"),
  "/(tabs)/erp/fixed_equipment_audits/9",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/depreciations"),
  "/(tabs)/erp/fixed_equipment_depreciation_schedule",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/otpmanager/manage"),
  "/(tabs)/erp/otpmanager",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/otpmanager/settings?group=sources"),
  "/(tabs)/erp/otp_sources",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/automation_manager/edit/2"),
  "/(tabs)/erp/automation/2",
);
assert.equal(
  routing.resolveNativeRoute("https://ms.prizm-energy.com/MS/admin/fixed_equipment/settings?tab=models"),
  "/(tabs)/erp/fixed_equipment_models",
);
for (const [webPath, nativePath] of [
  ["invoice_items", "/(tabs)/erp/items"],
  ["utilities/calendar", "/(tabs)/calendar"],
  ["utilities/activity_log", "/(tabs)/activity"],
  ["staff/timesheets?view=all", "/(tabs)/timesheets/entries"],
  ["costcenters/ag_index", "/(tabs)/erp/cost_centers"],
  ["gatepass/Gatepass/ag_index", "/(tabs)/erp/gatepass"],
  ["materials/Materials", "/(tabs)/erp/materials"],
  ["opportunities/dashboard", "/(tabs)/opportunities"],
  ["prizm_reports", "/(tabs)/reports"],
  ["przpurchase/przpurchase/ag_index", "/(tabs)/erp/purchase_requests"],
  ["przpurchase/PurOrder/ag_index", "/(tabs)/erp/purchase_orders"],
  ["przpurchase/Expense_Request", "/(tabs)/erp/purchase_expense_requests"],
  ["przpurchase/Payment_Request/ag_index", "/(tabs)/erp/purchase_payment_requests"],
  ["przpurchase/Received_Vouchers/ag_index", "/(tabs)/erp/purchase_received_vouchers"],
  ["przpurchase/Delivery_Notes", "/(tabs)/erp/purchase_delivery_notes"],
  ["przpurchase/Quotations/ag_index", "/(tabs)/erp/purchase_quotations"],
  ["przpurchase/suppliers/ag_index", "/(tabs)/erp/purchase_vendors"],
  ["hr_payroll/payslip_manage", "/(tabs)/erp/hr_payslips"],
  ["hr_profile/contracts", "/(tabs)/erp/hr_contracts"],
  ["hr_profile/job_positions", "/(tabs)/erp/hr_job_positions"],
  ["rfq2/rfq", "/(tabs)/erp/rfq2"],
  ["technicalinquiries/Technicalinquiries", "/(tabs)/erp/technical_inquiries"],
  ["tenders/triage", "/(tabs)/tenders/triage"],
  ["tenders/tender", "/(tabs)/tenders"],
  ["prizmbudget/manage_budget", "/(tabs)/erp/budget_items"],
  ["prizmbusinesspartners/prizmbusinesspartners", "/(tabs)/erp/business_partners"],
  ["surveys", "/(tabs)/erp/surveys"],
  ["timesheets/requisition_manage", "/(tabs)/leave"],
  ["clients/groups", "/(tabs)/erp/setup_customer_groups"],
  ["tickets/priorities", "/(tabs)/erp/setup_ticket_priorities"],
  ["tickets/predefined_replies", "/(tabs)/erp/setup_ticket_replies"],
  ["tickets/statuses", "/(tabs)/erp/setup_ticket_statuses"],
  ["tickets/services", "/(tabs)/erp/setup_ticket_services"],
  ["leads/sources", "/(tabs)/erp/setup_lead_sources"],
  ["leads/statuses", "/(tabs)/erp/setup_lead_statuses"],
  ["taxes", "/(tabs)/erp/setup_taxes"],
  ["currencies", "/(tabs)/erp/setup_currencies"],
  ["paymentmodes", "/(tabs)/erp/setup_payment_modes"],
  ["expenses/categories", "/(tabs)/erp/setup_expense_categories"],
  ["contracts/types", "/(tabs)/erp/setup_contract_types"],
  ["departments", "/(tabs)/erp/setup_departments"],
]) {
  assert.equal(
    routing.resolveNativeRoute(`https://ms.prizm-energy.com/MS/admin/${webPath}`),
    nativePath,
    `${webPath} must open its existing native screen instead of the ERP hub`,
  );
}

const registryKeys = moduleRegistryKeys();
assert.equal(new Set(registryKeys).size, registryKeys.length, "Module registry keys must be unique");

const registrySource = fs
  .readFileSync(path.join(workspace, "lib/module-registry.ts"), "utf8")
  .replace(/\r\n/g, "\n");
const relationPickerSource = fs.readFileSync(path.join(workspace, "components/crud/RelationPicker.tsx"), "utf8");
const fixedEquipmentBlock = registrySource.match(/key: "fixed_equipment",[\s\S]*?(?=\s+key: "knowledge",)/)?.[0] ?? "";
assert.ok(fixedEquipmentBlock, "Fixed Equipment must remain registered as a native module");
assert.match(fixedEquipmentBlock, /permissionFeature: "fixed_equipment_assets"/);
assert.match(fixedEquipmentBlock, /key: "assets_name"/);
assert.match(fixedEquipmentBlock, /key: "series"/);
assert.match(fixedEquipmentBlock, /fixed_equipment_api\/\{id\}\/checkout/);
assert.match(fixedEquipmentBlock, /fixed_equipment_api\/\{id\}\/checkin/);
assert.match(fixedEquipmentBlock, /rel_type: "asset_files"/);
assert.doesNotMatch(fixedEquipmentBlock, /\/allocate|\/return/);
for (const [key, feature, endpoint, categoryType, fileType] of [
  ["fixed_equipment_accessories", "fixed_equipment_accessories", "accessories", "equipment_accessory_category", "accessory"],
  ["fixed_equipment_consumables", "fixed_equipment_consumables", "consumables", "equipment_consumable_category", "consumable"],
  ["fixed_equipment_components", "fixed_equipment_components", "components", "equipment_component_category", "component"],
]) {
  const block = registrySource.match(new RegExp(`key: "${key}",[\\s\\S]*?(?=\\n  \\{\\n    key: "|\\n\\];)`))?.[0] ?? "";
  assert.ok(block, `${key} must remain registered as a native module`);
  assert.match(block, new RegExp(`permissionFeature: "${feature}"`));
  assert.match(block, new RegExp(`fixed_equipment_api/${endpoint}`));
  assert.match(block, new RegExp(`relation: "${categoryType}"`));
  assert.match(block, new RegExp(`rel_type: "${fileType}"`));
  assert.match(block, /inventory_checkouts/);
  assert.match(block, /key: "checkout"/);
}
assert.match(registrySource, /fixed_equipment_api\/inventory_checkouts\/\{id\}\/checkin/);
const licenseBlock = registrySource.match(/key: "fixed_equipment_licenses",[\s\S]*?(?=\n  \{\n    key: "fixed_equipment_license_seats")/)?.[0] ?? "";
assert.match(licenseBlock, /permissionFeature: "fixed_equipment_licenses"/);
assert.match(licenseBlock, /relation: "equipment_license_category"/);
assert.match(licenseBlock, /relation: "equipment_depreciation"/);
assert.match(licenseBlock, /fixed_equipment_api\/license_seats\?license_id=\{id\}/);
assert.match(licenseBlock, /rel_type: "license_files"/);
assert.match(registrySource, /fixed_equipment_api\/license_seats\/\{id\}\/checkout/);
assert.match(registrySource, /fixed_equipment_api\/license_seats\/\{id\}\/checkin/);
const kitBlock = registrySource.match(/key: "fixed_equipment_predefined_kits",[\s\S]*?(?=\n  \{\n    key: "fixed_equipment_predefined_kit_models")/)?.[0] ?? "";
assert.match(kitBlock, /permissionFeature: "fixed_equipment_predefined_kits"/);
assert.match(kitBlock, /fixed_equipment_api\/predefined_kits\/\{id\}\/checkout/);
assert.match(kitBlock, /fixed_equipment_api\/predefined_kits\/\{id\}\/checkin/);
assert.match(kitBlock, /fixed_equipment_api\/predefined_kit_models\?parent_id=\{id\}/);
const equipmentRequestBlock = registrySource.match(/key: "fixed_equipment_requests",[\s\S]*?(?=\n  \{\n    key: "fixed_equipment_licenses")/)?.[0] ?? "";
assert.match(equipmentRequestBlock, /permissionFeature: "fixed_equipment_requested"/);
assert.match(equipmentRequestBlock, /relation: "equipment_requestable_asset"/);
assert.match(equipmentRequestBlock, /requests\/\{id\}\/choose_approver/);
assert.match(equipmentRequestBlock, /requests\/\{id\}\/submit_approval/);
assert.match(equipmentRequestBlock, /requests\/\{id\}\/approve/);
assert.match(equipmentRequestBlock, /requests\/\{id\}\/reject/);
assert.match(relationPickerSource, /fixed_equipment_api\/requestable_assets/);
const signDocumentBlock = registrySource.match(/key: "fixed_equipment_sign_documents",[\s\S]*?(?=\n  \{\n    key: "fixed_equipment_licenses")/)?.[0] ?? "";
assert.match(signDocumentBlock, /permissionFeature: "fixed_equipment_sign_manager"/);
assert.match(signDocumentBlock, /relation: "equipment_unsigned_checkout"/);
assert.match(signDocumentBlock, /type: "signature"/);
assert.match(signDocumentBlock, /sign_documents\/\{id\}\/sign/);
assert.match(relationPickerSource, /fixed_equipment_api\/unsigned_checkouts/);
const equipmentAuditBlock = registrySource.match(/key: "fixed_equipment_audits",[\s\S]*?(?=\n  \{\n    key: "fixed_equipment_audit_items")/)?.[0] ?? "";
assert.match(equipmentAuditBlock, /permissionFeature: "fixed_equipment_audit"/);
assert.match(equipmentAuditBlock, /relation: "equipment_auditable_item"/);
assert.match(equipmentAuditBlock, /audits\/\{id\}\/submit_results/);
assert.match(equipmentAuditBlock, /audits\/\{id\}\/close_approve/);
assert.match(registrySource, /audit_details\/\{id\}\/count/);
const depreciationBlock = registrySource.match(/key: "fixed_equipment_depreciation_schedule",[\s\S]*?(?=\n  \{\n    key: "fixed_equipment_licenses")/)?.[0] ?? "";
assert.match(depreciationBlock, /permissionFeature: "fixed_equipment_depreciations"/);
assert.match(depreciationBlock, /monthly_depreciation/);
assert.match(registrySource, /key: "fixed_equipment_dashboard"/);
assert.match(registrySource, /key: "fixed_equipment_activity"/);

const otpBlock = registrySource.match(/key: "otpmanager",[\s\S]*?(?=\n  \{\n    key: "otp_sources")/)?.[0] ?? "";
assert.match(otpBlock, /permissionFeature: "otpmanager"/);
assert.match(otpBlock, /relation: "otp_source"/);
assert.match(otpBlock, /otpmanager\/\{id\}\/reveal/);
assert.match(otpBlock, /resultFields:/);
assert.doesNotMatch(otpBlock, /identifier|expires_at/);
const otpSourcesBlock = registrySource.match(/key: "otp_sources",[\s\S]*?(?=\n  \{\n    key: ")/)?.[0] ?? "";
assert.match(otpSourcesBlock, /manage_sources/);
assert.match(otpSourcesBlock, /submitAsArray: true/);
assert.match(relationPickerSource, /endpoint: "otpmanager\/sources"/);

const backendWorkspace = path.resolve(
  process.env.PRIZM331_SOURCE_ROOT || path.join(workspace, "..", "prizm331-wt-mobile-parity-next"),
);
assert.ok(
  fs.existsSync(path.join(backendWorkspace, "modules/api/controllers")),
  `PRIZM331_SOURCE_ROOT must point to the deployable backend source (got ${backendWorkspace})`,
);
const mobileAppLinkBridge = fs.readFileSync(
  path.join(backendWorkspace, "modules/api/helpers/mobile_app_link_helper.php"),
  "utf8",
);
assert.match(mobileAppLinkBridge, /package=com\.prizmenergy\.mobile/);
assert.match(mobileAppLinkBridge, /S\.browser_fallback_url=/);
assert.match(mobileAppLinkBridge, /prizm_web/);
assert.match(mobileAppLinkBridge, /\^\/MS\(\?:\/\|\$\)/);
assert.match(mobileAppLinkBridge, /api\|uploads\?\|download\|media\|assets\?/);
const setupApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Setup_api.php"), "utf8");
const crudFormSource = fs.readFileSync(path.join(workspace, "components/crud/CrudFormScreen.tsx"), "utf8");
const crudDetailDeleteSource = fs.readFileSync(path.join(workspace, "components/crud/CrudDetailScreen.tsx"), "utf8");
assert.match(crudFormSource, /initializedFormKeyRef/);
assert.match(crudFormSource, /if \(initializedFormKeyRef\.current === initializationKey\) return/);
assert.match(crudFormSource, /const EMPTY_CUSTOM_FIELDS: CustomFieldRow\[\] = \[\]/);
assert.match(crudDetailDeleteSource, /router\.replace\(path as any\)/);
assert.match(crudDetailDeleteSource, /Alert\.alert\("Delete failed"/);
const activityQuerySource = fs.readFileSync(path.join(workspace, "lib/queries/activity.ts"), "utf8");
assert.match(activityQuerySource, /my\/activity/);
assert.doesNotMatch(activityQuerySource, /core_crm_api/);
for (const key of [
  "setup_customer_groups", "setup_ticket_priorities", "setup_ticket_replies", "setup_ticket_statuses",
  "setup_ticket_services", "setup_lead_sources", "setup_lead_statuses", "setup_taxes", "setup_currencies",
  "setup_payment_modes", "setup_expense_categories", "setup_contract_types",
  "setup_departments",
]) {
  assert.ok(registryKeys.includes(key), `${key} must be registered as a native admin module`);
  const block = registrySource.match(new RegExp(`key: "${key}",[\\s\\S]*?(?=\\n  \\{\\n    key: "|\\n\\];)`))?.[0] ?? "";
  assert.match(block, /adminOnlyAccess: true/);
  assert.match(block, /adminOnlyMutations: true/);
  assert.match(block, /supportsAdvancedFilters: true/);
  assert.match(block, /endpoint: "setup_api\//);
}
for (const resource of [
  "customer_groups", "ticket_priorities", "ticket_replies", "ticket_statuses", "ticket_services",
  "lead_sources", "lead_statuses", "taxes", "currencies", "payment_modes", "expense_categories", "contract_types",
  "departments",
]) {
  assert.match(setupApiSource, new RegExp(`'${resource}'`), `${resource} must have a backend definition`);
}
assert.match(setupApiSource, /api_apply_advanced_filters/);
assert.match(setupApiSource, /HTTP_NOT_FOUND/);
assert.match(setupApiSource, /make_base_currency/);
assert.match(setupApiSource, /delete_ticket_status/);
assert.match(setupApiSource, /delete_status/);
assert.match(setupApiSource, /getSelectableFolders/);
assert.match(setupApiSource, /getMailbox/);
assert.match(setupApiSource, /encryption->decrypt/);
const departmentsBlock = registrySource.match(/key: "setup_departments",[\s\S]*?(?=\n  \{\n    key: "|\n\];)/)?.[0] ?? "";
assert.match(departmentsBlock, /editableSecret: true/);
assert.match(departmentsBlock, /delete_after_import/);
assert.doesNotMatch(departmentsBlock.match(/titleFields:[\s\S]*?fields:/)?.[0] ?? "", /password/);
const departmentToolsSource = fs.readFileSync(path.join(workspace, "components/crud/DepartmentImapTools.tsx"), "utf8");
assert.match(departmentToolsSource, /setup_api\/departments\/\$\{id \|\| 0\}\/\$\{action\}/);
assert.match(departmentToolsSource, /Retrieve folders/);
assert.match(departmentToolsSource, /Test connection/);
assert.doesNotMatch(departmentToolsSource, /console\.(?:log|warn|error)/);
const contactsBlock = registrySource.match(/\r?\n  \{\r?\n    key: "contacts",[\s\S]*?(?=\r?\n  \{\r?\n    key: "leads")/)?.[0] ?? "";
assert.match(contactsBlock, /detailEndpoint: "contacts\/detail"/);
assert.match(contactsBlock, /filterableFields:/);
assert.match(contactsBlock, /sortableFields:/);
const contactsApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Contacts.php"), "utf8");
assert.match(contactsApiSource, /function global_list_get/);
assert.match(contactsApiSource, /api_apply_advanced_filters/);
assert.match(contactsApiSource, /advanced_filters_applied/);
assert.match(contactsApiSource, /userid AS customer_id/);
const timesheetsApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Timesheets_api.php"), "utf8");
assert.match(timesheetsApiSource, /api_apply_advanced_filters/);
assert.match(timesheetsApiSource, /apply_unix_date_advanced_filter/);
assert.match(timesheetsApiSource, /apply_active_advanced_filter/);
const payrollApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Hr_payroll_api.php"), "utf8");
for (const fn of ["earning_types_get", "deduction_types_get", "payroll_templates_get", "commissions_get"]) {
  const start = payrollApiSource.indexOf(`function ${fn}`);
  const end = payrollApiSource.indexOf("\n    public function ", start + 20);
  const block = payrollApiSource.slice(start, end > start ? end : undefined);
  assert.match(block, /api_apply_advanced_filters/, `${fn} must apply validated advanced filters`);
  assert.match(block, /advanced_filters_applied/, `${fn} must report applied filters`);
  assert.match(block, /\$sorts = \[/, `${fn} must whitelist sort keys`);
  assert.match(block, /\$total/, `${fn} must paginate with a server total`);
}
for (const key of ["hr_payroll_commissions", "hr_payroll_templates", "hr_earning_types", "hr_deduction_types"]) {
  const block = registrySource.match(new RegExp(`\\r?\\n  \\{\\r?\\n    key: "${key}",[\\s\\S]*?(?=\\r?\\n  \\{\\r?\\n    key: "|\\r?\\n\\];)`))?.[0] ?? "";
  assert.match(block, /searchFields:/, `${key} must expose its verified search contract`);
  assert.match(block, /filterableFields:/, `${key} must expose its verified filter contract`);
  assert.match(block, /sortableFields:/, `${key} must expose only verified sort keys`);
}
const advanceLeadsBlock = registrySource.match(/key: "advance_leads",[\s\S]*?(?=\n  \{\n    key: "projects")/)?.[0] ?? "";
assert.ok(advanceLeadsBlock, "Advance Leads must be exposed as a native module");
assert.match(advanceLeadsBlock, /permissionFeature: "advanceleads"/);
assert.match(advanceLeadsBlock, /permissionCapabilities: \{ edit: "action" \}/);
assert.match(advanceLeadsBlock, /canCreate: false/);
assert.match(advanceLeadsBlock, /canDelete: false/);
assert.match(advanceLeadsBlock, /searchFields:/);
assert.match(advanceLeadsBlock, /filterableFields:/);
assert.match(advanceLeadsBlock, /sortableFields:/);
const advanceLeadsApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Advance_leads_api.php"), "utf8");
assert.match(advanceLeadsApiSource, /l\.id AS lead_id/);
assert.match(advanceLeadsApiSource, /al\.id AS advance_lead_id/);
assert.match(advanceLeadsApiSource, /api_apply_advanced_filters/);
assert.match(advanceLeadsApiSource, /advanced_filters_applied/);
assert.match(advanceLeadsApiSource, /array_intersect_key\(\$input, array_flip\(\$allowed\)\)/);
assert.match(advanceLeadsApiSource, /HTTP_METHOD_NOT_ALLOWED/);
assert.doesNotMatch(advanceLeadsApiSource, /advanceleads_model->(?:get|update_advancelead|delete)\(/);
assert.doesNotMatch(advanceLeadsApiSource, /costcenters/);
const tenderRouteSource = fs.readFileSync(path.join(workspace, "app/(tabs)/tenders/[id].tsx"), "utf8");
assert.match(tenderRouteSource, /CrudDetailScreen moduleKey="tenders" id=\{id\}/, "Tender detail must use the verified registry/API contract");
assert.doesNotMatch(tenderRouteSource, /TenderDetailScreen/);
const tendersQuerySource = fs.readFileSync(path.join(workspace, "lib/queries/tenders.ts"), "utf8");
assert.doesNotMatch(tendersQuerySource, /tenders_api\/data/, "Tender queries must use the registered API routes");
assert.doesNotMatch(tendersQuerySource, /mark_(?:won|lost)/, "Mobile must not expose invalid Won/Lost tender mutations");
assert.equal(fs.existsSync(path.join(workspace, "components/tenders/TenderDetailScreen.tsx")), false, "Obsolete tender detail must not reintroduce invalid actions");
const tendersBlock = registrySource.match(/key: "tenders",[\s\S]*?(?=\r?\n  \{\r?\n    key: "tender_boq")/)?.[0] ?? "";
assert.match(tendersBlock, /tenders_api\/\{id\}\/convert/);
assert.doesNotMatch(tendersBlock, /key: "risks"/, "Tender detail must not expose the uninstalled tender_risks table");
const tenderBoqBlock = registrySource.match(/key: "tender_boq",[\s\S]*?(?=\r?\n  \{\r?\n    key: "tender_requirements")/)?.[0] ?? "";
assert.match(tenderBoqBlock, /key: "item_description"/, "Tender BOQ must use the unified BOQ schema");
assert.match(tenderBoqBlock, /key: "quantity"/);
assert.doesNotMatch(tenderBoqBlock, /key: "qty"/);
const tenderRequirementsBlock = registrySource.match(/key: "tender_requirements",[\s\S]*?(?=\r?\n  \{\r?\n    key: "tender_risks")/)?.[0] ?? "";
assert.match(tenderRequirementsBlock, /key: "type"/);
assert.match(tenderRequirementsBlock, /key: "notes"/);
const tenderRisksBlock = registrySource.match(/key: "tender_risks",[\s\S]*?(?=\r?\n  \{\r?\n    key: "opportunities")/)?.[0] ?? "";
assert.match(tenderRisksBlock, /canCreate: false/);
const tendersApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Tenders_api.php"), "utf8");
assert.doesNotMatch(tendersApiSource, /\['tender_status' => '(?:Won|Lost)'\]/, "Tender actions must not write the non-existent tender_status column");
assert.match(tendersApiSource, /Won is not a valid tender status/);
assert.match(tendersApiSource, /convert_to_opportunity/);
const tenderTriageScreenSource = fs.readFileSync(path.join(workspace, "components/tenders/TenderTriageScreen.tsx"), "utf8");
const tenderTriageQuerySource = fs.readFileSync(path.join(workspace, "lib/queries/tender-triage.ts"), "utf8");
const tenderTriageApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Tender_triage_api.php"), "utf8");
assert.match(tenderTriageScreenSource, /TENDER OPERATIONS/);
assert.match(tenderTriageScreenSource, /matchType=\{filter\.matchType\}/, "Tender Triage must expose logical AND\/OR filters");
assert.match(tenderTriageScreenSource, /useTenderTriageBulkDismiss/);
assert.match(tenderTriageScreenSource, /useTenderTriageMute/);
assert.match(tenderTriageScreenSource, /previous: notice\.previous/, "Tender Triage must preserve the server undo snapshot");
for (const endpoint of ["overview", "items", "action", "bulk_dismiss", "mutes", "mute", "unmute"]) {
  assert.match(tenderTriageQuerySource, new RegExp(`tender_triage/${endpoint}`));
}
for (const method of ["items_get", "overview_get", "action_post", "bulk_dismiss_post", "mutes_get", "mute_post", "unmute_post"]) {
  assert.match(tenderTriageApiSource, new RegExp(`function ${method}\\s*\\(`));
}
assert.match(tenderTriageApiSource, /api_apply_advanced_filters/);
assert.match(tenderTriageApiSource, /\$allowedFrom/);
assert.match(tenderTriageApiSource, /where\('triage_status', \$current\)/);
const opportunityBoqBlock = registrySource.match(/key: "opportunity_boq",[\s\S]*?(?=\r?\n  \{\r?\n    key: "opportunity_notes")/)?.[0] ?? "";
assert.match(opportunityBoqBlock, /key: "boq_id"/);
assert.match(opportunityBoqBlock, /key: "item_name"/);
assert.match(opportunityBoqBlock, /canCreate: false/);
assert.match(opportunityBoqBlock, /canOpenDetail: false/);
assert.match(opportunityBoqBlock, /canUpdate: false/);
assert.match(opportunityBoqBlock, /canDelete: false/);
const apiSource = fs.readFileSync(path.join(workspace, "lib/api.ts"), "utf8");
assert.match(apiSource, /Array\.isArray\(response\.data\.items\)/, "Nested {data:{items}} lists must be normalized");
const knowledgeScreenSource = fs.readFileSync(path.join(workspace, "components/knowledge/KnowledgeBaseScreen.tsx"), "utf8");
const knowledgeQuerySource = fs.readFileSync(path.join(workspace, "lib/queries/knowledge.ts"), "utf8");
assert.match(knowledgeScreenSource, /useFilterState\(KNOWLEDGE_FILTER_CONFIG\.rules\)/);
assert.match(knowledgeScreenSource, /filters: queryParams\.filters/);
assert.match(knowledgeQuerySource, /filters: filters\.filters/);
const knowledgeBlock = registrySource.match(/key: "knowledge",[\s\S]*?(?=\r?\n  \{\r?\n    key: "surveys")/)?.[0] ?? "";
assert.doesNotMatch(knowledgeBlock, /canCreate: false/);
assert.doesNotMatch(knowledgeBlock, /canUpdate: false/);
assert.doesNotMatch(knowledgeBlock, /canDelete: false/);
for (const mutation of ["useCreateKBArticle", "useUpdateKBArticle", "useDeleteKBArticle"]) {
  assert.match(knowledgeQuerySource, new RegExp(`function ${mutation}\\(`));
}
const knowledgeApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Knowledge_api.php"), "utf8");
for (const modelMethod of ["add_article", "update_article", "delete_article"]) {
  assert.match(knowledgeApiSource, new RegExp(`knowledge_base_model->${modelMethod}\\(`));
}
assert.doesNotMatch(knowledgeApiSource, /knowledge_base_model->(?:add|update|delete|search)\(/);
assert.match(knowledgeApiSource, /api_apply_advanced_filters/);
assert.match(knowledgeApiSource, /require_capability\('create'\)/);
assert.match(knowledgeApiSource, /require_capability\('edit'\)/);
assert.match(knowledgeApiSource, /require_capability\('delete'\)/);
const calendarScreenSource = fs.readFileSync(path.join(workspace, "components/calendar/CalendarScreen.tsx"), "utf8");
const calendarQuerySource = fs.readFileSync(path.join(workspace, "lib/queries/calendar.ts"), "utf8");
const calendarDetailSource = fs.readFileSync(path.join(workspace, "app/(tabs)/calendar/[id].tsx"), "utf8");
assert.match(calendarScreenSource, /useFilterState\(CALENDAR_FILTER_CONFIG\.rules\)/);
assert.match(calendarQuerySource, /apiRequest\(`calendar\/\$\{id\}`\)/, "Calendar detail must request one event");
assert.doesNotMatch(calendarQuerySource, /tenders_api\/data/, "Calendar tender overlays must use the registered route");
assert.match(calendarDetailSource, /useCalendarEvent\(id\)/);
assert.ok(fs.existsSync(path.join(workspace, "app/(tabs)/calendar/edit.tsx")), "Calendar edit route must exist");
const eventFormSource = fs.readFileSync(path.join(workspace, "components/calendar/EventForm.tsx"), "utf8");
assert.match(eventFormSource, /DateInput/);
assert.match(eventFormSource, /event\?\._actions\?\.delete !== false/);
const reportsQuerySource = fs.readFileSync(path.join(workspace, "lib/queries/reports.ts"), "utf8");
const reportsListSource = fs.readFileSync(path.join(workspace, "components/reports/ReportListScreen.tsx"), "utf8");
const reportsDetailSource = fs.readFileSync(path.join(workspace, "components/reports/ReportDetailScreen.tsx"), "utf8");
const reportsEditSource = fs.readFileSync(path.join(workspace, "components/reports/ReportEditScreen.tsx"), "utf8");
const reportsApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Reports_api.php"), "utf8");
const { reportImageUrl, reportImageUrls } = loadTypeScriptModule("lib/report-images.ts", {
  "./environment": {
    getCurrentEnvironment: () => ({ uploadsBase: "https://ms.prizm-energy.com/MS" }),
  },
});
assert.doesNotMatch(reportsQuerySource, /reports_api\/data/, "Reports must use their registered public routes");
assert.match(reportsListSource, /selectedStatus === "0"/);
assert.match(reportsListSource, /DateInput/);
assert.equal(
  reportImageUrl(327, "dsr_photo_1.jpg"),
  "https://ms.prizm-energy.com/MS/uploads/prizm_reports/327/images/dsr_photo_1.jpg",
  "new report images must resolve through the per-report uploads directory",
);
assert.deepEqual(reportImageUrls(327, "dsr_photo_1.jpg"), [
  "https://ms.prizm-energy.com/MS/uploads/prizm_reports/327/images/dsr_photo_1.jpg",
  "https://ms.prizm-energy.com/MS/modules/prizm_reports/assets/images/dsr_photo_1.jpg",
]);
assert.equal(
  reportImageUrl(327, "uploads/prizm_reports/327/images/dsr_photo_1.jpg"),
  "https://ms.prizm-energy.com/MS/uploads/prizm_reports/327/images/dsr_photo_1.jpg",
  "future API responses containing a relative uploads path must not be double-prefixed",
);
assert.match(reportsDetailSource, /sourceIndex \+ 1 < sources\.length/, "Report details must fall back for legacy images");
assert.match(reportsEditSource, /fallbackUris/, "Report editing must fall back for legacy images");
assert.match(
  reportsApiSource,
  /uploads\/prizm_reports\/['"]?\s*\.\s*\(int\)\s*\$report_id\s*\.\s*['"]\/images\//,
  "mobile report uploads must use the web UI's per-report Hetzner location",
);
for (const reportForm of ["components/reports/ReportCreateScreen.tsx", "components/reports/ReportEditScreen.tsx"]) {
  const source = fs.readFileSync(path.join(workspace, reportForm), "utf8");
  assert.match(source, /<DateInput[\s\S]*?mode="date"/, `${reportForm} must use the native date picker`);
}
const tasksScreenSource = fs.readFileSync(path.join(workspace, "app/(tabs)/tasks/index.tsx"), "utf8");
assert.doesNotMatch(tasksScreenSource, /useTasksByStatus/, "Task board must use the same filtered result as list view");
assert.match(tasksScreenSource, /tasks=\{boardItems\[col\.status\] \?\? \[\]\}/);
const timesheetEntriesSource = fs.readFileSync(path.join(workspace, "app/(tabs)/timesheets/entries.tsx"), "utf8");
assert.match(timesheetEntriesSource, /CrudListScreen moduleKey="timesheets"/);
const timesheetsBlock = registrySource.match(/key: "timesheets",[\s\S]*?(?=\n  \{\n    key: "recruitment_candidates")/)?.[0] ?? "";
assert.ok(timesheetsBlock, "Timesheets must remain a native module");
assert.doesNotMatch(timesheetsBlock, /permissionFeature:/, "Every staff member can access their own web timesheets");
assert.match(timesheetsBlock, /titleFields: \["task_name", "task_id"\]/);
assert.match(timesheetsBlock, /key: "end_time"[^\n]*required: true/);
assert.match(timesheetsBlock, /key: "active"[\s\S]*?label: "Running"/);
assert.match(timesheetsBlock, /key: "duration_seconds"/);
assert.match(timesheetsApiSource, /db_prefix\(\) \. 'taskstimers'/);
assert.doesNotMatch(timesheetsApiSource, /prz_timesheets/);
assert.match(timesheetsApiSource, /staff_can\('view-timesheets', 'reports'/);
assert.match(timesheetsApiSource, /tasks_model->timesheet\(/);
assert.match(timesheetsApiSource, /tasks_model->delete_timesheet\(/);
assert.match(timesheetsApiSource, /tasks_model->timer_tracking\(/);
const tasksModelSource = fs.readFileSync(path.join(backendWorkspace, "application/models/Tasks_model.php"), "utf8");
assert.match(tasksModelSource, /function timer_tracking\([^\n]*\$staffId = null/);
const taskApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Tasks.php"), "utf8");
assert.match(taskApiSource, /timer_tracking\([^;]*false, \$staffid\)/s);
assert.match(taskApiSource, /\$adminStop, \$staffid\)/);
const nativeRoutingSource = fs.readFileSync(path.join(workspace, "lib/native-routing.ts"), "utf8");
assert.match(nativeRoutingSource, /timesheets: "\/\(tabs\)\/timesheets\/entries"/);
assert.equal(fs.existsSync(path.join(workspace, "lib/queries/advance-leads.ts")), false, "Unsupported legacy Advance Leads mutations must stay removed");
assert.equal(fs.existsSync(path.join(workspace, "lib/queries/rfq.ts")), false, "Superseded RFQ client must stay removed in favor of RFQ2");
const customStatusesBlock = registrySource.match(/key: "custom_statuses",[\s\S]*?(?=\n  \{\n    key: "automation")/)?.[0] ?? "";
assert.ok(customStatusesBlock, "Custom Statuses must be available as a native settings page");
assert.match(customStatusesBlock, /permissionFeature: "si_custom_status"/);
assert.match(customStatusesBlock, /searchFields:/);
assert.match(customStatusesBlock, /filterableFields:/);
assert.match(customStatusesBlock, /sortableFields:/);
assert.match(customStatusesBlock, /value: "projects"/);
assert.match(customStatusesBlock, /value: "tasks"/);
const customStatusesApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Custom_statuses_api.php"), "utf8");
for (const capability of ["view", "create", "edit", "delete"]) {
  assert.match(customStatusesApiSource, new RegExp(`require_capability\\('${capability}'\\)`), `Custom Statuses API must enforce ${capability} permission`);
}
assert.match(customStatusesApiSource, /array_intersect_key\(\$input, array_flip\(\$allowed\)\)/);
assert.match(customStatusesApiSource, /api_apply_advanced_filters/);
assert.match(customStatusesApiSource, /advanced_filters_applied/);
assert.match(customStatusesApiSource, /\['projects', 'tasks'\]/);
assert.match(customStatusesApiSource, /six-digit hex value/);
const otpApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Otpmanager.php"), "utf8");
const apiRoutesSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/config/routes.php"), "utf8");
for (const route of ["items", "overview", "action", "bulk_dismiss", "mutes", "mute", "unmute"]) {
  assert.match(apiRoutesSource, new RegExp(`api/tender_triage/${route}`));
}
for (const staleCall of ["projects_model", "delete_milestone", "update_milestone", "verify_otp"]) {
  assert.doesNotMatch(otpApiSource, new RegExp(staleCall), `OTP API must not contain stale ${staleCall} calls`);
}
assert.match(otpApiSource, /_visibility_sql\(\)/);
assert.match(otpApiSource, /soft_delete_otp/);
assert.match(otpApiSource, /otp_audit/);
assert.match(otpApiSource, /\$row\['otp_code'\] = null/);
assert.match(otpApiSource, /\$row\['message'\] = null/);
const otpRevealRoute = apiRoutesSource.indexOf("api/otpmanager/(:num)/reveal");
const genericControllerRoute = apiRoutesSource.indexOf("api/(:any)/(:num)");
assert.ok(otpRevealRoute >= 0 && genericControllerRoute > otpRevealRoute, "OTP reveal route must precede the generic API route");

const automationBlock = registrySource.match(/key: "automation",[\s\S]*?(?=\n  \{\n    key: "automation_triggers")/)?.[0] ?? "";
assert.match(automationBlock, /adminOnlyAccess: true/);
assert.match(automationBlock, /automation_api\/activate\/\{id\}/);
assert.match(automationBlock, /moduleKey: "automation_triggers"/);
assert.match(automationBlock, /moduleKey: "automation_actions"/);
assert.doesNotMatch(automationBlock, /key: "trigger"|key: "action"/);
const automationApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Automation_api.php"), "utf8");
assert.match(automationApiSource, /require_admin/);
assert.match(automationApiSource, /api_apply_advanced_filters/);
assert.match(automationApiSource, /array_key_exists\(\$kind, \$input\).*continue/);
assert.doesNotMatch(automationApiSource, /automation_model->find|automation_model->update\(/);

const materialsBlock = registrySource.match(/key: "materials",[\s\S]*?(?=\n  \{\n    key: "material_metadata")/)?.[0] ?? "";
assert.match(materialsBlock, /key: "item_code"/);
assert.match(materialsBlock, /key: "item_name"/);
assert.match(materialsBlock, /moduleKey: "material_metadata"/);
assert.match(materialsBlock, /materials_catalog\/materials\/\{id\}\/convert/);
assert.doesNotMatch(materialsBlock, /key: "name"|key: "description"|key: "uom"|key: "unit_price"/);
const materialsApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Materials_catalog.php"), "utf8");
assert.match(materialsApiSource, /function materials_convert_post/);
assert.match(materialsApiSource, /function material_metadata_get/);
for (const method of ["categories_get", "categories_post", "categories_put", "categories_delete"]) {
  assert.match(materialsApiSource, new RegExp(`function ${method}\\s*\\(`));
}
assert.match(materialsApiSource, /api_apply_advanced_filters/);
assert.match(materialsApiSource, /\$sorts = \[/);
assert.match(materialsBlock, /sortableFields:/);
assert.doesNotMatch(materialsApiSource, /material_model->(?:add|update|delete)\(/);
const materialConvertRoute = apiRoutesSource.indexOf("$route['api/materials_catalog/materials/(:num)/convert']");
const materialDetailRoute = apiRoutesSource.indexOf("$route['api/materials_catalog/materials/(:num)']");
assert.ok(materialConvertRoute >= 0 && materialDetailRoute > materialConvertRoute, "Material conversion route must precede material detail");
const materialCategoriesBlock = registrySource.match(/key: "material_categories",[\s\S]*?(?=\n  \{\n    key: "material_kits")/)?.[0] ?? "";
assert.match(materialCategoriesBlock, /permissionFeature: "materials"/);
assert.match(materialCategoriesBlock, /clientSideSearch: true/);
assert.match(materialCategoriesBlock, /unpaginated: true/);
assert.match(materialCategoriesBlock, /relation: "material_category"/);
assert.match(materialCategoriesBlock, /canOpenDetail: false/);
const unspscCommoditiesBlock = registrySource.match(/key: "unspsc_commodities",[\s\S]*?(?=\n  \{\n    key: "unspsc_commodity_specs")/)?.[0] ?? "";
const unspscSpecsBlock = registrySource.match(/key: "unspsc_commodity_specs",[\s\S]*?(?=\n  \{\n    key: "material_kits")/)?.[0] ?? "";
assert.match(unspscCommoditiesBlock, /permissionFeature: "classification"/);
assert.match(unspscCommoditiesBlock, /searchParam: "q"/);
assert.match(unspscCommoditiesBlock, /requiresSearch: true/);
assert.match(unspscCommoditiesBlock, /detailEndpoint: "materials_catalog\/unspsc\/commodity"/);
assert.match(unspscCommoditiesBlock, /moduleKey: "unspsc_commodity_specs"/);
assert.match(unspscSpecsBlock, /canOpenDetail: false/);
for (const method of ["unspsc_search_get", "unspsc_commodity_get", "unspsc_commodity_specs_get"]) {
  assert.match(materialsApiSource, new RegExp(`function ${method}\\s*\\(`));
}
const requiredSearchListSource = fs.readFileSync(path.join(workspace, "components/crud/CrudListScreen.tsx"), "utf8");
assert.match(requiredSearchListSource, /params\[module\.searchParam \|\| "search"\]/);
assert.match(requiredSearchListSource, /awaitingRequiredSearch/);
const materialKitsBlock = registrySource.match(/key: "material_kits",[\s\S]*?(?=\n  \{\n    key: "material_kit_items")/)?.[0] ?? "";
const materialKitItemsBlock = registrySource.match(/key: "material_kit_items",[\s\S]*?(?=\n  \{\n    key: "budget_items")/)?.[0] ?? "";
assert.match(materialKitsBlock, /endpoint: "materials_catalog\/kits"/);
assert.match(materialKitsBlock, /permissionFeature: "prizm_items"/);
assert.match(materialKitsBlock, /moduleKey: "material_kit_items"/);
assert.match(materialKitsBlock, /materials_catalog\/kit_items\?kit_id=\{id\}/);
assert.doesNotMatch(materialKitsBlock, /filterableFields:|statusField:/);
assert.match(materialKitItemsBlock, /relation: "budget_item"/);
assert.match(materialKitItemsBlock, /relation: "budget_unit"/);
assert.match(materialKitItemsBlock, /canOpenDetail: false/);
assert.doesNotMatch(materialKitItemsBlock, /canUpdate: false|canDelete: false/);
assert.match(materialsApiSource, /function kits_get/);
assert.match(materialsApiSource, /function kits_post/);
assert.match(materialsApiSource, /function kits_put/);
assert.match(materialsApiSource, /function kits_delete/);
assert.match(materialsApiSource, /function kit_items_get/);
assert.match(materialsApiSource, /function kit_items_post/);
assert.match(materialsApiSource, /function kit_items_put/);
assert.match(materialsApiSource, /function kit_items_delete/);
const costCalculationsBlock = registrySource.match(/key: "cost_calculations",[\s\S]*?(?=\n  \{\n    key: "cost_calculation_items")/)?.[0] ?? "";
const costCalculationItemsBlock = registrySource.match(/key: "cost_calculation_items",[\s\S]*?(?=\n  \{\n    key: "rfq2")/)?.[0] ?? "";
assert.match(costCalculationsBlock, /endpoint: "cost_calculation_api"/);
assert.match(costCalculationsBlock, /permissionFeature: "boq_tree"/);
assert.match(costCalculationsBlock, /clientSideSearch: true/);
assert.match(costCalculationsBlock, /unpaginated: true/);
assert.match(costCalculationsBlock, /detailRootKey: "snapshot"/);
assert.match(costCalculationsBlock, /embeddedField: "nodes"/);
assert.match(costCalculationsBlock, /createEndpointTemplate: "cost_calculation_api\/\{id\}\/items"/);
assert.match(costCalculationItemsBlock, /canOpenDetail: false/);
assert.doesNotMatch(costCalculationItemsBlock, /canUpdate: false|canDelete: false/);
const costCalculationApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Cost_calculation_api.php"), "utf8");
for (const method of ["data_get", "data_post", "data_put", "data_delete", "items_post", "item_put", "item_delete"]) {
  assert.match(costCalculationApiSource, new RegExp(`function ${method}\\s*\\(`));
}
const technicalItemsBlock = registrySource.match(/key: "technical_items",[\s\S]*?(?=\n  \{\n    key: "cost_calculations")/)?.[0] ?? "";
assert.match(technicalItemsBlock, /permissionFeature: "technicalinquiries"/);
assert.match(technicalItemsBlock, /relation: "budget_item"/);
assert.match(technicalItemsBlock, /relation: "budget_unit"/);
assert.match(technicalItemsBlock, /canOpenDetail: false/);
assert.doesNotMatch(technicalItemsBlock, /canUpdate: false|canDelete: false/);
const technicalInquiryApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Technical_inquiries.php"), "utf8");
for (const method of ["items_post", "items_put", "items_delete"]) {
  assert.match(technicalInquiryApiSource, new RegExp(`function ${method}\\s*\\(`));
}
const budgetItemsBlock = registrySource.match(/key: "budget_items",[\s\S]*?(?=\n  \{\n    key: "budget_item_specs")/)?.[0] ?? "";
const budgetItemSpecsBlock = registrySource.match(/key: "budget_item_specs",[\s\S]*?(?=\n  \{\n    key: "goals")/)?.[0] ?? "";
assert.match(budgetItemsBlock, /moduleKey: "budget_item_specs"/);
assert.match(budgetItemsBlock, /budget_api\/item_specs\/\{id\}/);
assert.match(budgetItemSpecsBlock, /permissionFeature: "prizmbudget"/);
assert.match(budgetItemSpecsBlock, /relation: "budget_specification"/);
assert.match(budgetItemSpecsBlock, /canOpenDetail: false/);
const budgetApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Budget_api.php"), "utf8");
for (const method of ["item_specs_get", "item_specs_post", "item_specs_put", "item_specs_delete", "specifications_get"]) {
  assert.match(budgetApiSource, new RegExp(`function ${method}\\s*\\(`));
}
assert.match(registrySource, /endpointTemplate: "cost_calculation_api\?rel_type=project&rel_id=\{id\}"/);
assert.match(registrySource, /endpointTemplate: "cost_calculation_api\?rel_type=opportunity&rel_id=\{id\}"/);
const embeddedCrudDetailSource = fs.readFileSync(path.join(workspace, "components/crud/CrudDetailScreen.tsx"), "utf8");
const endpointOverrideFormSource = fs.readFileSync(path.join(workspace, "components/crud/CrudFormScreen.tsx"), "utf8");
assert.match(embeddedCrudDetailSource, /tab\?\.embeddedField/);
assert.match(embeddedCrudDetailSource, /_mutation_endpoint/);
assert.match(endpointOverrideFormSource, /params\._mutation_endpoint/);
const costCentersBlock = registrySource.match(/key: "cost_centers",[\s\S]*?(?=\n  \{\n    key: "timesheets")/)?.[0] ?? "";
assert.match(costCentersBlock, /permissionFeature: "costcenters"/);
assert.doesNotMatch(costCentersBlock, /permissionFeature: "costcenter"/);
for (const child of ["cost_center_members", "cost_center_supervisors", "cost_center_activity"]) {
  assert.match(costCentersBlock, new RegExp(`moduleKey: "${child}"`));
}
const costCentersApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Cost_centers_api.php"), "utf8");
assert.match(costCentersApiSource, /costcenter_members cm[\s\S]*cm\.member_id/);
assert.match(costCentersApiSource, /costcenter_supervisors cs[\s\S]*cs\.supervisor_id/);
assert.match(costCentersApiSource, /order_by\('date'[\s\S]*costcenter_activity_log/);
assert.match(costCentersApiSource, /costcenters_model->add_edit_members/);
assert.match(costCentersApiSource, /costcenters_model->add_edit_supervisors/);
assert.match(costCentersApiSource, /api_apply_advanced_filters/);
assert.doesNotMatch(costCentersApiSource, /prz_cost_centers/);
const costCentersInstallSource = fs.readFileSync(path.join(backendWorkspace, "modules/costcenters/install.php"), "utf8");
assert.match(costCentersInstallSource, /costcenter_members[\s\S]*`member_id`/);
assert.match(costCentersInstallSource, /costcenter_supervisors[\s\S]*`supervisor_id`/);
assert.match(costCentersInstallSource, /costcenter_activity_log[\s\S]*`date` datetime/);
const surveysBlock = registrySource.match(/key: "surveys",[\s\S]*?(?=\n  \{\n    key: "survey_send_log")/)?.[0] ?? "";
const surveySendLogBlock = registrySource.match(/key: "survey_send_log",[\s\S]*?(?=\n  \{\n    key: "custom_statuses")/)?.[0] ?? "";
assert.match(surveysBlock, /moduleKey: "survey_send_log"/);
assert.match(surveysBlock, /surveys_api\/send_log\/\{id\}/);
assert.match(surveysBlock, /kind: "survey_results"/);
assert.match(surveysBlock, /surveys_api\/results\/\{id\}/);
assert.match(surveySendLogBlock, /canOpenDetail: false/);
assert.match(surveySendLogBlock, /canCreate: false/);
const surveysApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Surveys_api.php"), "utf8");
assert.match(surveysApiSource, /function send_log_get/);
assert.match(surveysApiSource, /function results_get[\s\S]*form_results/);
assert.match(surveysApiSource, /surveyresultsets/);
assert.match(surveysApiSource, /api_apply_advanced_filters/);
assert.doesNotMatch(surveysApiSource, /prz_surveys|surveyresults(?!ets)/);
const surveysInstallSource = fs.readFileSync(path.join(backendWorkspace, "modules/surveys/install.php"), "utf8");
assert.match(surveysInstallSource, /surveyresultsets/);
const surveyResultsTabSource = fs.readFileSync(path.join(workspace, "components/surveys/SurveyResultsTab.tsx"), "utf8");
assert.match(surveyResultsTabSource, /useSurveyResults/);
assert.match(surveyResultsTabSource, /totalResponses/);
assert.match(surveyResultsTabSource, /progress-bar|percentage|percent/i);

for (const key of [
  "fixed_equipment_categories", "fixed_equipment_manufacturers", "fixed_equipment_models",
  "fixed_equipment_suppliers", "fixed_equipment_statuses", "fixed_equipment_depreciations",
]) {
  const block = registrySource.match(new RegExp(`key: "${key}",[\\s\\S]*?(?=\\n  \\{\\n    key: "|\\n\\];)`))?.[0] ?? "";
  assert.ok(block, `${key} must remain registered as a native settings module`);
  assert.match(block, /adminOnlyAccess: true/);
  assert.match(block, /adminOnlyMutations: true/);
  assert.match(block, /filterableFields:/);
}
const fixedEquipmentApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Fixed_equipment_api.php"), "utf8");
for (const key of [
  "fixed_equipment", "fixed_equipment_locations", "fixed_equipment_maintenances",
  "fixed_equipment_licenses", "fixed_equipment_predefined_kits", "fixed_equipment_accessories",
  "fixed_equipment_consumables", "fixed_equipment_components",
]) {
  const block = registrySource.match(new RegExp(`key: "${key}",[\\s\\S]*?(?=\\n  \\{\\n    key: "|\\n\\];)`))?.[0] ?? "";
  assert.match(block, /filterableFields:/, `${key} must expose its verified server filter contract`);
  assert.match(block, /sortableFields:/, `${key} must expose only verified server sort keys`);
}
for (const kind of ["categories", "manufacturers", "models", "suppliers", "depreciations", "statuses"]) {
  assert.match(fixedEquipmentApiSource, new RegExp(`function ${kind}_post\\(`));
  assert.match(fixedEquipmentApiSource, new RegExp(`function ${kind}_put\\(`));
  assert.match(fixedEquipmentApiSource, new RegExp(`function ${kind}_delete\\(`));
  const detailRoute = `$route['api/fixed_equipment_api/${kind}/(:num)']`;
  const listRoute = `$route['api/fixed_equipment_api/${kind}']`;
  assert.ok(apiRoutesSource.indexOf(detailRoute) >= 0 && apiRoutesSource.indexOf(listRoute) > apiRoutesSource.indexOf(detailRoute), `${kind} detail route must precede its list route`);
}
assert.match(fixedEquipmentApiSource, /Fixed Equipment settings are restricted to administrators/);

for (const key of ["estimate_request_statuses", "estimate_request_forms"]) {
  const block = registrySource.match(new RegExp(`key: "${key}",[\\s\\S]*?(?=\\n  \\{\\n    key: "|\\n\\];)`))?.[0] ?? "";
  assert.ok(block, `${key} must remain registered as a native settings module`);
  assert.match(block, /adminOnlyAccess: true/);
  assert.match(block, /adminOnlyMutations: true/);
  assert.match(block, /filterableFields:/);
}
const estimateRequestApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Estimate_requests.php"), "utf8");
assert.match(estimateRequestApiSource, /function statuses_post\(/);
assert.match(estimateRequestApiSource, /function statuses_put\(/);
assert.match(estimateRequestApiSource, /function statuses_delete\(/);
assert.match(estimateRequestApiSource, /function forms_post\(/);
assert.match(estimateRequestApiSource, /function forms_put\(/);
assert.match(estimateRequestApiSource, /function forms_delete\(/);
assert.match(estimateRequestApiSource, /required email field/);
assert.match(estimateRequestApiSource, /api_apply_advanced_filters/);
for (const kind of ["statuses", "forms"]) {
  const detailRoute = `$route['api/estimate_requests/${kind}/(:num)']`;
  const listRoute = `$route['api/estimate_requests/${kind}']`;
  assert.ok(apiRoutesSource.indexOf(detailRoute) >= 0 && apiRoutesSource.indexOf(listRoute) > apiRoutesSource.indexOf(detailRoute), `${kind} detail route must precede its list route`);
}
const moduleHubSource = fs.readFileSync(path.join(workspace, "components/crud/ModuleHubScreen.tsx"), "utf8");
assert.match(moduleHubSource, /if \(mod\.adminOnlyAccess\) return false/);

// Regressions caught while reconciling the remaining web-admin pages with the
// live schema. These misspellings/legacy names previously produced empty or
// failing mobile pages while looking superficially plausible.
const controllerContracts = [
  ["Cost_centers_api.php", /costcenters/, /prz_cost_centers/],
  ["Gatepass_api.php", /gatepass/, /prz_gatepass/],
  ["Surveys_api.php", /surveys/, /prz_surveys/],
  ["Recruitment_api.php", /rec_candidate[\s\S]*rec_job_position[\s\S]*rec_proposal/, /db_prefix\(\)\s*\.\s*['"]recruitment_(?:candidates|positions|proposals)/],
];
for (const [filename, liveSchema, staleSchema] of controllerContracts) {
  const source = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers", filename), "utf8");
  assert.match(source, liveSchema, `${filename} must use the live schema`);
  assert.doesNotMatch(source, staleSchema, `${filename} must not regress to a guessed legacy table`);
  assert.match(source, /api_apply_advanced_filters/, `${filename} must enforce the advertised advanced filters`);
}
const goalsApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Goals_api.php"), "utf8");
assert.match(goalsApiSource, /calculate_goal_achievement/);
assert.match(goalsApiSource, /notify_when_achieve/);
assert.doesNotMatch(goalsApiSource, /notify_when_achieved/);

const recruitmentApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Recruitment_api.php"), "utf8");
assert.match(recruitmentApiSource, /sanitize_candidate/);
assert.match(recruitmentApiSource, /\['password','new_pass_key'/);
assert.match(recruitmentApiSource, /candidate_child_list\('cd_literacy'/);
assert.match(recruitmentApiSource, /candidate_child_list\('cd_work_experience'/);
assert.doesNotMatch(recruitmentApiSource, /recruitment_candidate_(?:education|experience)/);
assert.doesNotMatch(registrySource.match(/key: "recruitment_candidates",[\s\S]*?(?=\n  \{\n    key: ")/)?.[0] ?? "", /hire|reject/);
for (const key of ["recruitment_candidate_education", "recruitment_candidate_experience"]) {
  assert.ok(registryKeys.includes(key), `${key} must remain registered for candidate tabs`);
}

const purchaseApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Purchase_api.php"), "utf8");
for (const token of ["_purchase_requests_list", "_purchase_orders_list", "delivery_notes_get", "quotations_get", "completion_certificates_get", "received_vouchers_get", "payment_requests_get", "expense_requests_get"]) {
  const start = purchaseApiSource.indexOf(`function ${token}`);
  assert.ok(start >= 0, `Purchase API must retain ${token}`);
}
assert.match(purchaseApiSource, /function vendor_contact_get/);
assert.match(purchaseApiSource, /advanced_filters_applied/);
assert.ok(apiRoutesSource.indexOf("api/purchase_api/vendor_contact/(:num)") >= 0, "Vendor contact detail route must exist separately from the vendor child list");
const purchaseContactsBlock = registrySource.match(/key: "purchase_vendor_contacts",[\s\S]*?(?=\n  \{\n    key: ")/)?.[0] ?? "";
assert.match(purchaseContactsBlock, /detailEndpoint: "purchase_api\/vendor_contact"/);
assert.match(purchaseContactsBlock, /key: "supplier_id"/);
assert.match(purchaseContactsBlock, /key: "phone"/);
assert.doesNotMatch(purchaseContactsBlock, /key: "vendor_id"|key: "phonenumber"/);
const completionCertificateBlock = registrySource.match(/key: "purchase_completion_certificates",[\s\S]*?(?=\n  \{\n    key: ")/)?.[0] ?? "";
assert.match(completionCertificateBlock, /key: "attachment"/);
assert.match(completionCertificateBlock, /key: "amount"/);
assert.doesNotMatch(completionCertificateBlock, /certificate_number|key: "title"|key: "date"|key: "notes"/);

// The UI must not advertise a filter for an endpoint without an explicit
// filter contract, and declared list-only filter columns must remain usable.
const crudListSource = fs.readFileSync(path.join(workspace, "components/crud/CrudListScreen.tsx"), "utf8");
assert.match(crudListSource, /hasSupportedFilters/);
assert.match(crudListSource, /hasSupportedSearch/);
assert.match(crudListSource, /hasSupportedSort/);
assert.match(registrySource, /function syntheticFilterField/);
assert.match(registrySource, /if \(module\.filterableFields\?\.length\)/);
assert.doesNotMatch(registrySource.slice(registrySource.indexOf("export function getFilterFields"), registrySource.indexOf("export function getFieldFilterRuleType")), /module\.fields\.slice\(0, 8\)/);
const sortPickerSource = fs.readFileSync(path.join(workspace, "components/crud/SortPicker.tsx"), "utf8");
assert.match(sortPickerSource, /module\.sortableFields\?\.length/);
assert.doesNotMatch(sortPickerSource, /module\.titleFields|module\.subtitleFields/);
const apiClientSource = fs.readFileSync(path.join(workspace, "lib/api.ts"), "utf8");
assert.match(apiClientSource, /requestGeneration: number/);
assert.match(apiClientSource, /endpoint\.includes\("\?"\) \? `&\$\{query\.slice\(1\)\}`/);
assert.match(apiClientSource, /export async function listAllEntities/);
const crudDetailSource = fs.readFileSync(path.join(workspace, "components/crud/CrudDetailScreen.tsx"), "utf8");
assert.match(crudDetailSource, /tab\?\.unpaginated \? listEntities\(endpoint\) : listAllEntities\(endpoint\)/);
assert.match(crudDetailSource, /if \(tab\.childField\)/);
assert.match(registrySource, /tasks\?rel_type=customer&rel_id=\{userid\}/);
assert.match(registrySource, /tasks\?rel_type=project&rel_id=\{id\}/);
assert.match(registrySource, /payments\?invoiceid=\{id\}/);

// Do not manufacture "parity" from raw-table shortcuts. These web workflows
// must remain absent until their API contracts delegate to the same models and
// permission rules as the web UI.
const customModulesApiSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/controllers/Custom_modules_api.php"), "utf8");
const taskManageControllerSource = fs.readFileSync(path.join(backendWorkspace, "modules/task_manage/controllers/Manage.php"), "utf8");
assert.match(customModulesApiSource, /task_template_groups[\s\S]*?'s'\s*=>\s*\['name'\]/);
assert.match(customModulesApiSource, /task_template_milestones[\s\S]*?'s'\s*=>\s*\['name'\]/);
assert.match(taskManageControllerSource, /task_manage_groups\.group_name/);
assert.match(taskManageControllerSource, /task_manage_milestones/);
assert.doesNotMatch(registrySource, /key: "task_template_(?:groups|tasks|milestones)"/);
assert.doesNotMatch(registrySource, /key: "(?:product_families|client_items)"/);
assert.doesNotMatch(materialsApiSource, /function (?:product_families|client_items)_/);

console.log("Mobile contract tests passed: auth, Perfex filters/UI, native routing, complete related-record tabs, live-schema module contracts, purchasing, fixed-equipment workflows/settings, OTP, Automation, Materials, and Estimate Request settings.");
