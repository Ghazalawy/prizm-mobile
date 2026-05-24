import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useProjectsCount,
  useTasksCount,
  useLeadsCount,
  useInvoicesCount,
  useCustomersCount,
  useMyTasksSummary,
  type MyTasksSummary,
} from "@/lib/queries/dashboard";
import {
  DEFAULT_LAYOUT,
  getLayout,
  visibleCards,
  type DashboardCardKey,
  type DashboardLayout,
} from "@/lib/dashboard-layout";

type StatCardProps = {
  title: string;
  value: number | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isLoading: boolean;
  isError: boolean;
  onPress: () => void;
  /** Optional micro-text shown below the number — used by the My Tasks tile
   *  for "X new · Y overdue · Z stale". */
  footnote?: string;
};

function StatCard({ title, value, icon, color, isLoading, isError, onPress, footnote }: StatCardProps) {
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
      {footnote ? (
        <Text className="text-[10px] text-muted mt-1" numberOfLines={1}>
          {footnote}
        </Text>
      ) : (
        <Text className="text-xs text-muted mt-1 uppercase tracking-wide">{title}</Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Build the micro-footnote for the My Tasks tile. Compact — only the
 * non-zero buckets show. "X new · Y overdue · Z stale" — at most 3
 * segments, fits one line under the big number.
 */
function buildTasksFootnote(s: MyTasksSummary | undefined): string {
  if (!s) return "MY TASKS";
  const parts: string[] = [];
  if (s.not_started > 0) parts.push(`${s.not_started} new`);
  if (s.overdue > 0)     parts.push(`${s.overdue} overdue`);
  if (s.stale > 0)       parts.push(`${s.stale} stale`);
  if (parts.length === 0) return "MY TASKS · ALL CLEAR";
  return parts.join(" · ").toUpperCase();
}

/**
 * Dashboard. Layout (which cards, in what order) is user-customisable —
 * the SecureStore-backed list comes from lib/dashboard-layout.ts. Tap
 * "Customize" in the header to reorder / show / hide.
 */
export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [layout, setLocalLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const projects = useProjectsCount();
  const tasksSummary = useMyTasksSummary();
  const leads = useLeadsCount();
  const invoices = useInvoicesCount();
  const customers = useCustomersCount();

  // Pick up the layout on mount + every time the screen regains focus so
  // edits made in the Customize sub-screen take effect immediately.
  useEffect(() => {
    let mounted = true;
    getLayout().then((next) => {
      if (mounted) setLocalLayout(next);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const reloadLayout = useCallback(() => {
    getLayout().then(setLocalLayout);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      projects.refetch(),
      tasksSummary.refetch(),
      leads.refetch(),
      invoices.refetch(),
      customers.refetch(),
    ]);
    reloadLayout();
    setRefreshing(false);
  }, [projects, tasksSummary, leads, invoices, customers, reloadLayout]);

  // Map a card key to a fully-configured StatCard element.
  const renderCard = (key: DashboardCardKey) => {
    switch (key) {
      case "tasks_summary":
        return (
          <StatCard
            key="tasks_summary"
            title="My Tasks"
            value={tasksSummary.data?.total_open}
            icon="checkbox-outline"
            color="#F59E0B"
            isLoading={tasksSummary.isLoading}
            isError={tasksSummary.isError}
            onPress={() => router.push("/(tabs)/tasks" as any)}
            footnote={buildTasksFootnote(tasksSummary.data)}
          />
        );
      case "projects":
        return (
          <StatCard
            key="projects"
            title="Active Projects"
            value={projects.data as number | undefined}
            icon="folder-outline"
            color="#0284C7"
            isLoading={projects.isLoading}
            isError={projects.isError}
            onPress={() => router.push("/(tabs)/erp/projects" as any)}
          />
        );
      case "customers":
        return (
          <StatCard
            key="customers"
            title="Customers"
            value={customers.data as number | undefined}
            icon="business-outline"
            color="#8B5CF6"
            isLoading={customers.isLoading}
            isError={customers.isError}
            onPress={() => router.push("/(tabs)/customers" as any)}
          />
        );
      case "leads":
        return (
          <StatCard
            key="leads"
            title="Total Leads"
            value={leads.data as number | undefined}
            icon="people-outline"
            color="#16A34A"
            isLoading={leads.isLoading}
            isError={leads.isError}
            onPress={() => router.push("/(tabs)/erp/leads" as any)}
          />
        );
      case "invoices":
        return (
          <StatCard
            key="invoices"
            title="Invoices"
            value={invoices.data as number | undefined}
            icon="document-text-outline"
            color="#EF4444"
            isLoading={invoices.isLoading}
            isError={invoices.isError}
            onPress={() => router.push("/(tabs)/erp/invoices" as any)}
          />
        );
      default:
        return null;
    }
  };

  const cards = visibleCards(layout);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="p-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
      }
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-2xl font-bold text-foreground">Dashboard</Text>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/dashboard-customize" as any)}
          activeOpacity={0.6}
          hitSlop={8}
          className="flex-row items-center px-2 py-1 rounded-lg"
        >
          <Ionicons name="options-outline" size={16} color="#0284C7" />
          <Text className="text-xs font-medium text-primary ml-1">Customize</Text>
        </TouchableOpacity>
      </View>
      <Text className="text-sm text-muted mb-4">Tap any tile to drill in</Text>

      <View className="flex-row flex-wrap -mx-1.5">{cards.map(renderCard)}</View>

      {cards.length === 0 ? (
        <View className="mt-8 px-4 items-center">
          <Ionicons name="grid-outline" size={48} color="#CBD5E1" />
          <Text className="text-sm text-muted mt-2 text-center">
            You've hidden every dashboard card.{"\n"}Tap Customize to bring some back.
          </Text>
        </View>
      ) : (
        <View className="mt-6 px-2">
          <Text className="text-xs text-muted leading-relaxed">
            Pull down to refresh counts. Tap a tile to see the list and drill into any record.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
