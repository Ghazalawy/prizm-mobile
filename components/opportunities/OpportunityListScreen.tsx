import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import {
  useOpportunitiesList,
  useOpportunityStages,
  type OpportunityListItem,
  type OpportunityStage,
} from "@/lib/queries/opportunities";
import { colors } from "@/lib/theme";

const ACCENT = "#E65100";

type ViewMode = "list" | "pipeline";

const STAGE_COLORS = [
  "#0284C7", "#7C3AED", "#0891B2", "#059669", "#D97706",
  "#DC2626", "#4F46E5", "#DB2777", "#0D9488", "#B45309",
];

function fmtCurrency(val: string | null): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function getOppStatusBadge(status: string): { label: string; color: string; bg: string } {
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "submitted") return { label: status, color: "#0284C7", bg: "#E0F2FE" };
  if (s === "won" || s === "closed won") return { label: "Won", color: "#16A34A", bg: "#D1FAE5" };
  if (s === "lost" || s === "closed lost") return { label: "Lost", color: "#DC2626", bg: "#FEE2E2" };
  if (s === "draft") return { label: "Draft", color: "#B45309", bg: "#FEF3C7" };
  return { label: status || "—", color: "#64748B", bg: "#F1F5F9" };
}

export function OpportunityListScreen() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const q = useOpportunitiesList({
    search: search.trim() || undefined,
    stage: stageFilter === "all" ? undefined : stageFilter,
    limit: 200,
  });

  const stages = useOpportunityStages();

  const items = useMemo(() => {
    return (q.data?.items ?? []) as OpportunityListItem[];
  }, [q.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const isLoading = q.isLoading && !q.data;
  const isEmpty = !isLoading && !q.isError && items.length === 0;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.primaryBg }}
          >
            <Ionicons name="trending-up-outline" size={22} color={ACCENT} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-slate-900">Opportunities</Text>
            <Text className="text-xs text-slate-500 mt-0.5">{q.data?.total ?? 0} total</Text>
          </View>
        </View>

        {/* View toggle */}
        <View className="flex-row mt-3 bg-slate-100 rounded-lg p-0.5">
          <TouchableOpacity
            onPress={() => setViewMode("list")}
            className="flex-1 py-2 rounded-md items-center"
            style={{ backgroundColor: viewMode === "list" ? "#FFFFFF" : "transparent" }}
          >
            <Text className={`text-xs font-semibold ${viewMode === "list" ? "text-slate-900" : "text-slate-500"}`}>
              List View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode("pipeline")}
            className="flex-1 py-2 rounded-md items-center"
            style={{ backgroundColor: viewMode === "pipeline" ? "#FFFFFF" : "transparent" }}
          >
            <Text className={`text-xs font-semibold ${viewMode === "pipeline" ? "text-slate-900" : "text-slate-500"}`}>
              Pipeline
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center mt-3 bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search opportunities…"
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2 text-slate-900"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Stage filter chips */}
        {stages.data && stages.data.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 10, gap: 6 }}>
            <TouchableOpacity
              onPress={() => setStageFilter("all")}
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: stageFilter === "all" ? ACCENT : "#F1F5F9" }}
            >
              <Text className="text-xs font-semibold" style={{ color: stageFilter === "all" ? "#FFF" : "#475569" }}>
                All Stages
              </Text>
            </TouchableOpacity>
            {stages.data.map((s: OpportunityStage) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setStageFilter(String(s.id))}
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: stageFilter === String(s.id) ? ACCENT : "#F1F5F9" }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: stageFilter === String(s.id) ? "#FFF" : "#475569" }}
                >
                  {s.stage_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
          <Text className="text-slate-900 font-semibold mt-3">Couldn&apos;t load opportunities</Text>
          <TouchableOpacity
            onPress={() => q.refetch()}
            className="mt-4 px-5 py-2 rounded-lg"
            style={{ backgroundColor: ACCENT }}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="trending-up-outline" size={48} color="#94A3B8" />
          <Text className="text-slate-900 font-semibold mt-3">No opportunities found</Text>
        </View>
      ) : viewMode === "list" ? (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.opportunity_id)}
          renderItem={({ item }) => <OpportunityCard item={item} stages={stages.data || []} />}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
        />
      ) : (
        <PipelineView items={items} stages={stages.data || []} onRefresh={onRefresh} refreshing={refreshing} />
      )}
    </View>
  );
}

