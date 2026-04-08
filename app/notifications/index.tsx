import { View, Text, FlatList, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const notifications = useApi(api.getNotifications);
  const items = Array.isArray(notifications.data) ? notifications.data : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await notifications.refetch();
    setRefreshing(false);
  }, [notifications]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Notifications" }} />
      <View className="flex-1 bg-surface">
        <FlatList
          data={items}
          keyExtractor={(item: any, index) => String(item.id || index)}
          contentContainerClassName="p-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Ionicons name="notifications-outline" size={48} color="#CBD5E1" />
              <Text className="text-muted mt-3 font-medium">
                {notifications.isLoading ? "Loading..." : "No notifications"}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <View className={`bg-white rounded-xl p-4 mb-3 shadow-sm ${!item.isread ? "border-l-4 border-primary" : ""}`}>
              <Text className="text-foreground font-semibold">{item.description || item.title}</Text>
              {item.date && (
                <Text className="text-muted text-xs mt-2">
                  {new Date(item.date).toLocaleString()}
                </Text>
              )}
            </View>
          )}
        />
      </View>
    </>
  );
}
