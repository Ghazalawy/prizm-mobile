/**
 * Prizm Mobile — FULL CRUD AUDIT
 * Tests EVERY operation on EVERY module: List, Detail, Create, Update, Delete + Actions
 * Proper payloads derived from module-registry.ts required fields.
 */
const API = "http://localhost/prizm331/api";
const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoib3NhbWEuaGFzc2FuQHByaXptLWVuZXJneS5jb20iLCJuYW1lIjoiT3NhbWEgaGFzc2FuIiwiQVBJX1RJTUUiOjE3Nzk4NTA3NTl9.o9TuTSeH1XhfkeD-xFwo0oErSCJ0OFeCJHAkiZjIGMg";
const fs = require("fs");

const TS = Date.now();
const R = (n) => Math.floor(Math.random() * 99999);

async function call(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json", authtoken: TOKEN } };
  if (body) opts.body = JSON.stringify(body);
  const t0 = Date.now();
  let res, text, json;
  try {
    res = await fetch(`${API}/${path}`, opts);
    text = await res.text();
    try { json = JSON.parse(text); } catch { json = text; }
  } catch (e) {
    return { method, path, status: "NETERR", ms: 0, body: e.message, ok: false };
  }
  return { method, path, status: res.status, ms: Date.now() - t0, body: json, ok: res.status >= 200 && res.status < 300 };
}

// Define every module with: name, group, endpoint, listFn, createPayload, updatePayload, idExtractor, skipReasons, actions, skipCreate, skipUpdate, skipDelete, createReadOnly
const SUITE = [];

function mod(name, group, endpoint, createPayload, updatePayload, opts = {}) {
  SUITE.push({ name, group, endpoint, createPayload, updatePayload, ...opts });
}

// ── CRM ──
mod("customers", "CRM", "customers",
  { company: `QA-Test-${R()}` },
  { company: `QA-Updated-${R()}` },
  { idKey: "userid", notes: "List+Detail+Create+Update+Delete" }
);
mod("contacts", "CRM", "contacts",
  { customer_id: 1, firstname: "QA", lastname: `Test${R()}`, email: `qa${R()}@test.com`, password: "123456" },
  { firstname: "QAUpdated" },
  { idKey: "id", detailEndpoint: "contacts/detail", notes: "List+Detail+Create+Update+Delete" }
);
mod("leads", "CRM", "leads",
  { name: `QA Lead ${R()}`, source: 1, status: 1 },
  { name: `QA Lead Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "ChangeStatus", method: "PUT", path: "leads/{id}/status", body: { status: 1 } }
  ]}
);
mod("contracts", "CRM", "contracts",
  { subject: `QA Contract ${R()}`, client: 1, datestart: "2026-05-27" },
  { subject: `QA Contract Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Sign", method: "POST", path: "contracts/{id}/sign" }
  ]}
);
mod("business_partners", "CRM", "business_partners_api",
  { company: `QA Partner ${R()}` },
  { company: `QA Partner Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);

// ── Sales ──
mod("invoices", "Sales", "invoices",
  { clientid: 1, number: `QA-INV-${R()}`, date: "2026-05-27", currency: 1, subtotal: 100, total: 100, newitems: JSON.stringify([{ description: "Test Item", qty: 1, rate: 100 }]) },
  { adminnote: `Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Send", method: "POST", path: "invoices/{id}/send" },
    { name: "MarkCancelled", method: "PUT", path: "invoices/{id}/mark_cancelled" }
  ]}
);
mod("estimates", "Sales", "estimates",
  { clientid: 1, number: `QA-EST-${R()}`, date: "2026-05-27", currency: 1, subtotal: 100, total: 100, newitems: JSON.stringify([{ description: "Test", qty: 1, rate: 100 }]) },
  { adminnote: `Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Send", method: "POST", path: "estimates/{id}/send" },
    { name: "MarkSent", method: "PUT", path: "estimates/{id}/mark_sent" }
  ]}
);
mod("proposals", "Sales", "proposals",
  { subject: `QA Proposal ${R()}`, rel_type: "customer", rel_id: 1, proposal_to: "Test", email: "test@test.com", date: "2026-05-27", currency: 1, subtotal: 100, total: 100 },
  { subject: `QA Proposal Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Send", method: "POST", path: "proposals/{id}/send", body: { cc: "", attachpdf: true } },
    { name: "MarkSent", method: "PUT", path: "proposals/{id}/mark_sent" }
  ]}
);
mod("payments", "Sales", "payments",
  { invoiceid: 1, amount: 10, date: "2026-05-27", paymentmode: "cash" },
  { amount: 20 },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);
