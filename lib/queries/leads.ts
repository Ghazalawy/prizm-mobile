import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type LeadListItem = {
  id: number;
  name: string;
  company: string | null;
  email: string | null;
  phonenumber: string | null;
  status: number;
  source: number;
  assigned: number | null;
  dateadded: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  website: string | null;
  address: string | null;
  state: string | null;
  zip: string | null;
  contact: string | null;
  title: string | null;
  is_public: string | null;
  lastcontact: string | null;
  lost: number | null;
  // Joined fields the API sometimes includes
  status_name?: string;
  source_name?: string;
  assigned_name?: string;
};

export type LeadSource = {
  id: number;
  name: string;
};

export type LeadStatus = {
  id: number;
  name: string;
  color: string;
  isdefault?: number;
  statusorder?: number;
};

// ─── Filters ─────────────────────────────────────────────────────────────

export type LeadFilters = {
  status?: string;
  source?: string;
  assigned?: string;
  search?: string;
  limit?: number;
};

// ─── Queries ─────────────────────────────────────────────────────────────

export function useLeadsList(filters?: LeadFilters) {
  return useQuery({
    queryKey: ["leads", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 500 };
      if (filters?.status) params.status = filters.status;
      if (filters?.source) params.source = filters.source;
      if (filters?.assigned) params.assigned = filters.assigned;

      let endpoint = "leads";
      if (filters?.search) {
        endpoint = `leads/search/${encodeURIComponent(filters.search)}`;
      } else {
        const qs = Object.entries(params)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join("&");
        endpoint = `leads?${qs}`;
      }
      const data = await apiRequest(endpoint);
      return normalizeList(data).items as LeadListItem[];
    },
    staleTime: 60 * 1000,
  });
}

export function useLeadDetail(id: string | number) {
  return useQuery({
    queryKey: ["leads", "detail", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`leads/${id}`);
      if (Array.isArray(data)) return data[0] as LeadListItem;
      if (data?.data) return (Array.isArray(data.data) ? data.data[0] : data.data) as LeadListItem;
      return data as LeadListItem;
    },
    enabled: !!id,
  });
}

export function useLeadSources() {
  return useQuery({
    queryKey: ["leads", "sources"],
    queryFn: async () => {
      try {
        const data = await apiRequest("leads/sources");
        return normalizeList(data).items as LeadSource[];
      } catch {
        try {
          const fallback = await apiRequest("lead_sources");
          return normalizeList(fallback).items as LeadSource[];
        } catch {
          return [] as LeadSource[];
        }
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useLeadStatuses() {
  return useQuery({
    queryKey: ["leads", "statuses"],
    queryFn: async () => {
      try {
        const data = await apiRequest("leads/statuses");
        return normalizeList(data).items as LeadStatus[];
      } catch {
        try {
          const fallback = await apiRequest("lead_statuses");
          return normalizeList(fallback).items as LeadStatus[];
        } catch {
          return [] as LeadStatus[];
        }
      }
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useLeadNotes(leadId: string | number) {
  return useQuery({
    queryKey: ["leads", String(leadId), "notes"],
    queryFn: async () => normalizeList(await apiRequest(`leads/notes?lead_id=${leadId}`)),
    enabled: !!leadId,
    staleTime: 60 * 1000,
  });
}

export function useAddLeadNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, description }: { leadId: string | number; description: string }) =>
      apiRequest("leads/notes", {
        method: "POST",
        body: JSON.stringify({ lead_id: leadId, description }),
      }),
    onSuccess: (_, { leadId }) => {
      qc.invalidateQueries({ queryKey: ["leads", String(leadId), "notes"] });
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────

export function useChangeLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string | number; status: number }) => {
      return apiRequest(`leads/${leadId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["crud", "leads"] });
    },
  });
}

export function useConvertToCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string | number) => {
      return apiRequest(`leads/${leadId}/convert_to_customer`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["crud", "leads"] });
      qc.invalidateQueries({ queryKey: ["crud", "customers"] });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string | number) => {
      return apiRequest(`leads/${leadId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["crud", "leads"] });
    },
  });
}

export function useMarkLeadLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string | number) =>
      apiRequest(`leads/${leadId}/mark_lost`, { method: "PUT", body: JSON.stringify({}) }),
    onSuccess: (_, leadId) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads", "detail", String(leadId)] });
    },
  });
}

export function useMarkLeadJunk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string | number) =>
      apiRequest(`leads/${leadId}/mark_junk`, { method: "PUT", body: JSON.stringify({}) }),
    onSuccess: (_, leadId) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads", "detail", String(leadId)] });
    },
  });
}
