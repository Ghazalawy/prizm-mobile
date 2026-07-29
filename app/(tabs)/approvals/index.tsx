import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useInbox, type InboxItem } from "@/lib/queries/inbox";
import { useState, useCallback } from "react";
import { colors } from "@/lib/theme";
import { navigateInAppOrExternalLink } from "@/lib/native-routing";
import { DenseListRow } from "@/components/ui/DenseListRow";
import { EntityPill } from "@/components/ui/EntityPill";

const TYPE_LABELS: Record<string, string> = {
  payment_request: "Payment Request",
  purchase_request: "Purchase Request",
  purchase_order: "Purchase Order",
  expense_request: "Expense Request",
  leave: "Leave",
  leave_request: "Leave",
  timesheet: "Timesheet",
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return null;
  const hrs = Math.floor(ms / 3600000);
  if (hrs < 1) return "now";
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function ApprovalsIndexScreen() {
  const inbox = useInbox();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await inbox.refetch();
    setRefreshing(false);
  }, [inbox]);

  const approvalItems = inbox.data?.approvals ?? [];

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "Pending Approvals",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      >
        {inbox.isLoading ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : approvalItems.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: "#7C3AED1A" }}
            >
              <Ionicons name="shield-checkmark-outline" size={28} color="#7C3AED" />
            </View>
            <Text className="text-foreground font-semibold text-lg">All caught up</Text>
            <Text className="text-muted text-sm mt-1 text-center">
              No pending approvals at the moment.
            </Text>
          </View>
        ) : (
          <View className="bg-white rounded-2xl px-2 shadow-sm">
            {approvalItems.map((item: InboxItem) => (
              <DenseListRow
                key={`${item.type}-${item.id}`}
                title={item.title || `Approval #${item.id}`}
                subtitle={item.subtitle || undefined}
                onPress={() => {
                  if (item.deeplink) {
                    void navigateInAppOrExternalLink(item.deeplink, {
                      fallbackRoute: "/(tabs)/approvals",
                    });
                  }
                }}
                leftAccent={
                  <View
                    className="w-8 h-8 rounded-lg items-center justify-center mr-1"
                    style={{ backgroundColor: "#7C3AED1A" }}
                  >
                    <Ionicons name="shield-checkmark-outline" size={16} color="#7C3AED" />
                  </View>
                }
                badges={<EntityPill label={typeLabel(item.type)} color="#7C3AED" bg="#EDE9FE" />}
                rightMeta={
                  formatTimeAgo(item.triggered_at) ? (
                    <Text className="text-[10px] text-muted text-right font-medium">
                      {formatTimeAgo(item.triggered_at)}
                    </Text>
                  ) : item.priority === "high" ? (
                    <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "#FEE2E2" }}>
                      <Text className="text-[9px] font-bold" style={{ color: "#B91C1C" }}>
                        HIGH
                      </Text>
                    </View>
                  ) : null
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
