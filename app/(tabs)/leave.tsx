import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useState, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import Toast from "react-native-toast-message";
import Svg, { Circle } from "react-native-svg";
import {
  useLeaveBalance,
  useLeaveRequests,
  useCancelLeave,
  type LeaveRequest,
  type LeaveBalance,
  LEAVE_REL_TYPES,
  TYPE_OF_LEAVE,
} from "@/lib/queries/my";

const STATUS_LABEL: Record<number, { text: string; color: string; bg: string }> = {
  0: { text: "Pending", color: "#B45309", bg: "#FEF3C7" },
  1: { text: "Approved", color: "#16A34A", bg: "#D1FAE5" },
  2: { text: "Rejected", color: "#DC2626", bg: "#FEE2E2" },
};

const BALANCE_COLORS = ["#0284C7", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2"];

function relTypeLabel(rel: number, sub?: number): string {
  if (rel === 1 && sub !== undefined) {
    const sl = TYPE_OF_LEAVE.find((t) => t.id === sub);
    if (sl) return sl.label;
  }
  return LEAVE_REL_TYPES.find((t) => t.id === rel)?.label ?? "Leave";
}

function fmtDate(s: string): string {
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function dayCount(start: string, end: string): number {
  const a = new Date(start.replace(" ", "T"));
  const b = new Date(end.replace(" ", "T"));
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

function CircularProgress({ used, total, color, size = 56 }: { used: number; total: number; color: string; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(used / total, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#F1F5F9"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

type ViewMode = "list" | "pending";

export default function LeaveScreen() {
  const balance = useLeaveBalance();
  const requests = useLeaveRequests();
  const cancel = useCancelLeave();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([balance.refetch(), requests.refetch()]);
    setRefreshing(false);
  }, [balance, requests]);

  const { allRequests, pendingRequests } = useMemo(() => {
    const all = requests.data || [];
    return {
      allRequests: all,
      pendingRequests: all.filter((r) => r.status === 0),
    };
  }, [requests.data]);

  const displayedRequests = viewMode === "pending" ? pendingRequests : allRequests;

  const handleCancel = (r: LeaveRequest) => {
    Alert.alert(
      "Cancel leave request?",
      `${relTypeLabel(r.rel_type, r.type_of_leave)} from ${fmtDate(r.start_time)} to ${fmtDate(r.end_time)}.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: () => {
            cancel.mutate(r.id, {
              onSuccess: () => Toast.show({ type: "success", text1: "Request cancelled" }),
              onError: (e: any) =>
                Toast.show({ type: "error", text1: "Cancel failed", text2: e?.message?.slice(0, 80) }),
            });
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "My Leave",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color="#0284C7" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Balance cards with circular progress */}
        <View className="mx-4 mt-3">
          <Text className="text-xs uppercase text-muted tracking-wide mb-2 ml-1">
            Balance — {balance.data?.year ?? new Date().getFullYear()}
          </Text>
          {balance.isLoading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator color="#0284C7" />
            </View>
          ) : balance.isError ? (
            <View className="bg-white rounded-2xl p-4">
              <Text className="text-sm text-rose-600">Could not load balance</Text>
            </View>
          ) : balance.data && balance.data.balance.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {balance.data.balance.map((b: LeaveBalance, idx: number) => {
                const hasCap = b.max_days !== null && b.remaining !== null;
                const color = BALANCE_COLORS[idx % BALANCE_COLORS.length];
                return (
                  <View
                    key={b.type_id ?? b.type_slug ?? b.type_name}
                    className="bg-white rounded-2xl p-4 items-center shadow-sm"
                    style={{ width: 130 }}
                  >
                    <View className="relative items-center justify-center">
                      <CircularProgress
                        used={b.used_days}
                        total={b.max_days ?? b.used_days}
                        color={color}
                      />
                      <View className="absolute items-center justify-center">
                        <Text className="text-base font-bold" style={{ color }}>
                          {hasCap ? b.remaining : b.used_days}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs font-semibold text-slate-800 mt-2 text-center" numberOfLines={1}>
                      {b.type_name}
                    </Text>
                    <Text className="text-[10px] text-slate-500 mt-0.5">
                      {hasCap ? `${b.used_days}/${b.max_days} used` : `${b.used_days} used`}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View className="bg-white rounded-2xl p-4">
              <Text className="text-sm text-muted">No leave types configured</Text>
            </View>
          )}
        </View>

        {/* View toggle */}
        <View className="mx-4 mt-4 flex-row bg-slate-100 rounded-lg p-0.5">
          <TouchableOpacity
            onPress={() => setViewMode("list")}
            className="flex-1 py-2 rounded-md items-center"
            style={{ backgroundColor: viewMode === "list" ? "#FFFFFF" : "transparent" }}
          >
            <Text className={`text-xs font-semibold ${viewMode === "list" ? "text-slate-900" : "text-slate-500"}`}>
              All Requests ({allRequests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode("pending")}
            className="flex-1 py-2 rounded-md items-center"
            style={{ backgroundColor: viewMode === "pending" ? "#FFFFFF" : "transparent" }}
          >
            <Text className={`text-xs font-semibold ${viewMode === "pending" ? "text-slate-900" : "text-slate-500"}`}>
              Pending ({pendingRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Request history */}
        <View className="mx-4 mt-4">
          {requests.isLoading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator color="#0284C7" />
            </View>
          ) : requests.isError ? (
            <View className="bg-white rounded-2xl p-6">
              <Text className="text-sm text-rose-600 text-center">
                {(requests.error as Error)?.message?.slice(0, 120) || "Could not load requests"}
              </Text>
            </View>
          ) : displayedRequests.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
              <Text className="text-sm text-muted mt-2 text-center">
                {viewMode === "pending" ? "No pending requests" : "No leave requests yet"}
              </Text>
              {viewMode !== "pending" ? (
                <Text className="text-xs text-muted mt-1 text-center">
                  Tap the + button below to submit one
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="bg-white rounded-2xl overflow-hidden">
              {displayedRequests.map((r, i) => {
                const status = STATUS_LABEL[r.status] ?? { text: "?", color: "#64748B", bg: "#F1F5F9" };
                const days = dayCount(r.start_time, r.end_time);
                return (
                  <View
                    key={r.id}
                    className={`px-4 py-3 ${i < displayedRequests.length - 1 ? "border-b border-slate-100" : ""}`}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 mr-2">
                        <Text className="text-sm font-medium text-foreground">
                          {relTypeLabel(r.rel_type, r.type_of_leave)}
                        </Text>
                        <Text className="text-xs text-muted mt-0.5">
                          {fmtDate(r.start_time)} → {fmtDate(r.end_time)} · {days} day{days === 1 ? "" : "s"}
                        </Text>
                        {r.reason ? (
                          <Text className="text-xs text-slate-500 mt-1" numberOfLines={2}>
                            {r.reason}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        className="px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: status.bg }}
                      >
                        <Text className="text-[11px] font-semibold" style={{ color: status.color }}>
                          {status.text}
                        </Text>
                      </View>
                    </View>
                    {r.status === 0 ? (
                      <TouchableOpacity
                        onPress={() => handleCancel(r)}
                        disabled={cancel.isPending}
                        className="mt-2 self-end px-3 py-1 bg-rose-50 rounded"
                      >
                        <Text className="text-xs text-rose-600 font-medium">
                          {cancel.isPending ? "Cancelling…" : "Cancel"}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB — submit new */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/leave-new" as any)}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{ backgroundColor: "#0284C7" }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
