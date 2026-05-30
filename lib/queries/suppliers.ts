import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type Supplier = {
  id: number;
  company: string;
  company_name?: string;
  vat: string | null;
  phone_number: string | null;
  country: string | null;
  city: string | null;
  zipcode: string | null;
  state: string | null;
  address: string | null;
  website: string | null;
  date_created: string | null;
  categories: string | null;
  approval_status?: string | null;
  primary_contact_id?: number | null;
};

export type SupplierContact = {
  id: number;
  supplier_id: number;
  firstname: string;
  lastname: string;
  middlename?: string | null;
  title?: string | null;
  designation: string | null;
  Department?: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  primary_contact: number | null;
  active: number | null;
};

export type VendorCategory = {
  id: number;
  name: string;
};

// ─── Suppliers CRUD ──────────────────────────────────────────────────────

export function useSuppliersList(filters?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: ["suppliers", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.search) params.search = filters.search;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`purchase_api/vendors?${qs}`)).items as Supplier[];
    },
    staleTime: 60_000,
  });
}

export function useSupplierDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ["suppliers", "detail", String(id)],
    queryFn: async () => (await apiRequest(`purchase_api/vendors/${id}`))?.data as Supplier,
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("purchase_api/vendors", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`purchase_api/vendors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["suppliers", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["suppliers", "list"] });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); },
  });
}

// ─── Supplier Contacts ───────────────────────────────────────────────────

export function useSupplierContacts(supplierId: string | number | undefined) {
  return useQuery({
    queryKey: ["suppliers", "contacts", String(supplierId)],
    queryFn: async () => normalizeList(await apiRequest(`purchase_api/vendor_contacts/${supplierId}`)).items as SupplierContact[],
    enabled: !!supplierId,
    staleTime: 30_000,
  });
}

export function useAddSupplierContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("purchase_api/vendor_contacts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["suppliers", "contacts", String(vars.supplier_id ?? vars.vendor_id)] });
    },
  });
}

export function useUpdateSupplierContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`purchase_api/vendor_contacts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers", "contacts"] }); },
  });
}

export function useDeleteSupplierContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`purchase_api/vendor_contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers", "contacts"] }); },
  });
}

// ─── Vendor Categories ───────────────────────────────────────────────────

export function useVendorCategories() {
  return useQuery({
    queryKey: ["suppliers", "categories"],
    queryFn: async () => normalizeList(await apiRequest("purchase_api/vendor_categories")).items as VendorCategory[],
    staleTime: 300_000,
  });
}
