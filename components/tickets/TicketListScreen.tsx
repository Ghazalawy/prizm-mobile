import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { useTicketsList } from "@/lib/queries/tickets";
import type { TicketListItem } from "@/lib/queries/tickets";
import { rtlTextStyle } from "@/lib/rtl";
import { colors } from "@/lib/theme";

const STATUS_OPTIONS = [
  { label: "All", value: "", color: "#64748B" },
  { label: "Open", value: "1", color: "#DC2626" },
  { label: "In Progress", value: "2", color: "#2563EB" },
  { label: "Answered", value: "3", color: "#16A34A" },
  { label: "On Hold", value: "4", color: "#F59E0B" },
  { label: "Closed", value: "5", color: "#64748B" },
];

const PRIORITY_COLORS: Record<string, string> = {
  "1": "#3B82F6",  // Low
  "2": "#F59E0B",  // Medium
  "3": "#EA580C",  // High
  "4": "#DC2626",  // Urgent
};

const PRIORITY_LABELS: Record<string, string> = {
  "1": "Low",
  "2": "Medium",
  "3": "High",
  "4": "Urgent",
};

export function TicketListScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const ticketsQuery = useTicketsList({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  const tickets = ticketsQuery.data ?? [];

  const onRefresh = useCallback(async () => {
    await ticketsQuery.refetch();
  }, [ticketsQuery]);

  const renderItem = useCallback(
    ({ item }: { item: TicketListItem }) => <TicketCard item={item} />,
    []
  );

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 pt-3 pb-2">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xl font-bold text-foreground">Tickets</Text>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-100 rounded-lg px-3 py-2 mb-2">
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search tickets..."
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

        {/* Status filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 4 }}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setStatusFilter(statusFilter === opt.value ? "" : opt.value)}
              activeOpacity={0.7}
              style={{
                backgroundColor: statusFilter === opt.value ? opt.color + "20" : "#F1F5F9",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                borderWidth: statusFilter === opt.value ? 1 : 0,
                borderColor: statusFilter === opt.value ? opt.color : "transparent",
              }}
            >
              <Text style={{ color: statusFilter === opt.value ? opt.color : "#64748B", fontSize: 11, fontWeight: "600" }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Priority filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <TouchableOpacity
            onPress={() => setPriorityFilter("")}
            activeOpacity={0.7}
            style={{
              backgroundColor: !priorityFilter ? "#64748B20" : "#F1F5F9",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: !priorityFilter ? "#64748B" : "#94A3B8", fontSize: 10, fontWeight: "600" }}>
              All Priority
            </Text>
          </TouchableOpacity>
          {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              onPress={() => setPriorityFilter(priorityFilter === val ? "" : val)}
              activeOpacity={0.7}
              style={{
                backgroundColor: priorityFilter === val ? PRIORITY_COLORS[val] + "20" : "#F1F5F9",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                borderWidth: priorityFilter === val ? 1 : 0,
                borderColor: priorityFilter === val ? PRIORITY_COLORS[val] : "transparent",
              }}
            >
              <Text
                style={{
                  color: priorityFilter === val ? PRIORITY_COLORS[val] : "#94A3B8",
                  fontSize: 10,
                  fontWeight: "600",
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Ticket list */}
      {ticketsQuery.isLoading && tickets.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => String(item.ticketid)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl refreshing={ticketsQuery.isFetching} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Ionicons name="help-buoy-outline" size={48} color="#CBD5E1" />
              <Text className="text-slate-400 mt-2">No tickets found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Ticket Card ─────────────────────────────────────────────────────────

function TicketCard({ item }: { item: TicketListItem }) {
  const priorityColor = PRIORITY_COLORS[String(item.priority)] || "#64748B";
  const statusOpt = STATUS_OPTIONS.find((o) => o.value === String(item.status));
  const statusColor = statusOpt?.color || "#64748B";
  const statusLabel = statusOpt?.label || `Status ${item.status}`;
  const priorityLabel = PRIORITY_LABELS[String(item.priority)] || "Normal";
  const hasUnread = item.adminread === 0;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/tickets/${item.ticketid}` as any)}
      activeOpacity={0.7}
      className="bg-white rounded-xl overflow-hidden shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: priorityColor }}
    >
      <View className="p-4">
        <View className="flex-row items-start">
          {/* Unread dot */}
          {hasUnread ? (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.primary,
                marginTop: 5,
                marginRight: 6,
              }}
            />
          ) : null}
          <View className="flex-1">
            <Text
              className="text-sm font-semibold text-foreground"
              numberOfLines={2}
              style={rtlTextStyle(item.subject)}
            >
              {item.subject}
            </Text>
            <View className="flex-row items-center mt-1.5 flex-wrap">
              {/* Status badge */}
              <View style={{ backgroundColor: statusColor + "15", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, marginRight: 6 }}>
                <Text style={{ color: statusColor, fontSize: 10, fontWeight: "700" }}>{statusLabel}</Text>
              </View>
              {/* Priority badge */}
              <View style={{ backgroundColor: priorityColor + "15", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, marginRight: 6 }}>
                <Text style={{ color: priorityColor, fontSize: 10, fontWeight: "700" }}>{priorityLabel}</Text>
              </View>
              {/* Ticket ID */}
              <Text className="text-[10px] text-slate-400">#{item.ticketid}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between mt-2.5">
          <View className="flex-row items-center">
            {item.name ? (
              <View className="flex-row items-center mr-3">
                <Ionicons name="person-outline" size={11} color="#94A3B8" />
                <Text className="text-[10px] text-slate-400 ml-1" numberOfLines={1}>{item.name}</Text>
              </View>
            ) : null}
            {item.department_name ? (
              <View className="flex-row items-center">
                <Ionicons name="business-outline" size={11} color="#94A3B8" />
                <Text className="text-[10px] text-slate-400 ml-1">{item.department_name}</Text>
              </View>
            ) : null}
          </View>
          {item.date ? (
            <Text className="text-[10px] text-slate-400">{formatDate(item.date)}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatDate(d: string): string {
  const s = (d || "").trim();
  if (!s || s.startsWith("0000")) return "";
  return s.slice(0, 10);
}
