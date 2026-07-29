import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import Toast from "react-native-toast-message";
import { NoteModal, type NoteMode } from "@/components/approvals/NoteModal";
import {
  LEAVE_REL_TYPES,
  TYPE_OF_LEAVE,
  useApproveLeave,
  useLeaveApproval,
  useRejectLeave,
} from "@/lib/queries/my";
import { colors } from "@/lib/theme";

const statusMeta: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "Pending", color: "#B45309", bg: "#FEF3C7" },
  1: { label: "Approved", color: "#15803D", bg: "#DCFCE7" },
  2: { label: "Rejected", color: "#B91C1C", bg: "#FEE2E2" },
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function LeaveApprovalScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const query = useLeaveApproval(id);
  const approve = useApproveLeave();
  const reject = useRejectLeave();
  const [mode, setMode] = useState<NoteMode | null>(null);
  const row = query.data;
  const busy = approve.isPending || reject.isPending;

  const act = (note: string) => {
    if (!row || !mode) return;
    const mutation = mode === "approve" ? approve : reject;
    mutation.mutate(
      { id: row.id, note },
      {
        onSuccess: () => {
          Toast.show({ type: "success", text1: mode === "approve" ? "Leave approved" : "Leave rejected" });
          setMode(null);
        },
        onError: (error: any) =>
          Toast.show({ type: "error", text1: "Action failed", text2: error?.message?.slice(0, 100) }),
      }
    );
  };

  const typeLabel = row?.rel_type === 1
    ? TYPE_OF_LEAVE.find((item) => item.id === Number(row.type_of_leave))?.label || row.rel_type_key || "Leave"
    : LEAVE_REL_TYPES.find((item) => item.id === Number(row?.rel_type))?.label || row?.rel_type_key || "Leave";
  const state = statusMeta[Number(row?.status ?? 0)] || statusMeta[0];

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Leave Approval",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      {query.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : query.isError || !row ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={44} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn’t load this request</Text>
          <TouchableOpacity onPress={() => query.refetch()} className="bg-primary rounded-xl px-5 py-2.5 mt-4">
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        >
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-xs uppercase tracking-wide text-muted">{typeLabel}</Text>
                <Text className="text-xl font-bold text-foreground mt-1">{row.subject || `Request #${row.id}`}</Text>
                <Text className="text-sm text-muted mt-1">{row.staff_name || `Staff #${row.staff_id}`}</Text>
              </View>
              <View className="rounded-full px-3 py-1" style={{ backgroundColor: state.bg }}>
                <Text className="text-xs font-semibold" style={{ color: state.color }}>{state.label}</Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm mt-4">
            <Info label="Starts" value={formatDate(row.start_time)} />
            <Info label="Ends" value={formatDate(row.end_time)} />
            <Info label="Reason" value={row.reason || "No reason provided"} last />
          </View>

          {(row.approval_history ?? []).length > 0 ? (
            <View className="bg-white rounded-2xl p-4 shadow-sm mt-4">
              <Text className="text-xs uppercase tracking-wide text-muted mb-2">Approval history</Text>
              {row.approval_history!.map((item) => {
                const status = Number(item.approve);
                return (
                  <View key={item.id} className="border-b border-slate-100 py-2.5">
                    <Text className="text-sm font-medium text-foreground">
                      {status === 1 ? "Approved" : status === 2 ? "Rejected" : "Waiting"} · Staff {item.staff_approve || item.staffid}
                    </Text>
                    {item.date ? <Text className="text-xs text-muted mt-0.5">{formatDate(item.date)}</Text> : null}
                    {item.note ? <Text className="text-sm text-slate-600 mt-1">{item.note}</Text> : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      )}

      {row?._actions?.approve || row?._actions?.reject ? (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 flex-row">
          <TouchableOpacity onPress={() => setMode("reject")} className="flex-1 py-3 rounded-xl bg-rose-600 items-center mr-2">
            <Text className="text-white font-semibold">Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode("approve")} className="flex-1 py-3 rounded-xl bg-emerald-600 items-center ml-2">
            <Text className="text-white font-semibold">Approve</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <NoteModal visible={mode !== null} mode={mode ?? "approve"} busy={busy} onCancel={() => !busy && setMode(null)} onConfirm={act} />
    </View>
  );
}

function Info({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`py-2 ${last ? "" : "border-b border-slate-100"}`}>
      <Text className="text-xs text-muted">{label}</Text>
      <Text className="text-sm text-foreground mt-0.5">{value}</Text>
    </View>
  );
}
