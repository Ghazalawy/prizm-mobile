import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type RFQ = { id: number; title?: string; status?: string; date_created?: string; };

export function useRFQList(filters?: { search?: string; limit?: number }) {
  return useQuery({ queryKey: ["rfq","list",filters], queryFn: async () => {
    const p: Record<string,string|number> = { limit: filters?.limit ?? 100 };
    if (filters?.search) p.search = filters.search;
    return normalizeList(await apiRequest(`rfq_api?${new URLSearchParams(p as any)}`)).items as RFQ[];
  }, staleTime: 60_000 });
}
export function useRFQDetail(id: string|number|undefined) { return useQuery({ queryKey: ["rfq","detail",String(id)], queryFn: async () => (await apiRequest(`rfq_api/${id}`))?.data as RFQ, enabled: !!id }); }
