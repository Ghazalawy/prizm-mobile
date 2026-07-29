import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList, buildQS } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type CalendarEvent = {
  eventid: string | number;
  title: string;
  description: string | null;
  userid: string | number;
  start: string;
  end: string | null;
  public: string | number;
  color: string;
  isstartnotified: string | number;
  reminder_before: string | number;
  reminder_before_type: string;
  _actions?: { edit?: boolean; delete?: boolean };
};

export type CalendarEventFilters = {
  month?: number;
  year?: number;
  search?: string;
  filters?: string;
};

export type CalendarOverlayItem = {
  id: string | number;
  title: string;
  date: string;
  type: "task" | "project" | "contract" | "tender";
  color: string;
  route: string;
};

export type CreateEventPayload = {
  title: string;
  description?: string;
  start: string;
  end?: string;
  reminder_before: number;
  reminder_before_type: string;
  color?: string;
  userid: number;
  public: number;
  isstartnotified: number;
};

// ─── Calendar Events ─────────────────────────────────────────────────────

export function useCalendarEvents(options: CalendarEventFilters = {}) {
  const { month, year, search, filters } = options;
  return useQuery({
    queryKey: ["calendar-events", options],
    queryFn: async () => {
      const hasMonth = month !== undefined && year !== undefined;
      const from = hasMonth
        ? `${year}-${String(month + 1).padStart(2, "0")}-01`
        : undefined;
      const to = hasMonth
        ? `${year}-${String(month + 1).padStart(2, "0")}-${String(new Date(year!, month! + 1, 0).getDate()).padStart(2, "0")}`
        : undefined;
      const qs = buildQS({ search, filters, from, to, limit: 500 });
      const data = await apiRequest(`calendar${qs}`);
      const events: CalendarEvent[] = Array.isArray(data)
        ? data
        : data?.data ?? data ?? [];
      if (month !== undefined && year !== undefined) {
        return events.filter((e) => {
          const d = new Date(e.start.replace(" ", "T"));
          return d.getMonth() === month && d.getFullYear() === year;
        });
      }
      return events;
    },
    staleTime: 60_000,
  });
}

export function useCalendarEvent(id: string | number | undefined) {
  return useQuery({
    queryKey: ["calendar-event", id],
    queryFn: async () => {
      const data = await apiRequest(`calendar/${id}`);
      return (data?.data ?? data) as CalendarEvent;
    },
    enabled: id !== undefined && id !== "",
    staleTime: 60_000,
  });
}

// ─── Overlay: task due dates, project deadlines, contract expiry, tender closing ─

export function useCalendarOverlays(month?: number, year?: number) {
  return useQuery({
    queryKey: ["calendar-overlays", month, year],
    queryFn: async () => {
      const [tasks, projects, contracts, tenders] = await Promise.allSettled([
        apiRequest("tasks?limit=200"),
        apiRequest("projects?limit=200"),
        apiRequest("contracts?limit=200"),
        apiRequest("tenders_api?limit=200"),
      ]);

      const overlays: CalendarOverlayItem[] = [];

      if (tasks.status === "fulfilled") {
        const list = Array.isArray(tasks.value) ? tasks.value : tasks.value?.data ?? [];
        for (const t of list) {
          if (t.duedate) {
            overlays.push({
              id: `task-${t.id}`,
              title: t.name,
              date: t.duedate,
              type: "task",
              color: "#F59E0B",
              route: `/(tabs)/tasks/${t.id}`,
            });
          }
        }
      }

      if (projects.status === "fulfilled") {
        const list = Array.isArray(projects.value) ? projects.value : projects.value?.data ?? [];
        for (const p of list) {
          if (p.deadline) {
            overlays.push({
              id: `project-${p.id}`,
              title: p.name,
              date: p.deadline,
              type: "project",
              color: "#0284C7",
              route: `/(tabs)/projects/${p.id}`,
            });
          }
        }
      }

      if (contracts.status === "fulfilled") {
        const list = Array.isArray(contracts.value) ? contracts.value : contracts.value?.data ?? [];
        for (const c of list) {
          if (c.dateend) {
            overlays.push({
              id: `contract-${c.id}`,
              title: c.subject,
              date: c.dateend,
              type: "contract",
              color: "#7C3AED",
              route: `/(tabs)/contracts/${c.id}`,
            });
          }
        }
      }

      if (tenders.status === "fulfilled") {
        const list = Array.isArray(tenders.value) ? tenders.value : tenders.value?.data ?? [];
        for (const t of list) {
          if (t.closing_date) {
            overlays.push({
              id: `tender-${t.id}`,
              title: t.tender_description || t.tender_number,
              date: t.closing_date,
              type: "tender",
              color: "#DC2626",
              route: `/(tabs)/tenders/${t.id}`,
            });
          }
        }
      }

      if (month !== undefined && year !== undefined) {
        return overlays.filter((o) => {
          const d = new Date(o.date.slice(0, 10) + "T00:00:00");
          return d.getMonth() === month && d.getFullYear() === year;
        });
      }
      return overlays;
    },
    staleTime: 120_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEventPayload) =>
      apiRequest("calendar", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: CreateEventPayload & { id: number }) =>
      apiRequest(`calendar/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["calendar-event", id] });
      qc.invalidateQueries({ queryKey: ["calendar-event", String(id)] });
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`calendar/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ["calendar-event", id] });
      qc.removeQueries({ queryKey: ["calendar-event", String(id)] });
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}
