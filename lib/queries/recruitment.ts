import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type RecruitmentPosition = { id: number; title: string; description?: string; status?: number; date_created?: string; };
export type Candidate = { id: number; name: string; email?: string; phone?: string; position_id?: number; stage_id?: number; status?: string; date_created?: string; };
export type RecruitmentProposal = { id: number; position_id?: number; candidate_id?: number; status?: string; date_created?: string; };

// ─── Positions ───────────────────────────────────────────────────────────

export function usePositionsList(filters?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: ["recruitment", "positions", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.search) params.search = filters.search;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`recruitment_api/positions?${qs}`)).items as RecruitmentPosition[];
    },
    staleTime: 60_000,
  });
}

export function useCreatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("recruitment_api/positions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recruitment", "positions"] }); },
  });
}

export function useUpdatePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`recruitment_api/positions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recruitment", "positions"] }); },
  });
}

export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`recruitment_api/positions/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recruitment", "positions"] }); },
  });
}

// ─── Candidates ──────────────────────────────────────────────────────────

export function useCandidatesList(filters?: { position_id?: number; limit?: number }) {
  return useQuery({
    queryKey: ["recruitment", "candidates", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.position_id) params.position_id = filters.position_id;
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`recruitment_api/candidates?${qs}`)).items as Candidate[];
    },
    staleTime: 30_000,
  });
}

export function useCandidateDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ["recruitment", "candidates", String(id)],
    queryFn: async () => (await apiRequest(`recruitment_api/candidates/${id}`))?.data as Candidate,
    enabled: !!id,
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("recruitment_api/candidates", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recruitment", "candidates"] }); },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`recruitment_api/candidates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["recruitment", "candidates", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["recruitment", "candidates"] });
    },
  });
}

export function useHireCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`recruitment_api/candidates/${id}/hire`, { method: "PUT" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recruitment"] }); },
  });
}

export function useRejectCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) =>
      apiRequest(`recruitment_api/candidates/${id}/reject`, { method: "PUT" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recruitment"] }); },
  });
}

export function useChangeCandidateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage_id }: { id: string | number; stage_id: number }) =>
      apiRequest(`recruitment_api/candidates/${id}/change_stage`, { method: "PUT", body: JSON.stringify({ stage_id }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recruitment"] }); },
  });
}

// ─── Proposals ───────────────────────────────────────────────────────────

export function useProposalsList(filters?: { limit?: number }) {
  return useQuery({
    queryKey: ["recruitment", "proposals", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      return normalizeList(await apiRequest(`recruitment_api/proposals?${qs}`)).items as RecruitmentProposal[];
    },
    staleTime: 30_000,
  });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("recruitment_api/proposals", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recruitment", "proposals"] }); },
  });
}

// ─── Education / Experience ──────────────────────────────────────────────

export function useAddCandidateEducation() {
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("recruitment_api/education", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAddCandidateExperience() {
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("recruitment_api/experience", { method: "POST", body: JSON.stringify(data) }),
  });
}

// ─── Pipeline & Analytics ────────────────────────────────────────────────

export function useRecruitmentPipeline() {
  return useQuery({
    queryKey: ["recruitment", "pipeline"],
    queryFn: async () => (await apiRequest("recruitment_api/pipeline"))?.data,
    staleTime: 30_000,
  });
}

export function useRecruitmentAnalytics() {
  return useQuery({
    queryKey: ["recruitment", "analytics"],
    queryFn: async () => (await apiRequest("recruitment_api/analytics"))?.data,
    staleTime: 60_000,
  });
}
