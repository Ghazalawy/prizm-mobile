/**
 * Tasks Module API Test Suite
 * Hits every Tasks REST endpoint against the live ERP and validates 200 OK.
 * 
 * Usage: node test-tasks-api.js <email> <password>
 */

const API_BASE = "https://ms.prizm-energy.com/MS/api";
const AUTH_URL = "https://ms.prizm-energy.com/MS/mobile_auth.php";

let AUTH_TOKEN = null;
let STAFF_ID = null;
let testTaskId = null;
let testChecklistId = null;
let testCommentId = null;
let testAssignmentId = null;
let testFollowerId = null;
let testReminderId = null;
let testTimerId = null;
let testTimesheetId = null;

const PASS = 0, FAIL = 0;
const results = [];

function log(result, endpoint, method, status, message, iterations) {
  const icon = result === "PASS" ? "✅" : result === "SKIP" ? "⏭️" : "❌";
  const entry = { result, endpoint, method, status, message, iterations };
  results.push(entry);
  console.log(`${icon} [${method}] ${endpoint} → ${status} ${message}${iterations > 1 ? ` (${iterations} tries)` : ""}`);
}

async function api(method, endpoint, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (AUTH_TOKEN) headers["authtoken"] = AUTH_TOKEN;
  
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  
  const url = `${API_BASE}/${endpoint}`;
  let lastError = null;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, opts);
      const text = await res.text();
      let data = text;
      try { data = JSON.parse(text); } catch {}
      
      if (!res.ok) {
        const msg = (data && data.message) || `HTTP ${res.status}`;
        if (attempt < 3 && res.status >= 500) {
          lastError = { status: res.status, msg };
          await sleep(1000 * attempt);
          continue;
        }
        return { ok: false, status: res.status, data, iterations: attempt };
      }
      return { ok: true, status: res.status, data, iterations: attempt };
    } catch (err) {
      lastError = { status: 0, msg: err.message };
      if (attempt < 3) { await sleep(1000 * attempt); continue; }
      return { ok: false, status: 0, data: { message: err.message }, iterations: attempt };
    }
  }
  return { ok: false, status: lastError.status, data: { message: lastError.msg }, iterations: 3 };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function authenticate(email, password) {
  console.log("\n🔐 Authenticating...");
  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", password);
  
  try {
    const res = await fetch(AUTH_URL, { method: "POST", body: formData });
    const data = await res.json();
    if (data.status === true || data.success === true) {
      AUTH_TOKEN = data.token;
      if (data.staff && data.staff.staffid) STAFF_ID = data.staff.staffid;
      console.log(`✅ Authenticated as ${data.staff?.email || email} (staff #${STAFF_ID})`);
      return true;
    }
    console.log(`❌ Auth failed: ${data.message || "Invalid credentials"}`);
    return false;
  } catch (err) {
    console.log(`❌ Auth error: ${err.message}`);
    return false;
  }
}

function summarize() {
  const pass = results.filter(r => r.result === "PASS").length;
  const fail = results.filter(r => r.result === "FAIL").length;
  const skip = results.filter(r => r.result === "SKIP").length;
  const total = results.length;
  
  console.log("\n══════════════════════════════════════════════");
  console.log("  TASKS MODULE API TEST RESULTS");
  console.log("══════════════════════════════════════════════");
  console.log(`  Total: ${total}  |  ✅ PASS: ${pass}  |  ❌ FAIL: ${fail}  |  ⏭️ SKIP: ${skip}`);
  console.log(`  Success Rate: ${((pass / (pass + fail)) * 100).toFixed(1)}%`);
  console.log("══════════════════════════════════════════════\n");
  
  if (fail > 0) {
    console.log("FAILED ENDPOINTS:");
    results.filter(r => r.result === "FAIL").forEach(r => {
      console.log(`  ❌ ${r.method} ${r.endpoint} (${r.status}) — ${r.message}`);
    });
  }
}

