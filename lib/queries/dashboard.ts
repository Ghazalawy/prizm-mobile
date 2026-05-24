import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { getAuthToken } from "../auth";
import { parseApiResponse } from "../api";

/**
 * Dashboard count tiles. Each tile hits a dedicated /api/<module>/count
 * endpoint (added in ERP v2.4.4) that returns { count: N } from a single
 * SELECT COUNT(*) query — no row download. Cheap, fast, ~100 bytes per tile.
 *
 * Tasks tile is special because Tasks::data_get already returns a paginated
 * envelope with `total` — we just ask for limit:1 and read .total.
 */

async function fetchCount(module: string): Promise<number> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/${module}/count`, {
    headers: { ...(token ? { authtoken: token } : {}) },
  });
  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Number(body?.count ?? 0);
}

async function fetchTasksTotal(): Promise<number> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/tasks?limit=1`, {
    headers: { ...(token ? { authtoken: token } : {}) },
  });
  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Number(body?.total ?? 0);
}

const FIVE_MIN = 5 * 60 * 1000;

export const useProjectsCount = () =>
  useQuery({
    queryKey: ["dashboard", "projects", "count"],
    queryFn: () => fetchCount("projects"),
    staleTime: FIVE_MIN,
  });

export const useTasksCount = () =>
  useQuery({
    queryKey: ["dashboard", "tasks", "count"],
    queryFn: fetchTasksTotal,
    staleTime: FIVE_MIN,
  });

export const useLeadsCount = () =>
  useQuery({
    queryKey: ["dashboard", "leads", "count"],
    queryFn: () => fetchCount("leads"),
    staleTime: FIVE_MIN,
  });

export const useInvoicesCount = () =>
  useQuery({
    queryKey: ["dashboard", "invoices", "count"],
    queryFn: () => fetchCount("invoices"),
    staleTime: FIVE_MIN,
  });

export const useCustomersCount = () =>
  useQuery({
    queryKey: ["dashboard", "customers", "count"],
    queryFn: () => fetchCount("customers"),
    staleTime: FIVE_MIN,
  });

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
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/my/tasks-summary`, {
    headers: { ...(token ? { authtoken: token } : {}) },
  });
  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { ...EMPTY_SUMMARY, ...(body?.data || {}) };
}

export const useMyTasksSummary = () =>
  useQuery({
    queryKey: ["dashboard", "my-tasks-summary"],
    queryFn: fetchMyTasksSummary,
    staleTime: 60 * 1000, // fresher than the other tiles — this is "my" data
    refetchInterval: 5 * 60 * 1000,
  });
