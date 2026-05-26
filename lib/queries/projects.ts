import { useQuery } from "@tanstack/react-query";
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
