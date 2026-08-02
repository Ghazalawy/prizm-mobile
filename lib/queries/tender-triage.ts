import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, buildQS } from "@/lib/api";

export type TriageBucket = "inbox" | "watch" | "pursue" | "converted" | "dismissed";
export type TriageAction =
  | "pursue"
  | "watch"
  | "dismiss"
  | "reopen"
  | "to_inbox"
  | "mark_converted"
  | "not_converted"
  | "restore";

export type TenderTriageItem = {
  id: number;
  tender_id: number;
  title: string;
  number: string;
  source: string;
  authority: string;
  client: string;
  sector: string;
  rating: "High" | "Medium" | "Low" | null;
  scope: "supply" | "supply_service" | "service" | null;
  deadline: string | null;
  triage_status: TriageBucket | "new" | "pending";
  notes: string;
  rationale: string;
  description: string;
  dismiss_reason: string | null;
  dismiss_note: string | null;
  decided_at: string | null;
  decided_by: string | null;
  opportunity_code: string | null;
  convert_detect: string | null;
  first_seen: string | null;
  last_seen: string | null;
};

export type TriageOverview = {
  installed: boolean;
  counts: Record<TriageBucket, number>;
  kpis: {
    new: number;
    awaiting: number;
    high: number;
    pursue: number;
    closing2: number;
    closing7: number;
    closed: number;
  };
  last_run: string | null;
  options: {
    sources: string[];
    authorities: string[];
    clients: string[];
    sectors: string[];
    countries: string[];
  };
};

export type TriageSnapshot = {
  triage_status: string;
  dismiss_reason?: string | null;
  dismiss_note?: string | null;
  opportunity_id?: number | null;
  convert_detect?: string | null;
  decided_by?: number | null;
  decided_at?: string | null;
};

type TriageListParams = {
  bucket: TriageBucket;
  search?: string;
  filters?: string;
  source?: string;
  authority?: string;
  client?: string;
  sector?: string;
  rating?: string;
  scope?: string;
  country?: string;
  limit?: number;
  offset?: number;
};

const EMPTY_OVERVIEW: TriageOverview = {
  installed: false,
  counts: { inbox: 0, watch: 0, pursue: 0, converted: 0, dismissed: 0 },
  kpis: { new: 0, awaiting: 0, high: 0, pursue: 0, closing2: 0, closing7: 0, closed: 0 },
  last_run: null,
  options: { sources: [], authorities: [], clients: [], sectors: [], countries: [] },
};

export function useTenderTriageOverview(enabled = true) {
  return useQuery({
    queryKey: ["tender-triage", "overview"],
    queryFn: async () => {
      const response = await apiRequest("tender_triage/overview");
      return { ...EMPTY_OVERVIEW, ...response } as TriageOverview;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useTenderTriageItems(params: TriageListParams, enabled = true) {
  return useQuery({
    queryKey: ["tender-triage", "items", params],
    queryFn: async () => {
      const response = await apiRequest(`tender_triage/items${buildQS(params)}`);
      return {
        items: Array.isArray(response?.data) ? (response.data as TenderTriageItem[]) : [],
        total: Number(response?.total) || 0,
      };
    },
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useTenderTriageMutes(enabled = true) {
  return useQuery({
    queryKey: ["tender-triage", "mutes"],
    queryFn: async () => {
      const response = await apiRequest("tender_triage/mutes");
      return Array.isArray(response?.data) ? response.data : [];
    },
    enabled,
  });
}

function useTriageMutation<T>(endpoint: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: T) => apiRequest(endpoint, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tender-triage"] }),
  });
}

export function useTenderTriageAction() {
  return useTriageMutation<{
    id: number;
    action: TriageAction;
    reason?: string;
    note?: string;
    opp_code?: string;
    previous?: TriageSnapshot;
  }>("tender_triage/action");
}

export function useTenderTriageBulkDismiss() {
  return useTriageMutation<{ ids: number[]; reason: string; note?: string }>("tender_triage/bulk_dismiss");
}

export function useTenderTriageMute() {
  return useTriageMutation<{ type: "authority" | "branch"; value: string }>("tender_triage/mute");
}

export function useTenderTriageUnmute() {
  return useTriageMutation<{ type: "authority" | "branch"; value: string }>("tender_triage/unmute");
}

export const TENDER_TRIAGE_DISMISS_REASONS = [
  "Out of sector",
  "Deadline too tight",
  "Insufficient capability",
  "Low value",
  "Duplicate",
  "Geography not viable",
  "Not now",
  "Other",
] as const;
