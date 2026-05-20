import { useQuery } from "@tanstack/react-query";
import * as api from "../api";

/**
 * Dashboard summary counts. Hits 4 endpoints in parallel via React Query.
 * Each is its own query so they cache independently and we know exactly which
 * one failed if any.
 */
export function useProjectsCount() {
  return useQuery({
    queryKey: ["projects", "all"],
    queryFn: () => api.getProjects(),
    select: (d) => (Array.isArray(d) ? d.length : 0),
  });
}

export function useTasksCount() {
  return useQuery({
    queryKey: ["tasks", "all"],
    queryFn: () => api.getTasks(),
    select: (d) => (Array.isArray(d) ? d.length : 0),
  });
}

export function useLeadsCount() {
  return useQuery({
    queryKey: ["leads", "all"],
    queryFn: () => api.getLeads(),
    select: (d) => (Array.isArray(d) ? d.length : 0),
  });
}

export function useInvoicesCount() {
  return useQuery({
    queryKey: ["invoices", "all"],
    queryFn: () => api.getInvoices(),
    select: (d) => (Array.isArray(d) ? d.length : 0),
  });
}
