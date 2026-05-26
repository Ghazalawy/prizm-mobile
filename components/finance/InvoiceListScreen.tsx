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
import { DocumentStatusBadge, isOverdue } from "./DocumentStatusBadge";

const PAGE_SIZE = 25;
const ACCENT = "#DC2626";

type StatusFilter = "all" | "6" | "2" | "1" | "3" | "4" | "5" | "overdue";

const FILTER_CHIPS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "6", label: "Draft" },
  { key: "2", label: "Sent" },
  { key: "1", label: "Unpaid" },
  { key: "3", label: "Partial" },
  { key: "4", label: "Paid" },
  { key: "overdue", label: "Overdue" },
  { key: "5", label: "Cancelled" },
];

export function InvoiceListScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const q = useInfiniteQuery({
    queryKey: ["crud", "invoices", "list", { search, status: statusFilter === "all" || statusFilter === "overdue" ? undefined : statusFilter }],
    queryFn: ({ pageParam = 0 }) => {
      const params: ListParams = {
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset: pageParam as number,
        sort: "date",
        sort_dir: "desc",
      };
      if (statusFilter !== "all" && statusFilter !== "overdue") {
        params.status = statusFilter;
      }
      return listEntities("invoices", params);
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
      const id = String(row.id ?? row.invoiceid ?? "");
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    let filtered = unique;
    if (statusFilter === "overdue") {
      filtered = unique.filter(
        (r) => (String(r.status) === "1" || String(r.status) === "2") && isOverdue(r.duedate),
      );
    }

    const needle = search.trim().toLowerCase();
    if (needle) {
      filtered = filtered.filter((r) =>
        [r.number, r.invoice_number, r.company, r.client_name, r.clientid]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      );
    }

    return { rows: filtered, totalCount: serverTotal || filtered.length };
  }, [q.data, search, statusFilter]);

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
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${ACCENT}1A` }}
          >
            <Ionicons name="document-text-outline" size={22} color={ACCENT} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-foreground">Invoices</Text>
            <Text className="text-xs text-muted mt-0.5">{totalCount} total</Text>
          </View>
        </View>

        {/* Search */}
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

        {/* Status filter chips */}
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
              style={{
                backgroundColor: statusFilter === item.key ? ACCENT : "#F1F5F9",
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: statusFilter === item.key ? "#FFF" : "#475569" }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load invoices</Text>
          <TouchableOpacity
            onPress={() => q.refetch()}
            className="mt-4 bg-primary px-5 py-2 rounded-lg"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
          <Text className="text-foreground font-semibold mt-3">No invoices found</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={rows}
          keyExtractor={(item) => String(item.id ?? item.invoiceid)}
          renderItem={({ item }) => <InvoiceRow item={item} />}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={ACCENT} />
              </View>
            ) : null
          }
          initialNumToRender={18}
          windowSize={10}
        />
      )}
    </View>
  );
}

const InvoiceRow = memo(function InvoiceRow({ item }: { item: any }) {
  const total = Number(item.total || 0);
  const status = String(item.status || "1");
  const isPaid = status === "4";
  const overdue = isOverdue(item.duedate) && (status === "1" || status === "2");
  const isDraft = status === "6";

  const amountColor = isPaid ? "#16A34A" : overdue ? "#DC2626" : isDraft ? "#94A3B8" : "#0F172A";
  const invoiceNumber = item.invoice_number || item.number || `#${item.id}`;
  const clientName = item.company || item.client_name || "";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/invoices/${item.id}` as any)}
      activeOpacity={0.72}
      className="bg-white rounded-xl p-3.5 shadow-sm"
    >
      <View className="flex-row items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-foreground font-semibold text-base" numberOfLines={1}>
              {invoiceNumber}
            </Text>
            <View className="ml-2">
              <DocumentStatusBadge type="invoice" status={status} dueDate={item.duedate} />
            </View>
          </View>
          {clientName ? (
            <Text className="text-sm text-muted mt-0.5" numberOfLines={1}>
              {clientName}
            </Text>
          ) : null}
          <Text className="text-xs text-muted mt-1">
            {item.date || ""}
            {item.duedate && !item.duedate.startsWith("0000") ? ` · Due ${item.duedate}` : ""}
          </Text>
        </View>
        <Text
          className="text-lg font-bold font-mono ml-3"
          style={{ color: amountColor }}
        >
          {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    </TouchableOpacity>
  );
});