// ─── List Card ───────────────────────────────────────────────────────────

const OpportunityCard = memo(function OpportunityCard({
  item,
  stages,
}: {
  item: OpportunityListItem;
  stages: OpportunityStage[];
}) {
  const name = item.opportunity_name || "Untitled";
  const customer = item.company || "";
  const value = fmtCurrency(item.estimated_price || item.client_price);
  const status = getOppStatusBadge(item.status);
  const stage = stages.find((s) => s.id === Number(item.stage));
  const stageColor = stage ? STAGE_COLORS[(stage.id - 1) % STAGE_COLORS.length] : "#64748B";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/opportunities/${item.opportunity_id}` as any)}
      activeOpacity={0.72}
      className="bg-white rounded-xl p-4 shadow-sm"
    >
      <View className="flex-row items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-base font-semibold text-slate-900 flex-1" numberOfLines={1}>
              {name}
            </Text>
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: status.bg }}>
              <Text className="text-[10px] font-bold" style={{ color: status.color }}>
                {status.label}
              </Text>
            </View>
          </View>

          {customer ? (
            <Text className="text-sm text-slate-600 mt-0.5" numberOfLines={1}>{customer}</Text>
          ) : null}

          <View className="flex-row items-center mt-2 gap-x-3">
            <Text className="text-lg font-bold" style={{ color: ACCENT }}>
              {value}
            </Text>
            {stage ? (
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: stageColor }} />
                <Text className="text-xs text-slate-600">{stage.stage_name}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Pipeline (Kanban) View ──────────────────────────────────────────────

function PipelineView({
  items,
  stages,
  onRefresh,
  refreshing,
}: {
  items: OpportunityListItem[];
  stages: OpportunityStage[];
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const columns = useMemo(() => {
    return stages.map((stage, idx) => ({
      stage,
      color: STAGE_COLORS[idx % STAGE_COLORS.length],
      items: items.filter((i) => Number(i.stage) === stage.id),
    }));
  }, [stages, items]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
      }
    >
      {columns.map(({ stage, color, items: colItems }) => (
        <View key={stage.id} className="w-64 bg-white rounded-xl overflow-hidden shadow-sm">
          <View className="px-3 py-2.5 border-b border-slate-100" style={{ borderLeftWidth: 3, borderLeftColor: color }}>
            <Text className="text-sm font-bold text-slate-800">{stage.stage_name}</Text>
            <Text className="text-xs text-slate-500">{colItems.length} items</Text>
          </View>
          <ScrollView className="max-h-[500px]" contentContainerStyle={{ padding: 8, gap: 6 }}>
            {colItems.length === 0 ? (
              <Text className="text-xs text-slate-400 text-center py-4">No items</Text>
            ) : (
              colItems.map((item) => (
                <TouchableOpacity
                  key={item.opportunity_id}
                  onPress={() => router.push(`/(tabs)/opportunities/${item.opportunity_id}` as any)}
                  className="bg-slate-50 rounded-lg p-3"
                  activeOpacity={0.7}
                >
                  <Text className="text-xs font-semibold text-slate-800" numberOfLines={2}>
                    {item.opportunity_name}
                  </Text>
                  <Text className="text-lg font-bold mt-1" style={{ color: ACCENT }}>
                    {fmtCurrency(item.estimated_price || item.client_price)}
                  </Text>
                  {item.company ? (
                    <Text className="text-[10px] text-slate-500 mt-0.5" numberOfLines={1}>
                      {item.company}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}
