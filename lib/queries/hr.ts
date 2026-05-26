import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, buildQS } from "../api";

/**
 * HR self-service queries — wraps existing /api/my/* and /api/hr_payroll_api/*
 * endpoints with enhanced typing for the richer HR screens.
 *
 * Note: useLeaveBalance, useLeaveRequests, useSubmitLeave, useCancelLeave
 * already exist in lib/queries/my.ts — these are re-exports + new hooks.
 */

export {
  useLeaveBalance,
  useLeaveRequests,
  useSubmitLeave,
  useCancelLeave,
  useMyPayslips,
  useMyPayslip,
  useMyProfile,
  type LeaveBalance,
  type LeaveRequest,
  type PayslipRow,
  type PayslipDetail,
  type MyProfile,
} from "./my";

// ─── Leave History (with filters) ────────────────────────────────────────

export type LeaveHistoryFilters = {
  status?: number;
  year?: number;
  limit?: number;
};

export function useLeaveHistory(filters?: LeaveHistoryFilters) {
  return useQuery({
    queryKey: ["my", "leave", "history", filters],
    queryFn: async () => {
      const params: Record<string, string> = {
        limit: String(filters?.limit ?? 200),
      };
      if (filters?.status !== undefined) params.status = String(filters.status);
      if (filters?.year) params.year = String(filters.year);
      const qs = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
      const data = await apiRequest(`my/leave/requests?${qs}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    },
    staleTime: 60_000,
  });
}

// ─── Payslips with year filter ───────────────────────────────────────────

export function usePayslipsList(year?: number) {
  return useQuery({
    queryKey: ["my", "payslips", "filtered", year],
    queryFn: async () => {
      const qs = year ? `?year=${year}&limit=24` : "?limit=24";
      const data = await apiRequest(`my/payslips${qs}`);
      if (data?.status === true && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Enhanced Profile ────────────────────────────────────────────────────

export type EnhancedProfile = {
  staffid: number;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string | null;
  profile_image: string | null;
  role_name: string | null;
  departments: Array<{ departmentid: number; name: string }>;
  datecreated: string | null;
  employee_id?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  position?: string | null;
};

export function useEnhancedProfile() {
  return useQuery({
    queryKey: ["my", "profile", "enhanced"],
    queryFn: async () => {
      const data = await apiRequest("my/profile");
      if (data?.status === true && data.data) {
        return data.data as EnhancedProfile;
      }
      return null;
    },
    staleTime: 5 * 60_000,
  });
}
