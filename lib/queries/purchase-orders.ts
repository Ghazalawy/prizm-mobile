import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type PurchaseOrder = {
  id: number;
  title?: string | null;
  sequence_number?: number | null;
  display_code?: string | null;
  supplier_id: number | null;
  supplier_name?: string | null;
  status: number | string | null;
  total_amount: string | number | null;
  currency_id: number | null;
  currency_symbol?: string | null;
  date_created?: string | null;
  delivery_date?: string | null;
  notes?: string | null;
  project_id?: number | null;
  department_id?: number | null;
  staff_id?: number | null;
};

export type OrderItem = {
  id: number;
  order_id?: number;
  name: string | null;
  item_long_name?: string | null;
  spec?: string | null;
  item_unit?: string | null;
  qty: string | number | null;
  rate: string | number | null;
  subtotal?: string | number | null;
  status?: string | null;
};

// ─── Orders CRUD ─────────────────────────────────────────────────────────

export function usePurchaseOrdersList(filters?: { search?: string; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ["purchase-orders", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.search) params.search = filters.search;
      if (filters?.status) params.status = filters.status;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`purchase_api/orders?${qs}`)).items as PurchaseOrder[];
    },
    staleTime: 30_000,
  });
}

export function usePurchaseOrderDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ["purchase-orders", "detail", String(id)],
    queryFn: async () => (await apiRequest(`purchase_api/orders/${id}`))?.data as PurchaseOrder,
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("purchase_api/orders", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`purchase_api/orders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["purchase-orders", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["purchase-orders", "list"] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/orders/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); },
  });
}

// ─── Order Items ─────────────────────────────────────────────────────────

export function useOrderItems(orderId: string | number | undefined) {
  return useQuery({
    queryKey: ["purchase-orders", "items", String(orderId)],
    queryFn: async () => {
      // Items are typically returned as part of the order detail; this is a separate fetch if needed
      const data = await apiRequest(`purchase_api/order_items?order_id=${orderId}`);
      return normalizeList(data).items as OrderItem[];
    },
    enabled: !!orderId,
  });
}

export function useAddOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("purchase_api/order_items", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["purchase-orders", "items", String(vars.order_id)] });
    },
  });
}

export function useUpdateOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`purchase_api/order_items/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders", "items"] }); },
  });
}

export function useDeleteOrderItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/order_items/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders", "items"] }); },
  });
}

// ─── Order Workflow ──────────────────────────────────────────────────────

export function useApprovePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string | number; comment?: string }) =>
      apiRequest(`purchase_api/orders/${id}/approve`, { method: "POST", body: JSON.stringify({ comment }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["purchase-orders", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["purchase-orders", "list"] });
    },
  });
}

export function useRejectPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string | number; reason?: string }) =>
      apiRequest(`purchase_api/orders/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["purchase-orders", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["purchase-orders", "list"] });
    },
  });
}

export function useMarkOrderPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/orders/${id}/mark_paid`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["purchase-orders", "detail", String(id)] });
      qc.invalidateQueries({ queryKey: ["purchase-orders", "list"] });
    },
  });
}

export function useMarkOrderReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/orders/${id}/mark_received`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["purchase-orders", "detail", String(id)] });
      qc.invalidateQueries({ queryKey: ["purchase-orders", "list"] });
    },
  });
}

export function useSendOrderToSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/orders/${id}/send_to_supplier`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["purchase-orders", "detail", String(id)] });
      qc.invalidateQueries({ queryKey: ["purchase-orders", "list"] });
    },
  });
}

// ─── Order Approval Detail ───────────────────────────────────────────────
// (reuses the PRApproval shape from purchase-request.ts)

export function usePurchaseOrderApproval(orderId: string | number | undefined) {
  return useQuery({
    queryKey: ["purchase-orders", "approval", String(orderId)],
    queryFn: async () => (await apiRequest(`purchase_api/orders/${orderId}/approval`))?.data,
    enabled: !!orderId,
    staleTime: 30_000,
  });
}
