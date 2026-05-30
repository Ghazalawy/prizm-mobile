import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList, buildQS, type ListParams } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type CustomerListItem = {
  userid: number;
  company: string;
  vat: string | null;
  phonenumber: string | null;
  city: string | null;
  state: string | null;
  country: number;
  active: number;
  default_currency: number;
  default_language: string | null;
  website: string | null;
  datecreated: string | null;
  leadid: number | null;
};

export type CustomerContact = {
  id: number;
  customer_id: number;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string | null;
  title: string | null;
  is_primary: number;
  active: number;
};

export type CustomerGroup = {
  id: number;
  name: string;
};

export type CustomerFinancialSummary = {
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  invoiceCount: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
};

// ─── List ────────────────────────────────────────────────────────────────

export function useCustomersList(filters?: {
  search?: string;
  active?: string;
  group?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["customers", "list", filters],
    queryFn: async () => {
      const params: ListParams = {
        limit: filters?.limit ?? 200,
        offset: filters?.offset ?? 0,
        sort: "company",
        sort_dir: "asc",
      };
      if (filters?.search) params.search = filters.search;
      if (filters?.active) params.active = filters.active;
      if (filters?.group) params.group_id = filters.group;
      const data = await apiRequest(`customers${buildQS(params)}`);
      return normalizeList(data);
    },
    staleTime: 60_000,
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────

export function useCustomerDetail(id: string | number) {
  return useQuery({
    queryKey: ["customer", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`customers/${id}`);
      if (data?.status === true && data.data) {
        return Array.isArray(data.data) ? data.data[0] : data.data;
      }
      if (Array.isArray(data)) return data[0];
      return data;
    },
    enabled: !!id,
  });
}

// ─── Contacts ────────────────────────────────────────────────────────────

export function useCustomerContacts(customerId: string | number) {
  return useQuery({
    queryKey: ["customer", String(customerId), "contacts"],
    queryFn: async () => {
      try {
        const data = await apiRequest(`customers/contacts?customer_id=${customerId}`);
        return normalizeList(data).items as CustomerContact[];
      } catch {
        const data = await apiRequest(`contacts?customer_id=${customerId}&limit=100`);
        return normalizeList(data).items as CustomerContact[];
      }
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

export function useCreateCustomerContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CustomerContact> & { customer_id: number }) => {
      try {
        return await apiRequest("customers/contacts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch {
        return await apiRequest("contacts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["customer", String(vars.customer_id), "contacts"] });
    },
  });
}

export function useDeleteCustomerContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, customerId }: { id: number; customerId: string | number }) => {
      try {
        return await apiRequest("customers/contacts", {
          method: "DELETE",
          body: JSON.stringify({ id }),
        });
      } catch {
        return await apiRequest(`contacts/${id}`, { method: "DELETE" });
      }
    },
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: ["customer", String(customerId), "contacts"] });
    },
  });
}

// ─── Customer Groups ─────────────────────────────────────────────────────

