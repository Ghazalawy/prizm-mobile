import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type Tag = { id: number; name: string; };

export function useTagsList(filters?: { search?: string; limit?: number }) {
  return useQuery({ queryKey: ["tags","list",filters], queryFn: async () => {
    const p: Record<string,string|number> = { limit: filters?.limit ?? 200 };
    if (filters?.search) p.search = filters.search;
    return normalizeList(await apiRequest(`tags?${new URLSearchParams(p as any)}`)).items as Tag[];
  }, staleTime: 300_000 });
}
export function useSearchTags(query: string) { return useQuery({ queryKey: ["tags","search",query], queryFn: async () => normalizeList(await apiRequest(`tags/search/${encodeURIComponent(query)}`)).items as Tag[], enabled: query.length>0 }); }
export function useCreateTag() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("tags",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["tags"]}); } }); }
export function useUpdateTag() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`tags/${id}`,{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["tags"]}); } }); }
export function useDeleteTag() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`tags/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["tags"]}); } }); }
