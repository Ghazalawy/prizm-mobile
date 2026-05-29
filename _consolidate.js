const fs = require('fs');

const HEADER = '#,Batch,Round,Module,Operation,Category,HTTPMethod,APIEndpoint,WEBUI_Method,WEBUI_Available,API_Available,Mobile_Available,Tested,HTTP_Code,Success,Iterations,Gap_Severity,Fields,Notes';
let allRows = [];

// ── Batch mapping: module → batch number ────────────────────────────────────
const BATCH_MAP = {
  tasks: 1,
  customers: 2, contacts: 2, leads: 2, contracts: 2, business_partners: 2, projects: 2, milestones: 2,
  invoices: 3, estimates: 3, proposals: 3, payments: 3, items: 3, credit_notes: 3, expenses: 3,
  tickets: 4, knowledge_base: 4, knowledge: 4, surveys: 4, announcements: 4,
  purchase_requests: 5, purchase_orders: 5, payment_requests: 5, expense_requests: 5,
  suppliers: 5, delivery_notes: 5, quotations: 5, received_vouchers: 5, completion_certificates: 5,
  przpurchase: 5, przsuppliers: 5,
  staff: 6, hr_records: 6, hr_payroll: 6, recruitment: 6, leaves: 6, timesheets: 6, goals: 6, todo: 6,
  gatepass: 7, fixed_equipment: 7, materials: 7, vehicles: 7, cost_centers: 7,
  tenders: 8, opportunities: 8, technical_inquiries: 8, technicalinquiries: 8, rfq: 8, advance_leads: 8,
  dashboard: 9, calendar: 9, reports: 9, settings: 9, roles: 9, permissions: 9,
  api_management: 9, automation: 9, custom_fields: 9, filters: 9, mods: 9, backup: 9, documentation: 9,
  ai: 10, ai_feature_management: 10, outlook365: 10, quickbooks: 10, linkedin: 10, dms: 10, kbi: 10, sms: 10, otp: 10,
  // Admin/system-wide modules → Batch 9
  currencies: 9, departments: 9, emails: 9, email_templates: 9, spam_filters: 9,
  roles_model: 9, staff_departments: 9, staff_permissions: 9, taxes: 9,
  ticket_priorities: 4, ticket_statuses: 4, ticket_services: 4,
  leads_sources: 2, leads_statuses: 2, customer_groups: 2, payment_modes: 2,
  expense_categories: 3, item_groups: 3,
  subscription_items: 3, subscriptions: 3, prizmsubscription: 3,
  utilities: 9, migrations: 9, privacy_policy: 9, terms: 9,
  custom_controller: 9, bug: 9, fields: 9,
  reports_api: 9,
};

// ── Load existing MASTER rows (keep Batch 1-2, 9 already converted) ─────────
let masterContent = fs.readFileSync('MASTER-INVENTORY.csv', 'utf8');
let existingLines = masterContent.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('='));
let existingHeader = existingLines[0];
// Keep existing rows from previous consolidation
for (let i = 1; i < existingLines.length; i++) {
  let line = existingLines[i];
  if (line.startsWith('#,Batch')) continue; // skip repeated headers
  let cols = line.split(',');
  if (cols.length < 15) continue;
  allRows.push(line);
}
console.log('Existing MASTER rows:', allRows.length);

// ── Load ERP operations inventory ───────────────────────────────────────────
let erp = fs.readFileSync('erp-operations-inventory.csv', 'utf8').split('\n');
let skipped = 0, added = 0;
let seenModules = new Set();

