import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

export type TodoItem = {
  todoid: number;
  description: string;
  date: string;
  dateadded?: string;
  finished: number;
  staffid?: number;
  item_order?: number;
};

export function useTodoList(filters?: { finished?: number; page?: number }) {
  return useQuery({
    queryKey: ["todo", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters?.finished !== undefined) params.finished = filters.finished;
      if (filters?.page) params.page = filters.page;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`todo_api?${qs}`)).items as TodoItem[];
    },
    staleTime: 30_000,
  });
}

export function useTodoDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ["todo", "detail", String(id)],
    queryFn: async () => (await apiRequest(`todo_api/${id}`))?.data as TodoItem,
    enabled: !!id,
  });
}

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("todo_api", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["todo"] }); },
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`todo_api/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["todo"] }); },
  });
}

export function useToggleTodoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, finished }: { id: string | number; finished: number }) =>
      apiRequest(`todo_api/${id}/status`, { method: "PUT", body: JSON.stringify({ finished }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["todo"] }); },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`todo_api/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["todo"] }); },
  });
}
