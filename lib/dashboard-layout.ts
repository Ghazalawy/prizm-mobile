import * as SecureStore from "expo-secure-store";

/**
 * User-customisable dashboard layout.
 *
 * Each card has a stable key. The user picks which cards appear and in
 * what order via Settings → Customize Dashboard. The layout is persisted
 * to SecureStore so it survives app restarts but stays per-device (each
 * staff member can curate their own view).
 *
 * Implementation note: we did NOT pull in react-native-draggable-flatlist
 * because the UX needed by Phase C3 is plain reorder + toggle — easily
 * served by up/down arrow buttons in the Customize screen, no gestures,
 * no native code. Saves a dependency + a build cycle.
 */

export type DashboardCardKey =
  | "tasks_summary"
  | "projects"
  | "customers"
  | "leads"
  | "invoices";

export type DashboardLayout = {
  /** Card keys in display order, top → bottom (paired 2-per-row in the UI). */
  order: DashboardCardKey[];
  /** Cards the user explicitly hid. */
  hidden: DashboardCardKey[];
};

const STORAGE_KEY = "prizm_dashboard_layout_v1";

/** Default layout — same set the legacy hard-coded dashboard rendered, in the
 *  same order. New users see this until they tweak. */
export const DEFAULT_LAYOUT: DashboardLayout = {
  order: ["tasks_summary", "projects", "customers", "leads", "invoices"],
  hidden: [],
};

/** All cards the dashboard knows how to render. Keep this in sync with the
 *  card render switch in app/(tabs)/index.tsx. */
export const ALL_CARD_KEYS: DashboardCardKey[] = [
  "tasks_summary",
  "projects",
  "customers",
  "leads",
  "invoices",
];

/** Human-friendly label for each card key. Shown in the Customize screen
 *  as the row title. */
export const CARD_LABELS: Record<DashboardCardKey, string> = {
  tasks_summary: "My Tasks",
  projects:      "Active Projects",
  customers:     "Customers",
  leads:         "Total Leads",
  invoices:      "Invoices",
};

export async function getLayout(): Promise<DashboardLayout> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    return {
      order:  Array.isArray(parsed.order)  ? sanitise(parsed.order)  : DEFAULT_LAYOUT.order,
      hidden: Array.isArray(parsed.hidden) ? sanitise(parsed.hidden) : DEFAULT_LAYOUT.hidden,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export async function setLayout(next: DashboardLayout): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
}

export async function resetLayout(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}

/** Drop any unknown keys + dedupe. Defensive against schema drift between
 *  build versions where the layout was saved before a card was renamed. */
function sanitise(keys: unknown[]): DashboardCardKey[] {
  const seen = new Set<DashboardCardKey>();
  const out: DashboardCardKey[] = [];
  for (const k of keys) {
    if (typeof k !== "string") continue;
    if (!ALL_CARD_KEYS.includes(k as DashboardCardKey)) continue;
    if (seen.has(k as DashboardCardKey)) continue;
    seen.add(k as DashboardCardKey);
    out.push(k as DashboardCardKey);
  }
  return out;
}

/** Returns the visible cards in display order. */
export function visibleCards(layout: DashboardLayout): DashboardCardKey[] {
  const hidden = new Set(layout.hidden);
  return layout.order.filter((k) => !hidden.has(k));
}
