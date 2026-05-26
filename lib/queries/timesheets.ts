import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList, buildAuthHeaders, parseApiResponse } from "../api";
import { API_URL } from "../config";
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
      const qs = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
      const data = await apiRequest(`timesheets_api?${qs}`);
      return (data?.data || []) as TimesheetEntry[];
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
      const data = await apiRequest(`timesheets_api?limit=200`);
      const entries = (data?.data || []) as TimesheetEntry[];
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
      const data = await apiRequest(`timesheets_api?limit=500`);
      const entries = (data?.data || []) as TimesheetEntry[];
      const dates = getWeekDates(weekStart);
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
      const data = await apiRequest(`timesheets_api?limit=50`);
      const entries = (data?.data || []) as TimesheetEntry[];
      return entries.filter(
        (e) => !e.end_time || e.end_time === "0000-00-00 00:00:00"
      ) as ActiveTimer[];
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
      staff_id: number;
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
