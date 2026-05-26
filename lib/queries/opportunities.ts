import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, buildQS, type ListParams } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type OpportunityListItem = {
  opportunity_id: number;
  opportunity_code: string;
  opportunity_name: string;
  partner_id: number | null;
  company: string | null;
  staff_name: string | null;
  resonsible_staff_name: string | null;
  stage: number | string;
  status: string;
  estimated_price: string | null;
  client_price: string | null;
  start_date: string | null;
  end_date: string | null;
  expiry_date: string | null;
  priority: string | null;
  progress: string | null;
  opportunity_type: string | null;
  summary: string | null;
  created_at: string | null;
};

export type OpportunityDetail = OpportunityListItem & {
  cost_center_id: number | null;
  partner_code: string | null;
  responsible_id: number | null;
  staff_id: number | null;
  initialized: number | null;
  site_visit: number | null;
  resources_inquiry: number | null;
  estimation: number | null;
  review: number | null;
  submission: number | null;
  opportunity_job_type: string | null;
  opportunity_field: string | null;
  business_sector: string | null;
  entity: string | null;
  country: string | null;
  partner_reference: string | null;
  teams_channel: string | null;
  project_id: number | null;
  Is_converted_to_project: number | null;
  estimated_hours: string | null;
};

export type OpportunityStage = {
  id: number;
  stage_name: string;
  stage_level: number;
  color?: string | null;
};

export type OpportunityNote = {
  id: number;
  opportunity_id: number;
  content: string;
  staff_id: number;
  staff_name?: string;
  created_at?: string;
};

export type OpportunityBOQ = {
  boq: { id: number; rel_id: number; rel_type: string } | null;
  items: OpportunityBOQItem[];
};

export type OpportunityBOQItem = {
  id: number;
  boq_id: number;
  item_no: string | null;
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
  created_at: string | null;
};

export type OpportunityFilters = {
  search?: string;
  status?: string;
  stage?: string | number;
  client_id?: string | number;
  limit?: number;
  offset?: number;
};

// ─── List ────────────────────────────────────────────────────────────────

export function useOpportunitiesList(filters?: OpportunityFilters) {
  return useQuery({
    queryKey: ["opportunities", "list", filters],
    queryFn: async () => {
      const params: ListParams = {
        limit: filters?.limit ?? 200,
        offset: filters?.offset ?? 0,
      };
      if (filters?.search) params.search = filters.search;
      if (filters?.status) params.status = filters.status;
      if (filters?.stage) params.stage = String(filters.stage);
      if (filters?.client_id) params.client_id = String(filters.client_id);
      const data = await apiRequest(`opportunities_api/data${buildQS(params)}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return { items: data.data as OpportunityListItem[], total: data.data.length };
      }
      return { items: [] as OpportunityListItem[], total: 0 };
    },
    staleTime: 60_000,
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────

export function useOpportunityDetail(id: string | number) {
  return useQuery({
    queryKey: ["opportunity", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`opportunities_api/data/${id}`);
      if (data?.status === true && data.data) {
        return data.data as OpportunityDetail;
      }
      return data;
    },
    enabled: !!id,
  });
}

// ─── Stages ──────────────────────────────────────────────────────────────

export function useOpportunityStages() {
  return useQuery({
    queryKey: ["opportunities", "stages"],
    queryFn: async () => {
      const data = await apiRequest("opportunities_api/stages");
      if (data?.status === true && Array.isArray(data.data)) {
        return data.data as OpportunityStage[];
      }
      return [];
    },
    staleTime: 5 * 60_000,
  });
}

// ─── BOQ ─────────────────────────────────────────────────────────────────

export function useOpportunityBOQ(oppId: string | number) {
  return useQuery({
    queryKey: ["opportunity", "boq", String(oppId)],
    queryFn: async () => {
      const data = await apiRequest(`opportunities_api/boq/${oppId}`);
      if (data?.status === true && data.data) {
        return data.data as OpportunityBOQ;
      }
      return { boq: null, items: [] } as OpportunityBOQ;
    },
    enabled: !!oppId,
  });
}

// ─── Notes ───────────────────────────────────────────────────────────────

export function useOpportunityNotes(oppId: string | number) {
  return useQuery({
    queryKey: ["opportunity", "notes", String(oppId)],
    queryFn: async () => {
      const data = await apiRequest(`opportunities_api/notes/${oppId}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return data.data as OpportunityNote[];
      }
      return [];
    },
    enabled: !!oppId,
  });
}

export function useAddOpportunityNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { opportunity_id: number; content: string; staff_id?: number }) =>
      apiRequest("opportunities_api/notes", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, { opportunity_id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", "notes", String(opportunity_id)] });
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────

export function useSubmitForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, staff_overrides }: { id: number; staff_overrides?: Record<string, number> }) =>
      apiRequest(`opportunities_api/submit/${id}`, {
        method: "POST",
        body: JSON.stringify(staff_overrides ? { staff_overrides } : {}),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", String(id)] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useChangeStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage_id }: { id: number; stage_id: number }) =>
      apiRequest(`opportunities_api/${id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ stage_id }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", String(id)] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useChangeOpportunityStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status_id }: { id: number; status_id: number }) =>
      apiRequest(`opportunities_api/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status_id }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", String(id)] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useDeleteOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`opportunities_api/data/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}
