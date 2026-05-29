/**
 * Prizm ERP → Mobile Operations Harvester
 * Scans admin controllers, extracts all operations, cross-refs mobile module-registry
 */
const fs = require("fs");
const path = require("path");

const ERP = "C:/wamp64/www/prizm331";
const CTRL_DIR = path.join(ERP, "application/controllers/admin");
const MOD_DIR = path.join(ERP, "modules");

// Known module controller mappings (admin controller -> module key)
const MODULE_MAP = {
  "Clients": "customers",
  "Projects": "projects",
  "Tasks": "tasks",
  "Leads": "leads",
  "Invoices": "invoices",
  "Estimates": "estimates",
  "Proposals": "proposals",
  "Expenses": "expenses",
  "Contracts": "contracts",
  "Tickets": "tickets",
  "Knowledge_base": "knowledge",
  "Surveys": "surveys",
  "Goals": "goals",
  "Staff": "staff",
  "Credit_notes": "credit_notes",
  "Payments": "payments",
  "Invoice_items": "items",
  "Departments": "departments",
  "Roles": "roles",
  "Currencies": "currencies",
  "Custom_fields": "custom_fields",
  "Emails": "emails",
  "Announcements": "announcements",
  "Reports": "reports",
  "Settings": "settings",
  "Misc": "misc",
  "Dashboard": "dashboard",
  "Gdpr": "gdpr",
  "Spam_filters": "spam_filters",
  "Estimate_request": "estimate_request",
  "Ai": "ai",
  "Ai_tickets": "ai_tickets",
  "Auto_update": "auto_update",
  "Bug": "bug",
  "Feature": "feature",
  "Filters": "filters",
  "ColumnSettings": "column_settings",
  "Email_schedule_estimate": "email_schedule_estimate",
  "Email_schedule_invoice": "email_schedule_invoice",
  "Ag_column_settings": "ag_column_settings",
};

