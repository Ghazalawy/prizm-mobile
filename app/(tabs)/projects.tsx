import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";

export default function ProjectsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const projects = trpc.projects.list.useQuery({}, { retry: false });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await projects.refetch();
    setRefreshing(false);
  }, [projects]);

  const items = (projects.data as any[]) ?? [];

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
            <Ionicons name="folder-outline" size={48} color="#CBD5E1" />
            <Text className="text-muted mt-3 font-medium">
              {projects.isLoading ? "Loading..." : "No projects found"}
            </Text>
          </View>
        }
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            onPress={() => router.push(`/projects/${item.id}`)}
            className="bg-white rounded-xl p-4 mb-3 shadow-sm"
            activeOpacity={0.7}
          >
            <Text className="text-foreground font-semibold" numberOfLines={1}>
              {item.name || item.title}
            </Text>
            {item.client_name && (
              <Text className="text-muted text-sm mt-1">{item.client_name}</Text>
            )}
            <View className="flex-row items-center mt-2">
              <View
                className={`px-2 py-1 rounded-full ${
                  item.status === "active" ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    item.status === "active" ? "text-green-700" : "text-gray-600"
                  }`}
                >
                  {item.status}
                </Text>
              </View>
              {item.progress != null && (
                <Text className="text-muted text-xs ml-3">{item.progress}% complete</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
