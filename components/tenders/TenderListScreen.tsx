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
import { memo, useCallback, useMemo, useState } from "react";
import { useTendersList, type TenderListItem } from "@/lib/queries/tenders";
import { colors } from "@/lib/theme";

const ACCENT = "#B45309";

type StatusFilter = "all" | "Draft" | "Submitted" | "Awarded" | "Won" | "Lost" | "Cancelled";

const FILTER_CHIPS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "Draft", label: "Draft" },
  { key: "Submitted", label: "Submitted" },
  { key: "Awarded", label: "Awarded" },
  { key: "Won", label: "Won" },
  { key: "Lost", label: "Lost" },
  { key: "Cancelled", label: "Cancelled" },
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("closing_date");
  const [refreshing, setRefreshing] = useState(false);

  const q = useTendersList({
    search: search.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
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

        {/* Search */}
        <View className="flex-row items-center mt-3 bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by title or tender number…"
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
          renderItem={({ item }) => <TenderCard item={item} />}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
        />
      )}
    </View>
  );
}

const TenderCard = memo(function TenderCard({ item }: { item: TenderListItem }) {
  const title = item.tender_description || "Untitled Tender";
  const status = getStatusBadge(item.tender_status);
  const countdown = closingCountdown(item.closing_date);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/tenders/${item.id}` as any)}
      activeOpacity={0.72}
      className="bg-white rounded-xl p-4 shadow-sm"
    >
      <View className="flex-row items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-base font-semibold text-slate-900 flex-1" numberOfLines={2}>
              {title}
            </Text>
            <View
              className="px-2 py-0.5 rounded-full ml-2"
              style={{ backgroundColor: status.bg }}
            >
              <Text className="text-[10px] font-bold" style={{ color: status.color }}>
                {status.label}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mt-1 gap-x-2">
            {item.tender_number ? (
              <Text className="text-xs text-slate-500">#{item.tender_number}</Text>
            ) : null}
            {item.source ? (
              <View className="flex-row items-center">
                <Ionicons name="globe-outline" size={10} color="#64748B" />
                <Text className="text-xs text-slate-500 ml-0.5">{item.source}</Text>
              </View>
            ) : null}
          </View>

          {item.closing_date ? (
            <View className="flex-row items-center mt-2">
              <Ionicons name="calendar-outline" size={12} color="#64748B" />
              <Text className="text-xs text-slate-600 ml-1">
                Closes: {new Date(item.closing_date).toLocaleDateString()}
              </Text>
              {countdown ? (
                <View className="ml-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: countdown.color + "15" }}>
                  <Text className="text-[10px] font-bold" style={{ color: countdown.color }}>
                    {countdown.text}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});
