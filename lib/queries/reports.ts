import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, buildAuthHeaders, buildQS } from "@/lib/api";
import { API_URL, BASE_URL } from "@/lib/config";

// ── Types ──────────────────────────────────────────────────────────────

export type ReportDetailRow = {
  id: number;
  report_id: number;
  type: "done" | "next";
  location: string;
  description_of_work: string;
  item_no: string;
  today_percent: string | null;
  planned_percent: string | null;
  overall_percent: string;
  submission_status: string;
};

export type ReportImage = {
  id: number;
  report_id: number;
  image_path: string;
  work_image_descriptions: string | null;
};

export type ReportListItem = {
  id: number;
  project_id: number;
  report_code: string;
  type: string;
  related_to: number;
  report_date: string;
  status: number | string;
  created_by: number;
  created_at: string;
  outstanding_issues: string | null;
  suggestions: string | null;
  scope_description: string | null;
  project_name: string | null;
  project_number: string | null;
  client_name: string | null;
  creator_name: string | null;
};

export type ReportFull = ReportListItem & {
  client_phone?: string;
  projectmanager_id?: number;
  company_approval?: string;
  client_approval?: string;
  details: ReportDetailRow[];
  images: ReportImage[];
};

export type ReportProject = {
  id: number;
  name: string;
  client_name: string | null;
};

export type ReportFilters = {
  project_id?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
};

// ── Queries ────────────────────────────────────────────────────────────

export function useReportsList(filters: ReportFilters) {
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: async () => {
      const qs = buildQS(filters as Record<string, string | number | undefined>);
      const res = await apiRequest(`reports_api/data${qs}`);
      return {
        items: (res?.data ?? []) as ReportListItem[],
        total: res?.total ?? (res?.data?.length ?? 0),
      };
    },
  });
}

export function useReportDetail(id: number | null) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const res = await apiRequest(`reports_api/data/${id}`);
      return (res?.data ?? null) as ReportFull | null;
    },
    enabled: !!id,
  });
}

export function useReportProjects() {
  return useQuery({
    queryKey: ["report-projects"],
    queryFn: async () => {
      const res = await apiRequest("reports_api/projects");
      return (res?.data ?? []) as ReportProject[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────

export type WorkItem = {
  location: string;
  description: string;
  item_no: string;
  today_percent: string;
  overall_percent: string;
  submission_status: string;
};

export type NextActivityItem = {
  location: string;
  description: string;
  item_no: string;
  planned_percent: string;
  overall_percent: string;
  submission_status: string;
};

export type CreateReportPayload = {
  type: string;
  related_to: number;
  report_date: string;
  scope_description: string;
  outstanding_issues: string;
  suggestions: string;
  work_done: {
    locations: string[];
    descriptions: string[];
    item_nos: string[];
    today_percent: string[];
    overall_percent: string[];
    submissions_raq: string[];
  };
  next_activities: {
    locations: string[];
    descriptions: string[];
    item_nos: string[];
    planned_percent: string[];
    overall_percent: string[];
    submissions_raq: string[];
  };
};

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateReportPayload) => {
      const res = await apiRequest("reports_api/data", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res?.data as { success: boolean; id: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<CreateReportPayload>;
    }) => {
      const res = await apiRequest(`reports_api/data/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return res?.data as { success: boolean; id: number };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["report", vars.id] });
    },
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`reports_api/data/${id}`, { method: "DELETE" });
      return res?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// ── Image upload ───────────────────────────────────────────────────────

export type ImageUploadItem = {
  uri: string;
  description: string;
};

export function useUploadReportImages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportId,
      images,
    }: {
      reportId: number;
      images: ImageUploadItem[];
    }) => {
      const tokenHeaders = await buildAuthHeaders();
      const { "Content-Type": _drop, ...headers } = tokenHeaders as Record<string, string>;
      const uploaded: unknown[] = [];

      for (const img of images) {
        const ext = img.uri.split(".").pop()?.toLowerCase() || "jpg";
        const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        const form = new FormData();
        form.append("image", {
          uri: img.uri,
          name: `report-${reportId}-${Date.now()}.${ext}`,
          type: mimeType,
        } as unknown as Blob);
        form.append("description", img.description);
        form.append("extension", ext);

        const res = await fetch(`${API_URL}/reports_api/images/${reportId}`, {
          method: "POST",
          headers,
          body: form,
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.message || `HTTP ${res.status}`);
        }
        const row = json?.data;
        if (Array.isArray(row)) uploaded.push(...row);
        else if (row) uploaded.push(row);
      }

      return uploaded;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["report", vars.reportId] });
    },
  });
}

export function useDeleteReportImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageId }: { imageId: number; reportId: number }) => {
      await apiRequest(`reports_api/images/${imageId}`, { method: "DELETE" });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["report", vars.reportId] });
    },
  });
}

// ── Image URL builder ──────────────────────────────────────────────────

export function reportImageUrl(imagePath: string): string {
  return `${BASE_URL}/MS/modules/prizm_reports/assets/images/${imagePath}`;
}
