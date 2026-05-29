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
import { useContractsList } from "@/lib/queries/contracts";
import { colors } from "@/lib/theme";

// ─── Perfix filter system ──────────────────────────────────────────────
import { useFilterState } from "@/lib/hooks/useFilterState";
import { CONTRACTS_FILTER_CONFIG } from "@/lib/filter-configs";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterChip } from "@/components/ui/FilterChip";
import { FilterSheet } from "@/components/ui/FilterSheet";

const ACCENT = "#475569";

// Client-side contract status derivation (Web UI parses dates server-side;
// mobile computes locally for quick chips)
type ClientStatusFilter = "all" | "active" | "expired" | "upcoming" | "expiring";

const STATUS_CHIPS: Array<{ key: ClientStatusFilter; label: string; color: string }> = [
  { key: "all", label: "All", color: ACCENT },
  { key: "active", label: "Active", color: "#16A34A" },
  { key: "expired", label: "Expired", color: "#DC2626" },
  { key: "upcoming", label: "Upcoming", color: "#7C3AED" },
  { key: "expiring", label: "Expiring Soon", color: "#D97706" },
];

function getContractStatus(item: any): { label: string; color: string; bg: string } {
  const now = new Date();
  const start = item.datestart ? new Date(item.datestart) : null;
  const end = item.dateend ? new Date(item.dateend) : null;
  const signed = Number(item.signed) === 1;

  if (signed) return { label: "Signed", color: "#2563EB", bg: "#EFF6FF" };
  if (end && end < now) return { label: "Expired", color: "#DC2626", bg: "#FEF2F2" };
  if (start && start > now) return { label: "Draft", color: "#64748B", bg: "#F1F5F9" };

  if (end) {
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 30)
      return { label: `${daysRemaining}d left`, color: "#D97706", bg: "#FFFBEB" };
  }

  return { label: "Active", color: "#16A34A", bg: "#F0FDF4" };
}

export function ContractListScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [clientStatus, setClientStatus] = useState<ClientStatusFilter>("all");

  // ─── Perfix filter state ──────────────────────────────────────────────
  const filter = useFilterState(CONTRACTS_FILTER_CONFIG.rules);

  // ─── API query ────────────────────────────────────────────────────────
  const queryParams = filter.toQueryParams();
  const q = useContractsList({
    search: queryParams.search ? String(queryParams.search) : undefined,
    limit: 200,
  });

  const { rows, totalCount } = useMemo(() => {
    const items = q.data?.items ?? [];
    const total = q.data?.total ?? items.length;
    const now = new Date();

    let filtered = items;
    if (clientStatus === "active") {
      filtered = items.filter((item: any) => {
        const start = item.datestart ? new Date(item.datestart) : null;
        const end = item.dateend ? new Date(item.dateend) : null;
        return (!start || start <= now) && (!end || end >= now);
      });
    } else if (clientStatus === "expired") {
      filtered = items.filter((item: any) => {
        const end = item.dateend ? new Date(item.dateend) : null;
        return end && end < now;
      });
    } else if (clientStatus === "upcoming") {
      filtered = items.filter((item: any) => {
        const start = item.datestart ? new Date(item.datestart) : null;
        return start && start > now;
      });
    } else if (clientStatus === "expiring") {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      filtered = items.filter((item: any) => {
        const end = item.dateend ? new Date(item.dateend) : null;
        if (!end || end < now) return false;
        return end.getTime() - now.getTime() <= thirtyDays;
      });
    }

    return { rows: filtered, totalCount: total };
  }, [q.data, clientStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const isLoading = q.isLoading && !q.data;
  const isEmpty = !isLoading && !q.isError && (q.data?.items?.length ?? 0) === 0;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <View className="flex-row items-center mb-3">
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${ACCENT}1A` }}>
            <Ionicons name="document-text-outline" size={22} color={ACCENT} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-slate-900">Contracts</Text>
            <Text className="text-xs text-slate-500 mt-0.5">
              {totalCount} total · {rows.length} shown
            </Text>
          </View>
        </View>

        {/* FilterBar */}
        <FilterBar
          search={filter.search}
          onSearchChange={filter.setSearch}
          searchPlaceholder="Search contracts..."
          activeFilterCount={filter.activeFilterCount}
          onFilterPress={() => setShowFilterSheet(true)}
          onClearAll={() => {
            filter.clearAll();
            setClientStatus("all");
          }}
        />

        {/* Quick status chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingTop: 12 }}
        >
          {STATUS_CHIPS.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              active={clientStatus === chip.key}
              onPress={() => setClientStatus(chip.key)}
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
          <Text className="text-slate-900 font-semibold mt-3">Couldn&apos;t load contracts</Text>
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
          <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
          <Text className="text-slate-900 font-semibold mt-3">No contracts found</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          renderItem={({ item }) => {
            const st = getContractStatus(item);
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/contracts/${item.id}` as any)}
                className="bg-white rounded-xl p-4 border border-gray-100"
                activeOpacity={0.7}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-semibold text-slate-900" numberOfLines={2}>
                      {item.subject || "Untitled"}
                    </Text>
                    {item.company ? (
                      <Text className="text-sm text-slate-500 mt-1">{item.company}</Text>
                    ) : null}
                  </View>
                  <View
                    className="rounded-full px-2.5 py-1"
                    style={{ backgroundColor: st.bg }}
                  >
                    <Text className="text-[10px] font-semibold" style={{ color: st.color }}>
                      {st.label}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center mt-2 gap-4">
                  <Text className="text-xs text-slate-400">
                    {item.datestart || "—"} → {item.dateend || "—"}
                  </Text>
                  {item.contract_value ? (
                    <Text className="text-xs font-semibold text-slate-700">
                      {item.contract_value}
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
        ruleDefs={CONTRACTS_FILTER_CONFIG.rules}
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
