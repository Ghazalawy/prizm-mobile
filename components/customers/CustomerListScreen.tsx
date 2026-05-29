import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { useCustomersList, useCustomerGroups } from "@/lib/queries/customers";
import { colors } from "@/lib/theme";

// ─── Perfix filter system ──────────────────────────────────────────────
import { useFilterState } from "@/lib/hooks/useFilterState";
import { CUSTOMERS_FILTER_CONFIG } from "@/lib/filter-configs";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterChip } from "@/components/ui/FilterChip";
import { FilterSheet } from "@/components/ui/FilterSheet";

const ACCENT = colors.primary;

export function CustomerListScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // ─── Perfix filter state ──────────────────────────────────────────────
  const filter = useFilterState(CUSTOMERS_FILTER_CONFIG.rules);
  const groups = useCustomerGroups();

  // ─── API query ────────────────────────────────────────────────────────
  const queryParams = filter.toQueryParams();
  const q = useCustomersList({
    search: queryParams.search ? String(queryParams.search) : undefined,
    active: queryParams.active ? String(queryParams.active) : undefined,
    group: queryParams.group_id ? String(queryParams.group_id) : undefined,
    limit: 500,
  });

  const { sections, totalCount } = useMemo(() => {
    const items = q.data?.items ?? [];
    const total = q.data?.total ?? items.length;

    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      const company = (item.company || "").trim();
      const letter = company.length > 0 ? company[0].toUpperCase() : "#";
      const key = /^[A-Z]$/.test(letter) ? letter : "#";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    const sorted = Object.keys(grouped)
      .sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
      .map((letter) => ({ title: letter, data: grouped[letter] }));

    return { sections: sorted, totalCount: total };
  }, [q.data]);

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
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${ACCENT}1A` }}
          >
            <Ionicons name="business-outline" size={22} color={ACCENT} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-slate-900">Customers</Text>
            <Text className="text-xs text-slate-500 mt-0.5">{totalCount} total</Text>
          </View>
        </View>

        {/* FilterBar */}
        <View style={{ marginTop: 12 }}>
          <FilterBar
            search={filter.search}
            onSearchChange={filter.setSearch}
            searchPlaceholder="Search company, phone, VAT, city…"
            activeFilterCount={filter.activeFilterCount}
            onFilterPress={() => setShowFilterSheet(true)}
            onClearAll={filter.clearAll}
          />
        </View>

        {/* Quick filter chips */}
        <View style={{ flexDirection: "row", marginTop: 12, gap: 6 }}>
          <FilterChip
            label="All"
            active={!filter.quickFilters["active"]}
            onPress={() => filter.setQuickFilter("active", "")}
          />
          <FilterChip
            label="Active"
            active={filter.quickFilters["active"] === "1"}
            onPress={() => filter.setQuickFilter("active", "1")}
            color="#16A34A"
          />
          <FilterChip
            label="Inactive"
            active={filter.quickFilters["active"] === "0"}
            onPress={() => filter.setQuickFilter("active", "0")}
            color="#DC2626"
          />

          {/* Group filter chips */}
          {(groups.data?.length ?? 0) > 0 && (
            <FlatList
              data={groups.data!}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(g) => String(g.id)}
              contentContainerStyle={{ gap: 6, paddingLeft: 4 }}
              renderItem={({ item: g }) => (
                <FilterChip
                  label={g.name}
                  active={filter.quickFilters["group_id"] === String(g.id)}
                  onPress={() => filter.setQuickFilter("group_id", String(g.id))}
                  color="#0284C7"
                />
              )}
            />
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
          <Text className="text-slate-900 font-semibold mt-3">Couldn&apos;t load customers</Text>
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
          <Ionicons name="business-outline" size={48} color="#94A3B8" />
          <Text className="text-slate-900 font-semibold mt-3">No customers found</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.userid)}
          renderItem={({ item }) => <CustomerCard item={item} />}
          renderSectionHeader={({ section }) => (
            <View className="px-4 py-1 bg-slate-50">
              <Text className="text-xs font-bold text-slate-400">{section.title}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 12 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
        />
      )}

      {/* Filter sheet modal */}
      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        ruleDefs={CUSTOMERS_FILTER_CONFIG.rules}
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

// ─── Customer Card ──────────────────────────────────────────────────────

const CustomerCard = memo(function CustomerCard({ item }: { item: any }) {
  const active = Number(item.active) === 1;
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/customers/${item.userid}` as any)}
      className="bg-white rounded-xl p-4 border border-gray-100"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
            {item.company || "—"}
          </Text>
          {item.phonenumber ? (
            <View className="flex-row items-center mt-1">
              <Ionicons name="call-outline" size={11} color="#64748B" />
              <Text className="text-xs text-slate-500 ml-1">{item.phonenumber}</Text>
            </View>
          ) : null}
        </View>
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: active ? "#DCFCE7" : "#FEE2E2" }}
        >
          <Text
            className="text-[10px] font-semibold"
            style={{ color: active ? "#166534" : "#991B1B" }}
          >
            {active ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>
      {item.city || item.country ? (
        <Text className="text-xs text-slate-400 mt-1.5" numberOfLines={1}>
          {[item.city, item.state].filter(Boolean).join(", ")}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});
