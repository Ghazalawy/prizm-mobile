/**
 * Prizm Mobile QA/QC — Automated CRUD Test Runner
 * Tests every module from module-registry.ts against the local API.
 * Exports results to qa-results.csv.
 */
const API = "http://localhost/prizm331/api";
const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoib3NhbWEuaGFzc2FuQHByaXptLWVuZXJneS5jb20iLCJuYW1lIjoiT3NhbWEgaGFzc2FuIiwiQVBJX1RJTUUiOjE3Nzk4NTA3NTl9.o9TuTSeH1XhfkeD-xFwo0oErSCJ0OFeCJHAkiZjIGMg";

// Module definitions extracted from module-registry.ts
const MODULES = [
  { key:"customers", group:"CRM", endpoint:"customers", idKey:"userid", titleFields:["company"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/customers" },
  { key:"contacts", group:"CRM", endpoint:"contacts", detailEndpoint:"contacts/detail", idKey:"id", titleFields:["firstname","lastname"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"leads", group:"CRM", endpoint:"leads", idKey:"id", titleFields:["name","company"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/leads" },
  { key:"contracts", group:"CRM", endpoint:"contracts", idKey:"id", titleFields:["subject"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/contracts" },
  { key:"business_partners", group:"CRM", endpoint:"business_partners_api", idKey:"id", titleFields:["company"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"invoices", group:"Sales", endpoint:"invoices", idKey:"id", titleFields:["invoice_number","number"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/invoices" },
  { key:"estimates", group:"Sales", endpoint:"estimates", idKey:"id", titleFields:["estimate_number","number"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/estimates" },
  { key:"proposals", group:"Sales", endpoint:"proposals", idKey:"id", titleFields:["subject"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/proposals" },
  { key:"payments", group:"Sales", endpoint:"payments", idKey:"id", titleFields:["amount"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"items", group:"Sales", endpoint:"items", idKey:"itemid", titleFields:["description"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"credit_notes", group:"Sales", endpoint:"credit_notes", idKey:"id", titleFields:["credit_note_number","number"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"projects", group:"Work", endpoint:"projects", idKey:"id", titleFields:["name"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/projects" },
  { key:"tasks", group:"Work", endpoint:"tasks", idKey:"id", titleFields:["name"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/tasks" },
  { key:"milestones", group:"Work", endpoint:"milestones", idKey:"id", titleFields:["name"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"calendar", group:"Work", endpoint:"calendar", idKey:"eventid", titleFields:["title"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/calendar" },
  { key:"goals", group:"Work", endpoint:"goals_api", idKey:"id", titleFields:["subject"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"timesheets", group:"Work", endpoint:"timesheets_api", idKey:"id", titleFields:["task_id"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/timesheets" },
  { key:"expenses", group:"Finance", endpoint:"expenses", idKey:"id", titleFields:["expense_name"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/expenses-mine" },
  { key:"budget_items", group:"Finance", endpoint:"budget_api/items", idKey:"id", titleFields:["description"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"cost_centers", group:"Finance", endpoint:"cost_centers_api", idKey:"id", titleFields:["name"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"tickets", group:"Support", endpoint:"tickets", idKey:"ticketid", titleFields:["subject"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/tickets" },
  { key:"knowledge", group:"Support", endpoint:"knowledge_api", idKey:"articleid", titleFields:["subject"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/knowledge" },
  { key:"surveys", group:"Support", endpoint:"surveys_api", idKey:"surveyid", titleFields:["subject"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"purchase_vendors", group:"Purchase", endpoint:"purchase_api/vendors", idKey:"id", titleFields:["company"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"purchase_requests", group:"Purchase", endpoint:"purchase_api/requests", idKey:"id", titleFields:["display_number","request_title"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"purchase_orders", group:"Purchase", endpoint:"purchase_api/orders", idKey:"id", titleFields:["display_number","order_number"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"purchase_payment_requests", group:"Purchase", endpoint:"purchase_api/payment_requests", idKey:"id", titleFields:["display_number"], canCreate:false, canUpdate:false, canDelete:false },
  { key:"purchase_expense_requests", group:"Purchase", endpoint:"purchase_api/expense_requests", idKey:"id", titleFields:["display_number"], canCreate:false, canUpdate:false, canDelete:false },
  { key:"purchase_received_vouchers", group:"Purchase", endpoint:"purchase_api/received_vouchers", idKey:"id", titleFields:["display_number"], canCreate:false, canUpdate:false, canDelete:false },
  { key:"purchase_delivery_notes", group:"Purchase", endpoint:"purchase_api/delivery_notes", idKey:"id", titleFields:["display_number"], canCreate:false, canUpdate:false, canDelete:false },
  { key:"purchase_quotations", group:"Purchase", endpoint:"purchase_api/quotations", idKey:"id", titleFields:["display_number"], canCreate:false, canUpdate:false, canDelete:false },
  { key:"purchase_completion_certificates", group:"Purchase", endpoint:"purchase_api/completion_certificates", idKey:"id", titleFields:["certificate_number"], canCreate:false, canUpdate:false, canDelete:false },
  { key:"technical_inquiries", group:"PRIZM", endpoint:"technical_inquiries", idKey:"id", titleFields:["name","subject"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"tenders", group:"PRIZM", endpoint:"tenders_api", idKey:"id", titleFields:["title","tender_number"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/tenders" },
  { key:"opportunities", group:"PRIZM", endpoint:"opportunities_api", idKey:"id", titleFields:["name","subject"], canCreate:true, canUpdate:true, canDelete:true, route:"/(tabs)/opportunities" },
  { key:"recruitment_candidates", group:"HR", endpoint:"recruitment_api/candidates", idKey:"id", titleFields:["candidate_name"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"recruitment_positions", group:"HR", endpoint:"recruitment_api/positions", idKey:"id", titleFields:["position_name"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"hr_payslips", group:"HR", endpoint:"hr_payroll_api/payslips", idKey:"id", titleFields:["staff_id","month"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"gatepass", group:"Operations", endpoint:"gatepass_api", idKey:"id", titleFields:["subject"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"fixed_equipment", group:"Operations", endpoint:"fixed_equipment_api", idKey:"id", titleFields:["asset_name"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"materials", group:"Inventory", endpoint:"materials_catalog/materials", idKey:"id", titleFields:["name"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"staff", group:"Admin", endpoint:"staffs", idKey:"staffid", titleFields:["firstname","lastname"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"automation", group:"Admin", endpoint:"automation_api", idKey:"id", titleFields:["name"], canCreate:true, canUpdate:true, canDelete:true },
  { key:"otpmanager", group:"Admin", endpoint:"otpmanager", idKey:"id", titleFields:["identifier"], canCreate:true, canUpdate:true, canDelete:true },
];

const results = [];

async function fetchAPI(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", "authtoken": TOKEN },
  };
  if (body) opts.body = JSON.stringify(body);
  const start = Date.now();
  const res = await fetch(`${API}/${path}`, opts);
  const ms = Date.now() - start;
  const text = await res.text();
  let json = text;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, body: json, ms };
}

async function testModule(mod) {
  const r = {
    key: mod.key,
    group: mod.group,
    title: mod.titleFields?.[0] || mod.key,
    screen: mod.route ? "YES" : "ERP_HUB",
    canCreate: mod.canCreate !== false ? "YES" : "NO",
    canEdit: mod.canUpdate !== false ? "YES" : "NO",
    canDelete: mod.canDelete !== false ? "YES" : "NO",
    listGET: "-",
    listStatus: "-",
    detailGET: "-",
    detailStatus: "-",
    createPOST: "-",
    createStatus: "-",
    updatePUT: "-",
    updateStatus: "-",
    deleteDEL: "-",
    deleteStatus: "-",
    notes: "",
  };

  // 1. LIST
  const list = await fetchAPI(mod.endpoint);
  r.listGET = list.ms + "ms";
  r.listStatus = list.status;
  const items = Array.isArray(list.body) ? list.body : (list.body?.data || list.body?.items || []);
  const firstId = items.length > 0 ? (items[0][mod.idKey] || items[0].id) : null;

  if (!firstId) {
    r.notes = "No existing records found — create/detail/update/delete skipped";
    return r;
  }

  // 2. DETAIL
  const detailPath = mod.detailEndpoint 
    ? `${mod.detailEndpoint}/${firstId}` 
    : `${mod.endpoint}/${firstId}`;
  const detail = await fetchAPI(detailPath);
  r.detailGET = detail.ms + "ms";
  r.detailStatus = detail.status;

  // 3. CREATE
  if (mod.canCreate !== false) {
    const payload = {};
    if (mod.key === "tasks") payload.name = "QA Test Task " + Date.now();
    else if (mod.key === "projects") { payload.name = "QA Test Project " + Date.now(); payload.clientid = items[0]?.clientid || 1; }
    else if (mod.key === "customers") payload.company = "QA Test Company " + Date.now();
    else if (mod.key === "leads") { payload.name = "QA Test Lead " + Date.now(); payload.source = 1; payload.status = 1; }
    else if (mod.key === "contacts") { payload.customer_id = 1; payload.firstname = "QA"; payload.lastname = "Test"; payload.email = "qatest@test.com"; payload.password = "123456"; }
    else if (mod.key === "invoices") { payload.clientid = 1; payload.number = "QA-" + Date.now(); payload.date = "2026-05-27"; payload.currency = 1; payload.subtotal = 100; payload.total = 100; payload.newitems = JSON.stringify([{description:"Test",qty:1,rate:100}]); }
    else if (mod.key === "estimates") { payload.clientid = 1; payload.number = "QA-" + Date.now(); payload.date = "2026-05-27"; payload.currency = 1; payload.subtotal = 100; payload.total = 100; payload.newitems = JSON.stringify([{description:"Test",qty:1,rate:100}]); }
    else if (mod.key === "proposals") { payload.subject = "QA Test " + Date.now(); payload.rel_type = "customer"; payload.rel_id = 1; payload.proposal_to = "Test"; payload.email = "test@test.com"; payload.date = "2026-05-27"; payload.currency = 1; payload.subtotal = 100; payload.total = 100; }
    else if (mod.key === "expenses") { payload.category = 1; payload.amount = 100; payload.date = "2026-05-27"; payload.expense_name = "QA Test " + Date.now(); }
    else if (mod.key === "contracts") { payload.subject = "QA Test " + Date.now(); payload.client = 1; payload.datestart = "2026-05-27"; }
    else if (mod.key === "tickets") { payload.subject = "QA Test " + Date.now(); payload.department = 1; payload.message = "Test ticket"; }
    else if (mod.key === "milestones") { payload.name = "QA Test " + Date.now(); payload.project_id = 1; }
    else if (mod.key === "calendar") { payload.title = "QA Test " + Date.now(); payload.start = "2026-05-27 10:00:00"; }
    else if (mod.key === "payments") { payload.invoiceid = firstId; payload.amount = 10; payload.date = "2026-05-27"; payload.paymentmode = 1; }
    else if (mod.key === "items") { payload.description = "QA Test " + Date.now(); payload.rate = 100; }
    else if (mod.key === "credit_notes") { payload.clientid = 1; payload.number = "QA-" + Date.now(); payload.date = "2026-05-27"; payload.currency = 1; payload.subtotal = 100; payload.total = 100; payload.newitems = JSON.stringify([{description:"Test",qty:1,rate:100}]); }
    else if (mod.key === "staff") { payload.firstname = "QA"; payload.lastname = "Test" + Date.now(); payload.email = "qatest" + Date.now() + "@test.com"; }
    else payload.name = "QA Test " + Date.now();

    const create = await fetchAPI(mod.endpoint, "POST", payload);
    r.createPOST = create.ms + "ms";
    r.createStatus = create.status;
    const createdId = create.body?.id || create.body?.data?.id || create.body?.[mod.idKey];
    r.notes = "Created #" + (createdId || "?");

    // 4. UPDATE (same record)
    if (createdId && mod.canUpdate !== false) {
      const updPath = mod.detailEndpoint 
        ? `${mod.detailEndpoint}/${createdId}` 
        : `${mod.endpoint}/${createdId}`;
      const updatePayload = {};
      if (mod.key === "tasks") updatePayload.name = "QA Updated " + Date.now();
      else if (mod.key === "projects") updatePayload.name = "QA Updated " + Date.now();
      else if (mod.key === "customers") updatePayload.company = "QA Updated " + Date.now();
      else if (mod.key === "leads") updatePayload.name = "QA Updated " + Date.now();
      else if (mod.key === "contracts") updatePayload.subject = "QA Updated " + Date.now();
      else updatePayload.name = "QA Updated " + Date.now();

      const upd = await fetchAPI(updPath, "PUT", updatePayload);
      r.updatePUT = upd.ms + "ms";
      r.updateStatus = upd.status;
    } else {
      r.updatePUT = "SKIP";
      r.updateStatus = "-";
    }

    // 5. DELETE
    if (createdId && mod.canDelete !== false) {
      const delPath = mod.deleteEndpoint 
        ? `${mod.deleteEndpoint}/${createdId}` 
        : `${mod.endpoint}/${createdId}`;
      const del = await fetchAPI(delPath, "DELETE");
      r.deleteDEL = del.ms + "ms";
      r.deleteStatus = del.status;
      r.notes += " | Deleted";
    } else {
      r.deleteDEL = "SKIP";
      r.deleteStatus = "-";
    }
  }

  return r;
}

async function main() {
  console.log("Prizm Mobile QA/QC — CRUD Audit v1.8.2");
  console.log("=".repeat(80));
  console.log("Testing " + MODULES.length + " modules against " + API);
  console.log("");

  for (let i = 0; i < MODULES.length; i++) {
    const mod = MODULES[i];
    const label = `[${i+1}/${MODULES.length}] ${mod.group}/${mod.key}`;
    process.stdout.write(label.padEnd(50) + " ... ");
    try {
      const r = await testModule(mod);
      results.push(r);
      const ok = r.listStatus < 400 ? "OK" : "FAIL";
      console.log(ok + " (List:" + r.listStatus + " Detail:" + r.detailStatus + " Create:" + r.createStatus + ")");
    } catch (e) {
      results.push({ key: mod.key, group: mod.group, title: mod.titleFields?.[0] || mod.key, screen: mod.route ? "YES" : "ERP_HUB", canCreate: mod.canCreate !== false ? "YES" : "NO", canEdit: mod.canUpdate !== false ? "YES" : "NO", canDelete: mod.canDelete !== false ? "YES" : "NO", listGET: "ERR", listStatus: "ERR", detailGET: "-", detailStatus: "-", createPOST: "-", createStatus: "-", updatePUT: "-", updateStatus: "-", deleteDEL: "-", deleteStatus: "-", notes: "Exception: " + e.message });
      console.log("ERR: " + e.message);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  const passed = results.filter(r => r.listStatus < 400).length;
  const failed = results.filter(r => r.listStatus >= 400 || r.listStatus === "ERR").length;
  console.log(`TOTAL: ${MODULES.length} | PASS: ${passed} | FAIL: ${failed}`);
  console.log("");

  // Export CSV
  const headers = ["Module","Group","Screen","AddBtn","EditBtn","DelBtn","ListGET(ms)","ListStatus","DetailGET(ms)","DetailStatus","CreatePOST(ms)","CreateStatus","UpdatePUT(ms)","UpdateStatus","DeleteDEL(ms)","DeleteStatus","Notes"];
  const csvRows = [headers.join(",")];
  for (const r of results) {
    csvRows.push([
      r.key, r.group, r.screen, r.canCreate, r.canEdit, r.canDelete,
      r.listGET, r.listStatus, r.detailGET, r.detailStatus,
      r.createPOST, r.createStatus, r.updatePUT, r.updateStatus,
      r.deleteDEL, r.deleteStatus,
      '"' + (r.notes || "").replace(/"/g,'""') + '"'
    ].join(","));
  }
  const csv = csvRows.join("\n");
  require("fs").writeFileSync("qa-results.csv", csv);
  console.log("Results exported to qa-results.csv");
}

main().catch(e => { console.error(e); process.exit(1); });
