#!/usr/bin/env node
/**
 * Pinned routing regressions. Runs without the backend checkout, so it guards
 * every CI job — including ones where the backend-aware gates cannot run.
 *
 * Every case is a production defect that shipped once. Each states the link
 * the backend really emits and the screen it must open.
 */
import assert from "node:assert/strict";
import { inspectRoute, loadMobileContext } from "./lib/mobile-surface.mjs";

const context = await loadMobileContext();
const { routing } = context;
let checks = 0;

function opens(link, expected, why) {
  const route = routing.resolveNativeRoute(link);
  assert.equal(route, expected, `${why}\n  link: ${link}`);
  if (expected) {
    const inspected = inspectRoute(context, expected);
    assert.deepEqual(inspected.problems, [], `${why}: ${expected} must render a real screen`);
  }
  checks += 1;
}

function appLinkOpens(path, expected, why) {
  const route = routing.resolveIncomingAppLink(`https://ms.prizm-energy.com/MS/admin/${path}`);
  assert.equal(route, expected, `${why}\n  app link: ${path}`);
  checks += 1;
}

// Leave approvals: relative links were rejected before any pattern ran because
// "timesheets" had no generic controller mapping. Every leave-approval
// notification fell back to the ERP home grid.
opens("timesheets/requisition_detail/812", "/(tabs)/approvals/leave/812", "leave approval notification");
opens("utilities/calendar?eventid=55", "/(tabs)/calendar/55", "calendar event reminder must open the event, not the calendar");
opens("costcenters/view/9", "/(tabs)/erp/cost_centers/9", "cost-center notification");
opens("hr_profile/member/31/training", "/(tabs)/erp/staff/31", "training notification opens the staff member");

// Purchase notifications carry the przpurchase/ module prefix.
opens("przpurchase/Delivery_Notes/view_delivery_note/77", "/(tabs)/erp/purchase_delivery_notes/77", "delivery note approval");
opens("przpurchase/Received_Vouchers/view_voucher/78", "/(tabs)/erp/purchase_received_vouchers/78", "received voucher approval");
opens("przpurchase/Payment_Request/view_payment_request/1211", "/(tabs)/approvals/payment_request/1211", "payment request approval");
opens("quotations/list_quotations/5", "/(tabs)/erp/purchase_quotations/5", "supplier-accepted quotation notification");

// Wrong-table records: these used to open a DIFFERENT record with the same id.
opens("materials/Items/view/4410", "/(tabs)/erp/budget_items/4410", "materials/Items is tblprizmbudget_items (budget_items), not tblmaterials");
opens("materials/Items/view/4410#item_review", "/(tabs)/erp/budget_items/4410", "item review anchor keeps the catalogue item");
opens("prizmbudget/request_advance_cash/12", null, "advance cash has no native screen; must not open budget item #12");
opens("prizmbudget/view_budget/12", null, "budgets have no native screen; must not open budget item #12");
opens("prizmbudget/view_resource_request/12", null, "resource requests have no native screen");
opens("rfq2/rfq/rfq/90/0/1/1/", null, "legacy tblrfqs id must not open tblrfq2 record #1 (or #90)");
opens("rfq/rfq/rfq/90/0/1/1/", null, "legacy RFQ module has no native screen");
opens("timesheets/requisition_manage?tab=additional_timesheets&additional_timesheets_id=4", null, "additional hours must not masquerade as the leave list");

// Inbox_api rewrites with a partial preg_replace and leaves debris around the route.
opens("#/(tabs)/erp/tasks/15", "/(tabs)/tasks/15", "approval inbox #taskid rewrite");
opens("https://ms.prizm-energy.com/MS/admin//(tabs)/approvals/payment_request/1211", "/(tabs)/approvals/payment_request/1211", "absolute admin_url link rewritten by Inbox_api");
assert.equal(routing.resolveNativeRoute("https://evil.example.com/MS/admin//(tabs)/approvals/payment_request/1"), null, "embedded routes are only trusted from internal hosts");
checks += 1;

// Backend-built generic routes must reach the dedicated screen.
opens("/(tabs)/erp/tasks/15", "/(tabs)/tasks/15", "inbox task deeplink");
opens("/(tabs)/erp/contracts/3", "/(tabs)/contracts/3", "contract expiry deeplink");
opens("/(tabs)/erp/purchase_requests/40", "/(tabs)/approvals/purchase_request/40", "PR generic route must open the approval screen");
opens("/(tabs)/erp/contracts/new", "/(tabs)/erp/contracts/new", "create routes keep the generic form");

// Inbox items without a backend deeplink.
assert.equal(routing.routeForInboxItem({ type: "leave_request", id: 812 }), "/(tabs)/approvals/leave/812");
assert.equal(routing.routeForInboxItem({ type: "task", id: 3, deeplink: "/(tabs)/erp/tasks/3" }), "/(tabs)/erp/tasks/3");
assert.equal(routing.routeForInboxItem({ type: "unknown_thing", id: 3 }), null);
checks += 3;

// Generic controller heuristic: only the plain view/edit action is a record.
assert.equal(routing.explainNativeRoute("prizmbudget/view_deployment/3").route, null);
assert.equal(routing.explainNativeRoute("materials/Items/view/3").via, "direct");
checks += 2;

// App Links (email / browser) agree with the in-app bell.
appLinkOpens("timesheets/requisition_detail/812", "/(tabs)/approvals/leave/812", "leave approval app link");
appLinkOpens("przpurchase/Delivery_Notes/view_delivery_note/77", "/(tabs)/erp/purchase_delivery_notes/77", "delivery note app link");
appLinkOpens("prizmbudget/request_advance_cash/12", "/(tabs)/erp", "unsupported app links land on the ERP hub, never a wrong record");

console.log(`Deeplink regression tests passed: ${checks} pinned production defects.`);