export function useCustomerGroups() {
  return useQuery({
    queryKey: ["customer-groups"],
    queryFn: async () => {
      try {
        const data = await apiRequest("customers/groups");
        if (Array.isArray(data)) return data as CustomerGroup[];
        if (data?.data && Array.isArray(data.data)) return data.data as CustomerGroup[];
        return [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Customer Invoices ───────────────────────────────────────────────────

export function useCustomerInvoices(customerId: string | number) {
  return useQuery({
    queryKey: ["customer", String(customerId), "invoices"],
    queryFn: async () => {
      const data = await apiRequest(
        `invoices?clientid=${customerId}&limit=200&sort=date&sort_dir=desc`
      );
      return normalizeList(data);
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

// ─── Customer Estimates ──────────────────────────────────────────────────

export function useCustomerEstimates(customerId: string | number) {
  return useQuery({
    queryKey: ["customer", String(customerId), "estimates"],
    queryFn: async () => {
      const data = await apiRequest(
        `estimates?clientid=${customerId}&limit=200&sort=date&sort_dir=desc`
      );
      return normalizeList(data);
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

// ─── Customer Projects ───────────────────────────────────────────────────

export function useCustomerProjects(customerId: string | number) {
  return useQuery({
    queryKey: ["customer", String(customerId), "projects"],
    queryFn: async () => {
      const data = await apiRequest(
        `projects?clientid=${customerId}&limit=200`
      );
      return normalizeList(data);
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

// ─── Customer Contracts ──────────────────────────────────────────────────

export function useCustomerContracts(customerId: string | number) {
  return useQuery({
    queryKey: ["customer", String(customerId), "contracts"],
    queryFn: async () => {
      const data = await apiRequest(
        `contracts?client=${customerId}&limit=200`
      );
      return normalizeList(data);
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

// ─── Customer Tasks ──────────────────────────────────────────────────────

export function useCustomerTasks(customerId: string | number) {
  return useQuery({
    queryKey: ["customer", String(customerId), "tasks"],
    queryFn: async () => {
      const data = await apiRequest(
        `tasks?rel_type=customer&rel_id=${customerId}&limit=200`
      );
      return normalizeList(data);
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

// ─── Customer Tickets ────────────────────────────────────────────────────

export function useCustomerTickets(customerId: string | number) {
  return useQuery({
    queryKey: ["customer", String(customerId), "tickets"],
    queryFn: async () => {
      const data = await apiRequest(
        `tickets?userid=${customerId}&limit=200`
      );
      return normalizeList(data);
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

// ─── Customer Proposals ──────────────────────────────────────────────────

export function useCustomerProposals(customerId: string | number) {
  return useQuery({
    queryKey: ["customer", String(customerId), "proposals"],
    queryFn: async () => {
      const data = await apiRequest(
        `proposals?rel_type=customer&rel_id=${customerId}&limit=200`
      );
      return normalizeList(data);
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

// ─── Customer Expenses ───────────────────────────────────────────────────

export function useCustomerExpenses(customerId: string | number) {
  return useQuery({
    queryKey: ["customer", String(customerId), "expenses"],
    queryFn: async () => {
      const data = await apiRequest(
        `expenses?clientid=${customerId}&limit=200`
      );
      return normalizeList(data);
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
}

// ─── Financial Summary (derived from invoices) ───────────────────────────

export function useCustomerFinancialSummary(customerId: string | number) {
  const invoices = useCustomerInvoices(customerId);

  const summary: CustomerFinancialSummary | undefined = invoices.data
    ? (() => {
        const items = invoices.data.items;
        let totalInvoiced = 0;
        let totalPaid = 0;
        let paidCount = 0;
        let unpaidCount = 0;
        let overdueCount = 0;

        for (const inv of items) {
          const total = Number(inv.total || 0);
          const status = String(inv.status);
          totalInvoiced += total;

          if (status === "4") {
            totalPaid += total;
            paidCount++;
          } else if (status === "5" || status === "6") {
            // cancelled / draft - don't count
          } else {
            const paid = Number(inv.amount_paid || inv.paid || 0);
            totalPaid += paid;
            unpaidCount++;
            if (inv.duedate && new Date(inv.duedate) < new Date() && status !== "4") {
              overdueCount++;
            }
          }
        }

        return {
          totalInvoiced,
          totalPaid,
          outstandingBalance: totalInvoiced - totalPaid,
          invoiceCount: items.length,
          paidCount,
          unpaidCount,
          overdueCount,
        };
      })()
    : undefined;

  return {
    data: summary,
    isLoading: invoices.isLoading,
    isError: invoices.isError,
  };
}

// ─── Customer Count ────────────────────────────────────────────────────────

export function useCustomerCount(filters?: { active?: string; group?: string }) {
  return useQuery({
    queryKey: ["customers", "count", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.active) params.set("active", filters.active);
      if (filters?.group) params.set("group_id", filters.group);
      const qs = params.toString();
      const data = await apiRequest(`customers/count${qs ? `?${qs}` : ""}`);
      return (data?.data ?? data) as { total?: number; count?: number; active?: number; inactive?: number };
    },
    staleTime: 60_000,
  });
}

// ─── Billing / Shipping ────────────────────────────────────────────────────

export function useCustomerBillingShipping(customerId: string | number) {
  return useQuery({
    queryKey: ["customer", String(customerId), "billing_shipping"],
    queryFn: async () => {
      const data = await apiRequest(
        `customers/billing_shipping?customer_id=${customerId}`
      );
      return (data?.data ?? data) as Record<string, unknown>;
    },
    enabled: !!customerId,
  });
}

// ─── Update Contact ────────────────────────────────────────────────────────

export function useUpdateCustomerContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string | number;
      payload: Partial<CustomerContact>;
    }) =>
      apiRequest("customers/contacts", {
        method: "PUT",
        body: JSON.stringify({ id, ...payload }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["customer", String(vars.payload.customer_id ?? ""), "contacts"] });
    },
  });
}

// ─── Delete Group ──────────────────────────────────────────────────────────

export function useDeleteCustomerGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest("customers/groups", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-groups"] });
    },
  });
}

// ─── Remove Admin ──────────────────────────────────────────────────────────

export function useRemoveCustomerAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      staffId,
    }: {
      customerId: string | number;
      staffId: string | number;
    }) =>
      apiRequest("customers/admins", {
        method: "DELETE",
        body: JSON.stringify({ customer_id: customerId, staff_id: staffId }),
      }),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: ["customer", String(customerId), "admins"] });
    },
  });
}
