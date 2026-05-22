import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { getAuthToken } from "../auth";

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
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return Number(j.count ?? 0);
}

async function fetchTasksTotal(): Promise<number> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/tasks?limit=1`, {
    headers: { ...(token ? { authtoken: token } : {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return Number(j.total ?? 0);
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