// Mobile app existing endpoints from module-registry
const MOBILE_ENDPOINTS = {
  customers: { list:"customers", detail:"customers", create:true, update:true, delete:true, actions:[] },
  contacts: { list:"contacts", detail:"contacts/detail", create:true, update:true, delete:true, actions:[] },
  leads: { list:"leads", detail:"leads", create:true, update:true, delete:true, actions:["change_status"] },
  projects: { list:"projects", detail:"projects", create:true, update:true, delete:true, actions:["mark_in_progress","mark_on_hold","mark_finished","mark_cancelled"] },
  tasks: { list:"tasks", detail:"tasks", create:true, update:true, delete:true, actions:["timer_start","timer_stop","mark_complete","reopen"], tabs:["checklist","comments","assignments","followers","files"] },
  invoices: { list:"invoices", detail:"invoices", create:true, update:true, delete:true, actions:["send","record_payment","mark_cancelled"] },
  estimates: { list:"estimates", detail:"estimates", create:true, update:true, delete:true, actions:["send","convert","mark_sent","mark_accepted","mark_declined"] },
  proposals: { list:"proposals", detail:"proposals", create:true, update:true, delete:true, actions:["send","copy","mark_open","mark_sent","mark_revised","mark_accepted","mark_declined"] },
  expenses: { list:"expenses", detail:"expenses", create:true, update:true, delete:true, actions:["mark_billable","mark_not_billable","copy"] },
  contracts: { list:"contracts", detail:"contracts", create:true, update:true, delete:true, actions:["sign","send","renew"] },
  tickets: { list:"tickets", detail:"tickets", create:true, update:true, delete:true, actions:["reply","change_status","change_priority","assign"] },
  knowledge: { list:"knowledge_api", detail:"knowledge_api", create:true, update:true, delete:true, actions:["publish","unpublish"] },
  surveys: { list:"surveys_api", detail:"surveys_api", create:true, update:true, delete:true, actions:["publish","close"] },
  goals: { list:"goals_api", detail:"goals_api", create:true, update:true, delete:true, actions:["mark_complete","reopen"] },
  staff: { list:"staffs", detail:"staffs", create:true, update:true, delete:true, actions:[] },
  credit_notes: { list:"credit_notes", detail:"credit_notes", create:true, update:true, delete:true, actions:[] },
  payments: { list:"payments", detail:"payments", create:true, update:true, delete:true, actions:[] },
  items: { list:"items", detail:"items", create:true, update:true, delete:true, actions:[] },
  milestones: { list:"milestones", detail:"milestones", create:true, update:true, delete:true, actions:[] },
  calendar: { list:"calendar", detail:"calendar", create:true, update:true, delete:true, actions:[] },
  timesheets: { list:"timesheets_api", detail:"timesheets_api", create:true, update:true, delete:true, actions:[] },
  // Purchase modules
  purchase_vendors: { list:"purchase_api/vendors", detail:"purchase_api/vendors", create:true, update:true, delete:true, actions:[] },
  purchase_requests: { list:"purchase_api/requests", detail:"purchase_api/requests", create:true, update:true, delete:true, actions:["publish","close"] },
  purchase_orders: { list:"purchase_api/orders", detail:"purchase_api/orders", create:true, update:true, delete:true, actions:["approve","reject","send_to_supplier","mark_received","mark_paid"] },
  purchase_payment_requests: { list:"purchase_api/payment_requests", detail:"purchase_api/payment_requests", create:false, update:false, delete:false, actions:[] },
  purchase_expense_requests: { list:"purchase_api/expense_requests", detail:"purchase_api/expense_requests", create:false, update:false, delete:false, actions:[] },
  purchase_received_vouchers: { list:"purchase_api/received_vouchers", detail:"purchase_api/received_vouchers", create:false, update:false, delete:false, actions:["approve","reject"] },
  purchase_delivery_notes: { list:"purchase_api/delivery_notes", detail:"purchase_api/delivery_notes", create:false, update:false, delete:false, actions:["approve","reject"] },
  purchase_quotations: { list:"purchase_api/quotations", detail:"purchase_api/quotations", create:false, update:false, delete:false, actions:["approve","reject"] },
  purchase_completion_certificates: { list:"purchase_api/completion_certificates", detail:"purchase_api/completion_certificates", create:false, update:false, delete:false, actions:["approve","reject"] },
  // PRIZM
  tenders: { list:"tenders_api", detail:"tenders_api", create:true, update:true, delete:true, actions:["mark_won","mark_lost","set_status"], tabs:["boq","requirements","risks","files"] },
  opportunities: { list:"opportunities_api", detail:"opportunities_api", create:true, update:true, delete:true, actions:["submit","set_stage","set_status"], tabs:["boq","notes","files"] },
  technical_inquiries: { list:"technical_inquiries", detail:"technical_inquiries", create:true, update:true, delete:true, actions:[] },
  // HR
  recruitment_candidates: { list:"recruitment_api/candidates", detail:"recruitment_api/candidates", create:true, update:true, delete:true, actions:["hire","reject","change_stage"] },
  recruitment_positions: { list:"recruitment_api/positions", detail:"recruitment_api/positions", create:true, update:true, delete:true, actions:[] },
  hr_payslips: { list:"hr_payroll_api/payslips", detail:"hr_payroll_api/payslips", create:true, update:true, delete:true, actions:["mark_paid"] },
  // Operations
  gatepass: { list:"gatepass_api", detail:"gatepass_api", create:true, update:true, delete:true, actions:["approve","reject","close"] },
  fixed_equipment: { list:"fixed_equipment_api", detail:"fixed_equipment_api", create:true, update:true, delete:true, actions:["allocate","return"] },
  // Others
  materials: { list:"materials_catalog/materials", detail:"materials_catalog/materials", create:true, update:true, delete:true, actions:[] },
  budget_items: { list:"budget_api/items", detail:"budget_api/items", create:true, update:true, delete:true, actions:["approve","reject"] },
  cost_centers: { list:"cost_centers_api", detail:"cost_centers_api", create:true, update:true, delete:true, actions:[] },
  business_partners: { list:"business_partners_api", detail:"business_partners_api", create:true, update:true, delete:true, actions:[] },
  automation: { list:"automation_api", detail:"automation_api", create:true, update:true, delete:true, actions:[] },
  otpmanager: { list:"otpmanager", detail:"otpmanager", create:true, update:true, delete:true, actions:[] },
};

