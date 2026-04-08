import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const notifications = trpc.notifications.list.useQuery(undefined, { retry: false });
  const items = (notifications.data as any[]) ?? [];

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
          keyExtractor={(item: any) => String(item.id)}
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
            <View className={`bg-white rounded-xl p-4 mb-3 shadow-sm ${!item.read ? "border-l-4 border-primary" : ""}`}>
              <Text className="text-foreground font-semibold">{item.title}</Text>
              <Text className="text-muted text-sm mt-1">{item.message || item.body}</Text>
              {item.created_at && (
                <Text className="text-muted text-xs mt-2">
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              )}
            </View>
          )}
        />
      </View>
    </>
  );
}
