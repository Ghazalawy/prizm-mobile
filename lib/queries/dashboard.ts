import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL } from "../config";
import { buildAuthHeaders, parseApiResponse } from "../api";
import { getSessionGeneration } from "../auth-events";
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
  const gen = getSessionGeneration();
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/${module}/count`, {
    headers,
  });
  const token = headers["authtoken"];
  const { body, invalidToken } = await parseApiResponse(res, !!token, gen);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Number(body?.count ?? 0);
}

async function fetchTasksTotal(): Promise<number> {
  const gen = getSessionGeneration();
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/tasks?limit=1`, {
    headers,
  });
  const token = headers["authtoken"];
  const { body, invalidToken } = await parseApiResponse(res, !!token, gen);
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
  const gen = getSessionGeneration();
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/my/tasks-summary`, {
    headers,
  });
  const token = headers["authtoken"];
  const { body, invalidToken } = await parseApiResponse(res, !!token, gen);
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

// ─── Pending Approvals (Dashboard "Approvals" widgets) ─────────────────

export type PendingApprovalsData = {
  total: number;
  by_type: {
    purchase_request: number;
    leave: number;
    timesheet: number;
  };
  items: Array<{
    id: number;
    subject: string;
    date: string;
    type: string;
  }>;
};

const EMPTY_APPROVALS: PendingApprovalsData = {
  total: 0,
  by_type: { purchase_request: 0, leave: 0, timesheet: 0 },
  items: [],
};

async function fetchPendingApprovals(detail: boolean): Promise<PendingApprovalsData> {
  const gen = getSessionGeneration();
  const headers = await buildAuthHeaders();
  const url = `${API_URL}/my/pending-approvals${detail ? "?detail=1" : ""}`;
  const res = await fetch(url, { headers });
  const token = headers["authtoken"];
  const { body, invalidToken } = await parseApiResponse(res, !!token, gen);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { ...EMPTY_APPROVALS, ...(body?.data || {}) };
}

export const usePendingApprovals = (detail = false) => {
  const scope = useDashboardQueryScope();
  return useQuery({
    queryKey: ["dashboard", "pending-approvals", detail, scope],
    queryFn: () => fetchPendingApprovals(detail),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

// ─── Checkin Status (Attendance widget) ────────────────────────────────

export type CheckinStatusData = {
  is_checked_in: boolean;
  checked_in_at?: string;
  total_today_hours?: number;
};

async function fetchCheckinStatus(): Promise<CheckinStatusData> {
  const gen = getSessionGeneration();
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/my/checkin/today`, { headers });
  const token = headers["authtoken"];
  const { body, invalidToken } = await parseApiResponse(res, !!token, gen);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = body?.data || {};
  return {
    is_checked_in: !!data.is_checked_in,
    checked_in_at: data.checked_in_at,
    total_today_hours: data.total_today_hours,
  };
}

export const useCheckinStatus = () => {
  const scope = useDashboardQueryScope();
  return useQuery({
    queryKey: ["dashboard", "checkin-status", scope],
    queryFn: fetchCheckinStatus,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
};

// ─── Expenses Summary (Dashboard expense widgets) ─────────────────────

export type ExpensesSummaryData = {
  total_amount: number;
  pending_count: number;
  by_category: Array<{
    name: string;
    count: number;
    amount: number;
  }>;
};

const EMPTY_EXPENSES_SUMMARY: ExpensesSummaryData = {
  total_amount: 0,
  pending_count: 0,
  by_category: [],
};

async function fetchExpensesSummary(): Promise<ExpensesSummaryData> {
  const gen = getSessionGeneration();
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/my/expenses-summary`, { headers });
  const token = headers["authtoken"];
  const { body, invalidToken } = await parseApiResponse(res, !!token, gen);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { ...EMPTY_EXPENSES_SUMMARY, ...(body?.data || {}) };
}

export const useExpensesSummary = () => {
  const scope = useDashboardQueryScope();
  return useQuery({
    queryKey: ["dashboard", "expenses-summary", scope],
    queryFn: fetchExpensesSummary,
    staleTime: FIVE_MIN,
  });
};

// ─── Dashboard Profile API hooks (Dashboard_api.php) ──────────────────────
import { apiRequest } from "../api";

export function useDashboardProfile() { return useQuery({ queryKey: ["dashboard","profile_api"], queryFn: async () => (await apiRequest("dashboard_api/profile"))?.data, staleTime: 30_000 }); }
export function useUpdateDashboardProfile() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("dashboard_api/profile",{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["dashboard"]}); } }); }
export function useDeleteDashboardOverride() { const qc = useQueryClient(); return useMutation({ mutationFn: async () => apiRequest("dashboard_api/override",{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["dashboard"]}); } }); }
export function useDashboardWidgets() { return useQuery({ queryKey: ["dashboard","widgets"], queryFn: async () => (await apiRequest("dashboard_api/widgets"))?.data, staleTime: 30_000 }); }
export function useDashboardProfiles() { return useQuery({ queryKey: ["dashboard","profiles"], queryFn: async () => (await apiRequest("dashboard_api/profiles"))?.data, staleTime: 60_000 }); }