// Operation classifications for the inventory
const OP_TYPES = {
  list: "LIST",
  create: "CREATE",
  edit: "EDIT",
  delete: "DELETE",
  view: "DETAIL",
  action: "ACTION",
  export: "EXPORT",
  import: "IMPORT",
  tab: "TAB",
  bulk: "BULK",
  modal: "MODAL",
  validate: "VALIDATE",
  upload: "UPLOAD",
  download: "DOWNLOAD",
};

function classifyMethod(methodName) {
  const m = methodName.toLowerCase();
  if (m === "index" || m === "table" || m.startsWith("all_")) return OP_TYPES.list;
  if (m === "client" || m === "create" || m === "add") return OP_TYPES.create;
  if (m === "edit" || m === "update") return OP_TYPES.edit;
  if (m === "delete" || m.startsWith("delete_")) return OP_TYPES.delete;
  if (m === "view" || m === "detail" || m === "profile") return OP_TYPES.view;
  if (m === "export" || m.startsWith("zip_")) return OP_TYPES.export;
  if (m === "import") return OP_TYPES.import;
  if (m.startsWith("upload_") || m.includes("attachment")) return OP_TYPES.upload;
  if (m.startsWith("change_") || m.startsWith("mark_") || m.startsWith("update_")) return OP_TYPES.action;
  if (m.startsWith("get_") || m === "check_duplicate") return OP_TYPES.validate;
  if (m.includes("tab") || m === "contacts" || m === "consents") return OP_TYPES.tab;
  if (m === "bulk_action" || m.includes("bulk")) return OP_TYPES.bulk;
  if (m === "modal" || m.startsWith("form_")) return OP_TYPES.modal;
  return OP_TYPES.action;
}