mod("items", "Sales", "items",
  { description: `QA Item ${R()}`, rate: 100 },
  { description: `QA Item Updated ${R()}`, rate: 200 },
  { idKey: "itemid", notes: "List+Detail+Create+Update+Delete" }
);
mod("credit_notes", "Sales", "credit_notes",
  { clientid: 1, number: `QA-CN-${R()}`, date: "2026-05-27", currency: 1, subtotal: 50, total: 50, newitems: JSON.stringify([{ description: "Credit", qty: 1, rate: 50 }]) },
  { adminnote: `Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);

// ── Work ──
mod("projects", "Work", "projects",
  { name: `QA Project ${R()}`, clientid: 1, billing_type: 3, status: 2, start_date: "2026-05-27" },
  { name: `QA Project Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "MarkInProgress", method: "PUT", path: "projects/{id}/mark_in_progress" },
    { name: "MarkFinished", method: "PUT", path: "projects/{id}/mark_finished" }
  ]}
);
mod("tasks", "Work", "tasks",
  { name: `QA Task ${R()}`, startdate: "2026-05-27", priority: 2 },
  { name: `QA Task Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete. KNOWN 401 on list.", actions: [
    { name: "StartTimer", method: "POST", path: "tasks/{id}/timer/start", body: {} },
    { name: "MarkComplete", method: "PUT", path: "tasks/{id}/mark_complete" },
    { name: "Reopen", method: "PUT", path: "tasks/{id}/reopen" }
  ]}
);
mod("milestones", "Work", "milestones",
  { name: `QA Milestone ${R()}`, project_id: 1 },
  { name: `QA Milestone Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);
mod("calendar", "Work", "calendar",
  { title: `QA Event ${R()}`, start: "2026-05-27 10:00:00" },
  { title: `QA Event Updated ${R()}` },
  { idKey: "eventid", notes: "List+Detail+Create+Update+Delete" }
);
mod("goals", "Work", "goals_api",
  { subject: `QA Goal ${R()}` },
  { subject: `QA Goal Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "MarkComplete", method: "PUT", path: "goals_api/{id}/mark_complete" }
  ]}
);
mod("timesheets", "Work", "timesheets_api",
  { task_id: 1, staff_id: 1, start_time: "2026-05-27 08:00:00", end_time: "2026-05-27 12:00:00" },
  { note: `Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);

// ── Finance ──
mod("expenses", "Finance", "expenses",
  { category: 1, amount: 100, date: "2026-05-27", expense_name: `QA Expense ${R()}` },
  { expense_name: `QA Expense Updated ${R()}`, amount: 200 },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "MarkBillable", method: "PUT", path: "expenses/{id}/mark_billable" },
    { name: "Copy", method: "POST", path: "expenses/{id}/copy" }
  ]}
);
mod("budget_items", "Finance", "budget_api/items",
  { description: `QA Budget ${R()}` },
  { description: `QA Budget Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Approve", method: "POST", path: "budget_api/items/{id}", body: { ai_classified: 1 } }
  ]}
);
mod("cost_centers", "Finance", "cost_centers_api",
  { name: `QA CostCenter ${R()}` },
  { name: `QA CostCenter Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);

// ── Support ──
mod("tickets", "Support", "tickets",
  { subject: `QA Ticket ${R()}`, department: 1, message: "Test ticket body" },
  { subject: `QA Ticket Updated ${R()}` },
  { idKey: "ticketid", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Reply", method: "POST", path: "tickets/{id}/reply", body: { content: "QA reply" } },
    { name: "ChangeStatus", method: "PUT", path: "tickets/{id}/status", body: { status: 2 } },
    { name: "Assign", method: "PUT", path: "tickets/{id}/assign", body: { assigned: 1 } }
  ]}
);
mod("knowledge", "Support", "knowledge_api",
  { subject: `QA Article ${R()}` },
  { subject: `QA Article Updated ${R()}` },
  { idKey: "articleid", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Publish", method: "PUT", path: "knowledge_api/{id}/publish" },
    { name: "Unpublish", method: "PUT", path: "knowledge_api/{id}/unpublish" }
  ]}
);
mod("surveys", "Support", "surveys_api",
  { subject: `QA Survey ${R()}` },
  { subject: `QA Survey Updated ${R()}` },
  { idKey: "surveyid", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Publish", method: "PUT", path: "surveys_api/{id}/publish" }
  ]}
);

