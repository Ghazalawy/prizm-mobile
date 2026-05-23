import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL } from "../config";
import { getAuthToken } from "../auth";

/**
 * Hooks for the /api/my/* employee self-service namespace.
 * Backend: modules/api/controllers/My_api.php (ERP v2.7.0+).
 *
 * Everything here resolves "me" via the auth token — no staffid in URLs.
 */

export type MyProfile = {
  staffid: number;
  email: string;
  firstname: string;
  lastname: string;
  phonenumber?: string | null;
  profile_image?: string | null;
  role?: number;
  role_name?: string | null;
  active?: number;
  last_login?: string | null;
  default_language?: string | null;
  departments?: Array<{ departmentid: number; name: string }>;
};

export type CheckinEvent = {
  id: number;
  staff_id?: number;
  date: string;
  type_check: number; // 1 = in, 2 = out
  location_user?: string | null;
  point_id?: string | null;
  workplace_id?: string | null;
  note?: string | null;
};

export type MyDashboard = {
  profile: MyProfile | null;
  checkin: {
    checked_in_now: boolean;
    last_event: CheckinEvent | null;
    today_events: number;
  };
  counts: {
    unread_notifications: number;
    open_tasks: number;
  };
};

export type MyNotification = {
  id: number;
  isread: number;
  isread_inline: number;
  description: string;
  link?: string | null;
  date: string;
  fromuserid?: number | null;
  from_fullname?: string | null;
  fromcompany?: string | null;
  additional_data?: string | null;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { authtoken: token } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 160)}`);
  }
  const j = await res.json();
  if (j?.status === false) throw new Error(j?.message || "Request failed");
  return j as T;
}

// ─── Dashboard ──────────────────────────────────────────────────────────

export function useMyDashboard() {
  return useQuery({
    queryKey: ["my", "dashboard"],
    queryFn: async () => {
      const r = await api<{ status: true; data: MyDashboard }>("my");
      return r.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 90 * 1000,
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: ["my", "profile"],
    queryFn: async () => {
      const r = await api<{ status: true; data: MyProfile }>("my/profile");
      return r.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Check-in / out ─────────────────────────────────────────────────────

export type CheckinResult = {
  status: boolean;
  message?: string;
  data?: { type_check: number; at: string };
  error_code?: number;
};

export function useCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      type_check: 1 | 2;
      location_user?: string;
      point_id?: string;
      workplace_id?: string;
      note?: string;
    }) => {
      return api<CheckinResult>("my/checkin", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["my", "checkin"] });
    },
  });
}

export function useCheckinToday() {
  return useQuery({
    queryKey: ["my", "checkin", "today"],
    queryFn: async () => {
      const r = await api<{ status: true; data: CheckinEvent[] }>("my/checkin/today");
      return r.data || [];
    },
    staleTime: 30 * 1000,
  });
}

export function useCheckinHistory(days = 30) {
  return useQuery({
    queryKey: ["my", "checkin", "history", days],
    queryFn: async () => {
      const r = await api<{ status: true; data: CheckinEvent[] }>(
        `my/checkin/history?days=${days}`
      );
      return r.data || [];
    },
    staleTime: 60 * 1000,
  });
}

// ─── Notifications ──────────────────────────────────────────────────────

export type NotificationsResponse = {
  status: true;
  data: MyNotification[];
  meta: { unread_total: number; limit: number; offset: number };
};

export function useMyNotifications(opts: { limit?: number; unreadOnly?: boolean } = {}) {
  const { limit = 50, unreadOnly = false } = opts;
  return useQuery({
    queryKey: ["my", "notifications", limit, unreadOnly],
    queryFn: async () => {
      const q = new URLSearchParams({ limit: String(limit) });
      if (unreadOnly) q.set("unread", "1");
      return await api<NotificationsResponse>(`my/notifications?${q.toString()}`);
    },
    staleTime: 30 * 1000,
    refetchInterval: 90 * 1000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return api<{ status: true; affected: number }>(
        `my/notifications/${id}/read`,
        { method: "PUT" }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my", "notifications"] });
      qc.invalidateQueries({ queryKey: ["my", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return api<{ status: true; affected: number }>("my/notifications/read_all", {
        method: "PUT",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my", "notifications"] });
      qc.invalidateQueries({ queryKey: ["my", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}