// Custom controller operation → mobile endpoint mapping
const MOBILE_ACTION_MAP = {
  "Clients": {
    "client": { api: "POST customers", note: "Create/Edit customer" },
    "form_contact": { api: "POST contacts", note: "Create/Edit contact" },
    "delete_contact": { api: "DELETE contacts/{id}", note: "Delete contact" },
    "delete": { api: "DELETE customers/{id}", note: "Delete customer" },
    "mark_as_active": { api: "PUT customers/{id}/mark_active", note: "Activate customer" },
    "change_contact_status": { api: "PUT contacts/{id}/status", note: "Change contact status" },
    "change_client_status": { api: "PUT customers/{id}/status", note: "Change customer status" },
    "upload_attachment": { api: "POST files/upload_bytes", note: "Upload attachment", exists: "YES (files.ts)" },
    "add_external_attachment": { api: "POST files/external", note: "Add external attachment", exists: "GAP" },
    "delete_attachment": { api: "DELETE files/{id}", note: "Delete attachment", exists: "GAP" },
    "zip_invoices": { api: "GET customers/{id}/invoices/zip", note: "Download invoices zip", exists: "GAP" },
    "zip_estimates": { api: "GET customers/{id}/estimates/zip", note: "Download estimates zip", exists: "GAP" },
    "zip_credit_notes": { api: "GET customers/{id}/credit_notes/zip", note: "Download credit notes zip", exists: "GAP" },
    "zip_payments": { api: "GET customers/{id}/payments/zip", note: "Download payments zip", exists: "GAP" },
    "confirm_registration": { api: "POST customers/{id}/confirm", note: "Confirm registration", exists: "GAP" },
    "assign_admins": { api: "POST customers/{id}/admins", note: "Assign admin", exists: "GAP" },
    "delete_customer_admin": { api: "DELETE customers/{id}/admins/{staff_id}", note: "Remove admin", exists: "GAP" },
    "update_file_share_visibility": { api: "PUT files/{id}/visibility", note: "File share visibility", exists: "GAP" },
    "get_customer_billing_and_shipping_details": { api: "GET customers/{id}/address", note: "Billing/shipping", exists: "GAP" },
  },
  "Projects": {
    "project": { api: "POST projects", note: "Create/Edit project" },
    "delete": { api: "DELETE projects/{id}", note: "Delete project" },
    "mark_as": { api: "PUT projects/{id}/mark_{status}", note: "Status change", exists: "YES (module actions)" },
    "upload_file": { api: "POST files/upload_bytes", note: "Upload file", exists: "YES" },
    "delete_file": { api: "DELETE files/{id}", note: "Delete file", exists: "GAP" },
    "copy": { api: "POST projects/{id}/copy", note: "Copy project", exists: "GAP" },
    "export": { api: "GET projects/{id}/export", note: "Export project", exists: "GAP" },
    "change_status": { api: "PUT projects/{id}/status", note: "Change status", exists: "YES" },
    "change_mark": { api: "PUT projects/{id}/mark", note: "Mark project", exists: "YES" },
    "get_members": { api: "GET projects/{id}/members", note: "Get members", exists: "GAP" },
    "add_member": { api: "POST projects/{id}/members", note: "Add member", exists: "GAP" },
    "remove_member": { api: "DELETE projects/{id}/members/{staff_id}", note: "Remove member", exists: "GAP" },
  },
  "Tasks": {
    "task": { api: "POST tasks", note: "Create/Edit task" },
    "delete": { api: "DELETE tasks/{id}", note: "Delete task" },
    "change_status": { api: "PUT tasks/{id}/status", note: "Change status" },
    "timer_tracking": { api: "POST tasks/{id}/timer/{action}", note: "Timer control", exists: "YES (start/stop)" },
    "add_checklist_item": { api: "POST tasks/checklist", note: "Add checklist item", exists: "YES (checklist tab)" },
    "delete_checklist_item": { api: "DELETE tasks/checklist/{id}", note: "Del checklist item", exists: "YES" },
    "toggle_checklist": { api: "PUT tasks/checklist/item/{id}", note: "Toggle checklist", exists: "YES" },
    "add_comment": { api: "POST tasks/comments", note: "Add comment", exists: "YES (comments tab)" },
    "delete_comment": { api: "DELETE tasks/comments/{id}", note: "Delete comment", exists: "GAP" },
    "add_follower": { api: "POST tasks/followers", note: "Add follower", exists: "YES (followers tab)" },
    "remove_follower": { api: "DELETE tasks/followers/{id}", note: "Remove follower", exists: "GAP" },
    "add_assignee": { api: "POST tasks/assignments", note: "Assign staff", exists: "YES (assignments tab)" },
    "remove_assignee": { api: "DELETE tasks/assignments/{id}", note: "Remove assignee", exists: "GAP" },
    "copy": { api: "POST tasks/{id}/copy", note: "Copy task", exists: "GAP" },
    "upload_file": { api: "POST files/upload_bytes", note: "Upload file", exists: "YES" },
    "delete_file": { api: "DELETE files/{id}", note: "Delete file", exists: "GAP" },
    "add_task_attachment": { api: "POST files/upload_bytes", note: "Task attachment", exists: "YES" },
  }
};

// Build the inventory
const inventory = [];

