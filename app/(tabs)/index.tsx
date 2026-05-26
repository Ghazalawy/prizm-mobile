import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useProjectsCount,
  useMyTasksSummary,
  useLeadsCount,
  useInvoicesCount,
  useCustomersCount,
  usePendingApprovals,
  useCheckinStatus,
  useExpensesSummary,
  type MyTasksSummary,
  type PendingApprovalsData,
} from "@/lib/queries/dashboard";
import {
  DEFAULT_LAYOUT,
  getLayout,
  setLayout,
  visibleCards,
  type DashboardCardKey,
  type DashboardLayout,
} from "@/lib/dashboard-layout";
import { getWidget, type WidgetDef } from "@/lib/widget-registry";
import { StatWidget } from "@/components/widgets/StatWidget";
import { ChartWidget, type ChartSegment } from "@/components/widgets/ChartWidget";
import { ListWidget, type ListWidgetItem } from "@/components/widgets/ListWidget";
import { ActionWidget } from "@/components/widgets/ActionWidget";
import { useDashboardProfile, useSaveDashboardProfile } from "@/lib/queries/dashboard-profile";
import { clearDismissedUpdate } from "@/lib/updates";
import { DraggableDashboardGrid } from "@/components/DraggableDashboardGrid";
// CheckinCard removed from dashboard — available via Settings only
import { useInbox } from "@/lib/queries/inbox";
import { useTasksDueToday, type TaskListItem } from "@/lib/queries/tasks";
import { useMyActivity, type ActivityRow } from "@/lib/queries/activity";
import { useCurrentUser } from "@/lib/auth-context";
import { colors, shadows, radius } from "@/lib/theme";

// ─── Priority / Status maps ─────────────────────────────────────────────

const PRIORITY: Record<string, { label: string; color: string; bg: string }> = {
  "1": { label: "Low", color: "#475569", bg: "#F1F5F9" },
  "2": { label: "Med", color: "#0369A1", bg: "#E0F2FE" },
  "3": { label: "High", color: "#B45309", bg: "#FEF3C7" },
  "4": { label: "Urg", color: "#B91C1C", bg: "#FEE2E2" },
};

const TASK_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "1": { label: "Not Started", color: "#475569", bg: "#F1F5F9" },
  "2": { label: "Feedback", color: "#7C3AED", bg: "#EDE9FE" },
  "3": { label: "Testing", color: "#0369A1", bg: "#E0F2FE" },
  "4": { label: "In Progress", color: "#B45309", bg: "#FEF3C7" },
  "5": { label: "Complete", color: "#15803D", bg: "#DCFCE7" },
};

// ─── Stat Card ──────────────────────────────────────────────────────────

type StatCardProps = {
  title: string;
  value: number | undefined;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isLoading: boolean;
  isError: boolean;
  onPress: () => void;
  footnote?: string;
};