async function runTests() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   TASKS MODULE — API TEST SUITE             ║");
  console.log("╚══════════════════════════════════════════════╝");
  
  // ═══════════════════════════════════════════════
  // 1. LIST OPERATIONS
  // ═══════════════════════════════════════════════
  console.log("\n─── 1. LIST ────────────────────────────────");
  
  let r = await api("GET", "tasks?limit=5");
  log(r.ok ? "PASS" : "FAIL", "tasks?limit=5", "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("GET", "tasks?status=1&limit=5");
  log(r.ok ? "PASS" : "FAIL", "tasks?status=1", "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("GET", "tasks?status=4&limit=5");
  log(r.ok ? "PASS" : "FAIL", "tasks?status=4", "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("GET", "tasks?priority=3&limit=5");
  log(r.ok ? "PASS" : "FAIL", "tasks?priority=3", "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("GET", "tasks?search=test&limit=5");
  log(r.ok ? "PASS" : "FAIL", "tasks?search=test", "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  if (STAFF_ID) {
    r = await api("GET", `tasks?assigned=${STAFF_ID}&limit=5`);
    log(r.ok ? "PASS" : "FAIL", `tasks?assigned=${STAFF_ID}`, "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }
  
  // ═══════════════════════════════════════════════
  // 2. CREATE TASK
  // ═══════════════════════════════════════════════
  console.log("\n─── 2. CREATE ──────────────────────────────");
  
  r = await api("POST", "tasks", {
    name: `API Test Task ${Date.now()}`,
    startdate: new Date().toISOString().slice(0, 10),
    priority: 2,
    is_public: 1,
    description: "Created by automated API test suite",
  });
  
  if (r.ok && r.data && (r.data.id || r.data.data?.id)) {
    testTaskId = r.data.id || r.data.data?.id;
    log("PASS", "POST tasks", "POST", r.status, `Created #${testTaskId}`, r.iterations);
  } else {
    log("FAIL", "POST tasks", "POST", r.status, r.data?.message || "No ID returned", r.iterations);
  }

  if (!testTaskId) {
    // Try to get an existing task for subsequent tests
    r = await api("GET", "tasks?limit=1");
    if (r.ok && r.data?.data?.[0]) {
      testTaskId = r.data.data[0].id;
      log("PASS", "GET tasks?limit=1 (fallback)", "GET", r.status, `Using existing #${testTaskId}`, r.iterations);
    }
  }

  if (!testTaskId) {
    console.log("❌ Cannot proceed — no task available for sub-resource tests");
    summarize();
    return;
  }

  // ═══════════════════════════════════════════════
  // 3. DETAIL / GET SINGLE
  // ═══════════════════════════════════════════════
  console.log("\n─── 3. DETAIL ──────────────────────────────");
  
  r = await api("GET", `tasks/${testTaskId}`);
  log(r.ok ? "PASS" : "FAIL", `tasks/${testTaskId}`, "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("GET", `tasks/search/test`);
  log(r.ok ? "PASS" : "FAIL", "tasks/search/test", "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);

  // ═══════════════════════════════════════════════
  // 4. UPDATE OPERATIONS
  // ═══════════════════════════════════════════════
  console.log("\n─── 4. UPDATE ──────────────────────────────");
  
  r = await api("PUT", `tasks/${testTaskId}`, { description: "Updated by test suite at " + new Date().toISOString() });
  log(r.ok ? "PASS" : "FAIL", `PUT tasks/${testTaskId}`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("PUT", `tasks/${testTaskId}`, { priority: 3 });
  log(r.ok ? "PASS" : "FAIL", `PUT tasks/${testTaskId} (priority)`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("PUT", `tasks/${testTaskId}`, { status: 4 });
  log(r.ok ? "PASS" : "FAIL", `PUT tasks/${testTaskId} (status=4)`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("PUT", `tasks/${testTaskId}`, { tags: "api-test,mobile,verified" });
  log(r.ok ? "PASS" : "FAIL", `PUT tasks/${testTaskId} (tags)`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("PUT", `tasks/${testTaskId}`, { is_public: 1 });
  log(r.ok ? "PASS" : "FAIL", `PUT tasks/${testTaskId} (is_public)`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);

  // ═══════════════════════════════════════════════
  // 5. ASSIGNMENTS
  // ═══════════════════════════════════════════════
  console.log("\n─── 5. ASSIGNMENTS ─────────────────────────");
  
  r = await api("GET", `tasks/assignments/${testTaskId}`);
  log(r.ok ? "PASS" : "FAIL", `GET tasks/assignments/${testTaskId}`, "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  if (STAFF_ID) {
    r = await api("POST", `tasks/assignments`, { taskid: testTaskId, staff_id: STAFF_ID });
    if (r.ok && r.data?.id) {
      testAssignmentId = r.data.id;
      log("PASS", "POST tasks/assignments", "POST", r.status, `Created #${testAssignmentId}`, r.iterations);
    } else {
      log(r.ok ? "PASS" : "FAIL", "POST tasks/assignments", "POST", r.status, r.data?.message || "No ID", r.iterations);
    }
  } else {
    log("SKIP", "POST tasks/assignments", "POST", "-", "No staff ID", 0);
  }

  // ═══════════════════════════════════════════════
  // 6. FOLLOWERS
  // ═══════════════════════════════════════════════
  console.log("\n─── 6. FOLLOWERS ───────────────────────────");
  
  r = await api("GET", `tasks/followers/${testTaskId}`);
  log(r.ok ? "PASS" : "FAIL", `GET tasks/followers/${testTaskId}`, "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  if (STAFF_ID) {
    r = await api("POST", `tasks/followers`, { taskid: testTaskId, staff_id: STAFF_ID });
    if (r.ok && r.data?.id) {
      testFollowerId = r.data.id;
      log("PASS", "POST tasks/followers", "POST", r.status, `Created #${testFollowerId}`, r.iterations);
    } else {
      log(r.ok ? "PASS" : "FAIL", "POST tasks/followers", "POST", r.status, r.data?.message || "No ID", r.iterations);
    }
  } else {
    log("SKIP", "POST tasks/followers", "POST", "-", "No staff ID", 0);
  }

  // ═══════════════════════════════════════════════
  // 7. CHECKLIST
  // ═══════════════════════════════════════════════
  console.log("\n─── 7. CHECKLIST ───────────────────────────");
  
  r = await api("GET", `tasks/checklist/${testTaskId}`);
  log(r.ok ? "PASS" : "FAIL", `GET tasks/checklist/${testTaskId}`, "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("POST", `tasks/checklist`, { taskid: testTaskId, description: "Test checklist item" });
  if (r.ok && r.data?.id) {
    testChecklistId = r.data.id;
    log("PASS", "POST tasks/checklist", "POST", r.status, `Created #${testChecklistId}`, r.iterations);
  } else {
    log("FAIL", "POST tasks/checklist", "POST", r.status, r.data?.message || "No ID", r.iterations);
  }
  
  if (testChecklistId) {
    r = await api("PUT", `tasks/checklist/${testChecklistId}`, { finished: 1 });
    log(r.ok ? "PASS" : "FAIL", `PUT tasks/checklist/${testChecklistId} (toggle)`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
    
    r = await api("PUT", `tasks/checklist/${testChecklistId}`, { description: "Updated checklist item" });
    log(r.ok ? "PASS" : "FAIL", `PUT tasks/checklist/${testChecklistId} (rename)`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
    
    r = await api("PUT", `tasks/checklist/item/${testChecklistId}`, { finished: 0 });
    log(r.ok ? "PASS" : "FAIL", `PUT tasks/checklist/item/${testChecklistId}`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }

  // ═══════════════════════════════════════════════
  // 8. COMMENTS
  // ═══════════════════════════════════════════════
  console.log("\n─── 8. COMMENTS ────────────────────────────");
  
  r = await api("GET", `tasks/comments/${testTaskId}`);
  log(r.ok ? "PASS" : "FAIL", `GET tasks/comments/${testTaskId}`, "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("POST", `tasks/comments`, { taskid: testTaskId, content: "Test comment from API suite" });
  if (r.ok && r.data?.id) {
    testCommentId = r.data.id;
    log("PASS", "POST tasks/comments", "POST", r.status, `Created #${testCommentId}`, r.iterations);
  } else {
    log("FAIL", "POST tasks/comments", "POST", r.status, r.data?.message || "No ID", r.iterations);
  }
  
  if (testCommentId) {
    r = await api("PUT", `tasks/comments/${testCommentId}`, { content: "Edited comment at " + new Date().toISOString() });
    log(r.ok ? "PASS" : "FAIL", `PUT tasks/comments/${testCommentId}`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }

  // ═══════════════════════════════════════════════
  // 9. TIMER
  // ═══════════════════════════════════════════════
  console.log("\n─── 9. TIMER ───────────────────────────────");
  
  r = await api("POST", `tasks/${testTaskId}/timer/start`, {});
  if (r.ok) {
    log("PASS", `POST tasks/${testTaskId}/timer/start`, "POST", r.status, "Timer started", r.iterations);
    // Get the timer ID from response
    if (r.data?.data?.task_id) testTimerId = testTaskId;
  } else {
    log("FAIL", `POST tasks/${testTaskId}/timer/start`, "POST", r.status, r.data?.message || "Failed", r.iterations);
  }
  
  r = await api("POST", `tasks/${testTaskId}/timer/stop`, { timer_id: 0, note: "Auto-stopped by test" });
  log(r.ok ? "PASS" : "FAIL", `POST tasks/${testTaskId}/timer/stop`, "POST", r.status, r.ok ? "OK" : r.data?.message, r.iterations);

  // ═══════════════════════════════════════════════
  // 10. LOG TIME
  // ═══════════════════════════════════════════════
  console.log("\n─── 10. LOG TIME ───────────────────────────");
  
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  r = await api("POST", `tasks/${testTaskId}/log_time`, {
    start_time: oneHourAgo.toISOString().slice(0, 19).replace("T", " "),
    end_time: now.toISOString().slice(0, 19).replace("T", " "),
    note: "Logged via test suite",
  });
  log(r.ok ? "PASS" : "FAIL", `POST tasks/${testTaskId}/log_time`, "POST", r.status, r.ok ? "OK" : r.data?.message, r.iterations);

  // ═══════════════════════════════════════════════
  // 11. TIMESHEETS
  // ═══════════════════════════════════════════════
  console.log("\n─── 11. TIMESHEETS ─────────────────────────");
  
  r = await api("GET", `tasks/${testTaskId}/timesheets`);
  if (r.ok && r.data?.data?.[0]) {
    testTimesheetId = r.data.data[0].id;
    log("PASS", `GET tasks/${testTaskId}/timesheets`, "GET", r.status, `Found entry #${testTimesheetId}`, r.iterations);
  } else {
    log(r.ok ? "PASS" : "FAIL", `GET tasks/${testTaskId}/timesheets`, "GET", r.status, r.ok ? "(empty)" : r.data?.message, r.iterations);
  }
  
  if (testTimesheetId) {
    r = await api("DELETE", `tasks/timesheets/${testTimesheetId}`);
    log(r.ok ? "PASS" : "FAIL", `DELETE tasks/timesheets/${testTimesheetId}`, "DELETE", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }

  // ═══════════════════════════════════════════════
  // 12. REMINDERS
  // ═══════════════════════════════════════════════
  console.log("\n─── 12. REMINDERS ──────────────────────────");
  
  r = await api("GET", `tasks/${testTaskId}/reminders`);
  log(r.ok ? "PASS" : "FAIL", `GET tasks/${testTaskId}/reminders`, "GET", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  r = await api("POST", `tasks/${testTaskId}/reminders`, { date: tomorrow });
  if (r.ok && r.data?.id) {
    testReminderId = r.data.id;
    log("PASS", `POST tasks/${testTaskId}/reminders`, "POST", r.status, `Created #${testReminderId}`, r.iterations);
  } else {
    log("FAIL", `POST tasks/${testTaskId}/reminders`, "POST", r.status, r.data?.message || "No ID", r.iterations);
  }
  
  if (testReminderId) {
    r = await api("DELETE", `tasks/reminders/${testReminderId}`);
    log(r.ok ? "PASS" : "FAIL", `DELETE tasks/reminders/${testReminderId}`, "DELETE", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }

  // ═══════════════════════════════════════════════
  // 13. STATUS ACTIONS
  // ═══════════════════════════════════════════════
  console.log("\n─── 13. STATUS ACTIONS ─────────────────────");
  
  r = await api("PUT", `tasks/${testTaskId}/mark_complete`, {});
  log(r.ok ? "PASS" : "FAIL", `PUT tasks/${testTaskId}/mark_complete`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  
  r = await api("PUT", `tasks/${testTaskId}/reopen`, {});
  log(r.ok ? "PASS" : "FAIL", `PUT tasks/${testTaskId}/reopen`, "PUT", r.status, r.ok ? "OK" : r.data?.message, r.iterations);

  // ═══════════════════════════════════════════════
  // 14. COPY
  // ═══════════════════════════════════════════════
  console.log("\n─── 14. COPY ───────────────────────────────");
  
  r = await api("POST", `tasks/${testTaskId}/copy`, {});
  let copyTaskId = null;
  if (r.ok && r.data?.id) {
    copyTaskId = r.data.id;
    log("PASS", `POST tasks/${testTaskId}/copy`, "POST", r.status, `Copied → #${copyTaskId}`, r.iterations);
  } else {
    log("FAIL", `POST tasks/${testTaskId}/copy`, "POST", r.status, r.data?.message || "Failed", r.iterations);
  }

  // ═══════════════════════════════════════════════
  // 15. CLEANUP
  // ═══════════════════════════════════════════════
  console.log("\n─── 15. CLEANUP ────────────────────────────");
  
  if (testChecklistId) {
    r = await api("DELETE", `tasks/checklist/${testChecklistId}`);
    log(r.ok ? "PASS" : "FAIL", `DELETE tasks/checklist/${testChecklistId}`, "DELETE", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }
  
  if (testCommentId) {
    r = await api("DELETE", `tasks/comments/${testCommentId}`);
    log(r.ok ? "PASS" : "FAIL", `DELETE tasks/comments/${testCommentId}`, "DELETE", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }
  
  if (testAssignmentId) {
    r = await api("DELETE", `tasks/assignments/${testAssignmentId}`);
    log(r.ok ? "PASS" : "FAIL", `DELETE tasks/assignments/${testAssignmentId}`, "DELETE", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }
  
  if (testFollowerId) {
    r = await api("DELETE", `tasks/followers/${testFollowerId}`);
    log(r.ok ? "PASS" : "FAIL", `DELETE tasks/followers/${testFollowerId}`, "DELETE", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }
  
  if (testTaskId) {
    r = await api("DELETE", `tasks/${testTaskId}`);
    log(r.ok ? "PASS" : "FAIL", `DELETE tasks/${testTaskId}`, "DELETE", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }
  
  if (copyTaskId) {
    r = await api("DELETE", `tasks/${copyTaskId}`);
    log(r.ok ? "PASS" : "FAIL", `DELETE tasks/${copyTaskId} (cleanup copy)`, "DELETE", r.status, r.ok ? "OK" : r.data?.message, r.iterations);
  }

  summarize();
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.log("Usage: node test-tasks-api.js <email> <password>");
  console.log("Provide ERP staff credentials to authenticate and test.");
  process.exit(1);
}

authenticate(email, password).then(authed => {
  if (!authed) {
    console.log("Cannot proceed without authentication.");
    process.exit(1);
  }
  return runTests();
}).catch(err => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
