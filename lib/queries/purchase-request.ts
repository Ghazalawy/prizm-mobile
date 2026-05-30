import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL } from "../config";
import { buildAuthHeaders, parseApiResponse, apiRequest, normalizeList } from "../api";
import { getSessionGeneration } from "../auth-events";

/**
 * Hooks for the Purchase Request native approval screen.
 *
 * Endpoint: GET /api/purchase_api/requests/{id}/approval
 * Returns: request header + line items + workflow stages + audit history
 * + viewer context (am I the current approver?).
 *
 * Defined here (not in lib/queries/dashboard or lib/queries/inbox) because
 * the shape is approval-specific and the screen will grow with future
 * mutations (approve / reject / add comment).
 */

export type PRLineItem = {
  id: number;
  name: string | null;
  item_long_name: string | null;
  spec: string | null;
  item_unit: string | null;
  qty: string | number | null;
  rate: string | number | null;
  subtotal: string | number | null;
  status: string | null;
  approved_qty: string | number | null;
  approved_price: string | number | null;
};

export type PRStage = {
  id: number;
  status_name: string;
  color: string | null;
  order_in_list: number;
  stageID: number;
  is_optional: number | boolean;
  is_final: number | boolean;
  approvers: Array<{ staffid: number; name: string }>;
};

/**
 * One row from tblprzpurcahse_req_statusdetail — the canonical
 * "this approver's seat at this PR's stage" record. Each PR has one of
 * these per (approver × stage) combination. The viewer's actionable
 * row is the one with approver=me, is_current_status=1, status not
 * yet 'Approved'/'Rejected'.
 */
export type PRApprovalRow = {
  statusDetailID: number;
  statusID: number;
  approver: number;
  approver_name: string | null;
  approver_profile_image?: string | null;
  requester: number | null;
  requester_name: string | null;
  requester_profile_image?: string | null;
  status: string;            // 'Submitted', 'Approved', 'Rejected', ...
  is_current_status: number;
  is_optional: number;
  is_final: number;
  stageID: number;
  stageLevel: number | null;
  order_in_list: number;
  status_name: string | null;
  color: string | null;
  rejection_reason: string | null;
  addeddate: string | null;
  updateddate: string | null;
  /** True only for the row the viewer should act on (server-computed). */
  can_act_now: boolean;
};

export type PRHeader = {
  id: number;
  staff_id: number;
  title: string | null;
  request_title?: string | null;
  /** Internal counter (not user-facing). */
  number: number | null;
  prefix: string | null;
  /** User-facing PR number — what the web shows as "PR-26050023". */
  sequence_number: number | null;
  /** Server-formatted "PR-{sequence_number}" — preferred display. */
  display_code: string | null;
  display_number?: string | null;
  web_path?: string | null;
  approval_endpoint?: string | null;
  status: number | string | null;
  total_amount: string | null;
  requested_date: string | null;
  department_id: number | null;
  department_name: string | null;
  currency_id: number | null;
  currency_symbol: string | null;
  currency_name: string | null;
  cost_centers: Array<{ id: number; code: string; title: string }>;
  notes: string | null;
  rel_type: string | null;
  rel_id: number | null;
  project_id: number | null;
  requester_name: string | null;
  requester_profile_image: string | null;
};

export type PRAttachment = {
  id: number;
  file_name: string;
  filetype: string;
  dateadded: string;
  staffid: number;
};

export type PRActivityLogItem = {
  id: number;
  log_details: string;
  add_date: string;
  staff_id: number;
  staff_name: string;
  profile_image: string | null;
};

export type PRQuotationSummaryRow = {
  supplier_id: number;
  supplier_name: string;
  currency_id: number;
  supplier_total: number;
  items_quoted: number;
};

export type PRApproval = {
  kind?: PurchaseApprovalKind;
  label?: string;
  endpoint?: string;
  web_path?: string;
  request: PRHeader;
  line_items: PRLineItem[];
  /** All approval-row records for this PR (per-approver-per-stage). */
  approval_rows: PRApprovalRow[];
  attachments: PRAttachment[];
  activity_log: PRActivityLogItem[];
  quotation_summary: PRQuotationSummaryRow[];
  viewer: {
    staffid: number;
    is_current_approver: boolean;
    is_submitter: boolean;
    current_status: number;
    /** The specific statusDetailID this viewer should pass to the
     *  approve/reject endpoint. 0 if no actionable row exists. */
    actionable_status_detail_id: number;
  };
};

export type PurchaseApprovalKind =
  | "purchase_request"
  | "purchase_order"
  | "payment_request"
  | "expense_request";

const ENDPOINT_BY_KIND: Record<PurchaseApprovalKind, string> = {
  purchase_request: "requests",
  purchase_order: "orders",
  payment_request: "payment_requests",
  expense_request: "expense_requests",
};

async function fetchPurchaseApproval(kind: PurchaseApprovalKind, id: number): Promise<PRApproval> {
  const gen = getSessionGeneration();
  const headers = await buildAuthHeaders();
  const endpoint = ENDPOINT_BY_KIND[kind];
  const res = await fetch(`${API_URL}/purchase_api/${endpoint}/${id}/approval`, { headers });
  const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"], gen);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error((body && (body as any).message) || `HTTP ${res.status}`);
  if (!body?.status) throw new Error((body && (body as any).message) || "Request failed");
  return { kind, ...(body as any).data } as PRApproval;
}

async function fetchPRApproval(id: number): Promise<PRApproval> {
  return fetchPurchaseApproval("purchase_request", id);
}

