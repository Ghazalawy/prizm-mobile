import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { buildAuthHeaders, parseApiResponse } from "../api";
import { useImpersonation } from "../impersonation";

/**
 * Dashboard count tiles. Each tile hits a dedicated /api/<module>/count
 * endpoint (added in ERP v2.4.4) that returns { count: N } from a single
 * SELECT COUNT(*) query — no row download. Cheap, fast, ~100 bytes per tile.
 *
 * Tasks tile is special because Tasks::data_get already returns a paginated
 * envelope with `total` — we just ask for limit:1 and read .total.
 */

async function fetchCount(module: string): Promise<number> {
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/${module}/count`, {
    headers,
  });
  const token = headers["authtoken"];
  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Number(body?.count ?? 0);
}

async function fetchTasksTotal(): Promise<number> {
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/tasks?limit=1`, {
    headers,
  });
  const token = headers["authtoken"];
  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Number(body?.total ?? 0);
}

const FIVE_MIN = 5 * 60 * 1000;

function useDashboardQueryScope(): string {
  const impersonation = useImpersonation();
  return impersonation ? `as:${impersonation.staffid}` : "self";
}

export const useProjectsCount = () => {
  const scope = useDashboardQueryScope();
  return useQuery({
    queryKey: ["dashboard", "projects", "count", scope],
    queryFn: () => fetchCount("projects"),
    staleTime: FIVE_MIN,
  });
};

export const useTasksCount = () => {
  const scope = useDashboardQueryScope();
  return useQuery({
    queryKey: ["dashboard", "tasks", "count", scope],
    queryFn: fetchTasksTotal,
    staleTime: FIVE_MIN,
  });
};

export const useLeadsCount = () => {
  const scope = useDashboardQueryScope();
  return useQuery({
    queryKey: ["dashboard", "leads", "count", scope],
    queryFn: () => fetchCount("leads"),
    staleTime: FIVE_MIN,
  });
};

export const useInvoicesCount = () => {
  const scope = useDashboardQueryScope();
  return useQuery({
    queryKey: ["dashboard", "invoices", "count", scope],
    queryFn: () => fetchCount("invoices"),
    staleTime: FIVE_MIN,
  });
};

export const useCustomersCount = () => {
  const scope = useDashboardQueryScope();
  return useQuery({
    queryKey: ["dashboard", "customers", "count", scope],
    queryFn: () => fetchCount("customers"),
    staleTime: FIVE_MIN,
  });
};

// ─── My Tasks summary (Dashboard "My Tasks" tile) ────────────────────────

export type MyTasksSummary = {
  total_open: number;
  not_started: number;
  awaiting_feedback: number;
  testing: number;
  in_progress: number;
  overdue: number;
  stale: number;
  completed_last_30d: number;
};

const EMPTY_SUMMARY: MyTasksSummary = {
  total_open: 0,
  not_started: 0,
  awaiting_feedback: 0,
  testing: 0,
  in_progress: 0,
  overdue: 0,
  stale: 0,
  completed_last_30d: 0,
};

async function fetchMyTasksSummary(): Promise<MyTasksSummary> {
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/my/tasks-summary`, {
    headers,
  });
  const token = headers["authtoken"];
  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { ...EMPTY_SUMMARY, ...(body?.data || {}) };
}

export const useMyTasksSummary = () => {
  const scope = useDashboardQueryScope();
  return useQuery({
    queryKey: ["dashboard", "my-tasks-summary", scope],
    queryFn: fetchMyTasksSummary,
    staleTime: 60 * 1000, // fresher than the other tiles — this is "my" data
    refetchInterval: 5 * 60 * 1000,
  });
};
