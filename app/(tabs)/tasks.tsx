import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";

export default function TasksScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const tasks = useApi(api.getTasks);
  const items = Array.isArray(tasks.data) ? tasks.data : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await tasks.refetch();
    setRefreshing(false);
  }, [tasks]);

  return (
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
            <Ionicons name="checkbox-outline" size={48} color="#CBD5E1" />
            <Text className="text-muted mt-3 font-medium">
              {tasks.isLoading ? "Loading..." : "No tasks found"}
            </Text>
          </View>
        }
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            onPress={() => router.push(`/tasks/${item.id}`)}
            className="bg-white rounded-xl p-4 mb-3 shadow-sm"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-foreground font-semibold" numberOfLines={1}>
                  {item.name || item.title}
                </Text>
                {item.project_name && (
                  <Text className="text-muted text-sm mt-1">{item.project_name}</Text>
                )}
              </View>
              {item.status_name && (
                <View className="px-2 py-1 rounded-full bg-gray-100">
                  <Text className="text-xs font-medium text-gray-600">{item.status_name}</Text>
                </View>
              )}
            </View>
            {item.duedate && (
              <Text className="text-muted text-xs mt-2">
                Due: {new Date(item.duedate).toLocaleDateString()}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
