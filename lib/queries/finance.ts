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
