import { useQuery } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

// ─── Reference data hooks for the Purchase module ─────────────────────────

export type PurchaseStage = {
  id: number;
  name: string;
  color?: string | null;
  order_in_list?: number;
};

export type PurchaseStatus = {
  id: number;
  name: string;
  color?: string | null;
};

export type PurchaseUnit = {
  id: number;
  name: string;
};

export type PurchaseLogItem = {
  id: number;
  log_details: string;
  add_date: string;
  staff_id?: number;
  staff_name?: string;
};

export function usePurchaseStages() {
  return useQuery({
    queryKey: ["purchase", "stages"],
    queryFn: async () => normalizeList(await apiRequest("purchase_api/stages")).items as PurchaseStage[],
    staleTime: 300_000,
  });
}

export function usePurchaseStatuses() {
  return useQuery({
    queryKey: ["purchase", "statuses"],
    queryFn: async () => normalizeList(await apiRequest("purchase_api/statuses")).items as PurchaseStatus[],
    staleTime: 300_000,
  });
}

export function usePurchaseUnits() {
  return useQuery({
    queryKey: ["purchase", "units"],
    queryFn: async () => normalizeList(await apiRequest("purchase_api/units")).items as PurchaseUnit[],
    staleTime: 600_000,
  });
}

export function usePurchaseLog(requestId: string | number | undefined) {
  return useQuery({
    queryKey: ["purchase", "log", String(requestId)],
    queryFn: async () => normalizeList(await apiRequest(`purchase_api/log?request_id=${requestId}`)).items as PurchaseLogItem[],
    enabled: !!requestId,
    staleTime: 15_000,
  });
}

export function usePurchaseAnalytics() {
  return useQuery({
    queryKey: ["purchase", "analytics"],
    queryFn: async () => (await apiRequest("purchase_api/analytics"))?.data,
    staleTime: 60_000,
  });
}
