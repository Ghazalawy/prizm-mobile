import { useQuery } from "@tanstack/react-query";
import { API_URL } from "./config";
import { getAuthToken } from "./auth";

/**
 * Reference-data lookups (countries, currencies, languages, etc.).
 *
 * Each table is small (≤300 rows), changes rarely, and is needed everywhere
 * to resolve foreign-key IDs into human labels. Strategy:
 *   - 1 hour staleTime per query — refetched at most once per hour
 *   - 24 hour gcTime — survives navigation, kept in memory all day
 *   - React Query persists between mounts for the lifetime of the app process
 *
 * (AsyncStorage persistence across app restarts can be added later via
 * @tanstack/react-query-persist-client; for now the in-memory cache is enough
 * since the network call is small and only fires once per hour anyway.)
 */

async function fetchRefList(path: string): Promise<any[]> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/${path}`, {
    headers: { ...(token ? { authtoken: token } : {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return Array.isArray(j) ? j : (j.data ?? []);
}

const REF_QUERY_OPTIONS = {
  staleTime: 60 * 60 * 1000,      // 1 hour
  gcTime:    24 * 60 * 60 * 1000, // 24 hours
} as const;

export type Country = {
  country_id: number | string;
  short_name?: string;
  long_name?: string;
  iso2?: string;
};

export type Currency = {
  id: number | string;
  name?: string;
  symbol?: string;
};

export type CustomerGroup = {
  id: number | string;
  name?: string;
};

export type PaymentMode = {
  id: number | string;
  name?: string;
  active?: number | string;
};

export type TaxRate = {
  id: number | string;
  name?: string;
  taxrate?: number | string;
};

export type LanguageRow = {
  name: string;
};

export const useCountries = () =>
  useQuery<Country[]>({
    queryKey: ["ref", "countries"],
    queryFn: () => fetchRefList("countries"),
    ...REF_QUERY_OPTIONS,
  });

export const useCurrencies = () =>
  useQuery<Currency[]>({
    queryKey: ["ref", "currencies"],
    queryFn: () => fetchRefList("currencies"),
    ...REF_QUERY_OPTIONS,
  });

export const useLanguages = () =>
  useQuery<LanguageRow[]>({
    queryKey: ["ref", "languages"],
    queryFn: () => fetchRefList("languages"),
    ...REF_QUERY_OPTIONS,
  });

export const useCustomerGroups = () =>
  useQuery<CustomerGroup[]>({
    queryKey: ["ref", "customer_groups"],
    queryFn: () => fetchRefList("customer_groups"),
    ...REF_QUERY_OPTIONS,
  });

export const usePaymentModes = () =>
  useQuery<PaymentMode[]>({
    queryKey: ["ref", "payment_modes"],
    queryFn: () => fetchRefList("payment_modes"),
    ...REF_QUERY_OPTIONS,
  });

export const useTaxRates = () =>
  useQuery<TaxRate[]>({
    queryKey: ["ref", "tax_rates"],
    queryFn: () => fetchRefList("tax_rates"),
    ...REF_QUERY_OPTIONS,
  });

// ─── Resolvers ──────────────────────────────────────────────────────────────
// One-line "give me the human label" hooks. Used in detail screens.
// All return undefined while the underlying ref data is loading.

function toId(x: any): string | null {
  if (x === null || x === undefined || x === "" || x === 0 || x === "0") return null;
  return String(x);
}

export function useCountryName(id: any): string | undefined {
  const { data } = useCountries();
  const key = toId(id);
  if (!key) return undefined;
  return data?.find((c) => String(c.country_id) === key)?.short_name;
}

export function useCurrencyName(id: any): string | undefined {
  const { data } = useCurrencies();
  const key = toId(id);
  if (!key) return undefined;
  return data?.find((c) => String(c.id) === key)?.name;
}

export function useCustomerGroupName(id: any): string | undefined {
  const { data } = useCustomerGroups();
  const key = toId(id);
  if (!key) return undefined;
  return data?.find((g) => String(g.id) === key)?.name;
}

export function usePaymentModeName(id: any): string | undefined {
  const { data } = usePaymentModes();
  const key = toId(id);
  if (!key) return undefined;
  return data?.find((m) => String(m.id) === key)?.name;
}
