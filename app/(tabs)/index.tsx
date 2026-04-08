import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
};

function StatCard({ title, value, icon, color, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl p-4 flex-1 min-w-[45%] m-1 shadow-sm"
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="text-2xl font-bold text-foreground">{value}</Text>
      <Text className="text-sm text-muted mt-1">{title}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const dashboard = trpc.dashboard.getSummary.useQuery(undefined, {
    retry: false,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dashboard.refetch();
    setRefreshing(false);
  }, [dashboard]);

  const data = dashboard.data as any;

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="p-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
      }
    >
      <Text className="text-2xl font-bold text-foreground mb-4">Dashboard</Text>

      {dashboard.error ? (
        <View className="bg-white rounded-xl p-6 items-center">
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Unable to connect</Text>
          <Text className="text-muted text-sm mt-1 text-center">
            Could not reach the Prizm CRM server. Check your API configuration.
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            className="mt-4 bg-primary px-6 py-2 rounded-lg"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row flex-wrap">
          <StatCard
            title="Active Projects"
            value={data?.activeProjects ?? "—"}
            icon="folder-outline"
            color="#0284C7"
            onPress={() => router.push("/(tabs)/projects")}
          />
          <StatCard
            title="Open Tasks"
            value={data?.openTasks ?? "—"}
            icon="checkbox-outline"
            color="#F59E0B"
            onPress={() => router.push("/(tabs)/tasks")}
          />
          <StatCard
            title="Total Leads"
            value={data?.totalLeads ?? "—"}
            icon="people-outline"
            color="#16A34A"
            onPress={() => router.push("/leads")}
          />
          <StatCard
            title="Pending Invoices"
            value={data?.pendingInvoices ?? "—"}
            icon="document-text-outline"
            color="#EF4444"
            onPress={() => router.push("/invoices")}
          />
        </View>
      )}
    </ScrollView>
  );
}
