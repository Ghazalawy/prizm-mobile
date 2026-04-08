import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";

export default function TasksScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const tasks = trpc.tasks.list.useQuery({}, { retry: false });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await tasks.refetch();
    setRefreshing(false);
  }, [tasks]);

  const items = (tasks.data as any[]) ?? [];

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
                  {item.title || item.name}
                </Text>
                {item.project_name && (
                  <Text className="text-muted text-sm mt-1">{item.project_name}</Text>
                )}
              </View>
              <View
                className={`px-2 py-1 rounded-full ${
                  item.status === "completed"
                    ? "bg-green-100"
                    : item.status === "overdue"
                    ? "bg-red-100"
                    : "bg-yellow-100"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    item.status === "completed"
                      ? "text-green-700"
                      : item.status === "overdue"
                      ? "text-red-700"
                      : "text-yellow-700"
                  }`}
                >
                  {item.status}
                </Text>
              </View>
            </View>
            {item.due_date && (
              <Text className="text-muted text-xs mt-2">
                Due: {new Date(item.due_date).toLocaleDateString()}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
