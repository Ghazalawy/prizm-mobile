import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";
import { useImpersonation } from "../impersonation";

// ─── Types ───────────────────────────────────────────────────────────────

export type TimesheetEntry = {
  id: number;
  task_id: number;
  staff_id: number;
  start_time: string;
  end_time: string | null;
  note: string | null;
  task_name?: string;
  project_name?: string;
  staff_name?: string;
  _actions?: { edit?: boolean; delete?: boolean };
};

export type TimesheetDaySummary = {
  date: string;
  totalSeconds: number;
  entries: TimesheetEntry[];
};

export type ActiveTimer = {
  id: number;
  task_id: number;
  staff_id: number;
  start_time: string;
  end_time: null;
  note: string | null;
  task_name?: string;
  project_name?: string;
};

// ─── Query scope ─────────────────────────────────────────────────────────

function useTimesheetQueryScope(): string {
  const impersonation = useImpersonation();
  return impersonation ? `as:${impersonation.staffid}` : "self";
}

// ─── List entries (raw) ──────────────────────────────────────────────────

export function useTimesheetEntries(opts?: {
  staffId?: number;
  taskId?: number;
  projectId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
}) {
  const scope = useTimesheetQueryScope();
  return useQuery({
    queryKey: ["timesheets", "entries", scope, opts],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        limit: opts?.limit ?? 100,
      };
      if (opts?.staffId) params.staff_id = opts.staffId;
      if (opts?.taskId) params.task_id = opts.taskId;
      if (opts?.projectId) params.project_id = opts.projectId;
      if (opts?.startDate || opts?.endDate) {
        params.start_time = `${opts?.startDate ?? ""}..${opts?.endDate ?? ""}`;
      }
      if (opts?.search) params.search = opts.search;
      const qs = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
      const data = await apiRequest(`timesheets_api?${qs}`);
      return normalizeList(data).items as TimesheetEntry[];
    },
    staleTime: 30 * 1000,
  });
}

// ─── Day summary ─────────────────────────────────────────────────────────

function entriesToDaySummary(
  entries: TimesheetEntry[],
  date: string
): TimesheetDaySummary {
  const dayEntries = entries.filter((e) => {
    const start = e.start_time?.slice(0, 10);
    return start === date;
  });
  let totalSeconds = 0;
  for (const e of dayEntries) {
    const start = new Date(e.start_time.replace(" ", "T")).getTime();
    const end = e.end_time
      ? new Date(e.end_time.replace(" ", "T")).getTime()
      : Date.now();
    totalSeconds += Math.max(0, Math.floor((end - start) / 1000));
  }
  return { date, totalSeconds, entries: dayEntries };
}

export function useTimesheetSummary(date?: string) {
  const scope = useTimesheetQueryScope();
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["timesheets", "summary", targetDate, scope],
    queryFn: async () => {
      const data = await apiRequest(
        `timesheets_api?limit=500&start_time=${encodeURIComponent(`${targetDate}..${targetDate}`)}`
      );
      const entries = normalizeList(data).items as TimesheetEntry[];
      return entriesToDaySummary(entries, targetDate);
    },
    staleTime: 30 * 1000,
  });
}

// ─── Weekly timesheet ────────────────────────────────────────────────────

function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

export function useWeeklyTimesheet(weekStart: string) {
  const scope = useTimesheetQueryScope();
  return useQuery({
    queryKey: ["timesheets", "weekly", weekStart, scope],
    queryFn: async () => {
      const dates = getWeekDates(weekStart);
      const range = `${dates[0]}..${dates[6]}`;
      const data = await apiRequest(
        `timesheets_api?limit=500&start_time=${encodeURIComponent(range)}`
      );
      const entries = normalizeList(data).items as TimesheetEntry[];
      const days = dates.map((date) => entriesToDaySummary(entries, date));
      const weekTotal = days.reduce((sum, d) => sum + d.totalSeconds, 0);
      return { days, weekTotal };
    },
    staleTime: 30 * 1000,
  });
}

// ─── Active timers ───────────────────────────────────────────────────────

export function useActiveTimers() {
  const scope = useTimesheetQueryScope();
  return useQuery({
    queryKey: ["timesheets", "active", scope],
    queryFn: async () => {
      const data = await apiRequest(`timesheets_api?limit=50&active=1`);
      return normalizeList(data).items as ActiveTimer[];
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// ─── Check-in status (from my.ts) ────────────────────────────────────────

export { useMyDashboard as useCheckinStatus } from "./my";

// ─── Log manual time entry ───────────────────────────────────────────────

export function useLogTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      task_id: number;
      staff_id?: number;
      start_time: string;
      end_time: string;
      note?: string;
    }) => {
      return apiRequest("timesheets_api", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      qc.invalidateQueries({ queryKey: ["my", "dashboard"] });
    },
  });
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<TimesheetEntry> & { id: number }) =>
      apiRequest(`timesheets_api/${encodeURIComponent(String(id))}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timesheets"] }),
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      apiRequest(`timesheets_api/${encodeURIComponent(String(id))}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timesheets"] }),
  });
}

// ─── Timer start/stop (re-export from tasks.ts) ──────────────────────────

export { useStartTimer, useStopTimer } from "./tasks";
export type { TaskTimer } from "./tasks";

// ─── Utility ─────────────────────────────────────────────────────────────

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatHoursDecimal(totalSeconds: number): string {
  return (totalSeconds / 3600).toFixed(1);
}
