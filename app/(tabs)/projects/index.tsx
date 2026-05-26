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
import { useProjectsList, type ProjectListItem } from "@/lib/queries/projects";
import { colors } from "@/lib/theme";

const ACCENT = "#2563EB";

const PROJECT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "1": { label: "Not Started", color: "#64748B", bg: "#F1F5F9" },
  "2": { label: "In Progress", color: "#16A34A", bg: "#F0FDF4" },
  "3": { label: "On Hold", color: "#B45309", bg: "#FEF3C7" },
  "4": { label: "Finished", color: "#2563EB", bg: "#EFF6FF" },
  "5": { label: "Cancelled", color: "#DC2626", bg: "#FEF2F2" },
};

const STATUS_FILTERS = [
  { value: undefined, label: "All" },
  { value: "2", label: "In Progress" },
  { value: "1", label: "Not Started" },
  { value: "3", label: "On Hold" },
  { value: "4", label: "Finished" },
];

function deadlineCountdown(deadline: string | null): { label: string; color: string } | null {
  if (!deadline || deadline.startsWith("0000")) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline.slice(0, 10) + "T00:00:00");
  if (isNaN(due.getTime())) return null;
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: "#DC2626" };
  if (diffDays === 0) return { label: "Due today", color: "#B45309" };
  if (diffDays === 1) return { label: "Tomorrow", color: "#0369A1" };
  if (diffDays <= 7) return { label: `${diffDays}d left`, color: "#64748B" };
  if (diffDays <= 30) return { label: `${diffDays}d`, color: "#94A3B8" };
  return null;
}

function statusBarColor(status: string, deadline: string | null): string {
  if (String(status) === "2") {
    if (deadline) {
      const dl = deadlineCountdown(deadline);
      if (dl && dl.color === "#DC2626") return "#DC2626";
    }
    return "#16A34A";
  }
  if (String(status) === "3") return "#F59E0B";
  if (String(status) === "1") return "#94A3B8";
  if (String(status) === "4") return "#2563EB";
  if (String(status) === "5") return "#DC2626";
  return "#64748B";
}

// ─── Project Card ────────────────────────────────────────────────────────

const ProjectCard = memo(function ProjectCard({ project }: { project: ProjectListItem }) {
  const statusInfo = PROJECT_STATUS[String(project.status || "1")] || PROJECT_STATUS["1"];
  const dl = deadlineCountdown(project.deadline);
  const progress = Math.max(0, Math.min(100, Number(project.progress || 0)));
  const barColor = statusBarColor(String(project.status), project.deadline);
  const clientName = project.company || project.client_name || "";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/projects/${project.id}` as any)}
      activeOpacity={0.7}
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Status color top bar */}
      <View className="h-1" style={{ backgroundColor: barColor }} />
      <View className="p-4">
        <View className="flex-row items-start">
          <View className="flex-1 mr-3">
            <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
              {project.name}
            </Text>
            {clientName ? (
              <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                {clientName}
              </Text>
            ) : null}
          </View>
          <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: statusInfo.bg }}>
            <Text style={{ color: statusInfo.color, fontSize: 10, fontWeight: "700" }}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View className="mt-3">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs text-muted">Progress</Text>
            <Text className="text-xs font-bold" style={{ color: barColor }}>
              {progress}%
            </Text>
          </View>
          <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: barColor }}
            />
          </View>
        </View>

        {/* Footer: deadline + dates */}
        <View className="flex-row items-center mt-3 flex-wrap gap-2">
          {dl ? (
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={12} color={dl.color} />
              <Text className="text-xs font-medium ml-1" style={{ color: dl.color }}>
                {dl.label}
              </Text>
            </View>
          ) : null}
          {project.deadline && !project.deadline.startsWith("0000") ? (
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
              <Text className="text-xs text-muted ml-1">
                {project.deadline.slice(0, 10)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Main Screen ─────────────────────────────────────────────────────────

export default function ProjectsScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const q = useProjectsList({ search: search || undefined, status: statusFilter, limit: 200 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const items = useMemo(() => {
    return (q.data?.items ?? []) as ProjectListItem[];
  }, [q.data]);

  const renderItem = useCallback(
    ({ item }: { item: ProjectListItem }) => <ProjectCard project={item} />,
    [],
  );

  const isLoading = q.isLoading && !items.length;

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-white border-b border-slate-100 px-4 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-2xl font-bold text-foreground">Projects</Text>
            <Text className="text-xs text-muted mt-0.5">
              {q.data?.total ? `${q.data.total} total` : `${items.length} projects`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/projects/new" as any)}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: ACCENT }}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2 text-foreground text-sm"
            placeholder="Search projects…"
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
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            const chipColor = f.value
              ? PROJECT_STATUS[f.value]?.color || "#64748B"
              : ACCENT;
            return (
              <TouchableOpacity
                key={f.label}
                onPress={() => setStatusFilter(f.value)}
                className="px-3 py-1.5 rounded-full mr-2"
                style={{
                  backgroundColor: active ? chipColor : "#F1F5F9",
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: active ? "#FFFFFF" : chipColor }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load projects</Text>
          <TouchableOpacity
            onPress={() => q.refetch()}
            className="mt-4 px-6 py-2.5 rounded-xl bg-slate-100"
          >
            <Text className="text-foreground font-semibold">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center pt-20">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: "#EFF6FF" }}
              >
                <Ionicons name="folder-outline" size={36} color={ACCENT} />
              </View>
              <Text className="text-foreground font-semibold text-lg">No projects found</Text>
              <Text className="text-muted text-sm mt-1 text-center px-8">
                {search || statusFilter
                  ? "Try adjusting your search or filters."
                  : "Tap + to create a new project."}
              </Text>
            </View>
          }
          initialNumToRender={12}
          windowSize={8}
        />
      )}
    </View>
  );
}
