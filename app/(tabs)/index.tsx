import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useState, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useProjectsCount,
  useTasksCount,
  useLeadsCount,
  useInvoicesCount,
  useCustomersCount,
} from "@/lib/queries/dashboard";
import { useCurrentUser } from "@/lib/auth-context";
import { useMyProfile } from "@/lib/queries/my";

type StatCardProps = {
  title: string;
  value: number | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isLoading: boolean;
  isError: boolean;
  onPress: () => void;
};

function StatCard({ title, value, icon, color, isLoading, isError, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      className="bg-white rounded-2xl p-5 flex-1 min-w-[45%] m-1.5 shadow-sm"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Ionicons
          name={isError ? "warning-outline" : "chevron-forward"}
          size={16}
          color={isError ? "#EF4444" : "#94A3B8"}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text className="text-3xl font-bold text-foreground">
          {isError ? "—" : (value ?? 0).toLocaleString()}
        </Text>
      )}
      <Text className="text-xs text-muted mt-1 uppercase tracking-wide">{title}</Text>
    </TouchableOpacity>
  );
}

/**
 * Welcome card pinned to the top of the dashboard. Mirrors the web admin
 * landing strip — avatar, time-of-day greeting, role/department. Reads
 * the persisted profile from SecureStore (via useCurrentUser) for instant
 * render, then progressively enriches with role + department from
 * /api/my/profile when that hook resolves.
 */
function WelcomeCard() {
  const user = useCurrentUser();
  const profile = useMyProfile();

  const firstname = user?.firstname || profile.data?.firstname || "";
  const lastname = user?.lastname || profile.data?.lastname || "";
  const profileImage = user?.profile_image || profile.data?.profile_image || null;
  const role = profile.data?.role_name || null;
  const dept = profile.data?.departments?.[0]?.name || null;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const initial = (firstname[0] || user?.email?.[0] || "?").toUpperCase();
  const subline = [role, dept].filter(Boolean).join(" · ");

  return (
    <TouchableOpacity
      onPress={() => router.push("/(tabs)/settings" as any)}
      activeOpacity={0.85}
      className="bg-white rounded-2xl px-4 py-3 mb-4 flex-row items-center shadow-sm"
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "#E2E8F0",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginRight: 12,
        }}
      >
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={{ width: 48, height: 48 }} />
        ) : (
          <Text style={{ color: "#0F172A", fontWeight: "700", fontSize: 18 }}>
            {initial}
          </Text>
        )}
      </View>
      <View className="flex-1">
        <Text className="text-xs text-muted">{greeting},</Text>
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {firstname ? `${firstname} ${lastname}`.trim() : user?.email || "—"}
        </Text>
        {subline ? (
          <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
            {subline}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const projects = useProjectsCount();
  const tasks = useTasksCount();
  const leads = useLeadsCount();
  const invoices = useInvoicesCount();
  const customers = useCustomersCount();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      projects.refetch(),
      tasks.refetch(),
      leads.refetch(),
      invoices.refetch(),
      customers.refetch(),
    ]);
    setRefreshing(false);
  }, [projects, tasks, leads, invoices, customers]);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="p-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
      }
    >
      <WelcomeCard />

      <Text className="text-2xl font-bold text-foreground mb-1">Dashboard</Text>
      <Text className="text-sm text-muted mb-4">Tap any tile to drill in</Text>

      <View className="flex-row flex-wrap -mx-1.5">
        <StatCard
          title="Active Projects"
          value={projects.data as number | undefined}
          icon="folder-outline"
          color="#0284C7"
          isLoading={projects.isLoading}
          isError={projects.isError}
          onPress={() => router.push("/(tabs)/erp/projects" as any)}
        />
        <StatCard
          title="Open Tasks"
          value={tasks.data as number | undefined}
          icon="checkbox-outline"
          color="#F59E0B"
          isLoading={tasks.isLoading}
          isError={tasks.isError}
          onPress={() => router.push("/(tabs)/erp/tasks" as any)}
        />
        <StatCard
          title="Customers"
          value={customers.data as number | undefined}
          icon="business-outline"
          color="#8B5CF6"
          isLoading={customers.isLoading}
          isError={customers.isError}
          onPress={() => router.push("/(tabs)/customers" as any)}
        />
        <StatCard
          title="Total Leads"
          value={leads.data as number | undefined}
          icon="people-outline"
          color="#16A34A"
          isLoading={leads.isLoading}
          isError={leads.isError}
          onPress={() => router.push("/(tabs)/erp/leads" as any)}
        />
        <StatCard
          title="Invoices"
          value={invoices.data as number | undefined}
          icon="document-text-outline"
          color="#EF4444"
          isLoading={invoices.isLoading}
          isError={invoices.isError}
          onPress={() => router.push("/(tabs)/erp/invoices" as any)}
        />
      </View>

      <View className="mt-6 px-2">
        <Text className="text-xs text-muted leading-relaxed">
          Pull down to refresh counts. Tap a tile to see the list and drill into any record.
        </Text>
      </View>
    </ScrollView>
  );
}
