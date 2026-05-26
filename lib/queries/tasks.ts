import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, buildAuthHeaders, parseApiResponse, normalizeList } from "../api";
import { API_URL } from "../config";
import { useImpersonation } from "../impersonation";

// ─── Types ───────────────────────────────────────────────────────────────

export type TaskListItem = {
  id: number;
  name: string;
  status: number;
  priority: number;
  startdate: string | null;
  duedate: string | null;
  rel_type: string | null;
  rel_id: number | null;
  description: string | null;
  billable: number;
  hourly_rate: string | null;
  tags: string | null;
  total_logged_time: string | null;
  dateadded: string | null;
  datefinished: string | null;
  milestone: number | null;
  addedfrom: number | null;
  assignees?: Array<{ staffid: number; firstname?: string; lastname?: string; profile_image?: string }>;
};

export type ChecklistItem = {
  id: number;
  taskid: number;
  description: string;
  finished: number;
  dateadded: string | null;
  addedfrom: number | null;
  list_order: number;
};

export type TaskComment = {
  id: number;
  taskid: number;
  content: string;
  staffid: number;
  dateadded: string;
  staff_name?: string;
  profile_image?: string;
};

export type TaskTimer = {
  id: number;
  task_id: number;
  staff_id: number;
  start_time: string;
  end_time: string | null;
  note: string | null;
};

// ─── Query scope ─────────────────────────────────────────────────────────

function useTaskQueryScope(): string {
  const impersonation = useImpersonation();
  return impersonation ? `as:${impersonation.staffid}` : "self";
}

// ─── List queries ────────────────────────────────────────────────────────

export function useMyTasks(filters?: { status?: string; search?: string; limit?: number }) {
  const scope = useTaskQueryScope();
  return useQuery({
    queryKey: ["tasks", "mine", scope, filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200 };
      if (filters?.status) params.status = filters.status;
      if (filters?.search) params.search = filters.search;
      const qs = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
      const data = await apiRequest(`tasks?${qs}`);
      return normalizeList(data);
    },
    staleTime: 60 * 1000,
  });
}

export function useTasksByStatus() {
  const scope = useTaskQueryScope();
  return useQuery({
    queryKey: ["tasks", "by-status", scope],
    queryFn: async () => {
      const data = await apiRequest("tasks?limit=500");
      const items = normalizeList(data).items as TaskListItem[];
      const grouped: Record<string, TaskListItem[]> = {
        "1": [], // Not Started
        "4": [], // In Progress
        "3": [], // Testing
        "2": [], // Awaiting Feedback
        "5": [], // Complete
      };
      for (const t of items) {
        const key = String(t.status);
        if (grouped[key]) grouped[key].push(t);
        else grouped[key] = [t];
      }
      return grouped;
    },
    staleTime: 60 * 1000,
  });
}

export function useTasksDueToday() {
  const scope = useTaskQueryScope();
  return useQuery({
    queryKey: ["tasks", "due-today", scope],
    queryFn: async () => {
      const data = await apiRequest("tasks?limit=200");
      const items = normalizeList(data).items as TaskListItem[];
      const today = new Date().toISOString().slice(0, 10);
      return items.filter((t) => {
        if (String(t.status) === "5") return false;
        if (!t.duedate) return false;
        const due = t.duedate.slice(0, 10);
        return due <= today;
      });
    },
    staleTime: 60 * 1000,
  });
}

// ─── Checklist ───────────────────────────────────────────────────────────

export function useTaskChecklist(taskId: string | number) {
  return useQuery({
    queryKey: ["task", String(taskId), "checklist"],
    queryFn: async () => {
      const data = await apiRequest(`tasks/checklist/${taskId}`);
      return normalizeList(data).items as ChecklistItem[];
    },
    enabled: !!taskId,
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, finished }: { itemId: number; finished: boolean; taskId: string }) => {
      return apiRequest(`tasks/checklist/item/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ finished: finished ? 1 : 0 }),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task", vars.taskId, "checklist"] });
    },
  });
}

// ─── Comments ────────────────────────────────────────────────────────────

export function useTaskComments(taskId: string | number) {
  return useQuery({
    queryKey: ["task", String(taskId), "comments"],
    queryFn: async () => {
      const data = await apiRequest(`tasks/comments/${taskId}`);
      return normalizeList(data).items as TaskComment[];
    },
    enabled: !!taskId,
  });
}

export function useAddTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      return apiRequest("tasks/comments", {
        method: "POST",
        body: JSON.stringify({ taskid: taskId, content }),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task", vars.taskId, "comments"] });
    },
  });
}

// ─── Timer ───────────────────────────────────────────────────────────────

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const headers = await buildAuthHeaders();
      const res = await fetch(`${API_URL}/tasks/${taskId}/timer/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"]);
      if (invalidToken) throw new Error("Session expired");
      if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
      return body;
    },
    onSuccess: (_, taskId) => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, timerId, note }: { taskId: string; timerId: number; note?: string }) => {
      const headers = await buildAuthHeaders();
      const body: Record<string, unknown> = { timer_id: timerId };
      if (note) body.note = note;
      const res = await fetch(`${API_URL}/tasks/${taskId}/timer/stop`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const { body: respBody, invalidToken } = await parseApiResponse(res, !!headers["authtoken"]);
      if (invalidToken) throw new Error("Session expired");
      if (!res.ok) throw new Error(respBody?.message || `HTTP ${res.status}`);
      return respBody;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task", vars.taskId] });
    },
  });
}

// ─── Status mutations ────────────────────────────────────────────────────

export function useMarkTaskComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const headers = await buildAuthHeaders();
      const res = await fetch(`${API_URL}/tasks/${taskId}/mark_complete`, {
        method: "PUT",
        headers,
        body: JSON.stringify({}),
      });
      const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"]);
      if (invalidToken) throw new Error("Session expired");
      if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["crud", "tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReopenTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const headers = await buildAuthHeaders();
      const res = await fetch(`${API_URL}/tasks/${taskId}/reopen`, {
        method: "PUT",
        headers,
        body: JSON.stringify({}),
      });
      const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"]);
      if (invalidToken) throw new Error("Session expired");
      if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["crud", "tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
