import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type SurveyListItem = {
  surveyid: number;
  title: string;
  description: string | null;
  viewdescription: string | null;
  status: number;
  active?: number;
  datecreated: string | null;
  datestart: string | null;
  dateend: string | null;
  totalquestions?: number;
  totalresponses?: number;
};

export type SurveyResultOption = {
  id: number;
  label: string;
  count: number;
  percent: number;
};

export type SurveyResultAnswer = {
  resultid: number;
  resultsetid: number;
  answer: string;
};

export type SurveyResultQuestion = {
  questionid: number;
  question: string;
  boxtype: string;
  total_answers: number;
  options: SurveyResultOption[];
  answers: SurveyResultAnswer[];
};

export type SurveyResults = {
  survey_id: number;
  total_responses: number;
  questions: SurveyResultQuestion[];
};

export type SurveySendLog = {
  id: number;
  surveyid: number;
  email: string;
  clientid: number | null;
  date: string;
  status: string;
};

// ─── Queries ─────────────────────────────────────────────────────────────

export function useSurveysList(filters?: { search?: string; status?: string; limit?: number }) {
  return useQuery({
    queryKey: ["surveys", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 200 };
      if (filters?.status) params.status = filters.status;
      if (filters?.search) params.search = filters.search;
      const qs = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
      const data = await apiRequest(`surveys_api?${qs}`);
      return normalizeList(data).items as SurveyListItem[];
    },
    staleTime: 60_000,
  });
}

export function useSurveyDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ["surveys", "detail", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`surveys_api/${id}`);
      return (data?.data ?? data) as SurveyListItem;
    },
    enabled: !!id,
  });
}

export function useSurveyResults(surveyId: string | number | undefined) {
  return useQuery({
    queryKey: ["surveys", "results", String(surveyId)],
    queryFn: async () => {
      const data = await apiRequest(`surveys_api/results/${surveyId}`);
      return (data?.data ?? data) as SurveyResults;
    },
    enabled: !!surveyId,
    staleTime: 30_000,
  });
}

export function useSurveySendLog(surveyId: string | number | undefined) {
  return useQuery({
    queryKey: ["surveys", "sendlog", String(surveyId)],
    queryFn: async () => {
      const data = await apiRequest(`surveys_api/send_log/${surveyId}`);
      return normalizeList(data).items as SurveySendLog[];
    },
    enabled: !!surveyId,
    staleTime: 30_000,
  });
}

// ─── CRUD Mutations ──────────────────────────────────────────────────────

export function useCreateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("surveys_api", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surveys", "list"] });
    },
  });
}

export function useUpdateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) => {
      return apiRequest(`surveys_api/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["surveys", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["surveys", "list"] });
    },
  });
}

export function useDeleteSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      return apiRequest(`surveys_api/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["surveys", "list"] });
    },
  });
}

// ─── Publish / Close ─────────────────────────────────────────────────────

export function usePublishSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      return apiRequest(`surveys_api/${id}/publish`, { method: "PUT" });
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["surveys", "detail", String(id)] });
      qc.invalidateQueries({ queryKey: ["surveys", "list"] });
    },
  });
}

export function useCloseSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      return apiRequest(`surveys_api/${id}/close`, { method: "PUT" });
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["surveys", "detail", String(id)] });
      qc.invalidateQueries({ queryKey: ["surveys", "list"] });
    },
  });
}
