import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";
import { useImpersonation } from "../impersonation";

// ─── Types ───────────────────────────────────────────────────────────────

export type ProjectListItem = {
  id: number;
  name: string;
  clientid: number;
  company?: string;
  client_name?: string;
  status: number;
  progress: number;
  start_date: string | null;
  deadline: string | null;
  billing_type: number;
  project_cost: string | null;
  estimated_hours: string | null;
  description: string | null;
  project_created: string | null;
  date_finished: string | null;
  projectmanager?: number;
  tags: string | null;
};

export type ProjectMilestone = {
  id: number;
  name: string;
  project_id: number;
  due_date: string | null;
  description: string | null;
  milestone_order: number;
  description_visible_to_customer: number;
  total_tasks?: number;
  total_finished_tasks?: number;
  color?: string;
};

export type ProjectStats = {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  totalMilestones: number;
  completedMilestones: number;
};

// ─── Query scope ─────────────────────────────────────────────────────────

function useProjectQueryScope(): string {
  const impersonation = useImpersonation();
  return impersonation ? `as:${impersonation.staffid}` : "self";
}

// ─── Project detail ──────────────────────────────────────────────────────

export function useProjectDetail(id: string | number) {
  return useQuery({
    queryKey: ["project", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`projects/${id}`);
      if (data?.status === true && data.data) {
        return Array.isArray(data.data) ? data.data[0] : data.data;
      }
      if (Array.isArray(data)) return data[0];
      return data;
    },
    enabled: !!id,
  });
}

// ─── Project tasks ───────────────────────────────────────────────────────

export function useProjectTasks(projectId: string | number) {
  return useQuery({
    queryKey: ["project", String(projectId), "tasks"],
    queryFn: async () => {
      const data = await apiRequest(`tasks?rel_type=project&rel_id=${projectId}&limit=200`);
      return normalizeList(data);
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

// ─── Project milestones ──────────────────────────────────────────────────

export function useProjectMilestones(projectId: string | number) {
  return useQuery({
    queryKey: ["project", String(projectId), "milestones"],
    queryFn: async () => {
      const data = await apiRequest(`milestones?project_id=${projectId}&limit=100`);
      return normalizeList(data).items as ProjectMilestone[];
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Project stats (derived from tasks) ──────────────────────────────────

export function useProjectStats(projectId: string | number) {
  const tasks = useProjectTasks(projectId);
  const milestones = useProjectMilestones(projectId);

  const stats: ProjectStats | undefined =
    tasks.data && milestones
      ? {
          totalTasks: tasks.data.items.length,
          completedTasks: tasks.data.items.filter((t: any) => String(t.status) === "5").length,
          openTasks: tasks.data.items.filter((t: any) => String(t.status) !== "5").length,
          totalMilestones: (milestones.data || []).length,
          completedMilestones: (milestones.data || []).filter(
            (m) => m.total_tasks != null && m.total_tasks > 0 && m.total_finished_tasks === m.total_tasks,
          ).length,
        }
      : undefined;

  return {
    data: stats,
    isLoading: tasks.isLoading || milestones.isLoading,
    isError: tasks.isError || milestones.isError,
  };
}

// ─── Project invoices ─────────────────────────────────────────────────────

export function useProjectInvoices(projectId: string | number) {
  return useQuery({
    queryKey: ["project", String(projectId), "invoices"],
    queryFn: async () => {
      const data = await apiRequest(`invoices?project_id=${projectId}&limit=200`);
      return normalizeList(data);
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

// ─── Project tickets ──────────────────────────────────────────────────────

export function useProjectTickets(projectId: string | number) {
  return useQuery({
    queryKey: ["project", String(projectId), "tickets"],
    queryFn: async () => {
      const data = await apiRequest(`tickets?project_id=${projectId}&limit=200`);
      return normalizeList(data);
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

// ─── Project notes ────────────────────────────────────────────────────────

export function useProjectNotes(projectId: string | number) {
  return useQuery({
    queryKey: ["project", String(projectId), "notes"],
    queryFn: async () => {
      const data = await apiRequest(`projects/notes?project_id=${projectId}&limit=200`);
      return normalizeList(data);
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

export function useAddProjectNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, content }: { projectId: string | number; content: string }) =>
      apiRequest("projects/notes", {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, content }),
      }),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["project", String(projectId), "notes"] });
    },
  });
}

// ─── Project members ──────────────────────────────────────────────────────

export function useProjectMembers(projectId: string | number) {
  return useQuery({
    queryKey: ["project", String(projectId), "members"],
    queryFn: async () => {
      const data = await apiRequest(`projects/members?project_id=${projectId}`);
      return normalizeList(data);
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

export function useAddProjectMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, members }: { projectId: string | number; members: number[] }) =>
      apiRequest("projects/members", {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, members }),
      }),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["project", String(projectId), "members"] });
    },
  });
}

export function useRemoveProjectMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, staffId }: { projectId: string | number; staffId: number }) =>
      apiRequest("projects/members", {
        method: "DELETE",
        body: JSON.stringify({ project_id: projectId, staff_id: staffId }),
      }),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["project", String(projectId), "members"] });
    },
  });
}

// ─── Project discussions ──────────────────────────────────────────────────

export function useProjectDiscussions(projectId: string | number) {
  return useQuery({
    queryKey: ["project", String(projectId), "discussions"],
    queryFn: async () => {
      const data = await apiRequest(`projects/discussions?project_id=${projectId}`);
      return normalizeList(data);
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

export function useAddProjectDiscussion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      subject,
      description,
    }: {
      projectId: string | number;
      subject: string;
      description: string;
    }) =>
      apiRequest("projects/discussions", {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, subject, description }),
      }),
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ["project", String(projectId), "discussions"] });
    },
  });
}

// ─── Project activity log ─────────────────────────────────────────────────

export function useProjectActivity(projectId: string | number) {
  return useQuery({
    queryKey: ["project", String(projectId), "activity"],
    queryFn: async () => {
      const data = await apiRequest(`projects/activity?project_id=${projectId}&limit=100`);
      return normalizeList(data);
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

// ─── All projects list ───────────────────────────────────────────────────

export function useProjectsList(filters?: { status?: string; search?: string; limit?: number }) {
  const scope = useProjectQueryScope();
  return useQuery({
    queryKey: ["projects", "list", scope, filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200 };
      if (filters?.status) params.status = filters.status;
      if (filters?.search) params.search = filters.search;
      const qs = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
      const data = await apiRequest(`projects?${qs}`);
      return normalizeList(data);
    },
    staleTime: 60 * 1000,
  });
}