export function usePurchaseApproval(kind: PurchaseApprovalKind, id: number | null | undefined) {
  return useQuery({
    queryKey: ["purchase_approval", kind, id],
    queryFn: () => fetchPurchaseApproval(kind, id as number),
    enabled: typeof id === "number" && id > 0,
    staleTime: 30 * 1000,
  });
}

export function usePRApproval(id: number | null | undefined) {
  return useQuery({
    queryKey: ["purchase_request_approval", id],
    queryFn: () => fetchPRApproval(id as number),
    enabled: typeof id === "number" && id > 0,
    staleTime: 30 * 1000,
  });
}

// ─── Purchase Requests CRUD ──────────────────────────────────────────────

export type PurchaseRequest = {
  id: number;
  title?: string | null;
  sequence_number?: number | null;
  display_code?: string | null;
  status: number | string | null;
  total_amount: string | number | null;
  staff_id?: number | null;
  department_id?: number | null;
  department_name?: string | null;
  currency_id?: number | null;
  currency_symbol?: string | null;
  project_id?: number | null;
  requested_date?: string | null;
  notes?: string | null;
  date_created?: string | null;
};

export function usePurchaseRequestsList(filters?: { search?: string; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ["purchase-requests", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.search) params.search = filters.search;
      if (filters?.status) params.status = filters.status;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const data = await apiRequest(`purchase_api/requests?${qs}`);
      return normalizeList(data).items as PurchaseRequest[];
    },
    staleTime: 30_000,
  });
}

export function usePurchaseRequestDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ["purchase-requests", "detail", String(id)],
    queryFn: async () => (await apiRequest(`purchase_api/requests/${id}`))?.data as PurchaseRequest,
    enabled: !!id,
  });
}

export function useCreatePurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("purchase_api/requests", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests"] }); },
  });
}

export function useUpdatePurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`purchase_api/requests/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["purchase-requests", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["purchase-requests", "list"] });
    },
  });
}

export function useDeletePurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/requests/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests"] }); },
  });
}

// ─── Request Items ───────────────────────────────────────────────────────

export function useRequestItems(requestId: string | number | undefined) {
  return useQuery({
    queryKey: ["purchase-requests", "items", String(requestId)],
    queryFn: async () => {
      const data = await apiRequest(`purchase_api/request_items?request_id=${requestId}`);
      return normalizeList(data).items as PRLineItem[];
    },
    enabled: !!requestId,
  });
}

export function useAddRequestItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("purchase_api/request_items", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests", "items"] }); },
  });
}

export function useUpdateRequestItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`purchase_api/request_items/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests", "items"] }); },
  });
}

export function useDeleteRequestItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/request_items/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-requests", "items"] }); },
  });
}

// ─── Request Workflow ────────────────────────────────────────────────────

export function useApprovePurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string | number; comment?: string }) =>
      apiRequest(`purchase_api/requests/${id}/approve`, { method: "POST", body: JSON.stringify({ comment }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["purchase-requests", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["purchase-requests", "list"] });
    },
  });
}

export function useRejectPurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string | number; reason?: string }) =>
      apiRequest(`purchase_api/requests/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["purchase-requests", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["purchase-requests", "list"] });
    },
  });
}

export function useClosePurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/requests/${id}/close`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["purchase-requests", "detail", String(id)] });
      qc.invalidateQueries({ queryKey: ["purchase-requests", "list"] });
    },
  });
}

export function usePublishPurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/requests/${id}/publish`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["purchase-requests", "detail", String(id)] });
      qc.invalidateQueries({ queryKey: ["purchase-requests", "list"] });
    },
  });
}

// ─── Payment Requests ────────────────────────────────────────────────────

export function usePaymentRequestsList(filters?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: ["payment-requests", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.search) params.search = filters.search;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`purchase_api/payment_requests?${qs}`)).items;
    },
    staleTime: 30_000,
  });
}

export function usePaymentRequestApproval(id: string | number | undefined) {
  return useQuery({
    queryKey: ["payment-requests", "approval", String(id)],
    queryFn: async () => (await apiRequest(`purchase_api/payment_requests/${id}/approval`))?.data,
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useApprovePaymentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string | number; comment?: string }) =>
      apiRequest(`purchase_api/payment_requests/${id}/approve`, { method: "POST", body: JSON.stringify({ comment }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["payment-requests", "approval", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["payment-requests", "list"] });
    },
  });
}

export function useRejectPaymentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string | number; reason?: string }) =>
      apiRequest(`purchase_api/payment_requests/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["payment-requests", "approval", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["payment-requests", "list"] });
    },
  });
}

// ─── Expense Requests ────────────────────────────────────────────────────

export function useExpenseRequestsList(filters?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: ["expense-requests", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.search) params.search = filters.search;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`purchase_api/expense_requests?${qs}`)).items;
    },
    staleTime: 30_000,
  });
}

export function useExpenseRequestApproval(id: string | number | undefined) {
  return useQuery({
    queryKey: ["expense-requests", "approval", String(id)],
    queryFn: async () => (await apiRequest(`purchase_api/expense_requests/${id}/approval`))?.data,
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useApproveExpenseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string | number; comment?: string }) =>
      apiRequest(`purchase_api/expense_requests/${id}/approve`, { method: "POST", body: JSON.stringify({ comment }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["expense-requests", "approval", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["expense-requests", "list"] });
    },
  });
}

export function useRejectExpenseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string | number; reason?: string }) =>
      apiRequest(`purchase_api/expense_requests/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["expense-requests", "approval", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["expense-requests", "list"] });
    },
  });
}
