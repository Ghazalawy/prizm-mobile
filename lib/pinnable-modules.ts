/**
 * Modules that can be pinned to the bottom tab bar.
 * Maps module keys to their tab route and Ionicons icon name.
 */

export type PinnableModule = {
  key: string;
  title: string;
  icon: string;
  route: string;
  tabName: string;
};

export const PINNABLE_MODULES: PinnableModule[] = [
  { key: "tasks",        title: "Tasks",       icon: "checkbox-outline",           route: "/(tabs)/tasks",        tabName: "tasks" },
  { key: "projects",     title: "Projects",    icon: "folder-outline",             route: "/(tabs)/projects",     tabName: "projects" },
  { key: "customers",    title: "Customers",   icon: "business-outline",           route: "/(tabs)/customers",    tabName: "customers" },
  { key: "leads",        title: "Leads",       icon: "people-outline",             route: "/(tabs)/leads",        tabName: "leads" },
  { key: "invoices",     title: "Invoices",    icon: "document-text-outline",      route: "/(tabs)/invoices",     tabName: "invoices" },
  { key: "estimates",    title: "Estimates",   icon: "calculator-outline",         route: "/(tabs)/estimates",    tabName: "estimates" },
  { key: "proposals",    title: "Proposals",   icon: "reader-outline",             route: "/(tabs)/proposals",    tabName: "proposals" },
  { key: "tickets",      title: "Tickets",     icon: "chatbox-ellipses-outline",   route: "/(tabs)/tickets",      tabName: "tickets" },
  { key: "contracts",    title: "Contracts",   icon: "document-lock-outline",      route: "/(tabs)/contracts",    tabName: "contracts" },
  { key: "expenses",     title: "Expenses",    icon: "receipt-outline",            route: "/(tabs)/expenses-mine",tabName: "expenses-mine" },
  { key: "timesheets",   title: "Timesheets",  icon: "time-outline",              route: "/(tabs)/timesheets",   tabName: "timesheets" },
  { key: "calendar",     title: "Calendar",    icon: "calendar-outline",           route: "/(tabs)/calendar",     tabName: "calendar" },
  { key: "approvals",    title: "Approvals",   icon: "shield-checkmark-outline",   route: "/(tabs)/approvals",    tabName: "approvals" },
  { key: "leave",        title: "Leave",       icon: "airplane-outline",           route: "/(tabs)/leave",        tabName: "leave" },
  { key: "knowledge",    title: "Knowledge",   icon: "book-outline",               route: "/(tabs)/knowledge",    tabName: "knowledge" },
];

const MODULE_MAP = new Map(PINNABLE_MODULES.map((m) => [m.key, m]));

export function getPinnableModule(key: string): PinnableModule | undefined {
  return MODULE_MAP.get(key);
}