// ── Purchase ──
mod("purchase_vendors", "Purchase", "purchase_api/vendors",
  { company: `QA Vendor ${R()}` },
  { company: `QA Vendor Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);
mod("purchase_requests", "Purchase", "purchase_api/requests",
  { title: `QA PR ${R()}` },
  { title: `QA PR Updated ${R()}` },
  { idKey: "id", notes: "KNOWN 401 on list. Create+Update+Delete if list works.", actions: [
    { name: "Publish", method: "POST", path: "purchase_api/requests/{id}/publish" }
  ]}
);
mod("purchase_orders", "Purchase", "purchase_api/orders",
  { title: `QA PO ${R()}` },
  { title: `QA PO Updated ${R()}` },
  { idKey: "id", notes: "KNOWN 401 on list.", actions: [
    { name: "Approve", method: "POST", path: "purchase_api/orders/{id}/approve" },
    { name: "SendToSupplier", method: "POST", path: "purchase_api/orders/{id}/send_to_supplier" }
  ]}
);
mod("purchase_payment_requests", "Purchase", "purchase_api/payment_requests",
  null, null,
  { skipCreate: true, skipUpdate: true, skipDelete: true, idKey: "id", notes: "Read-only. KNOWN 401." }
);
mod("purchase_expense_requests", "Purchase", "purchase_api/expense_requests",
  null, null,
  { skipCreate: true, skipUpdate: true, skipDelete: true, idKey: "id", notes: "Read-only. KNOWN 401." }
);
mod("purchase_received_vouchers", "Purchase", "purchase_api/received_vouchers",
  null, null,
  { skipCreate: true, skipUpdate: true, skipDelete: true, idKey: "id", notes: "Read-only.", actions: [
    { name: "Approve", method: "POST", path: "purchase_api/received_vouchers/{id}/approve" },
    { name: "Reject", method: "POST", path: "purchase_api/received_vouchers/{id}/reject" }
  ]}
);
mod("purchase_delivery_notes", "Purchase", "purchase_api/delivery_notes",
  null, null,
  { skipCreate: true, skipUpdate: true, skipDelete: true, idKey: "id", notes: "Read-only.", actions: [
    { name: "Approve", method: "POST", path: "purchase_api/delivery_notes/{id}/approve" }
  ]}
);
mod("purchase_quotations", "Purchase", "purchase_api/quotations",
  null, null,
  { skipCreate: true, skipUpdate: true, skipDelete: true, idKey: "id", notes: "Read-only.", actions: [
    { name: "Approve", method: "POST", path: "purchase_api/quotations/{id}/approve" }
  ]}
);
mod("purchase_completion_certificates", "Purchase", "purchase_api/completion_certificates",
  null, null,
  { skipCreate: true, skipUpdate: true, skipDelete: true, idKey: "id", notes: "Read-only.", actions: [
    { name: "Approve", method: "POST", path: "purchase_api/completion_certificates/{id}/approve" }
  ]}
);

// ── PRIZM ──
mod("technical_inquiries", "PRIZM", "technical_inquiries",
  { name: `QA Inquiry ${R()}` },
  { name: `QA Inquiry Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);
mod("tenders", "PRIZM", "tenders_api",
  { title: `QA Tender ${R()}` },
  { title: `QA Tender Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "MarkWon", method: "POST", path: "tenders_api/{id}/mark_won" },
    { name: "ChangeStatus", method: "PUT", path: "tenders_api/{id}/status", body: { tender_status: "Submitted" } }
  ]}
);
mod("opportunities", "PRIZM", "opportunities_api",
  { name: `QA Opp ${R()}` },
  { name: `QA Opp Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Submit", method: "POST", path: "opportunities_api/submit/{id}" },
    { name: "ChangeStage", method: "PUT", path: "opportunities_api/{id}/stage", body: { stage_id: 1 } }
  ]}
);

// ── HR ──
mod("recruitment_candidates", "HR", "recruitment_api/candidates",
  { candidate_name: `QA Candidate ${R()}` },
  { candidate_name: `QA Candidate Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Hire", method: "PUT", path: "recruitment_api/candidates/{id}/hire" }
  ]}
);
mod("recruitment_positions", "HR", "recruitment_api/positions",
  { position_name: `QA Position ${R()}` },
  { position_name: `QA Position Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);
mod("hr_payslips", "HR", "hr_payroll_api/payslips",
  { staff_id: 1, month: "05", year: 2026 },
  { net_pay: 5000 },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "MarkPaid", method: "PUT", path: "hr_payroll_api/payslips/{id}/mark_paid" }
  ]}
);

