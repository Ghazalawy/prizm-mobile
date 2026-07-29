import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type FixedEquipment = { id: number; assets_name: string; series: string; model_id?: number; category_id?: number; asset_location?: number; manufacturer_id?: number; status?: number; status_name?: string; checkin_out?: number; date_creator?: string; };
export type EquipmentCategory = { id: number; category_name: string; };
export type EquipmentLocation = { id: number; location_name: string; };
export type EquipmentManufacturer = { id: number; name: string; };

export function useFixedEquipmentList(filters?: { search?: string; limit?: number; category_id?: number }) {
  return useQuery({ queryKey: ["fixed-equipment","list",filters], queryFn: async () => {
    const p: Record<string,string|number> = { limit: filters?.limit ?? 100 };
    if (filters?.search) p.search = filters.search; if (filters?.category_id) p.category_id = filters.category_id;
    return normalizeList(await apiRequest(`fixed_equipment_api?${new URLSearchParams(p as any)}`)).items as FixedEquipment[];
  }, staleTime: 60_000 });
}
export function useFixedEquipmentDetail(id: string|number|undefined) {
  return useQuery({ queryKey: ["fixed-equipment","detail",String(id)], queryFn: async () => (await apiRequest(`fixed_equipment_api/${id}`))?.data as FixedEquipment, enabled: !!id });
}
export function useCreateFixedEquipment() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("fixed_equipment_api",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["fixed-equipment"]}); } }); }
export function useUpdateFixedEquipment() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`fixed_equipment_api/${id}`,{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["fixed-equipment"]}); } }); }
export function useDeleteFixedEquipment() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`fixed_equipment_api/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["fixed-equipment"]}); } }); }
export function useCheckoutEquipment() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`fixed_equipment_api/${id}/checkout`,{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["fixed-equipment"]}); qc.invalidateQueries({queryKey:["crud","fixed_equipment"]}); } }); }
export function useCheckinEquipment() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`fixed_equipment_api/${id}/checkin`,{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["fixed-equipment"]}); qc.invalidateQueries({queryKey:["crud","fixed_equipment"]}); } }); }

export function useEquipmentCategories() { return useQuery({ queryKey: ["fixed-equipment","categories"], queryFn: async () => normalizeList(await apiRequest("fixed_equipment_api/categories")).items as EquipmentCategory[], staleTime: 300_000 }); }
export function useCreateEquipmentCategory() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("fixed_equipment_api/categories",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["fixed-equipment","categories"]}); } }); }
export function useEquipmentLocations() { return useQuery({ queryKey: ["fixed-equipment","locations"], queryFn: async () => normalizeList(await apiRequest("fixed_equipment_api/locations")).items as EquipmentLocation[], staleTime: 300_000 }); }
export function useCreateEquipmentLocation() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("fixed_equipment_api/locations",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["fixed-equipment","locations"]}); } }); }
export function useEquipmentManufacturers() { return useQuery({ queryKey: ["fixed-equipment","manufacturers"], queryFn: async () => normalizeList(await apiRequest("fixed_equipment_api/manufacturers")).items as EquipmentManufacturer[], staleTime: 300_000 }); }
export function useCreateEquipmentManufacturer() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("fixed_equipment_api/manufacturers",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["fixed-equipment","manufacturers"]}); } }); }
export function useEquipmentAnalytics() { return useQuery({ queryKey: ["fixed-equipment","analytics"], queryFn: async () => (await apiRequest("fixed_equipment_api/analytics"))?.data, staleTime: 60_000 }); }
