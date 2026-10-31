import assert from "node:assert/strict";
import fs from "node:fs";
import { loadRegistry, loadRouting } from "./lib/mobile-surface.mjs";

const registry = await loadRegistry();
const routing = await loadRouting();
assert.equal(registry.has("dewa_contacts"), false, "inactive DEWA module must not be exposed in mobile");
assert.equal(routing.resolveNativeRoute("dewa_contacts/dewa_contacts"), null, "inactive DEWA routes must fail closed");
for (const key of ["advance_lead_details", "task_checklist", "task_comments", "task_assignments", "task_followers"]) {
  assert.equal(registry.get(key)?.canOpenDetail, false, `${key} has no single-record GET contract and must not open a detail screen`);
}
for (const [key, expected] of Object.entries({
  material_metadata: { moduleKey: "materials", param: "material_id" },
  fixed_equipment_license_seats: { moduleKey: "fixed_equipment_licenses", param: "license_id" },
  fixed_equipment_predefined_kit_models: { moduleKey: "fixed_equipment_predefined_kits", param: "parent_id" },
  fixed_equipment_inventory_checkouts: { moduleKey: "fixed_equipment_accessories", param: "item_id", params: { kind: "accessory" } },
})) {
  assert.deepEqual(registry.get(key)?.collectionParent, expected, `${key} must resolve its real parent collection`);
}
const smoke = fs.readFileSync(new URL("./smoke-live-api.mjs", import.meta.url), "utf8");
assert.match(smoke, /module\.collectionParent/);
assert.match(smoke, /parent\.param/);
assert.match(smoke, /parent\.params/);
console.log("Child parity contracts passed.");
