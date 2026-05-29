import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useLeadsList, useLeadSources, useLeadStatuses } from "@/lib/queries/leads";
import type { LeadListItem, LeadStatus } from "@/lib/queries/leads";
import { rtlTextStyle } from "@/lib/rtl";
import { colors } from "@/lib/theme";

// ─── Perfix filter system ──────────────────────────────────────────────
import { useFilterState } from "@/lib/hooks/useFilterState";
import { LEADS_FILTER_CONFIG } from "@/lib/filter-configs";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterChip } from "@/components/ui/FilterChip";
import { FilterSheet } from "@/components/ui/FilterSheet";

type ViewMode = "list" | "pipeline";

const DEFAULT_STATUS_COLORS: Record<string, string> = {
  "1": "#3B82F6",
  "2": "#F59E0B",
  "3": "#8B5CF6",
  "4": "#16A34A",
  "5": "#DC2626",
  "6": "#64748B",
  "7": "#0891B2",
  "8": "#EA580C",
};

export function LeadListScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // ─── Perfix filter state ──────────────────────────────────────────────
  const filter = useFilterState(LEADS_FILTER_CONFIG.rules);

  // ─── API queries ──────────────────────────────────────────────────────
  const queryParams = filter.toQueryParams();
  const leadsQuery = useLeadsList({
    search: queryParams.search ? String(queryParams.search) : undefined,
    status: queryParams.status ? String(queryParams.status) : undefined,
    source: queryParams.source ? String(queryParams.source) : undefined,
    assigned: queryParams.assigned ? String(queryParams.assigned) : undefined,
  });
  const sourcesQuery = useLeadSources();
  const statusesQuery = useLeadStatuses();

  const leads = leadsQuery.data ?? [];
  const sources = sourcesQuery.data ?? [];
  const statuses = statusesQuery.data ?? [];

  const statusMap = useMemo(() => {
    const m = new Map<string, LeadStatus>();
    for (const s of statuses) m.set(String(s.id), s);
    return m;
  }, [statuses]);

  const sourceMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sources) m.set(String(s.id), s.name);
    return m;
  }, [sources]);

  // Inject runtime options into filter config for status/source
  const ruleDefsWithOptions = useMemo(() => {
    return LEADS_FILTER_CONFIG.rules.map((def) => {
      if (def.id === "status") {
        return {
          ...def,
          options: statuses.map((s) => ({
            value: String(s.id),
            label: s.name,
            subtext: s.isdefault === 1 ? "Default" : undefined,
          })),
        };
      }
      if (def.id === "source") {
        return {
          ...def,
          options: sources.map((s) => ({
            value: String(s.id),
            label: s.name,
          })),
        };
      }
      return def;
    });
  }, [statuses, sources]);

  const onRefresh = useCallback(async () => {
    await Promise.all([leadsQuery.refetch(), sourcesQuery.refetch(), statusesQuery.refetch()]);
  }, [leadsQuery, sourcesQuery, statusesQuery]);

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 pt-3 pb-2">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xl font-bold text-foreground">Leads</Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/leads/new" as any)}
            className="bg-primary px-3 py-1.5 rounded-lg flex-row items-center"
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text className="text-white font-semibold text-xs ml-1">New</Text>
          </TouchableOpacity>
        </View>

        {/* View mode toggle */}
        <View className="flex-row bg-slate-100 rounded-lg p-0.5 mb-2">
          <TouchableOpacity
            onPress={() => setViewMode("list")}
            className={`flex-1 py-2 rounded-md items-center ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-xs font-semibold ${viewMode === "list" ? "text-primary" : "text-slate-500"}`}>
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode("pipeline")}
            className={`flex-1 py-2 rounded-md items-center ${viewMode === "pipeline" ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`text-xs font-semibold ${viewMode === "pipeline" ? "text-primary" : "text-slate-500"}`}>
              Pipeline
            </Text>
          </TouchableOpacity>
        </View>

        {/* FilterBar replaces inline search + filter */}
        <FilterBar
          search={filter.search}
          onSearchChange={filter.setSearch}
          searchPlaceholder="Search leads..."
          activeFilterCount={filter.activeFilterCount}
          onFilterPress={() => setShowFilterSheet(true)}
          onClearAll={filter.clearAll}
        />

        {/* Quick filter chips — status shortcuts */}
        {viewMode === "list" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingTop: 8 }}
          >
            <FilterChip
              label="All Status"
              active={!filter.quickFilters["status"]}
              onPress={() => filter.setQuickFilter("status", "")}
            />
            {statuses.map((s) => (
              <FilterChip
                key={s.id}
                label={s.name}
                active={filter.quickFilters["status"] === String(s.id)}
                onPress={() => filter.setQuickFilter("status", String(s.id))}
                color={s.color || DEFAULT_STATUS_COLORS[String(s.id)]}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Content */}
      {leadsQuery.isLoading && leads.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : viewMode === "list" ? (
        <LeadListView
          leads={leads}
          statusMap={statusMap}
          sourceMap={sourceMap}
          refreshing={leadsQuery.isFetching}
          onRefresh={onRefresh}
        />
      ) : (
        <LeadPipelineView
          leads={leads}
          statuses={statuses}
          statusMap={statusMap}
          refreshing={leadsQuery.isFetching}
          onRefresh={onRefresh}
        />
      )}

      {/* Filter sheet modal */}
      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        ruleDefs={ruleDefsWithOptions}
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

// ─── List View ───────────────────────────────────────────────────────────

function LeadListView({
  leads,
  statusMap,
  sourceMap,
  refreshing,
  onRefresh,
}: {
  leads: LeadListItem[];
  statusMap: Map<string, LeadStatus>;
  sourceMap: Map<string, string>;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const renderItem = useCallback(
    ({ item }: { item: LeadListItem }) => (
      <LeadCard item={item} statusMap={statusMap} sourceMap={sourceMap} />
    ),
    [statusMap, sourceMap]
  );

  return (
    <FlatList
      data={leads}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View className="items-center py-12">
          <Ionicons name="people-outline" size={48} color="#CBD5E1" />
          <Text className="text-slate-400 mt-2">No leads found</Text>
        </View>
      }
    />
  );
}

// ─── Pipeline View ──────────────────────────────────────────────────────

function LeadPipelineView({
  leads,
  statuses,
  statusMap,
  refreshing,
  onRefresh,
}: {
  leads: LeadListItem[];
  statuses: LeadStatus[];
  statusMap: Map<string, LeadStatus>;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const columns = useMemo(() => {
    return statuses.map((s) => ({
      status: s,
      leads: leads.filter((l) => String(l.status) === String(s.id)),
    }));
  }, [leads, statuses]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {columns.map((col) => (
        <View key={col.status.id} style={{ width: 260 }}>
          <View
            style={{
              backgroundColor: (col.status.color || DEFAULT_STATUS_COLORS[String(col.status.id)] || "#3B82F6") + "18",
              borderRadius: 10,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Text className="text-sm font-bold" style={{ color: col.status.color || DEFAULT_STATUS_COLORS[String(col.status.id)] }}>
              {col.status.name} ({col.leads.length})
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 32 }}>
            {col.leads.map((lead) => (
              <LeadCard key={lead.id} item={lead} statusMap={statusMap} sourceMap={new Map()} compact />
            ))}
            {col.leads.length === 0 && (
              <Text className="text-slate-400 text-xs text-center py-4">No leads</Text>
            )}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Lead Card ──────────────────────────────────────────────────────────

function LeadCard({
  item,
  statusMap,
  sourceMap,
  compact = false,
}: {
  item: LeadListItem;
  statusMap: Map<string, LeadStatus>;
  sourceMap: Map<string, string>;
  compact?: boolean;
}) {
  const status = statusMap.get(String(item.status));
  const sourceName = sourceMap.get(String(item.source)) ?? "";
  const statusColor = status?.color || DEFAULT_STATUS_COLORS[String(item.status)] || "#64748B";

  const handlePress = () => {
    router.push(`/(tabs)/leads/${item.id}` as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className="bg-white rounded-xl p-4 border border-slate-100"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 mr-2">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {item.name}
          </Text>
          {item.company ? (
            <Text className="text-sm text-slate-500 mt-0.5" numberOfLines={1}>
              {item.company}
            </Text>
          ) : null}
        </View>
        {status && (
          <View
            style={{
              backgroundColor: statusColor + "18",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: statusColor, fontSize: 11, fontWeight: "600" }}>
              {status.name}
            </Text>
          </View>
        )}
      </View>

      {!compact && (
        <View className="flex-row items-center mt-2 gap-3">
          {item.email ? (
            <View className="flex-row items-center">
              <Ionicons name="mail-outline" size={12} color="#94A3B8" />
              <Text className="text-xs text-slate-500 ml-1" numberOfLines={1}>
                {item.email}
              </Text>
            </View>
          ) : null}
          {item.phonenumber ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${item.phonenumber}`)}
              className="flex-row items-center"
            >
              <Ionicons name="call-outline" size={12} color="#3B82F6" />
              <Text className="text-xs text-blue-600 ml-1">{item.phonenumber}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {!compact && sourceName ? (
        <Text className="text-xs text-slate-400 mt-1.5">Source: {sourceName}</Text>
      ) : null}
    </TouchableOpacity>
  );
}
