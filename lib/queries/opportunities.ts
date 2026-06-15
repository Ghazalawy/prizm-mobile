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
    mutationFn: ({
      id,
      statusID,
      stage,
      optional,
    }: {
      id: number;
      statusID: number;
      stage: number;
      optional?: number;
    }) =>
      apiRequest(`opportunities_api/${id}/change_status`, {
        method: "POST",
        body: JSON.stringify({ statusID, stage, optional: optional ?? 0 }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", String(id)] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["opportunity", "approval", String(id)] });
    },
  });
}

/** @deprecated use useChangeStage — calls change_status POST */
export function useChangeOpportunityStatus() {
  return useChangeStage();
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest("opportunities_api/data", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useUpdateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Record<string, unknown>) =>
      apiRequest(`opportunities_api/data/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", String(id)] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useOpportunityStatuses() {
  return useQuery({
    queryKey: ["opportunities", "statuses"],
    queryFn: async () => {
      const data = await apiRequest("opportunities_api/statuses");
      if (data?.status === true && Array.isArray(data.data)) return data.data;
      return [];
    },
    staleTime: 5 * 60_000,
  });
}

export type OpportunityStatusDetailRow = {
  id?: number;
  opportunity_id?: number;
  stage?: number;
  status?: number;
  staff_id?: number;
  is_current_status?: number;
  chosen_status_id?: number;
  status_name?: string;
  stage_name?: string;
};

export function useOpportunityStatusDetail(oppId: string | number) {
  return useQuery({
    queryKey: ["opportunity", "statusdetail", String(oppId)],
    queryFn: async () => {
      const data = await apiRequest(`opportunities_api/statusdetail/${oppId}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return data.data as OpportunityStatusDetailRow[];
      }
      return [];
    },
    enabled: !!oppId,
  });
}

export type OpportunityApprovalInfo = {
  approval_info: Record<string, unknown>[];
  rejection: unknown;
  viewer_staff_id: number;
};

export function useOpportunityApprovalInfo(oppId: string | number) {
  return useQuery({
    queryKey: ["opportunity", "approval", String(oppId)],
    queryFn: async () => {
      const data = await apiRequest(`opportunities_api/approval_info/${oppId}`);
      if (data?.status === true && data.data) {
        return data.data as OpportunityApprovalInfo;
      }
      return null;
    },
    enabled: !!oppId,
  });
}

export type OpportunityMember = {
  staff_id: number;
  staff_name?: string;
  email?: string;
};

export function useOpportunityMembers(oppId: string | number) {
  return useQuery({
    queryKey: ["opportunity", "members", String(oppId)],
    queryFn: async () => {
      const data = await apiRequest(`opportunities_api/members/${oppId}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return data.data as OpportunityMember[];
      }
      return [];
    },
    enabled: !!oppId,
  });
}

export function useAddOpportunityMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { opportunity_id: number; staff_id: number }) =>
      apiRequest("opportunities_api/members", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, { opportunity_id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", "members", String(opportunity_id)] });
    },
  });
}

export function useRemoveOpportunityMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ oppId, staffId }: { oppId: number; staffId: number }) =>
      apiRequest(`opportunities_api/members/${oppId}/${staffId}`, { method: "DELETE" }),
    onSuccess: (_, { oppId }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", "members", String(oppId)] });
    },
  });
}

export function useApproveOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      request_id,
      comment,
    }: {
      id: number;
      request_id: number;
      comment?: string;
    }) =>
      apiRequest(`opportunities_api/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ request_id, comment }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", String(id)] });
      qc.invalidateQueries({ queryKey: ["opportunity", "approval", String(id)] });
      qc.invalidateQueries({ queryKey: ["opportunity", "statusdetail", String(id)] });
    },
  });
}

export function useRejectOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      request_id,
      comment,
    }: {
      id: number;
      request_id: number;
      comment?: string;
    }) =>
      apiRequest(`opportunities_api/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ request_id, comment }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", String(id)] });
      qc.invalidateQueries({ queryKey: ["opportunity", "approval", String(id)] });
    },
  });
}

export function useResubmitOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`opportunities_api/${id}/resubmit`, { method: "POST", body: "{}" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["opportunity", String(id)] });
      qc.invalidateQueries({ queryKey: ["opportunity", "approval", String(id)] });
    },
  });
}

export type OpportunityMilestone = {
  id: number;
  opportunity_id: number;
  name?: string;
  title?: string;
  due_date?: string;
  status?: string;
};

export function useOpportunityMilestones(oppId: string | number) {
  return useQuery({
    queryKey: ["opportunity", "milestones", String(oppId)],
    queryFn: async () => {
      const data = await apiRequest(`opportunities_api/milestones/${oppId}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return data.data as OpportunityMilestone[];
      }
      return [];
    },
    enabled: !!oppId,
  });
}

export function useCreateOpportunityMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest("opportunities_api/milestones", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, payload) => {
      const oid = payload.opportunity_id;
      if (oid) qc.invalidateQueries({ queryKey: ["opportunity", "milestones", String(oid)] });
    },
  });
}

