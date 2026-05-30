import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type BusinessPartner = {
  id: number;
  company: string;
  email?: string;
  phone?: string;
  group_id?: number;
};

export type PartnerActivity = {
  id: number;
  partner_id: number;
  description?: string;
  date?: string;
  staff_id?: number;
};

export function useBusinessPartnerDetail(id: string | number) {
  return useQuery({
    queryKey: ["business_partner", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`business_partners_api/${id}`);
      if (data?.status === true && data.data) return data.data;
      if (Array.isArray(data)) return data[0];
      return data;
    },
    enabled: !!id,
  });
}

export function useBusinessPartnerGroups() {
  return useQuery({
    queryKey: ["business_partners", "groups"],
    queryFn: async () => normalizeList(await apiRequest("business_partners_api/groups")),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBusinessPartnerActivity(partnerId: string | number) {
  return useQuery({
    queryKey: ["business_partner", String(partnerId), "activity"],
    queryFn: async () => normalizeList(await apiRequest(`business_partners_api/activity/${partnerId}`)),
    enabled: !!partnerId,
    staleTime: 60 * 1000,
  });
}

export function useBusinessPartnersList(filters?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: ["business_partners", "list", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(filters?.limit ?? 200));
      if (filters?.search) params.set("search", filters.search);
      return normalizeList(await apiRequest(`business_partners_api?${params.toString()}`));
    },
    staleTime: 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function useCreateBusinessPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<BusinessPartner>) =>
      apiRequest("business_partners_api", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business_partners"] });
    },
  });
}

export function useUpdateBusinessPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Partial<BusinessPartner>;
    }) =>
      apiRequest(`business_partners_api/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["business_partner", String(id)] });
      qc.invalidateQueries({ queryKey: ["business_partners"] });
    },
  });
}

export function useDeleteBusinessPartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`business_partners_api/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business_partners"] });
    },
  });
}
