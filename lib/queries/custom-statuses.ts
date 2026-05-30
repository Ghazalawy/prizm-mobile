import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type CustomStatus = { id: number; name: string; color?: string; statusorder?: number; module?: string; };

export function useCustomStatuses(module?: string) {
  return useQuery({ queryKey: ["custom-statuses",module], queryFn: async () => {
    const qs = module ? `?module=${encodeURIComponent(module)}` : "";
    return normalizeList(await apiRequest(`custom_statuses_api${qs}`)).items as CustomStatus[];
  }, staleTime: 300_000 });
}
export function useCreateCustomStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("custom_statuses_api",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["custom-statuses"]}); } }); }
export function useUpdateCustomStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`custom_statuses_api/${id}`,{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["custom-statuses"]}); } }); }
export function useDeleteCustomStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`custom_statuses_api/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["custom-statuses"]}); } }); }
