import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
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

// ─── Perfix filter system ──────────────────────────────────────────────
import { useFilterState } from "@/lib/hooks/useFilterState";
import { OPPORTUNITIES_FILTER_CONFIG } from "@/lib/filter-configs";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterChip } from "@/components/ui/FilterChip";
import { FilterSheet } from "@/components/ui/FilterSheet";

const ACCENT = "#E65100";

type ViewMode = "list" | "pipeline";

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
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // ─── Perfix filter state ──────────────────────────────────────────────
  const filter = useFilterState(OPPORTUNITIES_FILTER_CONFIG.rules);
  const stages = useOpportunityStages();

  // ─── API query ────────────────────────────────────────────────────────
  const queryParams = filter.toQueryParams();
  const q = useOpportunitiesList({
    search: queryParams.search ? String(queryParams.search) : undefined,
    stage: queryParams.stage ? String(queryParams.stage) : undefined,
    limit: 200,
  });

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

        {/* FilterBar */}
        <View style={{ marginTop: 12 }}>
          <FilterBar
            search={filter.search}
            onSearchChange={filter.setSearch}
            searchPlaceholder="Search opportunities…"
            activeFilterCount={filter.activeFilterCount}
            onFilterPress={() => setShowFilterSheet(true)}
            onClearAll={filter.clearAll}
          />
        </View>

        {/* Stage filter chips */}
        {stages.data && stages.data.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingTop: 12 }}
          >
            <FilterChip
              label="All Stages"
              active={!filter.quickFilters["stage"]}
              onPress={() => filter.setQuickFilter("stage", "")}
              color={ACCENT}
            />
            {stages.data.map((s: OpportunityStage) => (
              <FilterChip
                key={s.id}
                label={s.stage_name}
                active={filter.quickFilters["stage"] === String(s.id)}
                onPress={() => filter.setQuickFilter("stage", String(s.id))}
                color={ACCENT}
              />
            ))}
          </ScrollView>
        )}
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
      ) : viewMode === "pipeline" ? (
        <PipelineView items={items} stages={stages.data} refreshing={refreshing} onRefresh={onRefresh} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.opportunity_id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          renderItem={({ item }) => {
            const st = getOppStatusBadge(item.status || item.stage?.toString() || "");
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/opportunities/${item.opportunity_id}` as any)}
                className="bg-white rounded-xl p-4 border border-gray-100"
                activeOpacity={0.7}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-semibold text-slate-900" numberOfLines={2}>
                      {item.opportunity_name || "Untitled"}
                    </Text>
                    <Text className="text-xs text-slate-400 mt-1">
                      {item.opportunity_code}
                      {item.company ? ` · ${item.company}` : ""}
                    </Text>
                  </View>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: st.bg }}>
                    <Text className="text-[10px] font-semibold" style={{ color: st.color }}>
                      {st.label}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center mt-2 gap-4">
                  {item.estimated_price ? (
                    <Text className="text-sm font-bold text-slate-800">
                      {fmtCurrency(item.estimated_price)}
                    </Text>
                  ) : null}
                  {item.start_date ? (
                    <Text className="text-xs text-slate-400">
                      {item.start_date} → {item.end_date || "—"}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Filter sheet modal */}
      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        ruleDefs={OPPORTUNITIES_FILTER_CONFIG.rules}
        rules={filter.rules}
        matchType={filter.matchType}
        onAddRule={filter.addRule}
        onRemoveRule={filter.removeRule}
        onUpdateRule={filter.updateRule}
        onSetMatchType={filter.setMatchType}
      />
    </View>
  );
}

// ─── Pipeline View ──────────────────────────────────────────────────────

function PipelineView({
  items,
  stages,
  refreshing,
  onRefresh,
}: {
  items: OpportunityListItem[];
  stages: OpportunityStage[] | undefined;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const stageList = stages ?? [];
  const columns = useMemo(() => {
    return stageList.map((s) => ({
      stage: s,
      items: items.filter(
        (item) => String(item.stage) === String(s.id) || String(item.stage) === String(s.stage_level)
      ),
    }));
  }, [items, stageList]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
    >
      {columns.map((col) => (
        <View key={col.stage.id} style={{ width: 260 }}>
          <View
            style={{
              backgroundColor: ACCENT + "15",
              borderRadius: 10,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Text className="text-sm font-bold" style={{ color: ACCENT }}>
              {col.stage.stage_name} ({col.items.length})
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 32 }}>
            {col.items.map((item) => (
              <TouchableOpacity
                key={item.opportunity_id}
                onPress={() => router.push(`/(tabs)/opportunities/${item.opportunity_id}` as any)}
                className="bg-white rounded-lg p-3 shadow-sm"
                activeOpacity={0.7}
              >
                <Text className="text-sm font-semibold text-slate-900" numberOfLines={2}>
                  {item.opportunity_name || "Untitled"}
                </Text>
                {item.company ? (
                  <Text className="text-xs text-slate-500 mt-0.5">{item.company}</Text>
                ) : null}
                {item.estimated_price ? (
                  <Text className="text-xs font-bold text-slate-700 mt-1">
                    {fmtCurrency(item.estimated_price)}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
            {col.items.length === 0 && (
              <Text className="text-slate-400 text-xs text-center py-4">No opportunities</Text>
            )}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}
