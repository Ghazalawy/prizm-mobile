import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, buildAuthHeaders, parseApiResponse, normalizeList } from "../api";
import { getSessionGeneration } from "../auth-events";
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
  /** Human-readable name of the related entity (project name, customer name, etc.) */
  rel_name?: string | null;
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

export function useMyTasks(filters?: { status?: string; search?: string; assigned?: number; limit?: number }) {
  const scope = useTaskQueryScope();
  return useQuery({
    queryKey: ["tasks", "mine", scope, filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200 };
      if (filters?.status) params.status = filters.status;
      if (filters?.search) params.search = filters.search;
      if (filters?.assigned) params.assigned = filters.assigned;
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
      const gen = getSessionGeneration();
      const headers = await buildAuthHeaders();
      const res = await fetch(`${API_URL}/tasks/${taskId}/timer/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"], gen);
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
      const gen = getSessionGeneration();
      const headers = await buildAuthHeaders();
      const body: Record<string, unknown> = { timer_id: timerId };
      if (note) body.note = note;
      const res = await fetch(`${API_URL}/tasks/${taskId}/timer/stop`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const { body: respBody, invalidToken } = await parseApiResponse(res, !!headers["authtoken"], gen);
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
      const gen = getSessionGeneration();
      const headers = await buildAuthHeaders();
      const res = await fetch(`${API_URL}/tasks/${taskId}/mark_complete`, {
        method: "PUT",
        headers,
        body: JSON.stringify({}),
      });
      const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"], gen);
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
      const gen = getSessionGeneration();
      const headers = await buildAuthHeaders();
      const res = await fetch(`${API_URL}/tasks/${taskId}/reopen`, {
        method: "PUT",
        headers,
        body: JSON.stringify({}),
      });
      const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"], gen);
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

// ─── Copy task ─────────────────────────────────────────────────────────

export function useCopyTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, ...opts }: { taskId: string; copy_task_assignees?: boolean; copy_task_followers?: boolean; copy_task_checklist_items?: boolean; copy_task_attachments?: boolean; copy_task_status?: number }) => {
      const gen = getSessionGeneration();
      const headers = await buildAuthHeaders();
      const res = await fetch(`${API_URL}/tasks/${encodeURIComponent(taskId)}/copy`, {
        method: "POST",
        headers,
        body: JSON.stringify(opts),
      });
      const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"], gen);
      if (invalidToken) throw new Error("Session expired");
      if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["crud", "tasks"] });
    },
  });
}

// ─── Timesheets ─────────────────────────────────────────────────────────

export type TimesheetEntry = {
  id: number;
  task_id: number;
  staff_id: number;
  start_time: string;
  end_time: string | null;
  note: string | null;
  staff_name?: string;
};

export function useTaskTimesheets(taskId: string | number) {
  return useQuery({
    queryKey: ["task", String(taskId), "timesheets"],
    queryFn: async () => {
      const data = await apiRequest(`tasks/${encodeURIComponent(String(taskId))}/timesheets`);
      return normalizeList(data).items as TimesheetEntry[];
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

export function useDeleteTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: number; taskId: string }) => {
      return apiRequest(`tasks/timesheets/${encodeURIComponent(String(id))}`, { method: "DELETE" });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task", vars.taskId, "timesheets"] });
      qc.invalidateQueries({ queryKey: ["task", vars.taskId] });
    },
  });
}

export function useLogTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, start_time, end_time, note, staff_id }: { taskId: string; start_time: string; end_time: string; note?: string; staff_id?: number }) => {
      const gen = getSessionGeneration();
      const headers = await buildAuthHeaders();
      const body: Record<string, unknown> = { start_time, end_time };
      if (note) body.note = note;
      if (staff_id) body.staff_id = staff_id;
      const res = await fetch(`${API_URL}/tasks/${encodeURIComponent(taskId)}/log_time`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const { body: respBody, invalidToken } = await parseApiResponse(res, !!headers["authtoken"], gen);
      if (invalidToken) throw new Error("Session expired");
      if (!res.ok) throw new Error(respBody?.message || `HTTP ${res.status}`);
      return respBody;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task", vars.taskId, "timesheets"] });
      qc.invalidateQueries({ queryKey: ["task", vars.taskId] });
    },
  });
}

// ─── Reminders ──────────────────────────────────────────────────────────

export type TaskReminder = {
  id: number;
  rel_id: number;
  rel_type: string;
  staff: number;
  date: string;
  creator: number;
};

export function useTaskReminders(taskId: string | number) {
  return useQuery({
    queryKey: ["task", String(taskId), "reminders"],
    queryFn: async () => {
      const data = await apiRequest(`tasks/${encodeURIComponent(String(taskId))}/reminders`);
      return normalizeList(data).items as TaskReminder[];
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

export function useAddReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, date }: { taskId: string; date: string }) => {
      return apiRequest(`tasks/${encodeURIComponent(taskId)}/reminders`, {
        method: "POST",
        body: JSON.stringify({ date }),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task", vars.taskId, "reminders"] });
    },
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: number; taskId: string }) => {
      return apiRequest(`tasks/reminders/${encodeURIComponent(String(id))}`, { method: "DELETE" });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task", vars.taskId, "reminders"] });
    },
  });
}

// ─── Edit comment ──────────────────────────────────────────────────────

export function useEditTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, content, taskId }: { commentId: number; content: string; taskId: string }) => {
      return apiRequest(`tasks/comments/${encodeURIComponent(String(commentId))}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task", vars.taskId, "comments"] });
    },
  });
}

// ─── Delete comment ────────────────────────────────────────────────────

export function useDeleteTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, taskId }: { commentId: number; taskId: string }) => {
      return apiRequest(`tasks/comments/${encodeURIComponent(String(commentId))}`, { method: "DELETE" });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["task", vars.taskId, "comments"] });
    },
  });
}

// --- Search ---------------------------------------------------------------

export function useSearchTasks(query: string) {
  const scope = useTaskQueryScope();
  return useQuery({
    queryKey: ["tasks", "search", scope, query],
    queryFn: async () => {
      const data = await apiRequest("tasks/search/" + encodeURIComponent(query));
      return normalizeList(data).items as TaskListItem[];
    },
    enabled: !!query && query.length >= 2,
    staleTime: 30 * 1000,
  });
}

