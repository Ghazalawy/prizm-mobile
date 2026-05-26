import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEntity } from "@/lib/api";
import {
  useProjectDetail,
  useProjectTasks,
  useProjectMilestones,
  useProjectStats,
  type ProjectMilestone,
} from "@/lib/queries/projects";
import { FilesTab } from "@/components/crud/FilesTab";
import { colors } from "@/lib/theme";
import { rtlTextStyle } from "@/lib/rtl";
import Toast from "react-native-toast-message";

const ACCENT = "#2563EB";

const PROJECT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "1": { label: "Not Started", color: "#64748B", bg: "#F1F5F9" },
  "2": { label: "In Progress", color: "#16A34A", bg: "#F0FDF4" },
  "3": { label: "On Hold", color: "#B45309", bg: "#FEF3C7" },
  "4": { label: "Finished", color: "#2563EB", bg: "#EFF6FF" },
  "5": { label: "Cancelled", color: "#DC2626", bg: "#FEF2F2" },
};

const TASK_STATUS: Record<string, { label: string; color: string }> = {
  "1": { label: "Not Started", color: "#64748B" },
  "2": { label: "Feedback", color: "#7C3AED" },
  "3": { label: "Testing", color: "#0369A1" },
  "4": { label: "In Progress", color: "#B45309" },
  "5": { label: "Complete", color: "#16A34A" },
};

type TabKey = "overview" | "tasks" | "milestones" | "files" | "expenses";

type Props = { id: string };

