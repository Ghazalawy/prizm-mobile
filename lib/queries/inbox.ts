import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { getAuthToken } from "../auth";
import { parseApiResponse } from "../api";

/**
 * Action Center inbox — the "what needs my attention" surface.
 *
 * Backed by GET /api/inbox (Inbox_api on the CRM side) which aggregates
 * across multiple tables for the authenticated staff. While the endpoint
 * is being built we return a zero-state shape so the UI ships first.
 */

export type InboxCategory = "approvals" | "tasks" | "mentions" | "compliance";

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
};

export type InboxSummary = {
  total: number;
  approvals: number;
  tasks: number;
  mentions: number;
  compliance: number;
};

export type InboxData = {
  summary: InboxSummary;
  approvals: InboxItem[];
  tasks: InboxItem[];
  mentions: InboxItem[];
  compliance: InboxItem[];
};

const EMPTY: InboxData = {
  summary: { total: 0, approvals: 0, tasks: 0, mentions: 0, compliance: 0 },
  approvals: [],
  tasks: [],
  mentions: [],
  compliance: [],
};

async function fetchInbox(): Promise<InboxData> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/inbox`, {
    headers: { ...(token ? { authtoken: token } : {}) },
  });
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
  return useQuery({
    queryKey: ["inbox"],
    queryFn: fetchInbox,
    staleTime: 30 * 1000,
    refetchInterval: POLL_MS,
    // Don't burn battery polling when the app is backgrounded — React
    // Query's default behaviour pauses refetch on app blur (we wired
    // wireAppStateFocus() in query-client).
  });
}
