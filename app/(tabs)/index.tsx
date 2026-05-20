import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  useProjectsCount,
  useTasksCount,
  useLeadsCount,
  useInvoicesCount,
} from "@/lib/queries/dashboard";

type StatCardProps = {
  title: string;
  value: number | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isLoading: boolean;
  isError: boolean;
};

function StatCard({ title, value, icon, color, isLoading, isError }: StatCardProps) {
  return (
    <View className="bg-white rounded-2xl p-5 flex-1 min-w-[45%] m-1.5 shadow-sm">
      <View className="flex-row items-center justify-between mb-3">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {isError ? (
          <Ionicons name="warning-outline" size={16} color="#EF4444" />
        ) : null}
      </View>
      {isLoading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text className="text-3xl font-bold text-foreground">
          {isError ? "—" : value ?? 0}
        </Text>
      )}
      <Text className="text-xs text-muted mt-1 uppercase tracking-wide">{title}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const projects = useProjectsCount();
  const tasks = useTasksCount();
  const leads = useLeadsCount();
  const invoices = useInvoicesCount();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      projects.refetch(),
      tasks.refetch(),
      leads.refetch(),
      invoices.refetch(),
    ]);
    setRefreshing(false);
  }, [projects, tasks, leads, invoices]);

  const allErrored = projects.isError && tasks.isError && leads.isError && invoices.isError;

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="p-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
      }
    >
      <Text className="text-3xl font-bold text-foreground mb-1">Dashboard</Text>
      <Text className="text-sm text-muted mb-5">At a glance</Text>

      {allErrored ? (
        <View className="bg-white rounded-2xl p-6 items-center mt-4">
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Unable to connect</Text>
          <Text className="text-muted text-sm mt-1 text-center">
            Pull down to retry. If this keeps happening, sign out and back in.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap -mx-1.5">
          <StatCard
            title="Active Projects"
            value={projects.data as number | undefined}
            icon="folder-outline"
            color="#0284C7"
            isLoading={projects.isLoading}
            isError={projects.isError}
          />
          <StatCard
            title="Open Tasks"
            value={tasks.data as number | undefined}
            icon="checkbox-outline"
            color="#F59E0B"
            isLoading={tasks.isLoading}
            isError={tasks.isError}
          />
          <StatCard
            title="Total Leads"
            value={leads.data as number | undefined}
            icon="people-outline"
            color="#16A34A"
            isLoading={leads.isLoading}
            isError={leads.isError}
          />
          <StatCard
            title="Invoices"
            value={invoices.data as number | undefined}
            icon="document-text-outline"
            color="#EF4444"
            isLoading={invoices.isLoading}
            isError={invoices.isError}
          />
        </View>
      )}

      <View className="mt-6 px-2">
        <Text className="text-xs text-muted leading-relaxed">
          More modules coming soon. Tasks and Projects native screens are in active development —
          you&apos;ll see them in the bottom bar as soon as they ship via the in-app updater.
        </Text>
      </View>
    </ScrollView>
  );
}
