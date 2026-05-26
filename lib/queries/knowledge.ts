import { useQuery } from "@tanstack/react-query";
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

export function useKBArticles(search?: string, groupId?: string | number) {
  return useQuery({
    queryKey: ["kb-articles", search, groupId],
    queryFn: async () => {
      const qs = buildQS({ search, limit: 200 });
      const res = await apiRequest(`knowledge_api${qs}`);
      let articles: KBArticle[] = res?.data ?? (Array.isArray(res) ? res : []);
      if (groupId) {
        articles = articles.filter(
          (a) => String(a.article_group_id) === String(groupId),
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
