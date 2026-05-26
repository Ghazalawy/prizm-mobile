import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useState, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { rtlTextStyle } from "@/lib/rtl";
import {
  useKBArticles,
  useKBGroups,
  type KBArticle,
  type KBGroup,
} from "@/lib/queries/knowledge";

// ─── Group Section ───────────────────────────────────────────────────────

function GroupSection({
  group,
  articles,
  expanded,
  onToggle,
}: {
  group: KBGroup;
  articles: KBArticle[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="mb-3">
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        className="flex-row items-center justify-between bg-white rounded-xl px-4 py-3"
        style={{ borderLeftWidth: 3, borderLeftColor: group.color || colors.primary }}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons
            name="folder-outline"
            size={18}
            color={group.color || colors.primary}
          />
          <Text
            className="text-sm font-bold text-foreground ml-2 flex-1"
            numberOfLines={1}
            style={rtlTextStyle(group.name)}
          >
            {group.name}
          </Text>
          <View
            className="px-2 py-0.5 rounded-full ml-2"
            style={{ backgroundColor: colors.slate100 }}
          >
            <Text className="text-[10px] font-semibold text-muted">
              {articles.length}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#94A3B8"
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>
      {expanded &&
        articles.map((article) => (
          <ArticleCard key={String(article.articleid)} article={article} />
        ))}
    </View>
  );
}

// ─── Article Card ────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: KBArticle }) {
  const isActive = Number(article.active) === 1;

  return (
    <TouchableOpacity
      onPress={() =>
        router.push(`/(tabs)/knowledge/${article.articleid}` as any)
      }
      activeOpacity={0.7}
      className="bg-white rounded-xl px-4 py-3 mt-1.5 ml-4 flex-row items-center"
    >
      <View className="flex-1">
        <Text
          className="text-sm font-medium text-foreground"
          numberOfLines={2}
          style={rtlTextStyle(article.subject)}
        >
          {article.subject}
        </Text>
        <View className="flex-row items-center mt-1.5 gap-2">
          {article.group_name && (
            <Text className="text-[10px] text-muted" numberOfLines={1}>
              {article.group_name}
            </Text>
          )}
          <View
            className="px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: isActive ? colors.successBg : colors.slate100,
            }}
          >
            <Text
              className="text-[10px] font-semibold"
              style={{
                color: isActive ? colors.success : colors.slate500,
              }}
            >
              {isActive ? "Active" : "Draft"}
            </Text>
          </View>
          {article.datecreated && (
            <Text className="text-[10px] text-muted">
              {new Date(article.datecreated).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────

export function KnowledgeBaseScreen() {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [refreshing, setRefreshing] = useState(false);

  const articles = useKBArticles(search || undefined);
  const groups = useKBGroups();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([articles.refetch(), groups.refetch()]);
    setRefreshing(false);
  }, [articles, groups]);

  const toggleGroup = (gid: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const allArticles = articles.data ?? [];
    const allGroups = groups.data ?? [];

    const groupMap = new Map<string, { group: KBGroup; articles: KBArticle[] }>();
    const ungrouped: KBArticle[] = [];

    for (const g of allGroups) {
      groupMap.set(String(g.groupid), { group: g, articles: [] });
    }

    for (const a of allArticles) {
      const gid = String(a.article_group_id ?? "");
      if (groupMap.has(gid)) {
        groupMap.get(gid)!.articles.push(a);
      } else {
        ungrouped.push(a);
      }
    }

    return { grouped: Array.from(groupMap.values()), ungrouped };
  }, [articles.data, groups.data]);

  const isLoading = articles.isLoading || groups.isLoading;

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 pt-3 pb-3">
        <Text className="text-xl font-bold text-foreground mb-3">
          Knowledge Base
        </Text>
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search articles..."
            className="flex-1 text-sm text-foreground ml-2"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginTop: 24 }}
          />
        )}

        {!isLoading && (articles.data?.length ?? 0) === 0 && (
          <View className="items-center py-16">
            <Ionicons name="book-outline" size={48} color="#CBD5E1" />
            <Text className="text-sm text-muted mt-3">
              {search ? "No articles match your search" : "No articles found"}
            </Text>
          </View>
        )}

        {grouped.grouped.map(({ group, articles: ga }) => {
          if (ga.length === 0 && !search) return null;
          return (
            <GroupSection
              key={String(group.groupid)}
              group={group}
              articles={ga}
              expanded={
                expandedGroups.has(String(group.groupid)) ||
                search.length > 0
              }
              onToggle={() => toggleGroup(String(group.groupid))}
            />
          );
        })}

        {grouped.ungrouped.length > 0 && (
          <View className="mb-3">
            <Text className="text-xs font-bold text-muted uppercase mb-2 px-1">
              Uncategorized
            </Text>
            {grouped.ungrouped.map((a) => (
              <ArticleCard key={String(a.articleid)} article={a} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