export function useUpdateOpportunityMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; opportunity_id?: number } & Record<string, unknown>) =>
      apiRequest(`opportunities_api/milestone/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, { opportunity_id }) => {
      if (opportunity_id) {
        qc.invalidateQueries({ queryKey: ["opportunity", "milestones", String(opportunity_id)] });
      }
    },
  });
}

export function useDeleteOpportunityMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, opportunity_id }: { id: number; opportunity_id: number }) =>
      apiRequest(`opportunities_api/milestone/${id}`, { method: "DELETE" }),
    onSuccess: (_, { opportunity_id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", "milestones", String(opportunity_id)] });
    },
  });
}

export function useUpdateOpportunityNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content, opportunity_id }: { id: number; content: string; opportunity_id: number }) =>
      apiRequest(`opportunities_api/note/${id}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_, { opportunity_id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", "notes", String(opportunity_id)] });
    },
  });
}

export function useDeleteOpportunityNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, opportunity_id }: { id: number; opportunity_id: number }) =>
      apiRequest(`opportunities_api/note/${id}`, { method: "DELETE" }),
    onSuccess: (_, { opportunity_id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", "notes", String(opportunity_id)] });
    },
  });
}

export function useCreateOpportunityBOQItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest("opportunities_api/boq_items", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, payload) => {
      const oid = payload.opportunity_id ?? payload.rel_id;
      if (oid) qc.invalidateQueries({ queryKey: ["opportunity", "boq", String(oid)] });
    },
  });
}

export function useUpdateOpportunityBOQItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, opportunity_id, ...payload }: { id: number; opportunity_id: number } & Record<string, unknown>) =>
      apiRequest(`opportunities_api/boq_items/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, { opportunity_id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", "boq", String(opportunity_id)] });
    },
  });
}

export function useDeleteOpportunityBOQItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, opportunity_id }: { id: number; opportunity_id: number }) =>
      apiRequest(`opportunities_api/boq_items/${id}`, { method: "DELETE" }),
    onSuccess: (_, { opportunity_id }) => {
      qc.invalidateQueries({ queryKey: ["opportunity", "boq", String(opportunity_id)] });
    },
  });
}

function useOpportunityLinkedList<T>(oppId: string | number, segment: string, queryKey: string) {
  return useQuery({
    queryKey: ["opportunity", queryKey, String(oppId)],
    queryFn: async () => {
      const data = await apiRequest(`opportunities_api/${oppId}/${segment}`);
      if (data?.status === true && Array.isArray(data.data)) return data.data as T[];
      if (data?.status === true && data.data) return data.data as T;
      return [] as T[];
    },
    enabled: !!oppId,
  });
}

export function useOpportunityTasks(oppId: string | number) {
  return useOpportunityLinkedList<Record<string, unknown>>(oppId, "tasks", "tasks");
}

export function useOpportunityTimesheets(oppId: string | number) {
  return useOpportunityLinkedList<Record<string, unknown>>(oppId, "timesheets", "timesheets");
}

export function useOpportunityRFQ(oppId: string | number) {
  return useOpportunityLinkedList<Record<string, unknown>>(oppId, "rfq", "rfq");
}

export function useOpportunityTechnicalInquiries(oppId: string | number) {
  return useOpportunityLinkedList<Record<string, unknown>>(oppId, "technical_inquiries", "technical_inquiries");
}

export function useOpportunityEstimation(oppId: string | number) {
  return useOpportunityLinkedList<Record<string, unknown>>(oppId, "estimation", "estimation");
}

export function useOpportunitySuppliers(oppId: string | number) {
  return useOpportunityLinkedList<Record<string, unknown>>(oppId, "suppliers", "suppliers");
}

export function useOpportunityDiscussions(oppId: string | number) {
  return useOpportunityLinkedList<Record<string, unknown>>(oppId, "discussions", "discussions");
}

export function useCreateOpportunityDiscussion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest("opportunities_api/discussions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, payload) => {
      const oid = payload.opportunity_id;
      if (oid) qc.invalidateQueries({ queryKey: ["opportunity", "discussions", String(oid)] });
    },
  });
}

export function useOpportunityEmails(oppId: string | number) {
  return useOpportunityLinkedList<Record<string, unknown>>(oppId, "emails", "emails");
}

export function useOpportunityTenderOpsStages(oppId: string | number) {
  return useOpportunityLinkedList<Record<string, unknown>>(oppId, "tenderops_stages", "tenderops");
}

export function useOpportunityDashboard() {
  return useQuery({
    queryKey: ["opportunities", "dashboard"],
    queryFn: async () => {
      const data = await apiRequest("opportunities_api/dashboard");
      if (data?.status === true && data.data) return data.data;
      return null;
    },
    staleTime: 120_000,
  });
}

export function useConvertOpportunityToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`opportunities_api/${id}/convert`, { method: "POST", body: "{}" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["opportunity", String(id)] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function usePinOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`opportunities_api/${id}/pin`, { method: "POST", body: "{}" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["opportunity", String(id)] });
    },
  });
}

export function useArchiveOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`opportunities_api/${id}/archive`, { method: "POST", body: "{}" }),
    onSuccess: () => {
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
