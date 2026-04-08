import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";

export default function ProjectsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const projects = useApi(api.getProjects);
  const items = Array.isArray(projects.data) ? projects.data : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await projects.refetch();
    setRefreshing(false);
  }, [projects]);

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
              {item.name}
            </Text>
            {item.client_data?.company && (
              <Text className="text-muted text-sm mt-1">{item.client_data.company}</Text>
            )}
            <View className="flex-row items-center mt-2">
              {item.status_name && (
                <View className={`px-2 py-1 rounded-full ${
                  item.status === 2 ? "bg-green-100" : "bg-gray-100"
                }`}>
                  <Text className={`text-xs font-medium ${
                    item.status === 2 ? "text-green-700" : "text-gray-600"
                  }`}>{item.status_name}</Text>
                </View>
              )}
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
