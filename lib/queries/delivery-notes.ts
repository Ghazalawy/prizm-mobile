import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type DeliveryNote = {
  id: number;
  title?: string | null;
  sequence_number?: number | null;
  display_code?: string | null;
  status: number | string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  total_amount?: string | number | null;
  date_created?: string | null;
  delivery_date?: string | null;
};

export function useDeliveryNotesList(filters?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: ["delivery-notes", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.search) params.search = filters.search;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`purchase_api/delivery_notes?${qs}`)).items as DeliveryNote[];
    },
    staleTime: 30_000,
  });
}

export function useDeliveryNoteApproval(id: string | number | undefined) {
  return useQuery({
    queryKey: ["delivery-notes", "approval", String(id)],
    queryFn: async () => (await apiRequest(`purchase_api/delivery_notes/${id}/approval`))?.data,
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useApproveDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string | number; comment?: string }) =>
      apiRequest(`purchase_api/delivery_notes/${id}/approve`, { method: "POST", body: JSON.stringify({ comment }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["delivery-notes", "approval", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["delivery-notes", "list"] });
    },
  });
}

export function useRejectDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string | number; reason?: string }) =>
      apiRequest(`purchase_api/delivery_notes/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["delivery-notes", "approval", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["delivery-notes", "list"] });
    },
  });
}
