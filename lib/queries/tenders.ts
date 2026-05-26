import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, buildQS, type ListParams } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type TenderListItem = {
  id: number;
  tender_number: string;
  tender_description: string;
  tenderer_name: string;
  source: string | null;
  tender_status: string;
  closing_date: string | null;
  opening_date: string | null;
  client_id: number | null;
  staff_id: number | null;
  created_at: string | null;
};

export type TenderDetail = TenderListItem & {
  description: string | null;
  notes: string | null;
  budget: string | null;
  currency: string | null;
  location: string | null;
  submission_method: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export type TenderBOQItem = {
  id: number;
  tender_id: number;
  item_no: string | null;
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
  created_at: string | null;
};

export type TenderRequirement = {
  id: number;
  tender_id: number;
  requirement: string;
  status: string;
  notes: string | null;
};

export type TenderRisk = {
  id: number;
  tender_id: number;
  risk_description: string;
  impact_level: string;
  mitigation: string | null;
  status: string | null;
};

export type TenderFilters = {
  search?: string;
  status?: string;
  source?: string;
  limit?: number;
  offset?: number;
};

// ─── List ────────────────────────────────────────────────────────────────

export function useTendersList(filters?: TenderFilters) {
  return useQuery({
    queryKey: ["tenders", "list", filters],
    queryFn: async () => {
      const params: ListParams = {
        limit: filters?.limit ?? 200,
        offset: filters?.offset ?? 0,
      };
      if (filters?.search) params.search = filters.search;
      if (filters?.status) params.status = filters.status;
      if (filters?.source) params.source = filters.source;
      const data = await apiRequest(`tenders_api/data${buildQS(params)}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return { items: data.data, total: data.data.length };
      }
      return { items: [], total: 0 };
    },
    staleTime: 60_000,
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────

export function useTenderDetail(id: string | number) {
  return useQuery({
    queryKey: ["tender", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`tenders_api/data/${id}`);
      if (data?.status === true && data.data) {
        return data.data as TenderDetail;
      }
      return data;
    },
    enabled: !!id,
  });
}

// ─── BOQ ─────────────────────────────────────────────────────────────────

export function useTenderBOQ(tenderId: string | number) {
  return useQuery({
    queryKey: ["tender", "boq", String(tenderId)],
    queryFn: async () => {
      const data = await apiRequest(`tenders_api/boq/${tenderId}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return data.data as TenderBOQItem[];
      }
      return [];
    },
    enabled: !!tenderId,
  });
}

// ─── Requirements ────────────────────────────────────────────────────────

export function useTenderRequirements(tenderId: string | number) {
  return useQuery({
    queryKey: ["tender", "requirements", String(tenderId)],
    queryFn: async () => {
      const data = await apiRequest(`tenders_api/requirements/${tenderId}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return data.data as TenderRequirement[];
      }
      return [];
    },
    enabled: !!tenderId,
  });
}

// ─── Risks ───────────────────────────────────────────────────────────────

export function useTenderRisks(tenderId: string | number) {
  return useQuery({
    queryKey: ["tender", "risks", String(tenderId)],
    queryFn: async () => {
      const data = await apiRequest(`tenders_api/risks/${tenderId}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return data.data as TenderRisk[];
      }
      return [];
    },
    enabled: !!tenderId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────

export function useMarkTenderWon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`tenders_api/${id}/mark_won`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["tender", String(id)] });
      qc.invalidateQueries({ queryKey: ["tenders"] });
    },
  });
}

export function useMarkTenderLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`tenders_api/${id}/mark_lost`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["tender", String(id)] });
      qc.invalidateQueries({ queryKey: ["tenders"] });
    },
  });
}

export function useChangeTenderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: string }) =>
      apiRequest(`tenders_api/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ tender_status: status }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["tender", String(id)] });
      qc.invalidateQueries({ queryKey: ["tenders"] });
    },
  });
}

export function useDeleteTender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`tenders_api/data/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenders"] });
    },
  });
}
