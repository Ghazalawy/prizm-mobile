import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type Quotation = {
  id: number;
  title?: string | null;
  sequence_number?: number | null;
  display_code?: string | null;
  status: number | string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  total_amount?: string | number | null;
  date_created?: string | null;
};

export function useQuotationsList(filters?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: ["quotations", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.search) params.search = filters.search;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`purchase_api/quotations?${qs}`)).items as Quotation[];
    },
    staleTime: 30_000,
  });
}

export function useQuotationApproval(id: string | number | undefined) {
  return useQuery({
    queryKey: ["quotations", "approval", String(id)],
    queryFn: async () => (await apiRequest(`purchase_api/quotations/${id}/approval`))?.data,
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useApproveQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string | number; comment?: string }) =>
      apiRequest(`purchase_api/quotations/${id}/approve`, { method: "POST", body: JSON.stringify({ comment }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quotations", "approval", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["quotations", "list"] });
    },
  });
}

export function useRejectQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string | number; reason?: string }) =>
      apiRequest(`purchase_api/quotations/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quotations", "approval", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["quotations", "list"] });
    },
  });
}

export function useSupplierQuotations(supplierId: string | number | undefined) {
  return useQuery({
    queryKey: ["quotations", "supplier", String(supplierId)],
    queryFn: async () => normalizeList(await apiRequest(`purchase_api/supplier_quotations?supplier_id=${supplierId}`)).items,
    enabled: !!supplierId,
    staleTime: 30_000,
  });
}
