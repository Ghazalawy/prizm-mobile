import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

// ─── Helpers ─────────────────────────────────────────────────────────────

function unwrapDetail(data: any): any {
  if (data?.status === true && data.data) {
    return Array.isArray(data.data) ? data.data[0] : data.data;
  }
  if (Array.isArray(data)) return data[0];
  return data;
}

function parseLineItems(row: any): any[] {
  const raw = row?.items ?? row?.newitems ?? row?.lineitems ?? [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && raw !== null) return Object.values(raw);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseTaxes(row: any): any[] {
  const raw = row?.taxes ?? row?.tax_data ?? [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ─── Invoice ─────────────────────────────────────────────────────────────

export function useInvoiceDetail(id: string | number) {
  return useQuery({
    queryKey: ["invoice", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`invoices/${id}`);
      const row = unwrapDetail(data);
      return {
        ...row,
        _items: parseLineItems(row),
        _taxes: parseTaxes(row),
        _payments: Array.isArray(row?.payments) ? row.payments : [],
      };
    },
    enabled: !!id,
  });
}

export function useInvoicePayments(invoiceId: string | number) {
  return useQuery({
    queryKey: ["invoice", String(invoiceId), "payments"],
    queryFn: async () => {
      try {
        const data = await apiRequest(`payments?invoiceid=${invoiceId}&limit=100`);
        return normalizeList(data).items;
      } catch {
        return [];
      }
    },
    enabled: !!invoiceId,
    staleTime: 30_000,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      payload,
    }: {
      invoiceId: string | number;
      payload: Record<string, any>;
    }) => {
      return apiRequest(`invoices/${invoiceId}/record_payment`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: ["invoice", String(invoiceId)] });
      qc.invalidateQueries({ queryKey: ["invoice", String(invoiceId), "payments"] });
      qc.invalidateQueries({ queryKey: ["crud", "invoices"] });
    },
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`invoices/${id}/send`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["invoice", String(id)] });
      qc.invalidateQueries({ queryKey: ["crud", "invoices"] });
    },
  });
}

export function useMarkInvoiceCancelled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`invoices/${id}/mark_cancelled`, { method: "PUT" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["invoice", String(id)] });
      qc.invalidateQueries({ queryKey: ["crud", "invoices"] });
    },
  });
}

export function useInvoiceList(filters?: { search?: string; status?: string; clientid?: string; limit?: number }) {
  return useQuery({
    queryKey: ["invoices", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200, sort: "date", sort_dir: "desc" };
      if (filters?.search) params.search = filters.search;
      if (filters?.status) params.status = filters.status;
      if (filters?.clientid) params.clientid = filters.clientid;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`invoices?${qs}`));
    },
    staleTime: 60_000,
  });
}

export function useCopyInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`invoices/${id}/copy`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["crud", "invoices"] });
    },
  });
}

export function useUnmarkInvoiceCancelled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`invoices/${id}/unmark_cancelled`, { method: "PUT" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["invoice", String(id)] });
      qc.invalidateQueries({ queryKey: ["crud", "invoices"] });
    },
  });
}

// ─── Estimate ────────────────────────────────────────────────────────────

export function useEstimateDetail(id: string | number) {
  return useQuery({
    queryKey: ["estimate", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`estimates/${id}`);
      const row = unwrapDetail(data);
      return {
        ...row,
        _items: parseLineItems(row),
        _taxes: parseTaxes(row),
      };
    },
    enabled: !!id,
  });
}

export function useSendEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`estimates/${id}/send`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["estimate", String(id)] });
      qc.invalidateQueries({ queryKey: ["crud", "estimates"] });
    },
  });
}

export function useMarkEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string | number; action: string }) =>
      apiRequest(`estimates/${id}/mark_${action}`, { method: "PUT" }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["estimate", String(id)] });
      qc.invalidateQueries({ queryKey: ["crud", "estimates"] });
    },
  });
}

export function useConvertToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`estimates/${id}/convert_to_invoice`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["estimate", String(id)] });
      qc.invalidateQueries({ queryKey: ["crud", "estimates"] });
      qc.invalidateQueries({ queryKey: ["crud", "invoices"] });
    },
  });
}

export function useEstimateList(filters?: { search?: string; status?: string; clientid?: string; limit?: number }) {
  return useQuery({
    queryKey: ["estimates", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200, sort: "date", sort_dir: "desc" };
      if (filters?.search) params.search = filters.search;
      if (filters?.status) params.status = filters.status;
      if (filters?.clientid) params.clientid = filters.clientid;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`estimates?${qs}`));
    },
    staleTime: 60_000,
  });
}

