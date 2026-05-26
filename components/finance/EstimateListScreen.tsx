import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { listEntities, normalizeList, type ListParams } from "@/lib/api";
import { DocumentStatusBadge } from "./DocumentStatusBadge";

const PAGE_SIZE = 25;
const ACCENT = "#7C3AED";

type StatusFilter = "all" | "1" | "2" | "3" | "4" | "5";

const FILTER_CHIPS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "1", label: "Draft" },
  { key: "2", label: "Sent" },
  { key: "4", label: "Accepted" },
  { key: "3", label: "Declined" },
  { key: "5", label: "Expired" },
];

export function EstimateListScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const q = useInfiniteQuery({
    queryKey: ["crud", "estimates", "list", { search, status: statusFilter === "all" ? undefined : statusFilter }],
    queryFn: ({ pageParam = 0 }) => {
      const params: ListParams = {
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset: pageParam as number,
        sort: "date",
        sort_dir: "desc",
      };
      if (statusFilter !== "all") params.status = statusFilter;
      return listEntities("estimates", params);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const { items, total } = normalizeList(lastPage);
      const loaded = allPages.reduce((a, p) => a + normalizeList(p).items.length, 0);
      if (items.length < PAGE_SIZE) return undefined;
      if (total > 0 && loaded >= total) return undefined;
      return loaded;
    },
  });

  const { rows, totalCount } = useMemo(() => {
    const all: any[] = [];
    let serverTotal = 0;
    for (const page of q.data?.pages ?? []) {
      const n = normalizeList(page);
      all.push(...n.items);
      if (n.total > 0) serverTotal = n.total;
    }
    const seen = new Set<string>();
    const unique = all.filter((row) => {
      const id = String(row.id ?? "");
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const needle = search.trim().toLowerCase();
    const filtered = needle
      ? unique.filter((r) =>
          [r.number, r.estimate_number, r.company, r.client_name]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(needle)),
        )
      : unique;

    return { rows: filtered, totalCount: serverTotal || filtered.length };
  }, [q.data, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const loadMore = useCallback(() => {
    if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
  }, [q]);

  const isLoading = q.isLoading && !q.data;
  const isEmpty = !isLoading && !q.isError && rows.length === 0;

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${ACCENT}1A` }}>
            <Ionicons name="reader-outline" size={22} color={ACCENT} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-foreground">Estimates</Text>
            <Text className="text-xs text-muted mt-0.5">{totalCount} total</Text>
          </View>
        </View>

        <View className="flex-row items-center mt-3 bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by number, client…"
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2 text-foreground"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={FILTER_CHIPS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingTop: 10, gap: 6 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setStatusFilter(item.key)}
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: statusFilter === item.key ? ACCENT : "#F1F5F9" }}
              activeOpacity={0.7}
            >
              <Text className="text-xs font-semibold" style={{ color: statusFilter === item.key ? "#FFF" : "#475569" }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load estimates</Text>
          <TouchableOpacity onPress={() => q.refetch()} className="mt-4 bg-primary px-5 py-2 rounded-lg">
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="reader-outline" size={48} color="#94A3B8" />
          <Text className="text-foreground font-semibold mt-3">No estimates found</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={rows}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <EstimateRow item={item} />}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <View className="py-4 items-center"><ActivityIndicator size="small" color={ACCENT} /></View>
            ) : null
          }
          initialNumToRender={18}
          windowSize={10}
        />
      )}
    </View>
  );
}

const EstimateRow = memo(function EstimateRow({ item }: { item: any }) {
  const total = Number(item.total || 0);
  const status = String(item.status || "1");
  const estimateNum = item.estimate_number || item.number || `#${item.id}`;
  const clientName = item.company || item.client_name || "";
  const isAccepted = status === "4";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/estimates/${item.id}` as any)}
      activeOpacity={0.72}
      className="bg-white rounded-xl p-3.5 shadow-sm"
    >
      <View className="flex-row items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-foreground font-semibold text-base" numberOfLines={1}>
              {estimateNum}
            </Text>
            <View className="ml-2">
              <DocumentStatusBadge type="estimate" status={status} />
            </View>
          </View>
          {clientName ? (
            <Text className="text-sm text-muted mt-0.5" numberOfLines={1}>{clientName}</Text>
          ) : null}
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-muted">{item.date || ""}</Text>
            {isAccepted ? (
              <View className="ml-2 flex-row items-center">
                <Ionicons name="swap-horizontal-outline" size={12} color="#7C3AED" />
                <Text className="text-xs text-purple-600 ml-1 font-medium">Convert to Invoice</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Text className="text-lg font-bold font-mono ml-3 text-foreground">
          {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    </TouchableOpacity>
  );
});
