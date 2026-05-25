import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { buildAuthHeaders, parseApiResponse } from "../api";
import { useImpersonation } from "../impersonation";

/**
 * Action Center inbox — the "what needs my attention" surface.
 *
 * Backed by GET /api/inbox (Inbox_api on the CRM side) which aggregates
 * across multiple tables for the authenticated staff. While the endpoint
 * is being built we return a zero-state shape so the UI ships first.
 */

export type InboxCategory =
  | "approvals"
  | "todos"
  | "tasks"
  | "mentions"
  | "notifications"
  | "compliance";

export type InboxItem = {
  /** Sub-type discriminator within a category. e.g. "budget_item",
   *  "expense", "po", "payslip" inside approvals. */
  type: string;
  id: number;
  title: string;
  subtitle?: string;
  /** Mobile route to navigate to when the item is tapped. */
  deeplink?: string;
  /** Inline quick actions (e.g. approve / reject from the sheet). */
  actions?: Array<{
    key: string;
    title: string;
    endpoint: string;
    method?: "POST" | "PUT";
    body?: Record<string, unknown>;
    destructive?: boolean;
  }>;
  /** "low" | "normal" | "high" — drives row color. */
  priority?: "low" | "normal" | "high";
  /** ISO timestamp, only set on tasks (due_at) and compliance (deadline). */
  due_at?: string | null;
  /** Days the item has been pending. Higher = redder. */
  age_days?: number;
  /** ISO 8601 of when the item was triggered/created/submitted. Drives
   *  the right-aligned time-ago badge ("3h", "2d") on inbox rows.
   *  Backend emits as date('c', $ts) so it parses cleanly via
   *  Date.parse on the client. Null when the source row has no
   *  usable timestamp (degrades gracefully — no badge rendered). */
  triggered_at?: string | null;
};

export type InboxSummary = {
  total: number;
  approvals: number;
  todos: number;
  tasks: number;
  mentions: number;
  notifications: number;
  compliance: number;
};

export type InboxData = {
  summary: InboxSummary;
  approvals: InboxItem[];
  todos: InboxItem[];
  tasks: InboxItem[];
  mentions: InboxItem[];
  notifications: InboxItem[];
  compliance: InboxItem[];
};

const EMPTY: InboxData = {
  summary: {
    total: 0,
    approvals: 0,
    todos: 0,
    tasks: 0,
    mentions: 0,
    notifications: 0,
    compliance: 0,
  },
  approvals: [],
  todos: [],
  tasks: [],
  mentions: [],
  notifications: [],
  compliance: [],
};

async function fetchInbox(): Promise<InboxData> {
  // buildAuthHeaders bundles authtoken + X-Impersonate-Staff-Id so the
  // inbox automatically reflects whoever the admin is viewing-as.
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/inbox`, { headers });
  // hadToken bookkeeping for invalid-token detection — same shape as
  // apiRequest uses.
  const token = headers["authtoken"];
  // Parse first so the invalid-token detector sees the body even on 404
  // (Perfex returns 404 + signature-failed JSON when the JWT is bad).
  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) throw new Error("Session expired");
  // Endpoint not yet deployed — degrade silently so the UI still renders.
  if (res.status === 404) return EMPTY;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!body?.status) return EMPTY;
  return (body.data || EMPTY) as InboxData;
}

const POLL_MS = 90 * 1000; // 90 s — fresh enough without hammering

export function useInbox() {
  const impersonation = useImpersonation();
  // Cache key includes the impersonated staffid so flipping View-As
  // gets its own query bucket. Without this the previous user's bell
  // counts render for a frame after the swap and tapping during that
  // frame shows the "count says 19 but list is empty" mismatch — the
  // counts come from the cached q.data while the list re-derives
  // from the same q.data mid-refetch. Keying breaks the cache cleanly.
  const target = impersonation ? `as:${impersonation.staffid}` : "self";
  return useQuery({
    queryKey: ["inbox", target],
    queryFn: fetchInbox,
    staleTime: 30 * 1000,
    refetchInterval: POLL_MS,
    // Without this, the cached data from the previous session renders for a
    // frame on cold launch before the refetch resolves — items flash in and
    // disappear. placeholderData makes the first render use EMPTY instead
    // of cached, so the strip is steady until real data arrives.
    placeholderData: EMPTY,
    // Don't burn battery polling when the app is backgrounded — React
    // Query's default behaviour pauses refetch on app blur (we wired
    // wireAppStateFocus() in query-client).
  });
}
