import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");

  const leadsQuery = useLeadsList({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    source: sourceFilter || undefined,
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

        {/* Search */}
        <View className="flex-row items-center bg-slate-100 rounded-lg px-3 py-2 mb-2">
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search leads..."
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2 text-sm text-foreground"
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter chips */}
        {viewMode === "list" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <FilterChip
              label="All Status"
              active={!statusFilter}
              onPress={() => setStatusFilter("")}
            />
            {statuses.map((s) => (
              <FilterChip
                key={s.id}
                label={s.name}
                active={statusFilter === String(s.id)}
                onPress={() => setStatusFilter(statusFilter === String(s.id) ? "" : String(s.id))}
                color={s.color || DEFAULT_STATUS_COLORS[String(s.id)]}
              />
            ))}
          </ScrollView>
        ) : null}
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

function LeadCard({
  item,
  statusMap,
  sourceMap,
}: {
  item: LeadListItem;
  statusMap: Map<string, LeadStatus>;
  sourceMap: Map<string, string>;
}) {
  const status = statusMap.get(String(item.status));
  const statusColor = status?.color || DEFAULT_STATUS_COLORS[String(item.status)] || "#64748B";
  const sourceName = sourceMap.get(String(item.source)) || item.source_name;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/leads/${item.id}` as any)}
      activeOpacity={0.7}
      className="bg-white rounded-xl p-4 shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: statusColor }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-base font-semibold text-foreground" style={rtlTextStyle(item.name)} numberOfLines={1}>
            {item.name}
          </Text>
          {item.company ? (
            <Text className="text-sm text-slate-600 mt-0.5" numberOfLines={1}>
              {item.company}
            </Text>
          ) : null}
        </View>
        <View style={{ backgroundColor: statusColor + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
          <Text style={{ color: statusColor, fontSize: 10, fontWeight: "700" }}>
            {status?.name || `Status ${item.status}`}
          </Text>
        </View>
      </View>

      {/* Contact info */}
      <View className="flex-row items-center mt-2 flex-wrap">
        {item.email ? (
          <View className="flex-row items-center mr-3">
            <Ionicons name="mail-outline" size={12} color="#64748B" />
            <Text className="text-xs text-slate-500 ml-1" numberOfLines={1}>{item.email}</Text>
          </View>
        ) : null}
        {item.phonenumber ? (
          <View className="flex-row items-center mr-3">
            <Ionicons name="call-outline" size={12} color="#64748B" />
            <Text className="text-xs text-slate-500 ml-1">{item.phonenumber}</Text>
          </View>
        ) : null}
      </View>

      {/* Footer: source + quick actions */}
      <View className="flex-row items-center justify-between mt-2">
        <View className="flex-row items-center">
          {sourceName ? (
            <View className="flex-row items-center bg-slate-100 rounded-full px-2 py-0.5">
              <Ionicons name="git-branch-outline" size={10} color="#64748B" />
              <Text className="text-[10px] text-slate-500 ml-1">{sourceName}</Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-center">
          {item.phonenumber ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${item.phonenumber}`)}
              className="w-7 h-7 rounded-full bg-green-50 items-center justify-center mr-1"
              hitSlop={6}
            >
              <Ionicons name="call" size={13} color="#16A34A" />
            </TouchableOpacity>
          ) : null}
          {item.email ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${item.email}`)}
              className="w-7 h-7 rounded-full bg-blue-50 items-center justify-center"
              hitSlop={6}
            >
              <Ionicons name="mail" size={13} color="#2563EB" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Pipeline/Kanban View ────────────────────────────────────────────────

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
  const grouped = useMemo(() => {
    const m = new Map<string, LeadListItem[]>();
    for (const s of statuses) m.set(String(s.id), []);
    for (const lead of leads) {
      const key = String(lead.status);
      const arr = m.get(key);
      if (arr) arr.push(lead);
      else m.set(key, [lead]);
    }
    return m;
  }, [leads, statuses]);

  const columns = statuses.length > 0
    ? statuses
    : Array.from(grouped.keys()).map((id) => ({ id: Number(id), name: `Status ${id}`, color: DEFAULT_STATUS_COLORS[id] || "#64748B" }));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {columns.map((col) => {
        const colId = String(col.id);
        const colLeads = grouped.get(colId) ?? [];
        const colColor = col.color || DEFAULT_STATUS_COLORS[colId] || "#64748B";
        return (
          <View
            key={colId}
            style={{ width: 260, marginRight: 12 }}
            className="bg-slate-100 rounded-xl overflow-hidden"
          >
            {/* Column header */}
            <View
              className="px-3 py-2.5 flex-row items-center justify-between"
              style={{ backgroundColor: colColor + "15" }}
            >
              <View className="flex-row items-center flex-1">
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colColor }} />
                <Text className="ml-2 text-sm font-bold text-foreground" numberOfLines={1}>
                  {col.name}
                </Text>
              </View>
              <View
                style={{ backgroundColor: colColor + "30", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}
              >
                <Text style={{ color: colColor, fontSize: 11, fontWeight: "700" }}>{colLeads.length}</Text>
              </View>
            </View>

            {/* Column cards */}
            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 8 }}>
              {colLeads.length === 0 ? (
                <Text className="text-xs text-slate-400 text-center py-4">No leads</Text>
              ) : (
                colLeads.map((lead) => (
                  <TouchableOpacity
                    key={lead.id}
                    onPress={() => router.push(`/(tabs)/leads/${lead.id}` as any)}
                    activeOpacity={0.7}
                    className="bg-white rounded-lg p-3 mb-2 shadow-sm"
                  >
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1} style={rtlTextStyle(lead.name)}>
                      {lead.name}
                    </Text>
                    {lead.company ? (
                      <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>{lead.company}</Text>
                    ) : null}
                    {lead.email ? (
                      <View className="flex-row items-center mt-1.5">
                        <Ionicons name="mail-outline" size={10} color="#94A3B8" />
                        <Text className="text-[10px] text-slate-400 ml-1" numberOfLines={1}>{lead.email}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Shared components ───────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: active ? (color || colors.primary) + "20" : "#F1F5F9",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: active ? 1 : 0,
        borderColor: active ? (color || colors.primary) : "transparent",
      }}
    >
      <Text
        style={{
          color: active ? (color || colors.primary) : "#64748B",
          fontSize: 11,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
