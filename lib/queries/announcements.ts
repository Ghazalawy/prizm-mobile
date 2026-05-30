import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type AnnouncementItem = {
  announcementid: number;
  name: string;
  message: string;
  showname: number;
  showtostaff: number;
  showtousers: number;
  userid: string | null;
  dateadded: string;
};

// ─── Queries ─────────────────────────────────────────────────────────────

export function useAnnouncementsList(filters?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: ["announcements", "list", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: filters?.limit ?? 100 };
      if (filters?.search) params.search = filters.search;
      const qs = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
      const data = await apiRequest(`announcements_api?${qs}`);
      return normalizeList(data).items as AnnouncementItem[];
    },
    staleTime: 60_000,
  });
}

export function useAnnouncementDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: ["announcements", "detail", String(id)],
    queryFn: async () => {
      const data = await apiRequest(`announcements_api/${id}`);
      return (data?.data ?? data) as AnnouncementItem;
    },
    enabled: !!id,
  });
}

// ─── CRUD Mutations ──────────────────────────────────────────────────────

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiRequest("announcements_api", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements", "list"] });
    },
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) => {
      return apiRequest(`announcements_api/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["announcements", "detail", String(vars.id)] });
      qc.invalidateQueries({ queryKey: ["announcements", "list"] });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      return apiRequest(`announcements_api/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements", "list"] });
    },
  });
}
