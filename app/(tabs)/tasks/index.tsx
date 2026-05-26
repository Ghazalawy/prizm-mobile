import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useState, useCallback, useMemo, memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMyTasks, useTasksByStatus, type TaskListItem } from "@/lib/queries/tasks";
import { useMyTasksSummary } from "@/lib/queries/dashboard";
import { colors } from "@/lib/theme";

const ACCENT = colors.primary;

const PRIORITY: Record<string, { label: string; color: string; bg: string }> = {
  "1": { label: "Low", color: "#475569", bg: "#F1F5F9" },
  "2": { label: "Medium", color: "#0369A1", bg: "#E0F2FE" },
  "3": { label: "High", color: "#B45309", bg: "#FEF3C7" },
  "4": { label: "Urgent", color: "#B91C1C", bg: "#FEE2E2" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "1": { label: "Not Started", color: "#64748B", bg: "#F1F5F9" },
  "4": { label: "In Progress", color: "#2563EB", bg: "#EFF6FF" },
  "3": { label: "Testing", color: "#7C3AED", bg: "#F5F3FF" },
  "2": { label: "Awaiting Feedback", color: "#F59E0B", bg: "#FFFBEB" },
  "5": { label: "Complete", color: "#16A34A", bg: "#F0FDF4" },
};

const KANBAN_COLUMNS = [
  { status: "1", label: "Not Started", color: "#64748B" },
  { status: "4", label: "In Progress", color: "#2563EB" },
  { status: "3", label: "Testing", color: "#7C3AED" },
  { status: "2", label: "Feedback", color: "#F59E0B" },
  { status: "5", label: "Complete", color: "#16A34A" },
];

type ViewMode = "list" | "board";

function dueCountdown(duedate: string | null): { label: string; color: string } | null {
  if (!duedate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(duedate.slice(0, 10) + "T00:00:00");
  if (isNaN(due.getTime())) return null;
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "#DC2626" };
  if (diffDays === 0) return { label: "Due today", color: "#B45309" };
  if (diffDays === 1) return { label: "Tomorrow", color: "#0369A1" };
  if (diffDays <= 7) return { label: `${diffDays}d left`, color: "#64748B" };
  return { label: `${diffDays}d`, color: "#94A3B8" };
}

// ─── Enhanced Task List Item ─────────────────────────────────────────────

const TaskListRow = memo(function TaskListRow({ task }: { task: TaskListItem }) {
  const priority = PRIORITY[String(task.priority || "2")] || PRIORITY["2"];
  const status = STATUS_CONFIG[String(task.status || "1")] || STATUS_CONFIG["1"];
  const due = dueCountdown(task.duedate);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/tasks/${task.id}` as any)}
      activeOpacity={0.7}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      <View className="flex-row">
        {/* Priority color bar */}
        <View className="w-1.5" style={{ backgroundColor: priority.color }} />
        <View className="flex-1 p-3.5">
          <View className="flex-row items-start">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
                {task.name}
              </Text>
              {task.rel_type ? (
                <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                  {task.rel_type} #{task.rel_id}
                </Text>
              ) : null}
            </View>
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: priority.bg }}
            >
              <Text style={{ color: priority.color, fontSize: 10, fontWeight: "700" }}>
                {priority.label}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mt-2 flex-wrap gap-1.5">
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: status.bg }}
            >
              <Text style={{ color: status.color, fontSize: 10, fontWeight: "600" }}>
                {status.label}
              </Text>
            </View>
            {due ? (
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={11} color={due.color} />
                <Text className="text-xs font-medium ml-0.5" style={{ color: due.color }}>
                  {due.label}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View className="justify-center pr-3">
          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Kanban Card ─────────────────────────────────────────────────────────

const KanbanCard = memo(function KanbanCard({ task }: { task: TaskListItem }) {
  const priority = PRIORITY[String(task.priority || "2")] || PRIORITY["2"];
  const due = dueCountdown(task.duedate);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/tasks/${task.id}` as any)}
      activeOpacity={0.7}
      className="bg-white rounded-xl p-3 mb-2 shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: priority.color }}
    >
      <Text className="text-xs font-semibold text-foreground" numberOfLines={2}>
        {task.name}
      </Text>
      <View className="flex-row items-center mt-2 justify-between">
        <View
          className="px-1.5 py-0.5 rounded"
          style={{ backgroundColor: priority.bg }}
        >
          <Text style={{ color: priority.color, fontSize: 9, fontWeight: "700" }}>
            {priority.label}
          </Text>
        </View>
        {due ? (
          <Text className="text-[10px] font-medium" style={{ color: due.color }}>
            {due.label}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

// ─── Kanban Column ───────────────────────────────────────────────────────

function KanbanColumn({
  label,
  color,
  tasks,
}: {
  label: string;
  color: string;
  tasks: TaskListItem[];
}) {
  return (
    <View className="mr-3" style={{ width: 200 }}>
      <View className="flex-row items-center mb-2">
        <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: color }} />
        <Text className="text-xs font-bold text-foreground flex-1">{label}</Text>
        <View className="bg-slate-100 px-1.5 py-0.5 rounded-full">
          <Text className="text-[10px] font-bold text-muted">{tasks.length}</Text>
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 500 }}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {tasks.map((t) => (
          <KanbanCard key={t.id} task={t} />
        ))}
        {tasks.length === 0 ? (
          <View className="bg-slate-50 rounded-xl p-4 items-center">
            <Ionicons name="checkmark-circle-outline" size={20} color="#CBD5E1" />
            <Text className="text-xs text-muted mt-1">Empty</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Status counts strip ────────────────────────────────────────────────

function StatusStrip({ summary }: { summary: any }) {
  if (!summary) return null;
  const items = [
    { label: "Open", value: summary.total_open, color: colors.primary },
    { label: "New", value: summary.not_started, color: "#64748B" },
    { label: "Active", value: summary.in_progress, color: "#2563EB" },
    { label: "Overdue", value: summary.overdue, color: "#DC2626" },
  ];
  return (
    <View className="flex-row mx-4 mb-3">
      {items.map((item) => (
        <View key={item.label} className="flex-1 items-center">
          <Text className="text-lg font-bold" style={{ color: item.color }}>
            {item.value ?? 0}
          </Text>
          <Text className="text-[10px] text-muted">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────

export default function TasksScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const listQuery = useMyTasks({ search: search || undefined, status: statusFilter, limit: 200 });
  const boardQuery = useTasksByStatus();
  const summary = useMyTasksSummary();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([listQuery.refetch(), boardQuery.refetch(), summary.refetch()]);
    setRefreshing(false);
  }, [listQuery, boardQuery, summary]);

  const listItems = useMemo(() => {
    return (listQuery.data?.items ?? []) as TaskListItem[];
  }, [listQuery.data]);

  const renderListItem = useCallback(
    ({ item }: { item: TaskListItem }) => <TaskListRow task={item} />,
    [],
  );

  const handleCreateTask = useCallback(() => {
    router.push("/(tabs)/tasks/new" as any);
  }, []);

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-white border-b border-slate-100 px-4 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-2xl font-bold text-foreground">Tasks</Text>
            <Text className="text-xs text-muted mt-0.5">
              {listQuery.data?.total
                ? `${listQuery.data.total} total`
                : `${listItems.length} tasks`}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {/* View mode toggle */}
            <View className="flex-row bg-slate-100 rounded-xl p-0.5">
              <TouchableOpacity
                onPress={() => setViewMode("list")}
                className="px-3 py-1.5 rounded-lg"
                style={viewMode === "list" ? { backgroundColor: "#FFFFFF" } : undefined}
              >
                <Ionicons
                  name="list-outline"
                  size={16}
                  color={viewMode === "list" ? colors.primary : "#94A3B8"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode("board")}
                className="px-3 py-1.5 rounded-lg"
                style={viewMode === "board" ? { backgroundColor: "#FFFFFF" } : undefined}
              >
                <Ionicons
                  name="grid-outline"
                  size={16}
                  color={viewMode === "board" ? colors.primary : "#94A3B8"}
                />
              </TouchableOpacity>
            </View>
            {/* FAB / create */}
            <TouchableOpacity
              onPress={handleCreateTask}
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: ACCENT }}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2 text-foreground text-sm"
            placeholder="Search tasks…"
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Status filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8 }}
        >
          <TouchableOpacity
            onPress={() => setStatusFilter(undefined)}
            className="px-3 py-1.5 rounded-full mr-2"
            style={{
              backgroundColor: !statusFilter ? ACCENT : "#F1F5F9",
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: !statusFilter ? "#FFFFFF" : "#64748B" }}
            >
              All
            </Text>
          </TouchableOpacity>
          {KANBAN_COLUMNS.filter((c) => c.status !== "5").map((col) => (
            <TouchableOpacity
              key={col.status}
              onPress={() =>
                setStatusFilter(statusFilter === col.status ? undefined : col.status)
              }
              className="px-3 py-1.5 rounded-full mr-2"
              style={{
                backgroundColor: statusFilter === col.status ? col.color : "#F1F5F9",
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: statusFilter === col.status ? "#FFFFFF" : col.color }}
              >
                {col.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Status summary strip */}
      <StatusStrip summary={summary.data} />

      {/* Content */}
      {viewMode === "list" ? (
        listQuery.isLoading && !listItems.length ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : listQuery.isError ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
            <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load tasks</Text>
            <TouchableOpacity
              onPress={() => listQuery.refetch()}
              className="mt-4 px-6 py-2.5 rounded-xl bg-slate-100"
            >
              <Text className="text-foreground font-semibold">Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={listItems}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderListItem}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            ItemSeparatorComponent={() => <View className="h-2.5" />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
            }
            ListEmptyComponent={
              <View className="items-center justify-center pt-20">
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "#FEF3C7" }}
                >
                  <Ionicons name="checkbox-outline" size={36} color={ACCENT} />
                </View>
                <Text className="text-foreground font-semibold text-lg">No tasks found</Text>
                <Text className="text-muted text-sm mt-1 text-center px-8">
                  {search || statusFilter
                    ? "Try adjusting your search or filters."
                    : "Tap + to create your first task."}
                </Text>
              </View>
            }
            initialNumToRender={15}
            windowSize={8}
          />
        )
      ) : (
        /* Board View */
        boardQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: 12, paddingRight: 24 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
            }
          >
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                label={col.label}
                color={col.color}
                tasks={(boardQuery.data?.[col.status] ?? []) as TaskListItem[]}
              />
            ))}
          </ScrollView>
        )
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={handleCreateTask}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{ backgroundColor: ACCENT, elevation: 8 }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
