import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";

export default function CalendarScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const events = useApi(api.getCalendarEvents);
  const items = Array.isArray(events.data) ? events.data : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await events.refetch();
    setRefreshing(false);
  }, [events]);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Calendar" }} />
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
        }
      >
        <Text className="text-lg font-bold text-foreground mb-4">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </Text>

        {items.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text className="text-muted mt-3 font-medium">
              {events.isLoading ? "Loading..." : "No events"}
            </Text>
          </View>
        ) : (
          items.map((item: any, index: number) => (
            <View
              key={item.id || index}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row"
            >
              <View className="w-1 bg-primary rounded-full mr-3" />
              <View className="flex-1">
                <Text className="text-foreground font-semibold">{item.title}</Text>
                {item.start && (
                  <Text className="text-muted text-sm mt-1">
                    {new Date(item.start).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}
