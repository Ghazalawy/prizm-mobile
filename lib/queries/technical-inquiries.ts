import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type TechnicalInquiry = { id: number; title: string; description?: string; status?: string; date_created?: string; department_id?: number; };
export type InquiryItem = { id: number; inquiry_id: number; name: string; qty?: number; specifications?: string; };
export type InquirySpec = { id: number; item_id: number; key: string; value: string; };

export function useTechnicalInquiriesList(filters?: { search?: string; limit?: number; status?: string }) {
  return useQuery({ queryKey: ["technical-inquiries","list",filters], queryFn: async () => {
    const p: Record<string,string|number> = { limit: filters?.limit ?? 100 };
    if (filters?.search) p.search = filters.search; if (filters?.status) p.status = filters.status;
    return normalizeList(await apiRequest(`technical_inquiries?${new URLSearchParams(p as any)}`)).items as TechnicalInquiry[];
  }, staleTime: 30_000 });
}
export function useTechnicalInquiryDetail(id: string|number|undefined) { return useQuery({ queryKey: ["technical-inquiries","detail",String(id)], queryFn: async () => (await apiRequest(`technical_inquiries/${id}`))?.data as TechnicalInquiry, enabled: !!id }); }
export function useCreateTechnicalInquiry() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("technical_inquiries",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["technical-inquiries"]}); } }); }
export function useUpdateTechnicalInquiry() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`technical_inquiries/${id}`,{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["technical-inquiries"]}); } }); }
export function useDeleteTechnicalInquiry() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`technical_inquiries/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["technical-inquiries"]}); } }); }

export function useInquiryItems(inquiryId: string|number|undefined) { return useQuery({ queryKey: ["technical-inquiries","items",String(inquiryId)], queryFn: async () => normalizeList(await apiRequest(`technical_inquiries/items?inquiry_id=${inquiryId}`)).items as InquiryItem[], enabled: !!inquiryId }); }
export function useAddInquiryItem() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("technical_inquiries/items",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["technical-inquiries","items"]}); } }); }
export function useUpdateInquiryItem() { const qc = useQueryClient(); return useMutation({ mutationFn: async ({id,...d}:{id:string|number}&Record<string,unknown>) => apiRequest(`technical_inquiries/items/${id}`,{method:"PUT",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["technical-inquiries","items"]}); } }); }
export function useDeleteInquiryItem() { const qc = useQueryClient(); return useMutation({ mutationFn: async (id:string|number) => apiRequest(`technical_inquiries/items/${id}`,{method:"DELETE"}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["technical-inquiries","items"]}); } }); }

export function useInquirySpecs(itemId: string|number|undefined) { return useQuery({ queryKey: ["technical-inquiries","specs",String(itemId)], queryFn: async () => normalizeList(await apiRequest(`technical_inquiries/specs?item_id=${itemId}`)).items as InquirySpec[], enabled: !!itemId }); }
export function useAddInquirySpec() { const qc = useQueryClient(); return useMutation({ mutationFn: async (d: Record<string,unknown>) => apiRequest("technical_inquiries/specs",{method:"POST",body:JSON.stringify(d)}), onSuccess: ()=>{ qc.invalidateQueries({queryKey:["technical-inquiries","specs"]}); } }); }
export function useInquiriesAnalytics() { return useQuery({ queryKey: ["technical-inquiries","analytics"], queryFn: async () => (await apiRequest("technical_inquiries/analytics"))?.data, staleTime: 60_000 }); }
