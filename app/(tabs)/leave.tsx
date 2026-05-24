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
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import Toast from "react-native-toast-message";
import {
  useLeaveBalance,
  useLeaveRequests,
  useCancelLeave,
  type LeaveRequest,
  LEAVE_REL_TYPES,
  TYPE_OF_LEAVE,
} from "@/lib/queries/my";

/**
 * My Leave — landing screen for the employee leave workflow.
 *
 * Shows:
 *   - Balance card up top (one row per leave type from tbltimesheets_type_of_leave)
 *   - List of MY leave requests, newest first, status-colored
 *   - FAB to open the submit form
 *
 * Each request has an action menu for cancellation (only allowed if
 * status === 0 pending; backend enforces this anyway).
 */

const STATUS_LABEL: Record<number, { text: string; color: string; bg: string }> = {
  0: { text: "Pending", color: "#B45309", bg: "#FEF3C7" },
  1: { text: "Approved", color: "#16A34A", bg: "#D1FAE5" },
  2: { text: "Rejected", color: "#DC2626", bg: "#FEE2E2" },
};

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

export default function LeaveScreen() {
  const balance = useLeaveBalance();
  const requests = useLeaveRequests();
  const cancel = useCancelLeave();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([balance.refetch(), requests.refetch()]);
    setRefreshing(false);
  }, [balance, requests]);

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
        {/* Balance card */}
        <View className="mx-4 mt-3 bg-white rounded-2xl shadow-sm p-4">
          <Text className="text-xs uppercase text-muted tracking-wide mb-3">
            Balance — {balance.data?.year ?? new Date().getFullYear()}
          </Text>
          {balance.isLoading ? (
            <ActivityIndicator color="#0284C7" />
          ) : balance.isError ? (
            <Text className="text-sm text-rose-600">Could not load balance</Text>
          ) : balance.data && balance.data.balance.length > 0 ? (
            balance.data.balance.map((b) => {
              const hasCap = b.max_days !== null && b.remaining !== null;
              return (
                <View key={b.type_id ?? b.type_slug ?? b.type_name} className="flex-row items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">{b.type_name}</Text>
                    <Text className="text-xs text-muted">
                      {hasCap ? `${b.used_days} of ${b.max_days} used` : `${b.used_days} day(s) used`}
                    </Text>
                  </View>
                  <View
                    className="px-3 py-1.5 rounded-full"
                    style={{
                      backgroundColor: hasCap
                        ? (b.remaining! > 5 ? "#D1FAE5" : b.remaining! > 0 ? "#FEF3C7" : "#FEE2E2")
                        : "#F1F5F9",
                    }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{
                        color: hasCap
                          ? (b.remaining! > 5 ? "#16A34A" : b.remaining! > 0 ? "#B45309" : "#DC2626")
                          : "#475569",
                      }}
                    >
                      {hasCap ? `${b.remaining} days` : `${b.used_days} used`}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-sm text-muted">No leave types configured</Text>
          )}
        </View>

        {/* Request history */}
        <View className="mx-4 mt-4">
          <Text className="text-xs uppercase text-muted tracking-wide mb-2 ml-1">
            My Requests {requests.data ? `(${requests.data.length})` : ""}
          </Text>

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
          ) : !requests.data || requests.data.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
              <Text className="text-sm text-muted mt-2 text-center">
                No leave requests yet
              </Text>
              <Text className="text-xs text-muted mt-1 text-center">
                Tap the + button below to submit one
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl overflow-hidden">
              {requests.data.map((r, i) => {
                const status = STATUS_LABEL[r.status] ?? { text: "?", color: "#64748B", bg: "#F1F5F9" };
                const days = dayCount(r.start_time, r.end_time);
                return (
                  <View
                    key={r.id}
                    className={`px-4 py-3 ${i < requests.data.length - 1 ? "border-b border-slate-100" : ""}`}
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
