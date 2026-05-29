const fs = require('fs');

const HEADER = '#,Batch,Round,Module,Operation,Category,HTTPMethod,APIEndpoint,WEBUI_Method,WEBUI_Available,API_Available,Mobile_Available,Tested,HTTP_Code,Success,Iterations,Gap_Severity,Fields,Notes';
let allRows = [];

// ── Batch 1: Tasks ──────────────────────────────────────────────────────────
let tasks = fs.readFileSync('tasks-module-full-inventory.csv', 'utf8').split('\n');
for (let i = 1; i < tasks.length; i++) {
  let line = tasks[i].trim();
  if (!line || line.includes('SUMMARY') || line.startsWith('"') || line.includes('NEXT STEPS') || line.includes('FIXES DEPLOYED') || line.includes('TASKS TABLE FIELDS')) continue;
  let cols = line.split(',');
  if (cols.length < 13) continue;
  let gapSev = 'NONE';
  let notes = (cols[14] || '').replace(/"/g, '');
  if (notes.includes('NOT IMPLEMENTED')) gapSev = 'LOW';
  if (notes.includes('NOT NEEDED')) gapSev = 'NONE';

  allRows.push([
    cols[0], '1', '1', 'tasks', cols[1], cols[2], cols[3], cols[4],
    cols[5], cols[6], cols[7], cols[8], cols[9], cols[10], cols[11],
    cols[12] || '0', gapSev, (cols[13] || '').replace(/"/g,''), notes
  ].join(','));
}
console.log('Batch 1:', allRows.filter(r => r.match(/^\d+,1,1,/)).length, 'rows');

// ── Batch 2: CRM ────────────────────────────────────────────────────────────
let batch2 = fs.readFileSync('batch2-crm-inventory.csv', 'utf8').split('\n');
let curMod = '';
for (let i = 1; i < batch2.length; i++) {
  let line = batch2[i].trim();
  if (!line) continue;
  if (line.match(/^[A-Z_]+,{10,}$/)) {
    curMod = line.split(',')[0].toLowerCase();
    if (curMod === 'business_partners') curMod = 'business_partners';
    continue;
  }
  let cols = line.split(',');
  if (cols.length < 12) continue;
  let gapSev = 'NONE';
  let notes = (cols[13] || '').replace(/"/g, '');
  if (notes.includes('GAP')) gapSev = notes.includes('CRITICAL') ? 'CRITICAL' : 'HIGH';

  allRows.push([
    cols[0], '2', '1', cols[1] || curMod, cols[2], cols[3], cols[4], cols[5],
    cols[6], cols[7], cols[8], cols[9], cols[10], 'N/A', cols[11] || 'PENDING',
    '0', gapSev, '', notes
  ].join(','));
}
console.log('Batch 2:', allRows.filter(r => r.match(/^\d+,2,1,/)).length, 'rows');

// ── Batch 9: Reports ────────────────────────────────────────────────────────
let reports = fs.readFileSync('reports-module-inventory.csv', 'utf8').split('\n');
for (let i = 1; i < reports.length; i++) {
  let line = reports[i].trim();
  if (!line) continue;
  let cols = line.split(',');
  if (cols.length < 14) continue;
  allRows.push([
    cols[0], '9', '1', cols[1] || 'reports', cols[2], cols[3], cols[4], cols[5],
    cols[6], cols[7], cols[8], cols[9], cols[10], cols[11], cols[12],
    cols[13] || '0', 'NONE', (cols[14] || '').replace(/"/g,''), (cols[15] || '').replace(/"/g,'')
  ].join(','));
}
console.log('Batch 9:', allRows.filter(r => r.match(/^\d+,9,1,/)).length, 'rows');
console.log('TOTAL:', allRows.length, 'rows');

// ── Write master ────────────────────────────────────────────────────────────
let master = fs.readFileSync('MASTER-INVENTORY.csv', 'utf8');
master += '\n';
master += '# ===== BATCH 1 — ROUND 1 — Tasks Pilot (Sweep + Test) ===================\n';
master += HEADER + '\n';
let b1 = allRows.filter(r => r.match(/^\d+,1,1,/));
for (let r of b1) master += r + '\n';

master += '\n# ===== BATCH 2 — ROUND 1 — CRM Sweep (7 modules, 128 ops) ===============\n';
master += HEADER + '\n';
let b2 = allRows.filter(r => r.match(/^\d+,2,1,/));
for (let r of b2) master += r + '\n';

master += '\n# ===== BATCH 9 — ROUND 1 — Reports Sweep =================================\n';
master += HEADER + '\n';
let b9 = allRows.filter(r => r.match(/^\d+,9,1,/));
for (let r of b9) master += r + '\n';

fs.writeFileSync('MASTER-INVENTORY.csv', master);
console.log('DONE — wrote MASTER-INVENTORY.csv');
