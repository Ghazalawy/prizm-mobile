import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";

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
  const leads = useApi(api.getLeads);
  const projects = useApi(api.getProjects);
  const tasks = useApi(api.getTasks);
  const invoices = useApi(api.getInvoices);

  const hasError = leads.isError && projects.isError;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([leads.refetch(), projects.refetch(), tasks.refetch(), invoices.refetch()]);
    setRefreshing(false);
  }, [leads, projects, tasks, invoices]);

  const count = (d: any) => (Array.isArray(d) ? d.length : 0);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="p-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
      }
    >
      <Text className="text-2xl font-bold text-foreground mb-4">Dashboard</Text>

      {hasError ? (
        <View className="bg-white rounded-xl p-6 items-center">
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Unable to connect</Text>
          <Text className="text-muted text-sm mt-1 text-center">
            Could not reach the Prizm CRM server. Check your API configuration.
          </Text>
          <TouchableOpacity onPress={onRefresh} className="mt-4 bg-primary px-6 py-2 rounded-lg">
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row flex-wrap">
          <StatCard
            title="Active Projects"
            value={count(projects.data)}
            icon="folder-outline"
            color="#0284C7"
            onPress={() => router.push("/(tabs)/projects")}
          />
          <StatCard
            title="Open Tasks"
            value={count(tasks.data)}
            icon="checkbox-outline"
            color="#F59E0B"
            onPress={() => router.push("/(tabs)/tasks")}
          />
          <StatCard
            title="Total Leads"
            value={count(leads.data)}
            icon="people-outline"
            color="#16A34A"
            onPress={() => router.push("/leads")}
          />
          <StatCard
            title="Invoices"
            value={count(invoices.data)}
            icon="document-text-outline"
            color="#EF4444"
            onPress={() => router.push("/invoices")}
          />
        </View>
      )}
    </ScrollView>
  );
}