// ── Operations ──
mod("gatepass", "Operations", "gatepass_api",
  { subject: `QA Gatepass ${R()}` },
  { subject: `QA Gatepass Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Approve", method: "PUT", path: "gatepass_api/{id}/approve" }
  ]}
);
mod("fixed_equipment", "Operations", "fixed_equipment_api",
  { asset_name: `QA Asset ${R()}` },
  { asset_name: `QA Asset Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete", actions: [
    { name: "Allocate", method: "PUT", path: "fixed_equipment_api/{id}/allocate", body: { staff_id: 1 } },
    { name: "Return", method: "PUT", path: "fixed_equipment_api/{id}/return" }
  ]}
);

// ── Inventory ──
mod("materials", "Inventory", "materials_catalog/materials",
  { name: `QA Material ${R()}` },
  { name: `QA Material Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);

// ── Admin ──
mod("staff", "Admin", "staffs",
  { firstname: "QA", lastname: `Test${R()}`, email: `qastaff${R()}@test.com` },
  { firstname: "QAUpdated" },
  { idKey: "staffid", notes: "List+Detail+Create+Update+Delete" }
);
mod("automation", "Admin", "automation_api",
  { name: `QA Automation ${R()}` },
  { name: `QA Automation Updated ${R()}` },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete — only module with full CRUD passing" }
);
mod("otpmanager", "Admin", "otpmanager",
  { identifier: `qa${R()}@test.com` },
  { status: "verified" },
  { idKey: "id", notes: "List+Detail+Create+Update+Delete" }
);

// ═══════════════════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════

const results = [];

async function testModule(m) {
  const row = {
    module: m.name, group: m.group,
    list_status: "", list_ms: "",
    detail_status: "", detail_ms: "",
    create_status: "", create_ms: "",
    update_status: "", update_ms: "",
    delete_status: "", delete_ms: "",
    actions: [],
    notes: m.notes || ""
  };

  // 1. LIST
  const list = await call("GET", m.endpoint);
  row.list_status = list.status; row.list_ms = list.ms;
  const items = Array.isArray(list.body) ? list.body : (list.body?.data || list.body || []);
  const firstId = items.length > 0 ? (items[0]?.[m.idKey] || items[0]?.id) : null;

  // 2. DETAIL (if we have an ID)
  if (firstId) {
    const dp = m.detailEndpoint ? `${m.detailEndpoint}/${firstId}` : `${m.endpoint}/${firstId}`;
    const detail = await call("GET", dp);
    row.detail_status = detail.status; row.detail_ms = detail.ms;
  }

  // 3. CREATE
  let createdId = null;
  if (!m.skipCreate && m.createPayload) {
    const create = await call("POST", m.endpoint, m.createPayload);
    row.create_status = create.status; row.create_ms = create.ms;
    createdId = create.body?.id || create.body?.data?.id || create.body?.[m.idKey];
    if (createdId) row.notes += ` | Created#${createdId}`;
  }

  // 4. UPDATE
  if (createdId && !m.skipUpdate && m.updatePayload) {
    const up = m.detailEndpoint ? `${m.detailEndpoint}/${createdId}` : `${m.endpoint}/${createdId}`;
    const upd = await call("PUT", up, m.updatePayload);
    row.update_status = upd.status; row.update_ms = upd.ms;
  }

  // 5. DELETE
  if (createdId && !m.skipDelete) {
    const dp = m.deleteEndpoint ? `${m.deleteEndpoint}/${createdId}` : `${m.endpoint}/${createdId}`;
    const del = await call("DELETE", dp);
    row.delete_status = del.status; row.delete_ms = del.ms;
    if (del.ok) row.notes += " | Deleted";
  }

  // 6. ACTIONS (on first existing item, not the one we created)
  if (m.actions && firstId) {
    for (const act of m.actions) {
      const ap = act.path.replace("{id}", firstId);
      const ar = await call(act.method, ap, act.body || {});
      row.actions.push({ name: act.name, status: ar.status, ms: ar.ms });
      if (!ar.ok) row.notes += ` | ${act.name}:${ar.status}`;
    }
  }

  return row;
}

function statusEmoji(s) {
  if (s === "" || s === undefined) return "⏭️";
  if (s >= 200 && s < 300) return "✅";
  if (s >= 400 && s < 500) return "🔴";
  if (s >= 500) return "💥";
  return "❓";
}

