import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type DetailFieldProps = {
  label: string;
  value?: string | number | null;
};

export function DetailField({ label, value }: DetailFieldProps) {
  if (value == null || value === "") return null;
  return (
    <View className="mb-4">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-foreground font-medium mt-1">{String(value)}</Text>
    </View>
  );
}

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = status?.toLowerCase() ?? "";
  const colorClass = s === "active" || s === "completed" || s === "paid"
    ? "bg-green-100 text-green-700"
    : s === "overdue" || s === "cancelled" || s === "rejected"
    ? "bg-red-100 text-red-700"
    : s === "draft" || s === "pending"
    ? "bg-yellow-100 text-yellow-700"
    : "bg-gray-100 text-gray-600";

  return (
    <View className={`px-3 py-1 rounded-full self-start ${colorClass.split(" ")[0]}`}>
      <Text className={`text-xs font-semibold ${colorClass.split(" ")[1]}`}>
        {status}
      </Text>
    </View>
  );
}

type DetailScreenProps = {
  data: any;
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
};

export function DetailScreenLayout({
  data,
  isLoading,
  isError,
  onRefresh,
  children,
}: DetailScreenProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  if (isLoading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  if (isError && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-4">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text className="text-foreground font-semibold mt-3">Failed to load</Text>
        <TouchableOpacity onPress={handleRefresh} className="mt-4 bg-primary px-6 py-2 rounded-lg">
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="p-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0284C7" />
      }
    >
      {children}
    </ScrollView>
  );
}