function StatCard({
  title,
  value,
  icon,
  color,
  isLoading,
  isError,
  onPress,
  footnote,
  isDragging,
}: StatCardProps & { isDragging?: boolean }) {
  return (
    <TouchableOpacity
      onPress={isDragging ? undefined : onPress}
      activeOpacity={isDragging ? 1 : 0.6}
      className="bg-white rounded-2xl p-5 flex-1 shadow-sm"
      style={isDragging ? { opacity: 0.95 } : undefined}
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

function buildTasksFootnote(s: MyTasksSummary | undefined): string {
  if (!s) return "MY TASKS";
  const parts: string[] = [];
  if (s.not_started > 0) parts.push(`${s.not_started} new`);
  if (s.overdue > 0) parts.push(`${s.overdue} overdue`);
  if (s.stale > 0) parts.push(`${s.stale} stale`);
  if (parts.length === 0) return "MY TASKS · ALL CLEAR";
  return parts.join(" · ").toUpperCase();
}

// ─── Summary Card (horizontal row) ──────────────────────────────────────

function SummaryCard({
  icon,
  label,
  count,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-2xl px-4 py-3 mr-3 shadow-sm"
      style={{ minWidth: 130 }}
    >
      <View className="flex-row items-center mb-2">
        <View
          className="w-8 h-8 rounded-lg items-center justify-center"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Ionicons name={icon} size={16} color={color} />
        </View>
      </View>
      <Text className="text-2xl font-bold text-foreground">{count}</Text>
      <Text className="text-xs text-muted mt-0.5">{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Quick Action Button ─────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-1 bg-white rounded-2xl p-3 items-center shadow-sm"
    >
      <View
        className="w-11 h-11 rounded-xl items-center justify-center mb-2"
        style={{ backgroundColor: `${color}1A` }}
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text className="text-xs font-medium text-foreground text-center" numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Activity Item ───────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return dateStr;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const ActivityItem = memo(function ActivityItem({ row }: { row: ActivityRow }) {
  return (
    <View className="flex-row items-start py-2.5 border-b border-slate-100">
      <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center mr-3">
        <Ionicons name="pulse-outline" size={14} color="#64748B" />
      </View>
      <View className="flex-1">
        <Text className="text-sm text-foreground leading-snug" numberOfLines={2}>
          {row.description}
        </Text>
        <Text className="text-xs text-muted mt-0.5">{relativeTime(row.date)}</Text>
      </View>
    </View>
  );
});

// ─── Due/Overdue Task Row ────────────────────────────────────────────────

function dueCountdown(duedate: string): { label: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(duedate.slice(0, 10) + "T00:00:00");
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "#DC2626" };
  if (diffDays === 0) return { label: "Today", color: "#B45309" };
  if (diffDays === 1) return { label: "Tomorrow", color: "#0369A1" };
  return { label: `${diffDays}d`, color: "#64748B" };
}

const DueTaskRow = memo(function DueTaskRow({ task }: { task: TaskListItem }) {
  const priority = PRIORITY[String(task.priority || "2")] || PRIORITY["2"];
  const status = TASK_STATUS[String(task.status || "1")] || TASK_STATUS["1"];
  const due = task.duedate ? dueCountdown(task.duedate) : null;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/tasks/${task.id}` as any)}
      activeOpacity={0.7}
      className="flex-row items-center py-2.5 border-b border-slate-100"
    >
      <View
        className="w-1 rounded-full mr-3"
        style={{ backgroundColor: priority.color, height: 32 }}
      />
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
          {task.name}
        </Text>
        <View className="flex-row items-center mt-1">
          <View
            className="px-1.5 py-0.5 rounded"
            style={{ backgroundColor: status.bg }}
          >
            <Text style={{ color: status.color, fontSize: 10, fontWeight: "600" }}>
              {status.label}
            </Text>
          </View>
          {due ? (
            <Text
              className="text-xs font-medium ml-2"
              style={{ color: due.color }}
            >
              {due.label}
            </Text>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
    </TouchableOpacity>
  );
});

// ─── Section header ──────────────────────────────────────────────────────

function SectionHeader({
  title,
  icon,
  actionLabel,
  onAction,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between mb-3 mt-6">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text className="text-base font-bold text-foreground ml-2">{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.6}>
          <Text className="text-xs font-medium" style={{ color: colors.primary }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Dashboard Screen ────────────────────────────────────────────────────

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [layout, setLocalLayoutState] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const profileQuery = useDashboardProfile();
  const saveProfile = useSaveDashboardProfile();
  const projects = useProjectsCount();
  const tasksSummary = useMyTasksSummary();
  const leads = useLeadsCount();
  const invoices = useInvoicesCount();
  const customers = useCustomersCount();
  const inbox = useInbox();
  const dueTasks = useTasksDueToday();
  const user = useCurrentUser();
  const activity = useMyActivity(user?.staffid, 10);
  const pendingApprovals = usePendingApprovals(true);
  const checkinStatus = useCheckinStatus();
  const expensesSummary = useExpensesSummary();

  // API profile is the source of truth. Local storage is only a fallback
  // for offline mode or while the API request is in flight.
  useEffect(() => {
    if (profileQuery.data) {
      setLocalLayoutState(profileQuery.data);
    }
  }, [profileQuery.data]);

  // Seed from local cache while API loads (offline fallback)
  useEffect(() => {
    if (!profileQuery.data) {
      let mounted = true;
      getLayout().then((local) => {
        if (mounted && !profileQuery.data) setLocalLayoutState(local);
      });
      return () => { mounted = false; };
    }
  }, [profileQuery.data]);

  const reloadLayout = useCallback(() => {
    getLayout().then(setLocalLayoutState);
    profileQuery.refetch();
  }, [profileQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await clearDismissedUpdate().catch(() => undefined);
    await Promise.all([
      projects.refetch(),
      tasksSummary.refetch(),
      leads.refetch(),
      invoices.refetch(),
      customers.refetch(),
      inbox.refetch(),
      dueTasks.refetch(),
      activity.refetch(),
      pendingApprovals.refetch(),
      checkinStatus.refetch(),
      expensesSummary.refetch(),
    ]);
    reloadLayout();
    setRefreshing(false);
  }, [projects, tasksSummary, leads, invoices, customers, inbox, dueTasks, activity, pendingApprovals, checkinStatus, expensesSummary, reloadLayout]);

  const widgetDataMap: Record<string, { value?: number; isLoading: boolean; isError: boolean; footnote?: string }> = useMemo(() => ({
    tasks_summary: { value: tasksSummary.data?.total_open, isLoading: tasksSummary.isLoading, isError: tasksSummary.isError, footnote: buildTasksFootnote(tasksSummary.data) },
    projects:      { value: projects.data as number | undefined, isLoading: projects.isLoading, isError: projects.isError },
    customers:     { value: customers.data as number | undefined, isLoading: customers.isLoading, isError: customers.isError },
    leads:         { value: leads.data as number | undefined, isLoading: leads.isLoading, isError: leads.isError },
    invoices:      { value: invoices.data as number | undefined, isLoading: invoices.isLoading, isError: invoices.isError },
    approvals_pending: { value: inbox.data?.summary?.approvals ?? 0, isLoading: inbox.isLoading, isError: inbox.isError },
    // Batch 1 — Tasks granular
    tasks_open:          { value: tasksSummary.data?.total_open, isLoading: tasksSummary.isLoading, isError: tasksSummary.isError },
    tasks_overdue:       { value: tasksSummary.data?.overdue, isLoading: tasksSummary.isLoading, isError: tasksSummary.isError },
    tasks_stale:         { value: tasksSummary.data?.stale, isLoading: tasksSummary.isLoading, isError: tasksSummary.isError },
    tasks_completed_30d: { value: tasksSummary.data?.completed_last_30d, isLoading: tasksSummary.isLoading, isError: tasksSummary.isError },
    // Batch 1 — Approvals granular
    approvals_my_pending: { value: pendingApprovals.data?.total, isLoading: pendingApprovals.isLoading, isError: pendingApprovals.isError },
    // Batch 1 — Timesheets
    timesheet_hours_week: { value: undefined, isLoading: false, isError: false, footnote: "HOURS THIS WEEK" },
    timesheet_pending:    { value: undefined, isLoading: false, isError: false, footnote: "PENDING TIMESHEETS" },
    // Batch 2 — Leave & Payslip (use data from existing leave hooks or show placeholder)
    leave_balance:        { value: undefined, isLoading: false, isError: false },
    leave_pending:        { value: undefined, isLoading: false, isError: false },
    payslip_latest:       { value: undefined, isLoading: false, isError: false },
    // Batch 2 — Expenses
    expenses_total_month: { value: expensesSummary.data ? Math.round(expensesSummary.data.total_amount) : undefined, isLoading: expensesSummary.isLoading, isError: expensesSummary.isError },
    expenses_pending:     { value: expensesSummary.data?.pending_count, isLoading: expensesSummary.isLoading, isError: expensesSummary.isError },
  }), [tasksSummary, projects, customers, leads, invoices, inbox, pendingApprovals, expensesSummary]);

  // Chart data derivation for chart-type widgets
  const EXPENSE_CHART_COLORS = ["#EA580C", "#F59E0B", "#0369A1", "#7C3AED", "#15803D", "#DC2626"];
  const chartDataMap: Record<string, ChartSegment[]> = useMemo(() => {
    const ts = tasksSummary.data;
    const ap = pendingApprovals.data;
    const exp = expensesSummary.data;
    return {
      tasks_status_chart: ts ? [
        { label: "Not Started", value: ts.not_started, color: "#475569" },
        { label: "In Progress", value: ts.in_progress, color: "#B45309" },
        { label: "Feedback", value: ts.awaiting_feedback, color: "#7C3AED" },
        { label: "Testing", value: ts.testing, color: "#0369A1" },
      ] : [],
      approvals_by_type: ap ? [
        { label: "Purchase Requests", value: ap.by_type.purchase_request, color: "#7C3AED" },
        { label: "Leave", value: ap.by_type.leave, color: "#F59E0B" },
        { label: "Timesheets", value: ap.by_type.timesheet, color: "#0369A1" },
      ] : [],
      expenses_by_category: exp ? exp.by_category.map((c, i) => ({
        label: c.name,
        value: c.count,
        color: EXPENSE_CHART_COLORS[i % EXPENSE_CHART_COLORS.length],
      })) : [],
    };
  }, [tasksSummary.data, pendingApprovals.data, expensesSummary.data]);

  // List data derivation for list-type widgets
  const listDataMap: Record<string, ListWidgetItem[]> = useMemo(() => {
    const dueItems: ListWidgetItem[] = (dueTasks.data || []).slice(0, 5).map((t) => ({
      id: t.id,
      title: t.name,
      subtitle: t.duedate ? dueCountdown(t.duedate).label : undefined,
      badge: t.priority ? { label: PRIORITY[String(t.priority)]?.label || "", color: PRIORITY[String(t.priority)]?.color || "#475569", bg: PRIORITY[String(t.priority)]?.bg || "#F1F5F9" } : undefined,
    }));
    const approvalItems: ListWidgetItem[] = (pendingApprovals.data?.items || []).slice(0, 5).map((a) => ({
      id: a.id,
      title: a.subject || `${a.type} #${a.id}`,
      subtitle: a.date,
      badge: { label: a.type.replace("_", " "), color: "#7C3AED", bg: "#EDE9FE" },
    }));
    return {
      tasks_due_today: dueItems,
      approvals_recent: approvalItems,
      leave_upcoming: [], // Populated when leave query is integrated
    };
  }, [dueTasks.data, pendingApprovals.data]);

  const renderCard = useCallback((key: DashboardCardKey, isDragging: boolean) => {
    const widget = getWidget(key);
    if (!widget) return null;

    // Route by component type
    switch (widget.componentType) {
      case "chart": {
        const segments = chartDataMap[key] || [];
        const isLoading = key.startsWith("tasks_") ? tasksSummary.isLoading
          : key.startsWith("expenses_") ? expensesSummary.isLoading
          : pendingApprovals.isLoading;
        const isError = key.startsWith("tasks_") ? tasksSummary.isError
          : key.startsWith("expenses_") ? expensesSummary.isError
          : pendingApprovals.isError;
        return (
          <ChartWidget
            widget={widget}
            segments={segments}
            isLoading={isLoading}
            isError={isError}
            isDragging={isDragging}
          />
        );
      }
      case "list": {
        const items = listDataMap[key] || [];
        const isLoading = key === "tasks_due_today" ? dueTasks.isLoading : pendingApprovals.isLoading;
        const isError = key === "tasks_due_today" ? dueTasks.isError : pendingApprovals.isError;
        return (
          <ListWidget
            widget={widget}
            items={items}
            isLoading={isLoading}
            isError={isError}
            isDragging={isDragging}
          />
        );
      }
      case "action": {
        if (key === "attendance_status") {
          const cs = checkinStatus.data;
          return (
            <ActionWidget
              widget={widget}
              statusLabel={cs?.is_checked_in ? "Clocked In" : "Not Clocked In"}
              statusColor={cs?.is_checked_in ? "#15803D" : "#94A3B8"}
              detail={cs?.checked_in_at ? `Since ${cs.checked_in_at.slice(11, 16)}` : undefined}
              isLoading={checkinStatus.isLoading}
              isError={checkinStatus.isError}
              isDragging={isDragging}
            />
          );
        }
        return null;
      }
      default: {
        // stat type — default
        const data = widgetDataMap[key] ?? { value: undefined, isLoading: false, isError: false };
        return (
          <StatWidget
            widget={widget}
            value={data.value}
            isLoading={data.isLoading}
            isError={data.isError}
            footnote={data.footnote}
            isDragging={isDragging}
          />
        );
      }
    }
  }, [widgetDataMap, chartDataMap, listDataMap, tasksSummary, pendingApprovals, dueTasks, checkinStatus, expensesSummary]);

  const cardKeys = visibleCards(layout);

  const handleReorder = useCallback(
    (nextVisible: DashboardCardKey[]) => {
      const hiddenSet = new Set(layout.hidden);
      const result: DashboardCardKey[] = [];
      let vIdx = 0;
      for (const k of layout.order) {
        if (hiddenSet.has(k)) {
          result.push(k);
        } else {
          result.push(nextVisible[vIdx]);
          vIdx++;
        }
      }
      for (const k of nextVisible) {
        if (!result.includes(k)) result.push(k);
      }
      const next: DashboardLayout = { ...layout, order: result };
      setLocalLayoutState(next);
      saveProfile.mutate(next);
    },
    [layout, saveProfile],
  );

  const summaryCards = useMemo(() => {
    const ts = tasksSummary.data;
    const inboxData = inbox.data;
    return [
      {
        icon: "checkbox-outline" as const,
        label: "My Open Tasks",
        count: ts?.total_open ?? 0,
        color: colors.primary,
        route: "/(tabs)/tasks",
      },
      {
        icon: "folder-outline" as const,
        label: "My Projects",
        count: (projects.data as number) ?? 0,
        color: "#0284C7",
        route: "/(tabs)/projects",
      },
      {
        icon: "mail-outline" as const,
        label: "Pending Approvals",
        count: inboxData?.summary?.approvals ?? 0,
        color: "#7C3AED",
        route: "/(tabs)/erp/index",
      },
      {
        icon: "document-text-outline" as const,
        label: "Today's Reports",
        count: 0,
        color: "#16A34A",
        route: "/(tabs)/reports",
      },
    ];
  }, [tasksSummary.data, inbox.data, projects.data]);

  const dueTasksList = useMemo(() => {
    return (dueTasks.data || []).slice(0, 5);
  }, [dueTasks.data]);

  const activityItems = useMemo(() => {
    return (activity.data || []).slice(0, 10);
  }, [activity.data]);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="pb-8"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View className="px-4 pt-4 pb-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-2xl font-bold text-foreground">Dashboard</Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/dashboard-customize" as any)}
            activeOpacity={0.6}
            hitSlop={8}
            className="flex-row items-center px-2 py-1 rounded-lg"
          >
            <Ionicons name="options-outline" size={16} color={colors.primary} />
            <Text className="text-xs font-medium ml-1" style={{ color: colors.primary }}>
              Show / Hide
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* A. Summary Cards Row */}
      <View className="px-4">
        <SectionHeader title="At a Glance" icon="analytics-outline" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            count={card.count}
            color={card.color}
            onPress={() => router.push(card.route as any)}
          />
        ))}
      </ScrollView>

      {/* B. Quick Actions Grid */}
      <View className="px-4">
        <SectionHeader title="Quick Actions" icon="flash-outline" />
        <View className="flex-row gap-3 mb-3">
          <QuickAction
            icon="camera-outline"
            label="Quick Expense"
            color="#EA580C"
            onPress={() => router.push("/(tabs)/quick-expense" as any)}
          />
          <QuickAction
            icon="time-outline"
            label="Timesheets"
            color="#0369A1"
            onPress={() => router.push("/(tabs)/timesheets" as any)}
          />
          <QuickAction
            icon="checkbox-outline"
            label="New Task"
            color="#F59E0B"
            onPress={() => router.push("/(tabs)/tasks/new" as any)}
          />
        </View>
        <View className="flex-row gap-3">
          <QuickAction
            icon="document-text-outline"
            label="New Report"
            color="#16A34A"
            onPress={() => router.push("/(tabs)/reports/new" as any)}
          />
          <QuickAction
            icon="receipt-outline"
            label="My Expenses"
            color={colors.primary}
            onPress={() => router.push("/(tabs)/expenses-mine" as any)}
          />
          <QuickAction
            icon="calendar-outline"
            label="Leave"
            color="#7C3AED"
            onPress={() => router.push("/(tabs)/leave" as any)}
          />
        </View>
        <View className="flex-row gap-3 mt-3">
          <QuickAction
            icon="calendar-outline"
            label="Calendar"
            color="#0284C7"
            onPress={() => router.push("/(tabs)/calendar" as any)}
          />
          <QuickAction
            icon="book-outline"
            label="Knowledge Base"
            color="#CA8A04"
            onPress={() => router.push("/(tabs)/knowledge" as any)}
          />
          <QuickAction
            icon="search-outline"
            label="Search"
            color="#6366F1"
            onPress={() => router.push("/(tabs)/search" as any)}
          />
        </View>
      </View>

      {/* C. Stat Tiles (draggable) */}
      {cardKeys.length > 0 ? (
        <View className="px-4">
          <SectionHeader
            title="Stats"
            icon="stats-chart-outline"
            actionLabel="Customize"
            onAction={() => router.push("/(tabs)/dashboard-customize" as any)}
          />
          <DraggableDashboardGrid<DashboardCardKey>
            items={cardKeys}
            renderItem={renderCard}
            onReorder={handleReorder}
          />
        </View>
      ) : null}

      {/* D. Tasks Due Today / Overdue */}
      {dueTasksList.length > 0 ? (
        <View className="px-4">
          <SectionHeader
            title="Due Today & Overdue"
            icon="alert-circle-outline"
            actionLabel="View All"
            onAction={() => router.push("/(tabs)/tasks" as any)}
          />
          <View className="bg-white rounded-2xl px-4 py-1 shadow-sm">
            {dueTasksList.map((task) => (
              <DueTaskRow key={task.id} task={task} />
            ))}
          </View>
        </View>
      ) : null}

      {/* E. Recent Activity Feed */}
      {activityItems.length > 0 ? (
        <View className="px-4">
          <SectionHeader
            title="Recent Activity"
            icon="time-outline"
            actionLabel="View All"
            onAction={() => router.push("/(tabs)/activity" as any)}
          />
          <View className="bg-white rounded-2xl px-4 py-1 shadow-sm">
            {activityItems.map((row) => (
              <ActivityItem key={row.id} row={row} />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
