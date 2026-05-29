import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList, buildQS, type ListParams } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type ContractListItem = {
  id: number;
  subject: string;
  client: number;
  company?: string;
  client_name?: string;
  datestart: string;
  dateend: string | null;
  contract_type: number;
  contract_value: string | null;
  description: string | null;
  content: string | null;
  project_id: number | null;
  signed: number;
  trash: number;
};

// ─── List ────────────────────────────────────────────────────────────────

export function useContractsList(filters?: {
  search?: string;
  status?: string;
  client?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["contracts", "list", filters],
    queryFn: async () => {
      const params: ListParams = {
        limit: filters?.limit ?? 200,
        offset: filters?.offset ?? 0,
        sort: "datestart",
        sort_dir: "desc",
      };
      if (filters?.search) params.search = filters.search;
      if (filters?.status) params.contract_type = filters.status;
      if (filters?.client) params.client = filters.client;
      const data = await apiRequest(`contracts${buildQS(params)}`);
      return normalizeList(data);
    },
    staleTime: 60_000,
  });
}

// ─── Detail ──────────────────────────────────────────────────────────────

export function useContractDetail(id: string | number) {
  return useQuery({
    queryKey: ["contract", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`contracts/${id}`);
      if (data?.status === true && data.data) {
        return Array.isArray(data.data) ? data.data[0] : data.data;
      }
      if (Array.isArray(data)) return data[0];
      return data;
    },
    enabled: !!id,
  });
}

// ─── Sign ────────────────────────────────────────────────────────────────

export function useSignContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`contracts/${id}/sign`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["contract", String(id)] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

// ─── Send ────────────────────────────────────────────────────────────────

export function useSendContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest(`contracts/${id}/send`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["contract", String(id)] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

// ─── Renew ───────────────────────────────────────────────────────────────

export function useRenewContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: { date_start: string; date_end: string; value?: number };
    }) =>
      apiRequest(`contracts/${id}/renew`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["contract", String(id)] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useContractComments(contractId: string | number) {
  return useQuery({
    queryKey: ["contract", String(contractId), "comments"],
    queryFn: async () => normalizeList(await apiRequest(`contracts/comments?contract_id=${contractId}`)),
    enabled: !!contractId,
    staleTime: 60 * 1000,
  });
}

export function useAddContractComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contractId, content }: { contractId: string | number; content: string }) =>
      apiRequest("contracts/comments", {
        method: "POST",
        body: JSON.stringify({ contract_id: contractId, content }),
      }),
    onSuccess: (_, { contractId }) => {
      qc.invalidateQueries({ queryKey: ["contract", String(contractId), "comments"] });
    },
  });
}

export function useContractNotes(contractId: string | number) {
  return useQuery({
    queryKey: ["contract", String(contractId), "notes"],
    queryFn: async () => normalizeList(await apiRequest(`contracts/notes?contract_id=${contractId}`)),
    enabled: !!contractId,
    staleTime: 60 * 1000,
  });
}

export function useAddContractNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contractId, description }: { contractId: string | number; description: string }) =>
      apiRequest("contracts/notes", {
        method: "POST",
        body: JSON.stringify({ contract_id: contractId, description }),
      }),
    onSuccess: (_, { contractId }) => {
      qc.invalidateQueries({ queryKey: ["contract", String(contractId), "notes"] });
    },
  });
}

export function useUnsignContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      apiRequest("contracts/unsign", {
        method: "POST",
        body: JSON.stringify({ id }),
      }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["contract", String(id)] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}
