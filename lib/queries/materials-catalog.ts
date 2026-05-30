import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type Material = { id: number; name: string; code?: string; category_id?: number; uom_id?: number; description?: string; };
export type MaterialCategory = { id: number; name: string; parent_id?: number; };
export type MaterialManufacturer = { id: number; name: string; };
export type MaterialSpec = { id: number; material_id: number; key: string; value: string; };
export type MaterialKit = { id: number; name: string; description?: string; };
export type KitItem = { id: number; kit_id: number; material_id: number; qty: number; };

export function useMaterialsList(filters?: { search?: string; category_id?: number; limit?: number }) {
  return useQuery({ queryKey: ["materials","list",filters], queryFn: async () => {
    const p: Record<string,string|number> = { limit: filters?.limit ?? 100 };
    if (filters?.search) p.search = filters.search; if (filters?.category_id) p.category_id = filters.category_id;
    return normalizeList(await apiRequest(`materials_catalog/materials?${new URLSearchParams(p as any)}`)).items as Material[];
  }, staleTime: 60_000 });
}
export function useMaterialDetail(id: string|number|undefined) { return useQuery({ queryKey: ["materials","detail",String(id)], queryFn: async () => (await apiRequest(`materials_catalog/materials/${id}`))?.data as Material, enabled: !!id }); }
export function useCreateMaterial() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("materials_catalog/materials",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["materials"]}); } }); }
export function useUpdateMaterial() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`materials_catalog/materials/${id}`,{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["materials"]}); } }); }
export function useDeleteMaterial() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`materials_catalog/materials/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["materials"]}); } }); }

export function useMaterialCategories() { return useQuery({ queryKey: ["materials","categories"], queryFn: async () => normalizeList(await apiRequest("materials_catalog/categories")).items as MaterialCategory[], staleTime: 300_000 }); }
export function useCreateMaterialCategory() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("materials_catalog/categories",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["materials","categories"]}); } }); }

export function useMaterialManufacturers() { return useQuery({ queryKey: ["materials","manufacturers"], queryFn: async () => normalizeList(await apiRequest("materials_catalog/manufacturers")).items as MaterialManufacturer[], staleTime: 300_000 }); }

export function useMaterialSpecs(materialId: string|number|undefined) { return useQuery({ queryKey: ["materials","specs",String(materialId)], queryFn: async () => normalizeList(await apiRequest(`materials_catalog/item_specs?material_id=${materialId}`)).items as MaterialSpec[], enabled: !!materialId }); }
export function useAddMaterialSpec() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("materials_catalog/item_specs",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["materials","specs"]}); } }); }

export function useMaterialKits(filters?: { search?: string; limit?: number }) {
  return useQuery({ queryKey: ["materials","kits",filters], queryFn: async () => {
    const p: Record<string,string|number> = { limit: filters?.limit ?? 100 };
    if (filters?.search) p.search = filters.search;
    return normalizeList(await apiRequest(`materials_catalog/kits?${new URLSearchParams(p as any)}`)).items as MaterialKit[];
  }, staleTime: 60_000 });
}
export function useCreateMaterialKit() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("materials_catalog/kits",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["materials","kits"]}); } }); }
export function useUpdateMaterialKit() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`materials_catalog/kits/${id}`,{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["materials","kits"]}); } }); }
export function useDeleteMaterialKit() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`materials_catalog/kits/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["materials","kits"]}); } }); }

export function useKitItems(kitId: string|number|undefined) { return useQuery({ queryKey: ["materials","kit_items",String(kitId)], queryFn: async () => normalizeList(await apiRequest(`materials_catalog/kit_items?kit_id=${kitId}`)).items as KitItem[], enabled: !!kitId }); }
export function useAddKitItem() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("materials_catalog/kit_items",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["materials","kit_items"]}); } }); }

export function useUOMs() { return useQuery({ queryKey: ["materials","uom"], queryFn: async () => normalizeList(await apiRequest("materials_catalog/uom")).items, staleTime: 600_000 }); }
export function useMaterialClassifications() { return useQuery({ queryKey: ["materials","classifications"], queryFn: async () => normalizeList(await apiRequest("materials_catalog/classifications")).items, staleTime: 300_000 }); }
export function useSearchMaterials(query: string) { return useQuery({ queryKey: ["materials","search",query], queryFn: async () => normalizeList(await apiRequest(`materials_catalog/catalog_search?q=${encodeURIComponent(query)}`)).items, enabled: query.length>0 }); }
export function useMaterialsAnalytics() { return useQuery({ queryKey: ["materials","analytics"], queryFn: async () => (await apiRequest("materials_catalog/analytics"))?.data, staleTime: 60_000 }); }
export function useUNSPSCSegments() { return useQuery({ queryKey: ["materials","unspsc_segments"], queryFn: async () => (await apiRequest("materials_catalog/unspsc_segments"))?.data, staleTime: 600_000 }); }
export function useUNSPSCFamilies(segment: string|number) { return useQuery({ queryKey: ["materials","unspsc_families",String(segment)], queryFn: async () => (await apiRequest(`materials_catalog/unspsc_families?segment=${segment}`))?.data, enabled: !!segment, staleTime: 300_000 }); }
export function useUNSPSCClasses(family: string|number) { return useQuery({ queryKey: ["materials","unspsc_classes",String(family)], queryFn: async () => (await apiRequest(`materials_catalog/unspsc_classes?family=${family}`))?.data, enabled: !!family, staleTime: 300_000 }); }
