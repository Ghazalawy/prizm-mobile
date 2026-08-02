import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, buildQS } from "../api";

// ─── Types ───────────────────────────────────────────────────────────────

export type KBArticle = {
  articleid: string | number;
  subject: string;
  description: string | null;
  slug: string | null;
  active: string | number;
  datecreated: string | null;
  article_group_id: string | number | null;
  group_name?: string;
  staff_article: string | number | null;
};

export type KBGroup = {
  groupid: string | number;
  name: string;
  group_slug: string | null;
  color: string | null;
  description: string | null;
  active: string | number;
  group_order: string | number | null;
};

// ─── Article list ────────────────────────────────────────────────────────

export type KBArticleFilters = {
  search?: string;
  groupId?: string | number;
  active?: string | number;
  filters?: string;
  sort?: string;
  sort_dir?: "asc" | "desc";
  limit?: number;
};

export function useKBArticles(filters: KBArticleFilters = {}) {
  return useQuery({
    queryKey: ["kb-articles", filters],
    queryFn: async () => {
      const qs = buildQS({
        search: filters.search,
        active: filters.active,
        filters: filters.filters,
        sort: filters.sort,
        sort_dir: filters.sort_dir,
        limit: filters.limit ?? 200,
      });
      const res = await apiRequest(`knowledge_api${qs}`);
      let articles: KBArticle[] = res?.data ?? (Array.isArray(res) ? res : []);
      if (filters.groupId !== undefined && filters.groupId !== "") {
        articles = articles.filter(
          (a) => String(a.article_group_id ?? (a as any).articlegroup) === String(filters.groupId),
        );
      }
      return articles;
    },
    staleTime: 60_000,
  });
}

// ─── Single article (full content) ───────────────────────────────────────

export function useKBArticle(id: string | number | undefined) {
  return useQuery({
    queryKey: ["kb-article", id],
    queryFn: async () => {
      const res = await apiRequest(`knowledge_api/${id}`);
      return (res?.data ?? res) as KBArticle;
    },
    enabled: !!id,
    staleTime: 120_000,
  });
}

// ─── Article groups ──────────────────────────────────────────────────────

export function useKBGroups() {
  return useQuery({
    queryKey: ["kb-groups"],
    queryFn: async () => {
      const res = await apiRequest("knowledge_api/groups");
      return (res?.data ?? (Array.isArray(res) ? res : [])) as KBGroup[];
    },
    staleTime: 300_000,
  });
}

// ─── Publish / Unpublish ────────────────────────────────────────────────────

export function usePublishKBArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      return apiRequest(`knowledge_api/${id}/publish`, { method: "PUT" });
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["kb-article", String(id)] });
      qc.invalidateQueries({ queryKey: ["kb-articles"] });
    },
  });
}

export function useUnpublishKBArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      return apiRequest(`knowledge_api/${id}/unpublish`, { method: "PUT" });
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["kb-article", String(id)] });
      qc.invalidateQueries({ queryKey: ["kb-articles"] });
    },
  });
}

export function useCreateKBArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      apiRequest("knowledge_api", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb-articles"] }),
  });
}

export function useUpdateKBArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string | number } & Record<string, unknown>) =>
      apiRequest(`knowledge_api/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, values) => {
      qc.invalidateQueries({ queryKey: ["kb-article", String(values.id)] });
      qc.invalidateQueries({ queryKey: ["kb-articles"] });
    },
  });
}

export function useDeleteKBArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => apiRequest(`knowledge_api/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb-articles"] }),
  });
}

// ─── Search ─────────────────────────────────────────────────────────────────

export function useSearchKB(query: string) {
  return useQuery({
    queryKey: ["kb-search", query],
    queryFn: async () => {
      const res = await apiRequest(`knowledge_api/search?q=${encodeURIComponent(query)}`);
      return (res?.data ?? (Array.isArray(res) ? res : [])) as KBArticle[];
    },
    enabled: query.length > 0,
    staleTime: 30_000,
  });
}
