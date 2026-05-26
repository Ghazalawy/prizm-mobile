import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useInbox, type InboxItem } from "@/lib/queries/inbox";
import { useState, useCallback } from "react";
import { colors } from "@/lib/theme";

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
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {inbox.isLoading ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : approvalItems.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: "#7C3AED1A" }}
            >
              <Ionicons name="shield-checkmark-outline" size={32} color="#7C3AED" />
            </View>
            <Text className="text-foreground font-semibold text-lg">All caught up</Text>
            <Text className="text-muted text-sm mt-1 text-center">
              No pending approvals at the moment.
            </Text>
          </View>
        ) : (
          approvalItems.map((item: InboxItem, idx: number) => (
            <TouchableOpacity
              key={`${item.type}-${item.id}`}
              activeOpacity={0.7}
              className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
              onPress={() => {
                if (item.deeplink) router.push(item.deeplink as any);
              }}
            >
              <View className="flex-row items-start">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: "#7C3AED1A" }}
                >
                  <Ionicons name="shield-checkmark-outline" size={20} color="#7C3AED" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
                    {item.title || `Approval #${item.id}`}
                  </Text>
                  {item.subtitle ? (
                    <Text className="text-xs text-muted mt-1" numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                  <Text className="text-xs text-muted mt-1 capitalize">{item.type.replace(/_/g, " ")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