async function main() {
  console.log("=".repeat(100));
  console.log("PRIZM MOBILE — FULL CRUD AUDIT  (List + Detail + Create + Update + Delete + Actions)");
  console.log(`API: ${API}  |  Modules: ${SUITE.length}`);
  console.log("=".repeat(100));

  let totalOps = 0, passOps = 0;

  for (let i = 0; i < SUITE.length; i++) {
    const m = SUITE[i];
    const label = `[${String(i+1).padStart(2)}/${SUITE.length}] ${m.group}/${m.name}`;
    process.stdout.write(label.padEnd(48));

    const row = await testModule(m);
    results.push(row);

    const ops = [];
    if (row.list_status) { ops.push(`L:${row.list_status}`); totalOps++; if (row.list_status >= 200 && row.list_status < 300) passOps++; }
    if (row.detail_status) { ops.push(`D:${row.detail_status}`); totalOps++; if (row.detail_status >= 200 && row.detail_status < 300) passOps++; }
    if (row.create_status) { ops.push(`C:${row.create_status}`); totalOps++; if (row.create_status >= 200 && row.create_status < 300) passOps++; }
    if (row.update_status) { ops.push(`U:${row.update_status}`); totalOps++; if (row.update_status >= 200 && row.update_status < 300) passOps++; }
    if (row.delete_status) { ops.push(`X:${row.delete_status}`); totalOps++; if (row.delete_status >= 200 && row.delete_status < 300) passOps++; }
    for (const a of row.actions) { ops.push(`${a.name}:${a.status}`); totalOps++; if (a.status >= 200 && a.status < 300) passOps++; }
    console.log(ops.join(" "));
  }

  // ══════════════════════════════════════════════════════════════
  // DETAILED REPORT TABLE
  // ══════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(150));
  console.log("FULL CRUD AUDIT RESULTS — Every Operation, Every Module");
  console.log("=".repeat(150));
  console.log(
    "MODULE".padEnd(28) +
    "LIST".padEnd(10) + "DETAIL".padEnd(10) + "CREATE".padEnd(10) + "UPDATE".padEnd(10) + "DELETE".padEnd(10) +
    "ACTIONS".padEnd(40) + "NOTES"
  );
  console.log("-".repeat(150));

  for (const r of results) {
    const acts = r.actions.map(a => `${a.name}:${a.status}`).join(" ");
    console.log(
      `${r.group}/${r.module}`.padEnd(28) +
      `${statusEmoji(r.list_status)}${r.list_status}`.padEnd(10) +
      `${statusEmoji(r.detail_status)}${r.detail_status || "-"}`.padEnd(10) +
      `${statusEmoji(r.create_status)}${r.create_status || "-"}`.padEnd(10) +
      `${statusEmoji(r.update_status)}${r.update_status || "-"}`.padEnd(10) +
      `${statusEmoji(r.delete_status)}${r.delete_status || "-"}`.padEnd(10) +
      acts.padEnd(40) +
      (r.notes || "")
    );
  }

  // ══════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(100));
  const pct = totalOps > 0 ? Math.round(passOps / totalOps * 100) : 0;
  console.log(`TOTAL OPERATIONS: ${totalOps}  |  PASS: ${passOps} (${pct}%)  |  FAIL: ${totalOps - passOps}`);
  console.log("✅=2xx  🔴=4xx  💥=5xx  ⏭️=skipped");

  // ══════════════════════════════════════════════════════════════
  // CSV EXPORT
  // ══════════════════════════════════════════════════════════════
  const csvHeaders = ["Module","Group","ListGET","ListStatus","DetailGET","DetailStatus","CreatePOST","CreateStatus","UpdatePUT","UpdateStatus","DeleteDEL","DeleteStatus","Actions","Notes"];
  const csvRows = [csvHeaders.join(",")];
  for (const r of results) {
    csvRows.push([
      r.module, r.group,
      r.list_ms, r.list_status,
      r.detail_ms, r.detail_status || "",
      r.create_ms, r.create_status || "",
      r.update_ms, r.update_status || "",
      r.delete_ms, r.delete_status || "",
      '"' + r.actions.map(a => `${a.name}:${a.status}`).join("; ") + '"',
      '"' + (r.notes || "").replace(/"/g, '""') + '"'
    ].join(","));
  }
  // Summary row
  csvRows.push([`TOTAL_OPS:${totalOps}`, `PASS:${passOps}`, `FAIL:${totalOps-passOps}`, `${pct}%`, "", "", "", "", "", "", "", "", "", ""]);
  fs.writeFileSync("qa-full-crud.csv", csvRows.join("\n"));
  console.log("\n📊 Exported: qa-full-crud.csv");
}

main().catch(e => { console.error(e); process.exit(1); });