// ─── Proposal ────────────────────────────────────────────────────────────

export function useProposalDetail(id: string | number) {
  return useQuery({
    queryKey: ["proposal", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`proposals/${id}`);
      const row = unwrapDetail(data);
      return {
        ...row,
        _items: parseLineItems(row),
        _taxes: parseTaxes(row),
      };
    },
    enabled: !!id,
  });
}

export function useSendProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload?: Record<string, any> }) =>
      apiRequest(`proposals/${id}/send`, {
        method: "POST",
        body: payload ? JSON.stringify(payload) : undefined,
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["proposal", String(id)] });
      qc.invalidateQueries({ queryKey: ["crud", "proposals"] });
    },
  });
}

export function useCopyProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`proposals/${id}/copy`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crud", "proposals"] });
    },
  });
}

export function useMarkProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string | number; action: string }) =>
      apiRequest(`proposals/${id}/mark_${action}`, { method: "PUT" }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["proposal", String(id)] });
      qc.invalidateQueries({ queryKey: ["crud", "proposals"] });
    },
  });
}

export function useProposalList(filters?: { search?: string; status?: string; limit?: number }) {
  return useQuery({
    queryKey: ["proposals", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200, sort: "date", sort_dir: "desc" };
      if (filters?.search) params.search = filters.search;
      if (filters?.status) params.status = filters.status;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`proposals?${qs}`));
    },
    staleTime: 60_000,
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────

export function usePaymentsList(filters?: { invoiceid?: string; limit?: number }) {
  return useQuery({
    queryKey: ["payments", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200, sort: "date", sort_dir: "desc" };
      if (filters?.invoiceid) params.invoiceid = filters.invoiceid;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`payments?${qs}`));
    },
    staleTime: 60_000,
  });
}

export function usePaymentModes() {
  return useQuery({
    queryKey: ["payments", "modes"],
    queryFn: async () => normalizeList(await apiRequest("payments/modes")),
    staleTime: 10 * 60_000,
  });
}

// ─── Items ────────────────────────────────────────────────────────────────

export function useItemsList(filters?: { search?: string; group?: string; limit?: number }) {
  return useQuery({
    queryKey: ["items", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200 };
      if (filters?.search) params.search = filters.search;
      if (filters?.group) params.group_id = filters.group;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`items?${qs}`));
    },
    staleTime: 60_000,
  });
}

export function useItemDetail(id: string | number) {
  return useQuery({
    queryKey: ["item", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`items/${id}`);
      return unwrapDetail(data);
    },
    enabled: !!id,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest("items", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Record<string, unknown> }) =>
      apiRequest(`items/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["item", String(id)] });
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

// ─── Credit Notes ─────────────────────────────────────────────────────────

export function useCreditNoteList(filters?: { search?: string; status?: string; clientid?: string; limit?: number }) {
  return useQuery({
    queryKey: ["credit_notes", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200, sort: "date", sort_dir: "desc" };
      if (filters?.search) params.search = filters.search;
      if (filters?.status) params.status = filters.status;
      if (filters?.clientid) params.clientid = filters.clientid;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`credit_notes?${qs}`));
    },
    staleTime: 60_000,
  });
}

export function useCreditNoteDetail(id: string | number) {
  return useQuery({
    queryKey: ["credit_note", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`credit_notes/${id}`);
      return unwrapDetail(data);
    },
    enabled: !!id,
  });
}

// ─── Budget ────────────────────────────────────────────────────────────────

export function useBudgetItemsList(budgetId: string | number) {
  return useQuery({
    queryKey: ["budget", String(budgetId), "items"],
    queryFn: async () => normalizeList(await apiRequest(`budget_api/items/${budgetId}`)),
    enabled: !!budgetId,
    staleTime: 60_000,
  });
}

export function useBudgetCategories() {
  return useQuery({
    queryKey: ["budget", "categories"],
    queryFn: async () => normalizeList(await apiRequest("budget_api/categories")),
    staleTime: 10 * 60_000,
  });
}

// ─── Cost Centers ──────────────────────────────────────────────────────────

export function useCostCentersList() {
  return useQuery({
    queryKey: ["cost_centers", "list"],
    queryFn: async () => normalizeList(await apiRequest("cost_centers_api")),
    staleTime: 5 * 60_000,
  });
}

export function useCostCenterDetail(id: string | number) {
  return useQuery({
    queryKey: ["cost_center", String(id)],
    queryFn: async () => unwrapDetail(await apiRequest(`cost_centers_api/${id}`)),
    enabled: !!id,
  });
}
