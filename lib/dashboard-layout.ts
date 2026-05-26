import * as SecureStore from "expo-secure-store";
import { ALL_WIDGET_KEYS, WIDGET_REGISTRY, getWidget } from "./widget-registry";

/**
 * User-customisable dashboard layout.
 *
 * Phase 1 (local): layout stored in SecureStore per device.
 * Phase 2 (server): layout fetched from /api/dashboard/profile,
 *   with SecureStore as offline fallback cache.
 *
 * The DashboardCardKey is now any string from the widget registry.
 */

export type DashboardCardKey = string;

export type WidgetPlacement = {
  widget_key: string;
  col: number;
  row: number;
  w: number;
  h: number;
};

export type DashboardLayout = {
  /** Card keys in display order (paired 2-per-row in the UI). */
  order: DashboardCardKey[];
  /** Cards the user explicitly hid. */
  hidden: DashboardCardKey[];
  /** Source of this layout: "local", "staff_override", "job_position", "department", "default" */
  source?: string;
};

const STORAGE_KEY = "prizm_dashboard_layout_v2";
const API_CACHE_KEY = "prizm_dashboard_api_cache";

/** The original 5 stat cards — shown until the user customizes or the API
 *  provides a role-based layout. */
const LEGACY_CARD_KEYS: DashboardCardKey[] = [
  "tasks_summary",
  "projects",
  "customers",
  "leads",
  "invoices",
];

export const DEFAULT_LAYOUT: DashboardLayout = {
  order: LEGACY_CARD_KEYS,
  hidden: [],
  source: "default",
};

/** All cards the dashboard knows how to render — union of registry keys. */
export const ALL_CARD_KEYS: DashboardCardKey[] = ALL_WIDGET_KEYS;

/** Human-friendly label for any card key. */
export function cardLabel(key: DashboardCardKey): string {
  return getWidget(key)?.title ?? key;
}

/** Backward-compat export — maps each key to its label. */
export const CARD_LABELS: Record<string, string> = Object.fromEntries(
  ALL_WIDGET_KEYS.map((k) => [k, WIDGET_REGISTRY[k].title])
);

// ─── Local layout persistence ─────────────────────────────────────────────

export async function getLayout(): Promise<DashboardLayout> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    return {
      order:  Array.isArray(parsed.order)  ? sanitise(parsed.order)  : DEFAULT_LAYOUT.order,
      hidden: Array.isArray(parsed.hidden) ? sanitise(parsed.hidden) : DEFAULT_LAYOUT.hidden,
      source: parsed.source ?? "local",
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
  await SecureStore.deleteItemAsync(API_CACHE_KEY);
}

// ─── API-fetched layout cache ─────────────────────────────────────────────

export async function getCachedApiLayout(): Promise<DashboardLayout | null> {
  try {
    const raw = await SecureStore.getItemAsync(API_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardLayout;
  } catch {
    return null;
  }
}

export async function setCachedApiLayout(layout: DashboardLayout): Promise<void> {
  await SecureStore.setItemAsync(API_CACHE_KEY, JSON.stringify(layout));
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Drop unknown keys + dedupe. Tolerant of schema drift between builds. */
function sanitise(keys: unknown[]): DashboardCardKey[] {
  const known = new Set(ALL_WIDGET_KEYS);
  const seen = new Set<string>();
  const out: DashboardCardKey[] = [];
  for (const k of keys) {
    if (typeof k !== "string") continue;
    if (!known.has(k)) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/** Returns the visible cards in display order. */
export function visibleCards(layout: DashboardLayout): DashboardCardKey[] {
  const hidden = new Set(layout.hidden);
  return layout.order.filter((k) => !hidden.has(k));
}