for (let i = 1; i < erp.length; i++) {
  let line = erp[i].trim();
  if (!line) continue;
  let cols = line.split(',');
  if (cols.length < 8) { skipped++; continue; }

  let controller = cols[0];
  let module = cols[1].toLowerCase().replace(/[^a-z0-9_]/g, '_');
  let method = cols[2];
  let type = (cols[3] || 'ACTION').toUpperCase();
  let mobileEndpoint = cols[4] || 'NONE';
  let mobileStatus = cols[5] || 'GAP';
  let note = (cols[6] || '').replace(/"/g, '');
  let erpPath = cols[7] || '';

  // Determine batch
  let batch = BATCH_MAP[module] || 9; // default to Batch 9 (Admin)

  // Map type to category
  const typeMap = {
    'LIST': 'LIST', 'TABLE': 'LIST', 'INDEX': 'LIST',
    'DETAIL': 'READ', 'VIEW': 'READ',
    'CREATE': 'CREATE', 'ADD': 'CREATE',
    'EDIT': 'UPDATE', 'UPDATE': 'UPDATE',
    'DELETE': 'DELETE', 'REMOVE': 'DELETE',
    'ACTION': 'ACTION', 'STATUS': 'STATUS', 'CHANGE': 'STATUS',
    'EXPORT': 'EXPORT', 'IMPORT': 'BULK',
    'UPLOAD': 'UPLOAD', 'DOWNLOAD': 'DOWNLOAD',
    'SEARCH': 'SEARCH', 'FILTER': 'FILTER',
    'VALIDATE': 'VALIDATE', 'CHECK': 'VALIDATE',
    'DUPLICATE': 'DUPLICATE', 'COPY': 'DUPLICATE',
    'REORDER': 'REORDER',
    'BULK': 'BULK',
    'MODAL': 'ACTION', 'TAB': 'READ',
    'PREFERENCE': 'PREFERENCE',
    'SUB': 'SUB',
  };
  let category = typeMap[type] || 'ACTION';

  // API endpoint inference
  let apiEndpoint = '';
  if (mobileEndpoint && mobileEndpoint !== 'NONE') {
    apiEndpoint = `/api/${mobileEndpoint}`;
  }

  let webAvailable = 'YES';
  let apiAvailable = (mobileEndpoint && mobileEndpoint !== 'NONE') ? 'YES' : 'NO';
  let mobileAvailable = (mobileStatus === 'YES') ? 'YES' : (mobileStatus === 'GAP' ? 'NO' : 'PARTIAL');
  let gapSeverity = (mobileStatus === 'GAP') ? 'MEDIUM' : 'NONE';

  // Deduplicate: skip if we already have this (module + method + controller)
  let dedupKey = `${batch},1,${module},${method}`;
  // Check if already exists
  let exists = allRows.some(r => {
    let c = r.split(',');
    return c[1] === String(batch) && c[3] === module && c[5] === method;
  });

  if (!exists) {
    let operation = `${method} (${controller})`;
    let httpMethod = 'GET'; // default
    if (type === 'CREATE' || type === 'ADD' || type === 'ACTION' || type === 'UPLOAD') httpMethod = 'POST';
    if (type === 'EDIT' || type === 'UPDATE' || type === 'STATUS') httpMethod = 'PUT';
    if (type === 'DELETE' || type === 'REMOVE') httpMethod = 'DELETE';

    allRows.push([
      '', // auto-number later
      batch, '1', module, operation, category, httpMethod,
      apiEndpoint, method, webAvailable, apiAvailable, mobileAvailable,
      'NO', 'N/A', 'PENDING', '0', gapSeverity, '', note
    ].join(','));
    added++;
    seenModules.add(module);
  } else {
    skipped++;
  }
}

console.log('ERP sweep: added', added, 'new rows, skipped', skipped, 'duplicates');
console.log('Modules covered:', seenModules.size);

// ── Re-number all rows ──────────────────────────────────────────────────────
let finalRows = [];
let rowNum = 1;
for (let r of allRows) {
  let cols = r.split(',');
  cols[0] = String(rowNum++);
  finalRows.push(cols.join(','));
}

// ── Write master ────────────────────────────────────────────────────────────
let master = fs.readFileSync('MASTER-INVENTORY.csv', 'utf8');
// Strip old data rows, keep header
let headerEnd = master.indexOf('\n#,Batch');
if (headerEnd < 0) headerEnd = master.lastIndexOf('\n# =====');
if (headerEnd < 0) headerEnd = master.length;
master = master.substring(0, headerEnd > 0 ? headerEnd : master.length);

// Group by batch
let batchOrder = [1,2,3,4,5,6,7,8,9,10];
let batchNames = {
  1: 'Tasks Pilot',
  2: 'CRM & Core Business',
  3: 'Sales & Finance',
  4: 'Support & Knowledge',
  5: 'Purchase & Supply Chain',
  6: 'HR & People',
  7: 'Operations & Assets',
  8: 'BD & Tenders',
  9: 'Admin & System',
  10: 'AI & Integrations',
};

for (let b of batchOrder) {
  let batchRows = finalRows.filter(r => {
    let cols = r.split(',');
    return cols[1] === String(b) && cols[3] !== 'undefined';
  });
  if (batchRows.length === 0) continue;

  master += `\n# ===== BATCH ${b} — ROUND 1 — ${batchNames[b] || ''} (Sweep) ${'='.repeat(Math.max(0,60-30-batchNames[b]?.length||0))}\n`;
  master += HEADER + '\n';
  for (let r of batchRows) master += r + '\n';
}

fs.writeFileSync('MASTER-INVENTORY.csv', master);
console.log('TOTAL rows written:', finalRows.length);
console.log('DONE');
