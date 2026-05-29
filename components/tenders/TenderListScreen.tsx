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
import { useTendersList, type TenderListItem } from "@/lib/queries/tenders";
import { colors } from "@/lib/theme";

// ─── Perfix filter system ──────────────────────────────────────────────
import { useFilterState } from "@/lib/hooks/useFilterState";
import { TENDERS_FILTER_CONFIG } from "@/lib/filter-configs";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterChip } from "@/components/ui/FilterChip";
import { FilterSheet } from "@/components/ui/FilterSheet";

const ACCENT = "#B45309";

type StatusFilter = "all" | "Draft" | "Submitted" | "Awarded" | "Won" | "Lost" | "Cancelled";

const FILTER_CHIPS: Array<{ key: StatusFilter; label: string; color: string }> = [
  { key: "all", label: "All", color: ACCENT },
  { key: "Draft", label: "Draft", color: "#B45309" },
  { key: "Submitted", label: "Submitted", color: "#0284C7" },
  { key: "Awarded", label: "Awarded", color: "#2563EB" },
  { key: "Won", label: "Won", color: "#16A34A" },
  { key: "Lost", label: "Lost", color: "#DC2626" },
  { key: "Cancelled", label: "Cancelled", color: "#64748B" },
];

function getStatusBadge(status: string): { label: string; color: string; bg: string } {
  const s = (status || "").toLowerCase();
  if (s === "won") return { label: "Won", color: "#16A34A", bg: "#D1FAE5" };
  if (s === "awarded") return { label: "Awarded", color: "#2563EB", bg: "#EFF6FF" };
  if (s === "submitted") return { label: "Submitted", color: "#0284C7", bg: "#E0F2FE" };
  if (s === "lost") return { label: "Lost", color: "#DC2626", bg: "#FEE2E2" };
  if (s === "cancelled") return { label: "Cancelled", color: "#64748B", bg: "#F1F5F9" };
  return { label: status || "Draft", color: "#B45309", bg: "#FEF3C7" };
}

function closingCountdown(closingDate: string | null): {
  text: string;
  color: string;
} | null {
  if (!closingDate) return null;
  const close = new Date(closingDate);
  if (isNaN(close.getTime())) return null;
  const days = Math.ceil((close.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "Closed", color: "#64748B" };
  if (days === 0) return { text: "Closes today!", color: "#DC2626" };
  if (days < 7) return { text: `${days}d left`, color: "#DC2626" };
  if (days < 14) return { text: `${days}d left`, color: "#D97706" };
  return { text: `${days}d left`, color: "#16A34A" };
}

type SortKey = "closing_date" | "title";

export function TenderListScreen() {
  const [sortBy, setSortBy] = useState<SortKey>("closing_date");
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // ─── Perfix filter state ──────────────────────────────────────────────
  const filter = useFilterState(TENDERS_FILTER_CONFIG.rules);

  // ─── API query ────────────────────────────────────────────────────────
  const queryParams = filter.toQueryParams();
  const q = useTendersList({
    search: queryParams.search ? String(queryParams.search) : undefined,
    status: queryParams.tender_status ? String(queryParams.tender_status) : undefined,
    limit: 200,
  });

  const { rows, totalCount } = useMemo(() => {
    const items = (q.data?.items ?? []) as TenderListItem[];
    const sorted = [...items].sort((a, b) => {
      if (sortBy === "closing_date") {
        const da = a.closing_date ? new Date(a.closing_date).getTime() : Infinity;
        const db = b.closing_date ? new Date(b.closing_date).getTime() : Infinity;
        return da - db;
      }
      return (a.tender_description || "").localeCompare(b.tender_description || "");
    });
    return { rows: sorted, totalCount: q.data?.total ?? items.length };
  }, [q.data, sortBy]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const isLoading = q.isLoading && !q.data;
  const isEmpty = !isLoading && !q.isError && rows.length === 0;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: "#FEF3C7" }}
          >
            <Ionicons name="briefcase-outline" size={22} color={ACCENT} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-slate-900">Tenders</Text>
            <Text className="text-xs text-slate-500 mt-0.5">{totalCount} total</Text>
          </View>
          <TouchableOpacity
            onPress={() => setSortBy(sortBy === "closing_date" ? "title" : "closing_date")}
            className="p-2"
          >
            <Ionicons
              name={sortBy === "closing_date" ? "time-outline" : "text-outline"}
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
        </View>

        {/* FilterBar */}
        <View style={{ marginTop: 12 }}>
          <FilterBar
            search={filter.search}
            onSearchChange={filter.setSearch}
            searchPlaceholder="Search by title or tender number…"
            activeFilterCount={filter.activeFilterCount}
            onFilterPress={() => setShowFilterSheet(true)}
            onClearAll={filter.clearAll}
          />
        </View>

        {/* Status filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingTop: 12 }}
        >
          {FILTER_CHIPS.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              active={filter.quickFilters["tender_status"] === chip.key || (chip.key === "all" && !filter.quickFilters["tender_status"])}
              onPress={() =>
                filter.setQuickFilter("tender_status", chip.key === "all" ? "" : chip.key)
              }
              color={chip.color}
            />
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
          <Text className="text-slate-900 font-semibold mt-3">Couldn&apos;t load tenders</Text>
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
          <Ionicons name="briefcase-outline" size={48} color="#94A3B8" />
          <Text className="text-slate-900 font-semibold mt-3">No tenders found</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          renderItem={({ item }) => {
            const st = getStatusBadge(item.tender_status);
            const cc = closingCountdown(item.closing_date);
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/tenders/${item.id}` as any)}
                className="bg-white rounded-xl p-4 border border-gray-100"
                activeOpacity={0.7}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-semibold text-slate-900" numberOfLines={2}>
                      {item.tender_description || "Untitled"}
                    </Text>
                    <Text className="text-xs text-slate-400 mt-1">
                      {item.tender_number || `#${item.id}`}
                      {item.tenderer_name ? ` · ${item.tenderer_name}` : ""}
                    </Text>
                  </View>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: st.bg }}>
                    <Text className="text-[10px] font-semibold" style={{ color: st.color }}>
                      {st.label}
                    </Text>
                  </View>
                </View>
                {cc && (
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="time-outline" size={12} color={cc.color} />
                    <Text className="text-xs font-medium ml-1" style={{ color: cc.color }}>
                      {cc.text}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Filter sheet modal */}
      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        ruleDefs={TENDERS_FILTER_CONFIG.rules}
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
