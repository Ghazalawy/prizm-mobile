import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type Payslip = { id: number; staff_id: number; month: string; year: number; status?: string; total?: number; date_created?: string; };
export type PayslipDetail = { id: number; payslip_id: number; earning_type_id?: number; deduction_type_id?: number; amount: number; description?: string; };
export type EarningType = { id: number; name: string; code?: string; };
export type DeductionType = { id: number; name: string; code?: string; };
export type PayrollTemplate = { id: number; name: string; };
export type Commission = { id: number; staff_id?: number; title?: string; amount: number; status?: string; date?: string; };

// ─── Payslips ────────────────────────────────────────────────────────────

export function usePayslips(filters?: { staff_id?: number; month?: string; year?: number; limit?: number }) {
  return useQuery({
    queryKey: ["payroll", "payslips", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.staff_id) params.staff_id = filters.staff_id;
      if (filters?.month) params.month = filters.month;
      if (filters?.year) params.year = filters.year;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`hr_payroll_api/payslips?${qs}`)).items as Payslip[];
    },
    staleTime: 60_000,
  });
}

export function useCreatePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("hr_payroll_api/payslips", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); },
  });
}

export function useUpdatePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`hr_payroll_api/payslips/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); },
  });
}

export function useDeletePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`hr_payroll_api/payslips/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); },
  });
}

export function useMarkPayslipPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`hr_payroll_api/payslips/${id}/mark_paid`, { method: "PUT" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll"] }); },
  });
}

// ─── Payslip Details ─────────────────────────────────────────────────────

export function usePayslipDetails(filters?: { payslip_id?: number; limit?: number }) {
  return useQuery({
    queryKey: ["payroll", "payslip_details", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200 };
      if (filters?.payslip_id) params.payslip_id = filters.payslip_id;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`hr_payroll_api/payslip_details?${qs}`)).items as PayslipDetail[];
    },
    staleTime: 60_000,
  });
}

// ─── Earning / Deduction Types ───────────────────────────────────────────

export function useEarningTypes() {
  return useQuery({
    queryKey: ["payroll", "earning_types"],
    queryFn: async () => normalizeList(await apiRequest("hr_payroll_api/earning_types")).items as EarningType[],
    staleTime: 300_000,
  });
}

export function useDeductionTypes() {
  return useQuery({
    queryKey: ["payroll", "deduction_types"],
    queryFn: async () => normalizeList(await apiRequest("hr_payroll_api/deduction_types")).items as DeductionType[],
    staleTime: 300_000,
  });
}

// ─── Payroll Templates ───────────────────────────────────────────────────

export function usePayrollTemplates() {
  return useQuery({
    queryKey: ["payroll", "templates"],
    queryFn: async () => normalizeList(await apiRequest("hr_payroll_api/payroll_templates")).items as PayrollTemplate[],
    staleTime: 300_000,
  });
}

export function useCreatePayrollTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("hr_payroll_api/payroll_templates", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll", "templates"] }); },
  });
}

export function useUpdatePayrollTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`hr_payroll_api/payroll_templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll", "templates"] }); },
  });
}

export function useDeletePayrollTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`hr_payroll_api/payroll_templates/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll", "templates"] }); },
  });
}

// ─── Commissions ─────────────────────────────────────────────────────────

export function useCommissions(filters?: { staff_id?: number; limit?: number }) {
  return useQuery({
    queryKey: ["payroll", "commissions", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.staff_id) params.staff_id = filters.staff_id;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`hr_payroll_api/commissions?${qs}`)).items as Commission[];
    },
    staleTime: 60_000,
  });
}

export function useCreateCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("hr_payroll_api/commissions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll", "commissions"] }); },
  });
}

export function useUpdateCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`hr_payroll_api/commissions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll", "commissions"] }); },
  });
}

export function useDeleteCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`hr_payroll_api/commissions/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payroll", "commissions"] }); },
  });
}

// ─── Payroll Summary ─────────────────────────────────────────────────────

export function usePayrollSummary(filters?: { month?: string; year?: number }) {
  return useQuery({
    queryKey: ["payroll", "summary", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters?.month) params.month = filters.month;
      if (filters?.year) params.year = filters.year;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return (await apiRequest(`hr_payroll_api/payroll_summary?${qs}`))?.data;
    },
    staleTime: 60_000,
  });
}
