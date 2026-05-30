import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type Gatepass = { id: number; title?: string; status?: string; type?: string; staff_id?: number; date?: string; };
export type GatepassVehicle = { id: number; gatepass_id: number; plate?: string; driver?: string; };
export type GatepassStaff = { id: number; gatepass_id: number; staff_name?: string; };

export function useGatepassList(filters?: { search?: string; limit?: number; status?: string }) {
  return useQuery({ queryKey: ["gatepass","list",filters], queryFn: async () => {
    const p: Record<string,string|number> = { limit: filters?.limit ?? 100 };
    if (filters?.search) p.search = filters.search; if (filters?.status) p.status = filters.status;
    return normalizeList(await apiRequest(`gatepass_api?${new URLSearchParams(p as any)}`)).items as Gatepass[];
  }, staleTime: 30_000 });
}

export function useGatepassDetail(id: string|number|undefined) {
  return useQuery({ queryKey: ["gatepass","detail",String(id)], queryFn: async () => (await apiRequest(`gatepass_api/${id}`))?.data as Gatepass, enabled: !!id });
}

export function useCreateGatepass() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("gatepass_api",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["gatepass"]}); } }); }
export function useUpdateGatepass() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`gatepass_api/${id}`,{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["gatepass"]}); } }); }
export function useDeleteGatepass() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`gatepass_api/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["gatepass"]}); } }); }
export function useApproveGatepass() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`gatepass_api/${id}/approve`,{method:"PUT"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["gatepass"]}); } }); }
export function useRejectGatepass() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`gatepass_api/${id}/reject`,{method:"PUT"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["gatepass"]}); } }); }
export function useCloseGatepass() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`gatepass_api/${id}/close`,{method:"PUT"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["gatepass"]}); } }); }

export function useGatepassStaff(gatepassId: string|number|undefined) {
  return useQuery({ queryKey: ["gatepass","staff",String(gatepassId)], queryFn: async () => normalizeList(await apiRequest(`gatepass_api/staff?gatepass_id=${gatepassId}`)).items as GatepassStaff[], enabled: !!gatepassId });
}
export function useAddGatepassStaff() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("gatepass_api/staff",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["gatepass","staff"]}); } }); }
export function useRemoveGatepassStaff() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`gatepass_api/staff/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["gatepass","staff"]}); } }); }

export function useGatepassVehicles(gatepassId: string|number|undefined) {
  return useQuery({ queryKey: ["gatepass","vehicles",String(gatepassId)], queryFn: async () => normalizeList(await apiRequest(`gatepass_api/vehicles?gatepass_id=${gatepassId}`)).items as GatepassVehicle[], enabled: !!gatepassId });
}

export function useExpiringGatepasses() {
  return useQuery({ queryKey: ["gatepass","expiring"], queryFn: async () => normalizeList(await apiRequest("gatepass_api/expiring")).items as Gatepass[], staleTime: 60_000 });
}
