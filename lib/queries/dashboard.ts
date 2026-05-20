import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { getAuthToken } from "../auth";

/**
 * Dashboard count tiles. Each tile hits a dedicated /api/<module>/count
 * endpoint that returns { count: N } from a single SELECT COUNT(*) query —
 * no row download. CRM-side endpoints added in ERP v2.4.4.
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

export const useProjectsCount = () =>
  useQuery({ queryKey: ["projects", "count"], queryFn: () => fetchCount("projects") });

export const useTasksCount = () =>
  useQuery({ queryKey: ["tasks", "count"], queryFn: fetchTasksTotal });

export const useLeadsCount = () =>
  useQuery({ queryKey: ["leads", "count"], queryFn: () => fetchCount("leads") });

export const useInvoicesCount = () =>
  useQuery({ queryKey: ["invoices", "count"], queryFn: () => fetchCount("invoices") });

export const useCustomersCount = () =>
  useQuery({ queryKey: ["customers", "count"], queryFn: () => fetchCount("customers") });
