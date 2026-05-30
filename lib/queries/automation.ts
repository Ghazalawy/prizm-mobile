import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type AutomationRule = { id: number; name: string; trigger_type?: string; action_type?: string; active?: number; };

export function useAutomationRules(filters?: { search?: string; limit?: number }) {
  return useQuery({ queryKey: ["automation","list",filters], queryFn: async () => {
    const p: Record<string,string|number> = { limit: filters?.limit ?? 100 };
    if (filters?.search) p.search = filters.search;
    return normalizeList(await apiRequest(`automation_api?${new URLSearchParams(p as any)}`)).items as AutomationRule[];
  }, staleTime: 60_000 });
}
export function useAutomationRuleDetail(id: string|number|undefined) { return useQuery({ queryKey: ["automation","detail",String(id)], queryFn: async () => (await apiRequest(`automation_api/${id}`))?.data, enabled: !!id }); }
export function useCreateAutomationRule() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("automation_api",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["automation"]}); } }); }
export function useUpdateAutomationRule() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`automation_api/${id}`,{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["automation"]}); } }); }
export function useDeleteAutomationRule() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`automation_api/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["automation"]}); } }); }
export function useAddAutomationTrigger() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("automation_api/triggers",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["automation"]}); } }); }
export function useAddAutomationAction() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("automation_api/actions",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["automation"]}); } }); }
export function useActivateAutomation() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`automation_api/${id}/activate`,{method:"PUT"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["automation"]}); } }); }
