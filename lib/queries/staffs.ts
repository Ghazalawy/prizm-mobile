import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type StaffMember = {
  staffid: number;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string | null;
  profile_image: string | null;
  role: number | null;
  role_name?: string | null;
  active: number;
  datecreated: string | null;
  department_name?: string | null;
  employee_id?: string | null;
};

export function useStaffList(filters?: { search?: string; limit?: number; active?: number }) {
  return useQuery({
    queryKey: ["staff", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200 };
      if (filters?.search) params.search = filters.search;
      if (filters?.active !== undefined) params.active = filters.active;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`staffs?${qs}`)).items as StaffMember[];
    },
    staleTime: 60_000,
  });
}

export function useStaffDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ["staff", "detail", String(id)],
    queryFn: async () => (await apiRequest(`staffs/${id}`))?.data as StaffMember,
    enabled: !!id,
  });
}

export function useSearchStaff(query: string) {
  return useQuery({
    queryKey: ["staff", "search", query],
    queryFn: async () => normalizeList(await apiRequest(`staffs/search/${encodeURIComponent(query)}`)).items as StaffMember[],
    enabled: query.length > 0,
    staleTime: 30_000,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("staffs", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); },
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`staffs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["staff", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["staff", "list"] });
    },
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`staffs/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); },
  });
}
