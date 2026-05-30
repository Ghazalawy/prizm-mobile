import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type AdvanceLead = { id: number; title?: string; status?: string; source?: string; date_created?: string; };
export type AdvanceLeadDetail = { id: number; lead_id: number; field_name: string; field_value: string; };
export type AdvanceLeadStatus = { id: number; name: string; color?: string; };

export function useAdvanceLeadsList(filters?: { search?: string; limit?: number; status?: string }) {
  return useQuery({ queryKey: ["advance-leads","list",filters], queryFn: async () => {
    const p: Record<string,string|number> = { limit: filters?.limit ?? 100 };
    if (filters?.search) p.search = filters.search; if (filters?.status) p.status = filters.status;
    return normalizeList(await apiRequest(`advance_leads_api?${new URLSearchParams(p as any)}`)).items as AdvanceLead[];
  }, staleTime: 30_000 });
}
export function useAdvanceLeadDetail(id: string|number|undefined) { return useQuery({ queryKey: ["advance-leads","detail",String(id)], queryFn: async () => (await apiRequest(`advance_leads_api/${id}`))?.data as AdvanceLead, enabled: !!id }); }
export function useCreateAdvanceLead() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("advance_leads_api",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["advance-leads"]}); } }); }
export function useUpdateAdvanceLead() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`advance_leads_api/${id}`,{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["advance-leads"]}); } }); }
export function useDeleteAdvanceLead() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`advance_leads_api/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["advance-leads"]}); } }); }

export function useAdvanceLeadDetails(leadId: string|number|undefined) { return useQuery({ queryKey: ["advance-leads","details",String(leadId)], queryFn: async () => normalizeList(await apiRequest(`advance_leads_api/details/${leadId}`)).items as AdvanceLeadDetail[], enabled: !!leadId }); }
export function useAddAdvanceLeadDetail() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("advance_leads_api/details",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["advance-leads","details"]}); } }); }
export function useAdvanceLeadStatuses() { return useQuery({ queryKey: ["advance-leads","statuses"], queryFn: async () => normalizeList(await apiRequest("advance_leads_api/statuses")).items as AdvanceLeadStatus[], staleTime: 300_000 }); }
export function useAddAdvanceLeadStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("advance_leads_api/statuses",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["advance-leads","statuses"]}); } }); }
export function useLogAdvanceLeadActivity() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("advance_leads_api/activities",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["advance-leads"]}); } }); }