export function ProjectDetailScreen({ id }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const [descExpanded, setDescExpanded] = useState(false);
  const qc = useQueryClient();

  const project = useProjectDetail(id);
  const tasks = useProjectTasks(id);
  const milestones = useProjectMilestones(id);
  const stats = useProjectStats(id);
  const row = project.data as any;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([project.refetch(), tasks.refetch(), milestones.refetch()]);
    setRefreshing(false);
  }, [project, tasks, milestones]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteEntity("projects", id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["crud", "projects"] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
      router.back();
    },
  });

  const handleDelete = useCallback(() => {
    Alert.alert("Delete project", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  }, [deleteMutation]);

  if (project.isLoading && !row) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }
  if (project.isError || !row) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-8">
        <Ionicons name="cloud-offline-outline" size={42} color="#EF4444" />
        <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load project</Text>
        <Text className="text-muted text-sm mt-1 text-center">
          {(project.error as Error)?.message || "Project not found"}
        </Text>
        <TouchableOpacity
          onPress={() => project.refetch()}
          className="mt-4 bg-primary px-5 py-2 rounded-lg"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusInfo = PROJECT_STATUS[String(row.status || "1")] || PROJECT_STATUS["1"];
  const progress = Math.max(0, Math.min(100, Number(row.progress || 0)));
  const description = cleanText(row.description || "");
  const clientName = row.company || row.client_name || "";
  const startDate = formatDate(row.start_date);
  const deadline = formatDate(row.deadline);
  const taskItems = (tasks.data?.items ?? []) as any[];
  const milestoneItems = (milestones.data ?? []) as ProjectMilestone[];
  const st = stats.data;

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 flex-row items-center px-3" style={{ minHeight: 48 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-2 text-base font-semibold text-foreground flex-1" numberOfLines={1}>
          {row.name || "Project"}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/projects/${encodeURIComponent(id)}/edit` as any)}
          className="w-8 h-8 items-center justify-center"
          hitSlop={6}
        >
          <Ionicons name="create-outline" size={20} color="#0F172A" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDelete}
          className="w-8 h-8 items-center justify-center"
          hitSlop={6}
          disabled={deleteMutation.isPending}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* ── Hero Card ─────────────────────────────────────────── */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-start">
            <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: `${ACCENT}1A` }}>
              <Ionicons name="folder-outline" size={24} color={ACCENT} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-xl font-bold text-foreground" style={rtlTextStyle(row.name)} selectable>
                {row.name}
              </Text>
              {clientName ? (
                <Text className="text-sm text-muted mt-0.5">{clientName}</Text>
              ) : null}
              <View className="flex-row items-center mt-2 flex-wrap gap-1.5">
                <Pill bg={statusInfo.bg} color={statusInfo.color} label={statusInfo.label} />
                {startDate ? (
                  <Pill bg="#F1F5F9" color="#475569" icon="calendar-outline" label={`Start: ${startDate}`} />
                ) : null}
                {deadline ? (
                  <Pill bg="#F1F5F9" color="#475569" icon="flag-outline" label={`Due: ${deadline}`} />
                ) : null}
              </View>
            </View>
          </View>

          {/* Progress ring / bar */}
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs text-muted">Overall Progress</Text>
              <Text className="text-sm font-bold" style={{ color: ACCENT }}>
                {progress}%
              </Text>
            </View>
            <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: ACCENT }} />
            </View>
          </View>

          {/* Key metrics */}
          {st ? (
            <View className="flex-row mt-4 -mx-1">
              <MetricBox label="Tasks" value={`${st.completedTasks}/${st.totalTasks}`} color={ACCENT} />
              <MetricBox label="Open" value={String(st.openTasks)} color="#F59E0B" />
              <MetricBox label="Milestones" value={`${st.completedMilestones}/${st.totalMilestones}`} color="#7C3AED" />
            </View>
          ) : null}
        </View>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <View className="mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8 }}>
            {(["overview", "tasks", "milestones", "files", "expenses"] as TabKey[]).map((k) => (
              <TabPill key={k} active={tab === k} label={tabLabel(k)} onPress={() => setTab(k)} />
            ))}
          </ScrollView>
          <View className="border-t border-slate-100">
            {tab === "overview" ? (
              <OverviewPanel row={row} description={description} descExpanded={descExpanded} setDescExpanded={setDescExpanded} />
            ) : null}
            {tab === "tasks" ? <TasksPanel tasks={taskItems} projectId={id} /> : null}
            {tab === "milestones" ? <MilestonesPanel milestones={milestoneItems} /> : null}
            {tab === "files" ? (
              <View style={{ height: 400 }}>
                <FilesTab relType="project" relId={id} color={ACCENT} />
              </View>
            ) : null}
            {tab === "expenses" ? <ExpensesPanel projectId={id} /> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function Pill({
  label,
  color,
  bg,
  icon,
}: {
  label: string;
  color: string;
  bg: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color, fontSize: 11, fontWeight: "600" }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function TabPill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: active ? ACCENT : "#F1F5F9",
        marginRight: 6,
      }}
    >
      <Text style={{ color: active ? "#FFFFFF" : "#475569", fontWeight: "600", fontSize: 12 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="flex-1 mx-1 bg-slate-50 rounded-xl p-3 items-center">
      <Text className="text-lg font-bold" style={{ color }}>{value}</Text>
      <Text className="text-[10px] text-muted mt-0.5">{label}</Text>
    </View>
  );
}

function SectionLabel({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View className="flex-row items-center mb-2">
      <Ionicons name={icon} size={14} color="#64748B" />
      <Text className="text-xs uppercase tracking-wide text-muted ml-1.5">{title}</Text>
    </View>
  );
}

// ─── Tab panels ──────────────────────────────────────────────────────────

function OverviewPanel({
  row,
  description,
  descExpanded,
  setDescExpanded,
}: {
  row: any;
  description: string;
  descExpanded: boolean;
  setDescExpanded: (v: boolean) => void;
}) {
  const cells: Array<{ label: string; value: string }> = [];
  pushCell(cells, "Billing Type", billingTypeLabel(row.billing_type));
  pushCell(cells, "Project Cost", row.project_cost && Number(row.project_cost) > 0 ? `${Number(row.project_cost).toLocaleString()}` : "");
  pushCell(cells, "Hourly Rate", row.project_rate_per_hour && Number(row.project_rate_per_hour) > 0 ? `${Number(row.project_rate_per_hour).toFixed(2)}/hr` : "");
  pushCell(cells, "Est. Hours", row.estimated_hours && Number(row.estimated_hours) > 0 ? String(row.estimated_hours) : "");
  pushCell(cells, "Created", formatDate(row.project_created));
  pushCell(cells, "Finished", formatDate(row.date_finished));

  return (
    <View className="px-4 py-3">
      {description ? (
        <View className="mb-4">
          <SectionLabel icon="document-text-outline" title="Description" />
          <Text
            className="text-sm text-foreground leading-5"
            selectable
            style={rtlTextStyle(description)}
            numberOfLines={descExpanded ? undefined : 6}
          >
            {description}
          </Text>
          {description.length > 200 ? (
            <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)} className="mt-1">
              <Text className="text-xs font-medium" style={{ color: ACCENT }}>
                {descExpanded ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {cells.length > 0 ? (
        <View>
          <SectionLabel icon="information-circle-outline" title="Details" />
          <View className="flex-row flex-wrap">
            {cells.map((c, idx) => (
              <View key={`${c.label}-${idx}`} style={{ width: "50%", paddingVertical: 4, paddingRight: 8 }}>
                <Text className="text-[10px] uppercase text-muted">{c.label}</Text>
                <Text className="text-sm text-foreground" numberOfLines={2}>{c.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function TasksPanel({ tasks, projectId }: { tasks: any[]; projectId: string }) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const s = String(t.status || "1");
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [tasks]);

  return (
    <View className="px-4 py-3">
      {/* Status count chips */}
      <View className="flex-row flex-wrap mb-3 gap-2">
        {Object.entries(TASK_STATUS).map(([k, v]) => {
          const count = statusCounts[k] || 0;
          if (count === 0) return null;
          return (
            <View key={k} className="flex-row items-center bg-slate-50 px-2.5 py-1 rounded-full">
              <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: v.color }} />
              <Text className="text-[10px] font-semibold" style={{ color: v.color }}>
                {v.label} ({count})
              </Text>
            </View>
          );
        })}
      </View>

      {tasks.length === 0 ? (
        <Text className="text-sm text-muted text-center py-6">No tasks in this project.</Text>
      ) : (
        tasks.slice(0, 20).map((t: any) => {
          const status = TASK_STATUS[String(t.status || "1")] || TASK_STATUS["1"];
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => router.push(`/(tabs)/tasks/${t.id}` as any)}
              activeOpacity={0.7}
              className="flex-row items-center py-2.5 border-b border-slate-100"
            >
              <View className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: status.color }} />
              <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>{t.name}</Text>
              <Text className="text-xs" style={{ color: status.color }}>{status.label}</Text>
            </TouchableOpacity>
          );
        })
      )}

      {tasks.length > 20 ? (
        <TouchableOpacity className="mt-3 items-center py-2">
          <Text className="text-xs font-medium" style={{ color: ACCENT }}>
            +{tasks.length - 20} more tasks
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function MilestonesPanel({ milestones }: { milestones: ProjectMilestone[] }) {
  if (milestones.length === 0) {
    return <Text className="text-sm text-muted text-center py-6 px-4">No milestones defined.</Text>;
  }

  return (
    <View className="px-4 py-3">
      {milestones.map((m, idx) => {
        const isComplete = m.total_tasks != null && m.total_tasks > 0 && m.total_finished_tasks === m.total_tasks;
        const progress =
          m.total_tasks && m.total_tasks > 0
            ? Math.round(((m.total_finished_tasks || 0) / m.total_tasks) * 100)
            : 0;
        const dueStr = m.due_date && !m.due_date.startsWith("0000") ? m.due_date.slice(0, 10) : null;

        return (
          <View key={m.id} className="flex-row items-start mb-4">
            {/* Timeline connector */}
            <View className="items-center mr-3" style={{ width: 24 }}>
              <View
                className="w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: isComplete ? "#DCFCE7" : "#F1F5F9" }}
              >
                <Ionicons
                  name={isComplete ? "checkmark" : "flag-outline"}
                  size={12}
                  color={isComplete ? "#16A34A" : "#64748B"}
                />
              </View>
              {idx < milestones.length - 1 ? (
                <View className="w-0.5 flex-1 bg-slate-200 mt-1" style={{ minHeight: 24 }} />
              ) : null}
            </View>
            <View className="flex-1 pb-1">
              <Text className="text-sm font-semibold text-foreground">{m.name}</Text>
              <View className="flex-row items-center mt-1 gap-2">
                {dueStr ? (
                  <View className="flex-row items-center">
                    <Ionicons name="calendar-outline" size={11} color="#94A3B8" />
                    <Text className="text-xs text-muted ml-1">{dueStr}</Text>
                  </View>
                ) : null}
                {m.total_tasks != null && m.total_tasks > 0 ? (
                  <Text className="text-xs text-muted">
                    {m.total_finished_tasks || 0}/{m.total_tasks} tasks
                  </Text>
                ) : null}
              </View>
              {m.total_tasks != null && m.total_tasks > 0 ? (
                <View className="mt-1.5">
                  <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${progress}%`, backgroundColor: isComplete ? "#16A34A" : ACCENT }}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ExpensesPanel({ projectId }: { projectId: string }) {
  return (
    <View className="px-4 py-6 items-center">
      <Ionicons name="receipt-outline" size={32} color="#CBD5E1" />
      <Text className="text-sm text-muted mt-2 text-center">
        Project expenses are available via the ERP module.
      </Text>
      <TouchableOpacity
        onPress={() => router.push(`/(tabs)/erp/expenses` as any)}
        className="mt-3 px-4 py-2 rounded-xl bg-slate-100"
        activeOpacity={0.7}
      >
        <Text className="text-xs font-semibold text-foreground">View Expenses</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Pure helpers ────────────────────────────────────────────────────────

function tabLabel(k: TabKey): string {
  switch (k) {
    case "overview": return "Overview";
    case "tasks": return "Tasks";
    case "milestones": return "Milestones";
    case "files": return "Files";
    case "expenses": return "Expenses";
  }
}

function formatDate(v: any): string {
  const s = String(v ?? "").trim();
  if (!s || s.startsWith("0000-00-00")) return "";
  return s.slice(0, 10);
}

function pushCell(out: Array<{ label: string; value: string }>, label: string, value: string) {
  const v = (value ?? "").trim();
  if (!v) return;
  out.push({ label, value: v });
}

function billingTypeLabel(v: any): string {
  const s = String(v || "");
  if (s === "1") return "Fixed Rate";
  if (s === "2") return "Project Hours";
  if (s === "3") return "Task Hours";
  return s || "";
}

function cleanText(value: any): string {
  if (!value) return "";
  const raw = String(value);
  const noHtml = raw
    .replace(/<\/(p|div|li|br|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return noHtml
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
