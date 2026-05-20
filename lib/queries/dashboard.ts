import { useQuery } from "@tanstack/react-query";
import * as api from "../api";
import { normalizeList } from "../api";

/**
 * Dashboard summary counts. Each endpoint returns a different shape:
 *   - tasks API   → { status, data: [...], total, limit, offset }   (paginated)
 *   - others      → plain array
 * normalizeList handles both.
 *
 * To avoid downloading the entire list just to count it, ask the server for a
 * single row and read `total` (when paginated) or fall back to array length.
 */

export function useProjectsCount() {
  // Projects API doesn't honor limit — falls back to array length client-side.
  return useQuery({
    queryKey: ["projects", "count"],
    queryFn: async () => normalizeList(await api.getProjects()).total,
  });
}

export function useTasksCount() {
  return useQuery({
    queryKey: ["tasks", "count"],
    queryFn: async () => normalizeList(await api.getTasks({ limit: 1 })).total,
  });
}

export function useLeadsCount() {
  return useQuery({
    queryKey: ["leads", "count"],
    queryFn: async () => normalizeList(await api.getLeads()).total,
  });
}

export function useInvoicesCount() {
  return useQuery({
    queryKey: ["invoices", "count"],
    queryFn: async () => normalizeList(await api.getInvoices()).total,
  });
}

export function useCustomersCount() {
  return useQuery({
    queryKey: ["customers", "count"],
    queryFn: async () => normalizeList(await api.getCustomers()).total,
  });
}
