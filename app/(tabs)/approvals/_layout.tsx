import { Stack } from "expo-router";

/**
 * Stack-routed subfolder. Without this layout file expo-router would
 * try to auto-register `approvals/purchase_request` as a bottom-tab,
 * showing as the broken "approvals/purch..." icon on the right of the
 * tab bar. A Stack layout tells the router "this folder is a nested
 * stack inside the parent tab" — same pattern as customers/, leads/,
 * invoices/, projects/, tasks/, erp/.
 */
export default function ApprovalsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
