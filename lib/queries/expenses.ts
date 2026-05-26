import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList, buildQS } from "../api";
import { useImpersonation } from "../impersonation";

// ─── Types ───────────────────────────────────────────────────────────────

export type ExpenseListItem = {
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
  clientid: number | null;
  customer_id: number | null;
  billable: number;
  invoiceid: number | null;
  paymentmode: number | null;
  reference_no: string | null;
  dateadded: string;
  addedfrom: number | null;
  tax: number | null;
  tax2: number | null;
  company?: string | null;
  payment_mode_name?: string | null;
  customfields?: any[];
};

export type ExpenseCategory = {
  id: number;
  name: string;
  description?: string | null;
};

export type ExpenseFilters = {
  category?: number;
  billable?: "all" | "billable" | "not_billable";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sort?: "date" | "amount";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

// ─── Query scope ─────────────────────────────────────────────────────────

function useExpenseQueryScope(): string {
  const impersonation = useImpersonation();
  return impersonation ? `as:${impersonation.staffid}` : "self";
}

// ─── List (all expenses — admin/permission-gated) ────────────────────────

export function useExpensesList(filters?: ExpenseFilters) {
  const scope = useExpenseQueryScope();
  return useQuery({
    queryKey: ["expenses", "list", scope, filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        limit: filters?.limit ?? 100,
      };
      if (filters?.search) params.search = filters.search;
      if (filters?.offset) params.offset = filters.offset;
      const data = await apiRequest(`expenses${buildQS(params)}`);
      let items = normalizeList(data).items as ExpenseListItem[];

      if (filters?.category) {
        items = items.filter((e) => e.category === filters.category);
      }
      if (filters?.billable === "billable") {
        items = items.filter((e) => e.billable === 1);
      } else if (filters?.billable === "not_billable") {
        items = items.filter((e) => e.billable === 0);
      }
      if (filters?.dateFrom) {
        items = items.filter((e) => e.date >= filters.dateFrom!);
      }
      if (filters?.dateTo) {
        items = items.filter((e) => e.date <= filters.dateTo!);
      }

      const sortKey = filters?.sort ?? "date";
      const dir = filters?.sortDir ?? "desc";
      items.sort((a, b) => {
        const va = sortKey === "amount" ? parseFloat(a.amount) : new Date(a.date).getTime();
        const vb = sortKey === "amount" ? parseFloat(b.amount) : new Date(b.date).getTime();
        return dir === "desc" ? vb - va : va - vb;
      });

      return items;
    },
    staleTime: 60 * 1000,
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────

export function useExpenseDetail(id: number | string | null | undefined) {
  const scope = useExpenseQueryScope();
  return useQuery({
    queryKey: ["expenses", "detail", String(id), scope],
    queryFn: async () => {
      const data = await apiRequest(`expenses/${id}`);
      const items = normalizeList(data).items as ExpenseListItem[];
      return items[0] ?? data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

// ─── Categories ──────────────────────────────────────────────────────────

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expenses", "categories"],
    queryFn: async () => {
      const data = await apiRequest("expenses_categories");
      return normalizeList(data).items as ExpenseCategory[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Create ──────────────────────────────────────────────────────────────

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      expense_name: string;
      amount: number;
      date: string;
      category: number;
      currency: number;
      note?: string;
      clientid?: number;
      project_id?: number;
      billable?: number;
      paymentmode?: number;
      reference_no?: string;
    }) => {
      return apiRequest("expenses", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["my", "expenses"] });
    },
  });
}

// ─── Update ──────────────────────────────────────────────────────────────

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: number;
      expense_name?: string;
      amount?: number;
      date?: string;
      category?: number;
      currency?: number;
      note?: string;
      clientid?: number;
      project_id?: number;
      billable?: number;
    }) => {
      return apiRequest(`expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["my", "expenses"] });
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`expenses/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["my", "expenses"] });
    },
  });
}

// ─── Workflow actions ────────────────────────────────────────────────────

export function useMarkBillable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`expenses/${id}/mark_billable`, { method: "PUT" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["my", "expenses"] });
    },
  });
}

export function useMarkNotBillable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`expenses/${id}/mark_not_billable`, { method: "PUT" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["my", "expenses"] });
    },
  });
}

export function useCopyExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`expenses/${id}/copy`, { method: "POST" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["my", "expenses"] });
    },
  });
}

// ─── My Expenses (re-export from my.ts for convenience) ──────────────────

export { useMyExpenses, useSubmitExpense } from "./my";
export type { ExpenseRow, ExpensesResponse } from "./my";
