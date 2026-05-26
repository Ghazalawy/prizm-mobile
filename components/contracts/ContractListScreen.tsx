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
import { useContractsList } from "@/lib/queries/contracts";
import { colors } from "@/lib/theme";

const ACCENT = "#475569";

type StatusFilter = "all" | "active" | "expired" | "upcoming" | "expiring";

const FILTER_CHIPS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "upcoming", label: "Upcoming" },
  { key: "expiring", label: "Expiring Soon" },
];

function getContractStatus(item: any): {
  label: string;
  color: string;
  bg: string;
} {
  const now = new Date();
  const start = item.datestart ? new Date(item.datestart) : null;
  const end = item.dateend ? new Date(item.dateend) : null;
  const signed = Number(item.signed) === 1;

  if (signed) return { label: "Signed", color: "#2563EB", bg: "#EFF6FF" };
  if (end && end < now) return { label: "Expired", color: "#DC2626", bg: "#FEF2F2" };
  if (start && start > now) return { label: "Draft", color: "#64748B", bg: "#F1F5F9" };

  if (end) {
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 30) return { label: `${daysRemaining}d left`, color: "#D97706", bg: "#FFFBEB" };
  }

  return { label: "Active", color: "#16A34A", bg: "#F0FDF4" };
}

export function ContractListScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const q = useContractsList({
    search: search.trim() || undefined,
    limit: 200,
  });

  const { rows, totalCount } = useMemo(() => {
    const items = q.data?.items ?? [];
    const total = q.data?.total ?? items.length;
    const now = new Date();

    let filtered = items;
    if (statusFilter === "active") {
      filtered = items.filter((item) => {
        const start = item.datestart ? new Date(item.datestart) : null;
        const end = item.dateend ? new Date(item.dateend) : null;
        return (!start || start <= now) && (!end || end >= now);
      });
    } else if (statusFilter === "expired") {
      filtered = items.filter((item) => {
        const end = item.dateend ? new Date(item.dateend) : null;
        return end && end < now;
      });
    } else if (statusFilter === "upcoming") {
      filtered = items.filter((item) => {
        const start = item.datestart ? new Date(item.datestart) : null;
        return start && start > now;
      });
    } else if (statusFilter === "expiring") {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      filtered = items.filter((item) => {
        const end = item.dateend ? new Date(item.dateend) : null;
        if (!end || end < now) return false;
        return end.getTime() - now.getTime() <= thirtyDays;
      });
    }

    return { rows: filtered, totalCount: total };
  }, [q.data, statusFilter]);

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
            style={{ backgroundColor: `${ACCENT}1A` }}
          >
            <Ionicons name="document-lock-outline" size={22} color={ACCENT} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-slate-900">Contracts</Text>
            <Text className="text-xs text-slate-500 mt-0.5">{totalCount} total</Text>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center mt-3 bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by subject…"
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
          <Ionicons name="document-lock-outline" size={48} color="#94A3B8" />
          <Text className="text-slate-900 font-semibold mt-3">No contracts found</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ContractCard item={item} />}
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

const ContractCard = memo(function ContractCard({ item }: { item: any }) {
  const subject = item.subject || "Untitled Contract";
  const client = item.company || item.client_name || "";
  const value = Number(item.contract_value || 0);
  const status = getContractStatus(item);

  const end = item.dateend ? new Date(item.dateend) : null;
  const now = new Date();
  const isExpiringSoon =
    end && end > now && (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 30;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/contracts/${item.id}` as any)}
      activeOpacity={0.72}
      className="bg-white rounded-xl p-4 shadow-sm"
    >
      <View className="flex-row items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-base font-semibold text-slate-900 flex-1" numberOfLines={1}>
              {subject}
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
          {client ? (
            <Text className="text-sm text-slate-600 mt-0.5" numberOfLines={1}>{client}</Text>
          ) : null}
          <View className="flex-row items-center mt-1.5 gap-x-3">
            {value > 0 && (
              <Text className="text-sm font-bold text-slate-800">
                {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            )}
            <Text className="text-xs text-slate-500">
              {item.datestart || "?"} → {item.dateend || "Ongoing"}
            </Text>
          </View>
          {isExpiringSoon && (
            <View className="flex-row items-center mt-1.5">
              <Ionicons name="warning-outline" size={12} color="#D97706" />
              <Text className="text-xs text-amber-700 ml-1">Expiring soon</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});