function harvestController(filePath) {
  const name = path.basename(filePath, ".php");
  const content = fs.readFileSync(filePath, "utf8");
  const methods = [];
  const lines = content.split("\n");
  
  for (const line of lines) {
    const m = line.match(/public\s+function\s+(\w+)\s*\(/);
    if (m) {
      const methodName = m[1];
      // Skip constructor and internal callbacks
      if (methodName === "__construct" || methodName.startsWith("_")) continue;
      methods.push(methodName);
    }
  }
  
  if (methods.length === 0) return null;
  
  const moduleKey = MODULE_MAP[name] || name.toLowerCase().replace(/_/g, "_");
  const mobile = MOBILE_ENDPOINTS[moduleKey];
  
  for (const method of methods) {
    const type = classifyMethod(method);
    const mobileAction = MOBILE_ACTION_MAP[name]?.[method];
    const mobileExists = mobileAction?.exists || 
      (mobile && (
        (type === OP_TYPES.list && mobile.list) ||
        (type === OP_TYPES.create && mobile.create) ||
        (type === OP_TYPES.edit && mobile.update) ||
        (type === OP_TYPES.delete && mobile.delete) ||
        (type === OP_TYPES.action && mobile.actions?.some(a => method.toLowerCase().includes(a.toLowerCase())))
      ));
    
    inventory.push({
      controller: name,
      module: moduleKey,
      method,
      type,
      mobile_endpoint: mobileAction?.api || (mobile ? mobile.list || mobile.detail : "NONE"),
      mobile_exists: mobileExists ? "YES" : (mobileAction?.exists || "GAP"),
      note: mobileAction?.note || "",
      erp_path: `admin/${name}/${method}`,
    });
  }
  
  return methods.length;
}

// Harvest core controllers
console.log("Harvesting ERP controllers...");
const coreFiles = fs.readdirSync(CTRL_DIR).filter(f => f.endsWith(".php") && !f.startsWith("."));
let totalOps = 0;

for (const file of coreFiles) {
  const count = harvestController(path.join(CTRL_DIR, file));
  if (count) {
    console.log(`  ${file.replace(".php","")}: ${count} methods`);
    totalOps += count;
  }
}

// Harvest module controllers  
if (fs.existsSync(MOD_DIR)) {
  const modDirs = fs.readdirSync(MOD_DIR);
  for (const mod of modDirs) {
    const modCtrlPath = path.join(MOD_DIR, mod, "controllers");
    if (!fs.existsSync(modCtrlPath)) continue;
    const files = fs.readdirSync(modCtrlPath).filter(f => f.endsWith(".php"));
    for (const file of files) {
      const count = harvestController(path.join(modCtrlPath, file));
      if (count) {
        console.log(`  [MOD] ${mod}/${file.replace(".php","")}: ${count} methods`);
        totalOps += count;
      }
    }
  }
}

console.log(`\nTOTAL ERP OPERATIONS HARVESTED: ${totalOps}`);

// Cross-reference stats
const gaps = inventory.filter(i => i.mobile_exists === "GAP");
const covered = inventory.filter(i => i.mobile_exists === "YES");
const partial = inventory.filter(i => i.mobile_exists && i.mobile_exists !== "YES" && i.mobile_exists !== "GAP");

console.log(`\nGAP ANALYSIS:`);
console.log(`  Covered by mobile: ${covered.length} (${(covered.length/totalOps*100).toFixed(0)}%)`);
console.log(`  GAPS (need API):   ${gaps.length} (${(gaps.length/totalOps*100).toFixed(0)}%)`);
console.log(`  Partial/Unknown:   ${partial.length}`);

// Group gaps by module
console.log(`\nTOP GAPS BY MODULE:`);
const gapByModule = {};
for (const g of gaps) {
  if (!gapByModule[g.module]) gapByModule[g.module] = [];
  gapByModule[g.module].push(g);
}
const sorted = Object.entries(gapByModule).sort((a,b) => b[1].length - a[1].length);
for (const [mod, ops] of sorted.slice(0, 20)) {
  console.log(`  ${mod}: ${ops.length} gaps — ${ops.slice(0,3).map(o=>o.method).join(", ")}...`);
}

// Export CSV
const csvRows = [["Controller","Module","Method","Type","MobileEndpoint","MobileStatus","Note","ERP_Path"].join(",")];
for (const item of inventory) {
  csvRows.push([
    item.controller, item.module, item.method, item.type, 
    item.mobile_endpoint, item.mobile_exists, 
    `"${item.note.replace(/"/g,'""')}"`, item.erp_path
  ].join(","));
}
fs.writeFileSync("erp-operations-inventory.csv", csvRows.join("\n"));
console.log(`\n📊 Exported: erp-operations-inventory.csv (${inventory.length} operations)`);
