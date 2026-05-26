import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, buildQS } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type SearchResultItem = {
  link: string;
  title: string;
  type: string;
};

export type SearchResultGroup = {
  type: string;
  result: SearchResultItem[];
};

const RECENT_KEY = "@prizm_recent_searches";
const MAX_RECENT = 10;

// ─── Global search ───────────────────────────────────────────────────────

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => {
      const qs = buildQS({ q: query, limit: 5 });
      const res = await apiRequest(`global_search_api${qs}`);
      return (res?.data ?? []) as SearchResultGroup[];
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ─── Recent searches (AsyncStorage) ──────────────────────────────────────

export function useRecentSearches() {
  return useQuery({
    queryKey: ["recent-searches"],
    queryFn: async () => {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    },
    staleTime: Infinity,
  });
}

export function useSaveRecentSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (term: string) => {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      const prev: string[] = raw ? JSON.parse(raw) : [];
      const next = [term, ...prev.filter((s) => s !== term)].slice(
        0,
        MAX_RECENT,
      );
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    },
    onSuccess: (data) => {
      qc.setQueryData(["recent-searches"], data);
    },
  });
}

export function useClearRecentSearches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(RECENT_KEY);
    },
    onSuccess: () => {
      qc.setQueryData(["recent-searches"], []);
    },
  });
}
