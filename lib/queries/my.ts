import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL } from "../config";
import { getAuthToken } from "../auth";
import { parseApiResponse } from "../api";

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
  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) {
    const txt = typeof body === "string" ? body : JSON.stringify(body ?? "");
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 160)}`);
  }
  if (body?.status === false) throw new Error(body?.message || "Request failed");
  return body as T;
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

// ─── My Leave (v2.7.1) ──────────────────────────────────────────────────

/** rel_type integer → human label (matches Timesheets module enum) */
export const LEAVE_REL_TYPES = [
  { id: 1, label: "Leave (annual / sick / etc)" },
  { id: 2, label: "Late / Early arrival" },
  { id: 3, label: "Go-out during work" },
  { id: 4, label: "Business trip" },
  { id: 5, label: "Quit / resignation" },
  { id: 6, label: "Early departure" },
] as const;

/** When rel_type === 1, type_of_leave picks the leave kind. */
export const TYPE_OF_LEAVE = [
  { id: 8, label: "Annual" },
  { id: 1, label: "Sick" },
  { id: 2, label: "Maternity" },
  { id: 4, label: "Unpaid" },
] as const;

export type LeaveBalance = {
  type_id: number;
  type_name: string;
  /** null when no per-type cap is configured in the source DB —
   *  the schema's tbltimesheets_type_of_leave has no max_day column. */
  max_days: number | null;
  used_days: number;
  /** null when max_days is null (no cap → "remaining" is undefined). */
  remaining: number | null;
};

export type LeaveRequest = {
  id: number;
  subject: string;
  start_time: string;
  end_time: string;
  reason: string;
  approver_id: number | null;
  followers_id: string | null;
  rel_type: number;
  type_of_leave: number;
  /** 0=pending, 1=approved, 2=rejected */
  status: number;
  place_of_business: string | null;
  datecreated: string;
};

export function useLeaveBalance(year?: number) {
  return useQuery({
    queryKey: ["my", "leave", "balance", year],
    queryFn: async () => {
      const q = year ? `?year=${year}` : "";
      const r = await api<{ status: true; data: { year: number; balance: LeaveBalance[] } }>(
        `my/leave/balance${q}`
      );
      return r.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeaveRequests(opts: { status?: number; limit?: number } = {}) {
  const { status, limit = 100 } = opts;
  return useQuery({
    queryKey: ["my", "leave", "requests", status, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (status !== undefined) params.set("status", String(status));
      const r = await api<{ status: true; data: LeaveRequest[] }>(
        `my/leave/requests?${params.toString()}`
      );
      return r.data || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useSubmitLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      rel_type: number;
      type_of_leave?: number;
      start_time: string;
      end_time: string;
      subject?: string;
      reason?: string;
      approver_id?: number;
      place_of_business?: string;
    }) => {
      return api<{ status: true; message: string; data: { id: number } }>(
        "my/leave/request",
        { method: "POST", body: JSON.stringify(body) }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my", "leave"] });
      qc.invalidateQueries({ queryKey: ["my", "dashboard"] });
    },
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return api<{ status: true; message: string }>(`my/leave/request/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my", "leave"] });
    },
  });
}

// ─── My Payslips (v2.7.2) ───────────────────────────────────────────────

export type PayslipRow = {
  id: number;
  payslip_id: number;
  staff_id: number;
  month: string;
  pay_slip_number: string | null;
  payment_run_date: string;
  employee_name: string | null;
  dept_name: string | null;
  standard_workday: string;
  actual_workday: string;
  paid_leave: string;
  unpaid_leave: string;
  gross_pay: string;
  total_deductions: string;
  net_pay: string;
  payslip_name: string;
  payslip_status: string;
  payslip_month: string;
  from_currency_name: string | null;
  to_currency_name: string | null;
};

export type PayslipDetail = PayslipRow & {
  income_tax_paye?: string;
  it_rebate_code?: string | null;
  it_rebate_value?: string;
  from_currency_rate?: string;
  to_currency_rate?: string;
};

export function useMyPayslips(limit = 24) {
  return useQuery({
    queryKey: ["my", "payslips", limit],
    queryFn: async () => {
      const r = await api<{ status: true; data: PayslipRow[] }>(
        `my/payslips?limit=${limit}`
      );
      return r.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyPayslip(id: number | null | undefined) {
  return useQuery({
    queryKey: ["my", "payslip", id],
    queryFn: async () => {
      const r = await api<{ status: true; data: PayslipDetail }>(
        `my/payslips/${id}`
      );
      return r.data;
    },
    enabled: typeof id === "number" && id > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── My Expenses (v2.7.3) ───────────────────────────────────────────────

export type ExpenseRow = {
  id: number;
  expense_name: string;
  note: string | null;
  amount: string;
  date: string;
  currency: number;
  currency_name: string | null;
  category: number;
  category_name: string | null;
  project_id: number | null;
  customer_id: number | null;
  billable: number;
  invoiceid: number | null;
  dateadded: string;
};

export type ExpensesResponse = {
  status: true;
  data: ExpenseRow[];
  summary: {
    total_amount: number;
    total_count: number;
    billed_amount: number;
  };
};

export function useMyExpenses(opts: { from?: string; to?: string; limit?: number } = {}) {
  const { from, to, limit = 60 } = opts;
  return useQuery({
    queryKey: ["my", "expenses", from, to, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return await api<ExpensesResponse>(`my/expenses?${params.toString()}`);
    },
    staleTime: 60 * 1000,
  });
}

export function useSubmitExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      expense_name: string;
      amount: number;
      date: string;
      category: number;
      note?: string;
      currency?: number;
      project_id?: number;
      customer_id?: number;
      billable?: boolean;
    }) => {
      return api<{ status: true; message: string; data: { id: number } }>(
        "my/expenses",
        { method: "POST", body: JSON.stringify(body) }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my", "expenses"] });
    },
  });
}
