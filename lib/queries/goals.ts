import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type Goal = {
  id: number;
  subject: string;
  description?: string;
  start_date: string;
  end_date?: string;
  goal_type_id?: number;
  staff_id?: number;
  achieved?: number;
  dateadded?: string;
};

export function useGoalsList(filters?: { search?: string; limit?: number; staff_id?: number }) {
  return useQuery({
    queryKey: ["goals", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.search) params.search = filters.search;
      if (filters?.staff_id) params.staff_id = filters.staff_id;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`goals_api?${qs}`)).items as Goal[];
    },
    staleTime: 30_000,
  });
}

export function useGoalDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ["goals", "detail", String(id)],
    queryFn: async () => (await apiRequest(`goals_api/${id}`))?.data as Goal,
    enabled: !!id,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("goals_api", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`goals_api/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["goals", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["goals", "list"] });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`goals_api/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); },
  });
}

export function useMarkGoalComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`goals_api/${id}/mark_complete`, { method: "PUT" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["goals", "detail", String(id)] });
      qc.invalidateQueries({ queryKey: ["goals", "list"] });
    },
  });
}

export function useReopenGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`goals_api/${id}/reopen`, { method: "PUT" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["goals", "detail", String(id)] });
      qc.invalidateQueries({ queryKey: ["goals", "list"] });
    },
  });
}

export function useGoalsSummary() {
  return useQuery({
    queryKey: ["goals", "summary"],
    queryFn: async () => (await apiRequest("goals_api/summary"))?.data,
    staleTime: 60_000,
  });
}

export function useOverdueGoals() {
  return useQuery({
    queryKey: ["goals", "overdue"],
    queryFn: async () => normalizeList(await apiRequest("goals_api/overdue")).items as Goal[],
    staleTime: 30_000,
  });
}
