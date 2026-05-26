import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildAuthHeaders,
  createEntity,
  deleteEntity,
  getEntity,
  listEntities,
  normalizeList,
  parseApiResponse,
  updateEntity,
} from "@/lib/api";
import { API_URL, staffAvatarUrl } from "@/lib/config";
import Toast from "react-native-toast-message";
import { FilesTab } from "@/components/crud/FilesTab";
import { rtlTextStyle } from "@/lib/rtl";
import { pickImage, takePhoto, uploadAttachment, type PickedFile } from "@/lib/files";
import * as Clipboard from "expo-clipboard";

/**
 * Tightly-packed mobile task detail. Replaces the generic CrudDetailScreen
 * for /tasks/:id only — every other module still uses the generic one.
 *
 * Why a dedicated screen:
 *  - The user explicitly called out the generic field-list layout as
 *    wasteful — too many one-value-per-row sections, blank gaps, wrong
 *    sequence (Description was hiding at the bottom).
 *  - The web admin's task pane is dense: title + chips + description +
 *    assignees + tabs all visible without scrolling. Mobile should do the
 *    same in the vertical axis: stat strip up top, description right after,
 *    then people, then tab content, then secondary metadata.
 *  - Tasks have rich data (assignees, followers, checklist, comments,
 *    files) that benefit from a bespoke layout — pills, avatar groups, an
 *    inline checklist editor — none of which the generic field-renderer
 *    can produce cleanly.
 *
 * Section order (per the user's spec):
 *
 *   1. Hero (title, status badge, due chip, edit/delete/actions icons)
 *   2. Stat strip — Priority · Status · Start→Due · Billable+Rate · Total time · Type
 *   3. Description (always shown if non-empty; full text, RTL-aware)
 *   4. Tags chip row
 *   5. Assignees + Followers (overlapping avatar groups, side by side)
 *   6. Inline tabs: Checklist · Comments · Files · Activity
 *      - Checklist: editable inline (toggle + add new)
 *      - Comments: timeline (newest first) + inline composer
 *      - Files: existing FilesTab
 *      - Activity: dateadded, addedfrom, recurring, kanban order, …
 *   7. Quick actions: Mark Complete · Reopen · Start/Stop Timer
 *
 * Section visibility: empty sections collapse entirely so there's never
 * a "Tags" label sitting next to a blank pill row.
 */

type Props = {
  id: string;
};

const PRIORITY: Record<string, { label: string; color: string; bg: string }> = {
  "1": { label: "Low",    color: "#475569", bg: "#F1F5F9" },
  "2": { label: "Medium", color: "#0369A1", bg: "#E0F2FE" },
  "3": { label: "High",   color: "#B45309", bg: "#FEF3C7" },
  "4": { label: "Urgent", color: "#B91C1C", bg: "#FEE2E2" },
};

// Perfex stores task status as an integer. Labels mirror the web admin.
const TASK_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "1": { label: "Not Started", color: "#475569", bg: "#F1F5F9" },
  "2": { label: "Awaiting Feedback", color: "#7C3AED", bg: "#EDE9FE" },
  "3": { label: "Testing", color: "#0369A1", bg: "#E0F2FE" },
  "4": { label: "In Progress", color: "#B45309", bg: "#FEF3C7" },
  "5": { label: "Complete", color: "#15803D", bg: "#DCFCE7" },
};

type TabKey = "checklist" | "comments" | "files" | "activity";

export function TaskDetailScreen({ id }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("checklist");
  const [descExpanded, setDescExpanded] = useState(false);
  const qc = useQueryClient();

  const task = useQuery({
    queryKey: ["task", id],
    queryFn: () => getEntity("tasks", id),
    enabled: !!id,
  });
  const row = unwrap(task.data);

  // Assignees + followers — fetched in parallel with the task itself.
  // Limit to first 50 (UI shows the leading 5-6 then a "+N").
  const assignments = useQuery({
    queryKey: ["task", id, "assignments"],
    queryFn: () => listEntities(`tasks/assignments/${id}`, { limit: 50 }),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
  const followers = useQuery({
    queryKey: ["task", id, "followers"],
    queryFn: () => listEntities(`tasks/followers/${id}`, { limit: 50 }),
    enabled: !!id,
    staleTime: 30 * 1000,
  });

  // Lookup staff once — used to resolve assignment/follower IDs into
  // names + avatars. Cached for 5 minutes; small (≤500 rows) so the cost
  // is negligible.
  const staff = useQuery({
    queryKey: ["lookup", "staff"],
    queryFn: () => listEntities("staffs", { limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });

  const staffById = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of normalizeList(staff.data).items) {
      m.set(String(s.staffid ?? s.id), s);
    }
    return m;
  }, [staff.data]);

  const assigneeRows = useMemo(
    () =>
      normalizeList(assignments.data).items.map((a: any) => {
        const sid = String(a.staffid ?? a.assigneeid ?? a.id);
        const s = staffById.get(sid);
        return {
          id: sid,
          name: joinName(s?.firstname, s?.lastname) || `Staff #${sid}`,
          avatar: staffAvatarUrl(sid, s?.profile_image, "thumb") || undefined,
        };
      }),
    [assignments.data, staffById]
  );

  const followerRows = useMemo(
    () =>
      normalizeList(followers.data).items.map((f: any) => {
        const sid = String(f.staffid ?? f.followerid ?? f.id);
        const s = staffById.get(sid);
        return {
          id: sid,
          name: joinName(s?.firstname, s?.lastname) || `Staff #${sid}`,
          avatar: staffAvatarUrl(sid, s?.profile_image, "thumb") || undefined,
        };
      }),
    [followers.data, staffById]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      task.refetch(),
      assignments.refetch(),
      followers.refetch(),
    ]);
    setRefreshing(false);
  }, [task, assignments, followers]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteEntity("tasks", id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["crud", "tasks"] });
      router.back();
    },
  });

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete task",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ],
      { cancelable: true }
    );
  }, [deleteMutation]);

  if (task.isLoading && !row) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }
  if (task.isError || !row) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-8">
        <Ionicons name="cloud-offline-outline" size={42} color="#EF4444" />
        <Text className="text-foreground font-semibold mt-3">Couldn't load task</Text>
        <Text className="text-muted text-sm mt-1 text-center">
          {(task.error as Error)?.message || "Task not found"}
        </Text>
        <TouchableOpacity
          onPress={() => task.refetch()}
          className="mt-4 bg-primary px-5 py-2 rounded-lg"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -- derived display data ------------------------------------------------
  const priority = PRIORITY[String(row.priority || "2")] || PRIORITY["2"];
  const status = TASK_STATUS[String(row.status || "1")] || TASK_STATUS["1"];
  const description = cleanText(row.description || "");
  const tags = parseTags(row.tags);
  const start = formatDate(row.startdate);
  const due = formatDate(row.duedate);
  const hasDates = !!(start || due);
  const billable = isTruthy(row.billable);
  const hourlyRate = numericOrZero(row.hourly_rate);
  const totalLogged = formatDuration(row.total_logged_time);
  const isComplete = String(row.status) === "5";

  return (
    <View className="flex-1 bg-surface">
      {/* Header — back, title fragment, edit/delete. Compact 48px. */}
      <View className="bg-white border-b border-slate-200 flex-row items-center px-3" style={{ minHeight: 48 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-2 text-base font-semibold text-foreground flex-1" numberOfLines={1}>
          {row.name || "Task"}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/tasks/${encodeURIComponent(id)}/edit` as any)}
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
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />}
      >
        {/* ── 1. Hero ──────────────────────────────────────────────── */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-start">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: "#F59E0B1A" }}
            >
              <Ionicons name="checkbox-outline" size={22} color="#F59E0B" />
            </View>
            <View className="flex-1 ml-3">
              <Text
                className="text-xl font-bold text-foreground"
                selectable
                style={rtlTextStyle(row.name)}
              >
                {row.name}
              </Text>
              <View className="flex-row items-center mt-1 flex-wrap">
                <Pill bg={status.bg} color={status.color} label={status.label} />
                {due ? (
                  <Pill
                    bg="#F1F5F9"
                    color="#475569"
                    icon="calendar-outline"
                    label={due}
                    marginLeft={6}
                  />
                ) : null}
                {row.rel_type ? (
                  <Pill
                    bg="#F1F5F9"
                    color="#475569"
                    icon="link-outline"
                    label={`${row.rel_type} #${row.rel_id ?? "-"}`}
                    marginLeft={6}
                  />
                ) : null}
              </View>
            </View>
          </View>

          {/* ── 2. Stat strip — second row of pills, denser ─────────── */}
          <View className="flex-row flex-wrap mt-3 -mr-1.5">
            <Pill bg={priority.bg} color={priority.color} label={priority.label} icon="flag-outline" />
            {hasDates ? (
              <Pill
                bg="#F0FDF4"
                color="#15803D"
                icon="time-outline"
                label={`${start || "—"} → ${due || "—"}`}
                marginLeft={6}
              />
            ) : null}
            {billable ? (
              <Pill
                bg="#FEF3C7"
                color="#B45309"
                icon="cash-outline"
                label={
                  hourlyRate > 0
                    ? `${hourlyRate.toFixed(2)} / hr`
                    : "Billable"
                }
                marginLeft={6}
              />
            ) : null}
            {totalLogged ? (
              <Pill
                bg="#E0F2FE"
                color="#0369A1"
                icon="hourglass-outline"
                label={totalLogged}
                marginLeft={6}
              />
            ) : null}
            {row.complete_type ? (
              <Pill
                bg="#F5F3FF"
                color="#7C3AED"
                icon="git-branch-outline"
                label={String(row.complete_type)}
                marginLeft={6}
              />
            ) : null}
          </View>
        </View>

        {/* ── 3. Description (description-first, per spec) ─────────── */}
        {description ? (
          <Section title="Description" icon="document-text-outline">
            <Text
              className="text-foreground leading-5"
              selectable
              style={rtlTextStyle(description)}
              numberOfLines={descExpanded ? undefined : 8}
            >
              {description}
            </Text>
            {description.length > 220 ? (
              <TouchableOpacity
                onPress={() => setDescExpanded((v) => !v)}
                className="mt-2"
                hitSlop={6}
              >
                <Text className="text-primary text-sm font-medium">
                  {descExpanded ? "Show less" : "Show more"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </Section>
        ) : null}

        {/* ── 4. Tags ──────────────────────────────────────────────── */}
        {tags.length > 0 ? (
          <Section title="Tags" icon="pricetags-outline">
            <View className="flex-row flex-wrap -mr-1.5">
              {tags.map((t) => (
                <Pill key={t} bg="#F1F5F9" color="#0F172A" label={t} marginRight={6} marginBottom={4} />
              ))}
            </View>
          </Section>
        ) : null}

        {/* ── 5. People (Assignees + Followers, side-by-side) ─────── */}
        {(assigneeRows.length > 0 || followerRows.length > 0) ? (
          <View className="flex-row mt-3">
            {assigneeRows.length > 0 ? (
              <View style={{ flex: 1, marginRight: followerRows.length > 0 ? 6 : 0 }}>
                <PeopleBlock
                  title={`Assignees (${assigneeRows.length})`}
                  icon="people-outline"
                  rows={assigneeRows}
                />
              </View>
            ) : null}
            {followerRows.length > 0 ? (
              <View style={{ flex: 1, marginLeft: assigneeRows.length > 0 ? 6 : 0 }}>
                <PeopleBlock
                  title={`Followers (${followerRows.length})`}
                  icon="eye-outline"
                  rows={followerRows}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── 6. Inline tabs ───────────────────────────────────────── */}
        <View className="mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: 8 }}
          >
            {(["checklist", "comments", "files", "activity"] as TabKey[]).map((k) => (
              <TabPill
                key={k}
                active={tab === k}
                label={tabLabel(k)}
                onPress={() => setTab(k)}
              />
            ))}
          </ScrollView>
          <View className="border-t border-slate-100">
            {tab === "checklist" ? <ChecklistPanel taskId={id} /> : null}
            {tab === "comments"  ? <CommentsPanel taskId={id} /> : null}
            {tab === "files"     ? <View style={{ height: 380 }}><FilesTab relType="task" relId={id} color="#F59E0B" /></View> : null}
            {tab === "activity"  ? <ActivityPanel row={row} /> : null}
          </View>
        </View>

        {/* ── 7. Quick actions ─────────────────────────────────────── */}
        <View className="flex-row mt-3">
          {!isComplete ? (
            <QuickActionButton
              icon="checkmark-done-circle-outline"
              label="Mark Complete"
              color="#15803D"
              bg="#DCFCE7"
              onPress={() => quickTaskAction(id, "mark_complete", "PUT", "Task marked complete")}
            />
          ) : (
            <QuickActionButton
              icon="refresh-circle-outline"
              label="Reopen"
              color="#0369A1"
              bg="#E0F2FE"
              onPress={() => quickTaskAction(id, "reopen", "PUT", "Task reopened")}
            />
          )}
          <QuickActionButton
            icon="play-circle-outline"
            label="Start Timer"
            color="#B45309"
            bg="#FEF3C7"
            onPress={() => quickTaskAction(id, "timer/start", "POST", "Timer started")}
            marginLeft={8}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Reusable bits ───────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 mt-3 shadow-sm">
      <View className="flex-row items-center mb-2">
        <Ionicons name={icon} size={14} color="#64748B" />
        <Text className="text-xs uppercase tracking-wide text-muted ml-1.5">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Pill({
  label,
  color,
  bg,
  icon,
  marginLeft = 0,
  marginRight = 0,
  marginBottom = 0,
}: {
  label: string;
  color: string;
  bg: string;
  icon?: keyof typeof Ionicons.glyphMap;
  marginLeft?: number;
  marginRight?: number;
  marginBottom?: number;
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
        marginLeft,
        marginRight,
        marginBottom,
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color, fontSize: 11, fontWeight: "600" }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function TabPill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: active ? "#F59E0B" : "#F1F5F9",
        marginRight: 6,
      }}
    >
      <Text style={{ color: active ? "#FFFFFF" : "#475569", fontWeight: "600", fontSize: 12 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PeopleBlock({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  rows: Array<{ id: string; name: string; avatar?: string }>;
}) {
  // Show up to 5 overlapping avatars + "+N" badge.
  const shown = rows.slice(0, 5);
  const overflow = Math.max(0, rows.length - shown.length);
  return (
    <View className="bg-white rounded-2xl p-3 shadow-sm">
      <View className="flex-row items-center mb-2">
        <Ionicons name={icon} size={13} color="#64748B" />
        <Text className="text-xs uppercase tracking-wide text-muted ml-1.5">{title}</Text>
      </View>
      <View className="flex-row items-center">
        {shown.map((r, idx) => (
          <Avatar
            key={r.id}
            name={r.name}
            uri={r.avatar}
            // Overlapping circles — second and onward shift left so they
            // form a tight stack.
            style={{ marginLeft: idx === 0 ? 0 : -8, zIndex: shown.length - idx }}
          />
        ))}
        {overflow > 0 ? (
          <View
            style={{
              marginLeft: -8,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "#E2E8F0",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#FFFFFF",
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#475569" }}>+{overflow}</Text>
          </View>
        ) : null}
      </View>
      {/* First name strip for quick scanning */}
      <Text className="text-xs text-muted mt-2" numberOfLines={1}>
        {rows.map((r) => firstName(r.name)).join(", ")}
      </Text>
    </View>
  );
}

function Avatar({
  name,
  uri,
  style,
}: {
  name: string;
  uri?: string;
  style?: any;
}) {
  const [broken, setBroken] = useState(false);
  const initial = (name?.[0] || "?").toUpperCase();
  return (
    <View
      style={[
        {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: "#E2E8F0",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderWidth: 2,
          borderColor: "#FFFFFF",
        },
        style,
      ]}
    >
      {uri && !broken ? (
        <Image source={{ uri }} style={{ width: 28, height: 28 }} onError={() => setBroken(true)} />
      ) : (
        <Text style={{ color: "#0F172A", fontWeight: "700", fontSize: 11 }}>{initial}</Text>
      )}
    </View>
  );
}

function QuickActionButton({
  icon,
  label,
  color,
  bg,
  onPress,
  marginLeft = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
  marginLeft?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        paddingVertical: 11,
        borderRadius: 12,
        marginLeft,
      }}
    >
      <Ionicons name={icon} size={16} color={color} style={{ marginRight: 6 }} />
      <Text style={{ color, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Tab panels ──────────────────────────────────────────────────────────

function ChecklistPanel({ taskId }: { taskId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["task", taskId, "checklist"],
    queryFn: () => listEntities(`tasks/checklist/${taskId}`, { limit: 100 }),
  });
  const items = normalizeList(q.data).items as any[];
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["task", taskId, "checklist"] });

  const toggle = useMutation({
    mutationFn: async (item: any) => {
      const headers = await buildAuthHeaders();
      const res = await fetch(
        `${API_URL}/tasks/checklist/${encodeURIComponent(item.id)}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ finished: isTruthy(item.finished) ? 0 : 1 }),
        }
      );
      const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"]);
      if (invalidToken) throw new Error("Session expired");
      if (!res.ok) {
        const msg = typeof body === "string" ? body : body?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return body;
    },
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: async (description: string) =>
      createEntity("tasks/checklist", { taskid: taskId, description }),
    onSuccess: () => {
      setDraft("");
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => deleteEntity("tasks/checklist/item", id),
    onSuccess: invalidate,
  });

  const rename = useMutation({
    mutationFn: async ({ id, description }: { id: number; description: string }) =>
      updateEntity("tasks/checklist/item", id, { description }),
    onSuccess: () => {
      setEditingId(null);
      setEditText("");
      invalidate();
    },
  });

  const moveUp = useMutation({
    mutationFn: async (idx: number) => {
      if (idx <= 0) return;
      const item = items[idx];
      const prev = items[idx - 1];
      await updateEntity("tasks/checklist/item", item.id, { list_order: prev.list_order ?? idx - 1 });
      await updateEntity("tasks/checklist/item", prev.id, { list_order: item.list_order ?? idx });
    },
    onSuccess: invalidate,
  });

  const moveDown = useMutation({
    mutationFn: async (idx: number) => {
      if (idx >= items.length - 1) return;
      const item = items[idx];
      const next = items[idx + 1];
      await updateEntity("tasks/checklist/item", item.id, { list_order: next.list_order ?? idx + 1 });
      await updateEntity("tasks/checklist/item", next.id, { list_order: item.list_order ?? idx });
    },
    onSuccess: invalidate,
  });

  if (q.isLoading && items.length === 0) {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator color="#F59E0B" />
      </View>
    );
  }

  return (
    <View className="px-3 py-2">
      {items.length === 0 ? (
        <Text className="text-muted text-sm py-3 text-center">No checklist items yet.</Text>
      ) : (
        items.map((it: any, idx: number) => {
          const done = isTruthy(it.finished);
          const isEditing = editingId === it.id;
          return (
            <View key={it.id} className="flex-row items-center py-1">
              {/* Checkbox */}
              <TouchableOpacity
                onPress={() => toggle.mutate(it)}
                disabled={toggle.isPending}
                activeOpacity={0.7}
                className="pr-2"
              >
                <Ionicons
                  name={done ? "checkbox" : "square-outline"}
                  size={20}
                  color={done ? "#15803D" : "#94A3B8"}
                />
              </TouchableOpacity>

              {/* Text / inline edit */}
              {isEditing ? (
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  autoFocus
                  className="flex-1 bg-surface rounded px-2 py-1 text-sm text-foreground"
                  onSubmitEditing={() => {
                    const v = editText.trim();
                    if (v && v !== it.description) rename.mutate({ id: it.id, description: v });
                    else { setEditingId(null); setEditText(""); }
                  }}
                  onBlur={() => { setEditingId(null); setEditText(""); }}
                />
              ) : (
                <TouchableOpacity
                  className="flex-1"
                  onLongPress={() => { setEditingId(it.id); setEditText(it.description); }}
                  onPress={() => toggle.mutate(it)}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm ${done ? "text-muted line-through" : "text-foreground"}`}
                    style={rtlTextStyle(it.description)}
                  >
                    {it.description}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Reorder arrows */}
              <View className="flex-row ml-1">
                <TouchableOpacity
                  onPress={() => moveUp.mutate(idx)}
                  disabled={idx === 0 || moveUp.isPending}
                  className="px-1"
                  style={{ opacity: idx === 0 ? 0.25 : 1 }}
                >
                  <Ionicons name="chevron-up" size={14} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveDown.mutate(idx)}
                  disabled={idx >= items.length - 1 || moveDown.isPending}
                  className="px-1"
                  style={{ opacity: idx >= items.length - 1 ? 0.25 : 1 }}
                >
                  <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Delete */}
              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Delete item?", it.description, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => remove.mutate(it.id) },
                  ]);
                }}
                disabled={remove.isPending}
                className="pl-2"
              >
                <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Add new item */}
      <View className="flex-row items-center mt-3">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add item…"
          placeholderTextColor="#94A3B8"
          className="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-foreground"
          onSubmitEditing={() => draft.trim() && add.mutate(draft.trim())}
        />
        <TouchableOpacity
          onPress={() => draft.trim() && add.mutate(draft.trim())}
          disabled={!draft.trim() || add.isPending}
          className="ml-2 bg-primary px-3 py-2 rounded-lg"
          style={{ opacity: !draft.trim() ? 0.4 : 1 }}
        >
          {add.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="add" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CommentsPanel({ taskId }: { taskId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["task", taskId, "comments"],
    queryFn: () => listEntities(`tasks/comments/${taskId}`, { limit: 100 }),
  });
  const items = normalizeList(q.data).items;
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<PickedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const add = useMutation({
    mutationFn: async (content: string) =>
      createEntity("tasks/comments", { taskid: taskId, content }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["task", taskId, "comments"] });
    },
  });

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content && attachments.length === 0) return;
    setUploading(true);
    try {
      for (const file of attachments) {
        await uploadAttachment({ relType: "task", relId: taskId, file });
      }
      if (content) {
        const imgNames = attachments.map((f) => f.name).join(", ");
        const fullContent = imgNames
          ? `${content}\n\n📎 ${imgNames}`
          : content;
        await add.mutateAsync(fullContent);
      } else if (attachments.length > 0) {
        await add.mutateAsync(`📎 ${attachments.map((f) => f.name).join(", ")}`);
      }
      setAttachments([]);
      qc.invalidateQueries({ queryKey: ["files", "task", taskId] });
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Could not send");
    } finally {
      setUploading(false);
    }
  }, [draft, attachments, taskId, add, qc]);

  const handlePickImage = useCallback(async () => {
    const file = await pickImage();
    if (file) setAttachments((prev) => [...prev, file]);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const file = await takePhoto();
    if (file) setAttachments((prev) => [...prev, file]);
  }, []);

  const handlePasteImage = useCallback(async () => {
    try {
      const hasImage = await Clipboard.hasImageAsync();
      if (!hasImage) {
        Alert.alert("No image", "No image found in clipboard. Copy an image first.");
        return;
      }
      const result = await Clipboard.getImageAsync({ format: "png" });
      if (result?.data) {
        const uri = result.data.startsWith("data:") ? result.data : `data:image/png;base64,${result.data}`;
        const name = `pasted-${Date.now()}.png`;
        setAttachments((prev) => [...prev, { uri, name, mimeType: "image/png" }]);
      }
    } catch {
      Alert.alert("Paste failed", "Could not read image from clipboard.");
    }
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  if (q.isLoading && items.length === 0) {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator color="#F59E0B" />
      </View>
    );
  }

  return (
    <View className="px-3 py-2">
      {items.length === 0 ? (
        <Text className="text-muted text-sm py-3 text-center">No comments yet — be the first.</Text>
      ) : (
        items.map((it: any) => (
          <View key={it.id} className="py-2 border-b border-slate-100">
            <Text className="text-xs text-muted mb-0.5">
              {formatDateTime(it.dateadded)}
            </Text>
            <Text
              className="text-sm text-foreground"
              style={rtlTextStyle(cleanText(it.content || it.comment || ""))}
            >
              {cleanText(it.content || it.comment || "")}
            </Text>
          </View>
        ))
      )}

      {/* Attachment previews */}
      {attachments.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 mt-2 mb-1">
          {attachments.map((f, idx) => (
            <View key={idx} className="flex-row items-center bg-blue-50 rounded-lg px-2 py-1">
              <Ionicons name="image-outline" size={14} color="#2563EB" />
              <Text className="text-xs text-blue-700 ml-1 max-w-[120px]" numberOfLines={1}>{f.name}</Text>
              <TouchableOpacity onPress={() => removeAttachment(idx)} hitSlop={8} className="ml-1">
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-end mt-2">
        <TouchableOpacity
          onPress={handleTakePhoto}
          className="w-9 h-9 rounded-lg items-center justify-center bg-slate-100 mr-1.5"
          activeOpacity={0.7}
        >
          <Ionicons name="camera-outline" size={18} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePickImage}
          className="w-9 h-9 rounded-lg items-center justify-center bg-slate-100 mr-1.5"
          activeOpacity={0.7}
        >
          <Ionicons name="images-outline" size={18} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePasteImage}
          className="w-9 h-9 rounded-lg items-center justify-center bg-slate-100 mr-1.5"
          activeOpacity={0.7}
        >
          <Ionicons name="clipboard-outline" size={18} color="#64748B" />
        </TouchableOpacity>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment…"
          placeholderTextColor="#94A3B8"
          multiline
          className="flex-1 bg-surface rounded-lg px-3 py-2 text-sm text-foreground"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={(!draft.trim() && attachments.length === 0) || add.isPending || uploading}
          className="ml-2 bg-primary px-3 py-2 rounded-lg"
          style={{ opacity: (!draft.trim() && attachments.length === 0) ? 0.4 : 1 }}
        >
          {add.isPending || uploading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="send" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ActivityPanel({ row }: { row: any }) {
  // Compact 2-column metadata grid. Only shows rows with non-empty
  // values — every blank one is suppressed so this section never has
  // dead space.
  const cells: Array<{ label: string; value: string }> = [];
  pushCell(cells, "Added", formatDateTime(row.dateadded));
  pushCell(cells, "Added by", row.addedfrom_name || (row.addedfrom ? `Staff #${row.addedfrom}` : ""));
  pushCell(cells, "Modified", formatDateTime(row.datefinished));
  pushCell(cells, "Recurring", row.repeat_every ? `Every ${row.repeat_every} ${row.recurring_type || ""}` : "");
  pushCell(cells, "Kanban order", row.kanban_order != null ? String(row.kanban_order) : "");
  pushCell(cells, "Visible to client", row.visible_to_client ? "Yes" : "");
  pushCell(cells, "Is recurring from", row.is_recurring_from && String(row.is_recurring_from) !== "0" ? String(row.is_recurring_from) : "");
  pushCell(cells, "Milestone", row.milestone && String(row.milestone) !== "0" ? `#${row.milestone}` : "");
  pushCell(cells, "Last recurring", formatDateTime(row.last_recurring_date));
  pushCell(cells, "Custom recurring", isTruthy(row.custom_recurring) ? "Yes" : "");
  pushCell(cells, "Cycles", row.cycles != null && String(row.cycles) !== "0" ? String(row.cycles) : "");
  pushCell(cells, "Total cycles", row.total_cycles != null && String(row.total_cycles) !== "0" ? String(row.total_cycles) : "");
  pushCell(cells, "Date finished", formatDateTime(row.datefinished));

  if (cells.length === 0) {
    return (
      <Text className="text-muted text-sm py-4 text-center">
        No activity metadata yet.
      </Text>
    );
  }

  return (
    <View className="px-3 py-2 flex-row flex-wrap">
      {cells.map((c, idx) => (
        <View key={`${c.label}-${idx}`} style={{ width: "50%", paddingVertical: 4, paddingRight: 8 }}>
          <Text className="text-[10px] uppercase text-muted">{c.label}</Text>
          <Text className="text-sm text-foreground" numberOfLines={2}>{c.value}</Text>
        </View>
      ))}
    </View>
  );
}

function pushCell(out: Array<{ label: string; value: string }>, label: string, value: string) {
  const v = (value ?? "").trim();
  if (!v) return;
  out.push({ label, value: v });
}

// ─── Quick action helper ─────────────────────────────────────────────────

async function quickTaskAction(
  id: string,
  endpoint: string,
  method: "POST" | "PUT",
  successMessage: string
) {
  try {
    const headers = await buildAuthHeaders();
    const res = await fetch(`${API_URL}/tasks/${encodeURIComponent(id)}/${endpoint}`, {
      method,
      headers,
      // mark_complete/reopen don't need a body; Perfex accepts an empty {}.
      body: JSON.stringify({}),
    });
    const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"]);
    if (invalidToken) throw new Error("Session expired");
    if (!res.ok) {
      const msg = typeof body === "string" ? body : JSON.stringify(body ?? "");
      throw new Error(`HTTP ${res.status}: ${msg.slice(0, 120)}`);
    }
    if (body && body.status === false) throw new Error(body.message || "Action failed");
    Toast.show({ type: "success", text1: successMessage });
  } catch (err: any) {
    Toast.show({
      type: "error",
      text1: "Action failed",
      text2: err?.message?.slice(0, 90),
    });
  }
}

// ─── Pure helpers ────────────────────────────────────────────────────────

function unwrap(data: any): any {
  if (!data) return data;
  if (data.status === true && data.data)
    return Array.isArray(data.data) ? data.data[0] : data.data;
  if (Array.isArray(data)) return data[0];
  return data;
}

function tabLabel(k: TabKey): string {
  switch (k) {
    case "checklist": return "Checklist";
    case "comments":  return "Comments";
    case "files":     return "Files";
    case "activity":  return "Activity";
  }
}

function isTruthy(v: any): boolean {
  if (v === true || v === 1) return true;
  const s = String(v ?? "").toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function numericOrZero(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(v: any): string {
  const s = String(v ?? "").trim();
  if (!s || s.startsWith("0000-00-00")) return "";
  return s.slice(0, 10);
}

function formatDateTime(v: any): string {
  const s = String(v ?? "").trim();
  if (!s || s.startsWith("0000-00-00")) return "";
  return s.replace("T", " ").slice(0, 16);
}

function formatDuration(v: any): string {
  // Perfex stores total_logged_time as seconds (in some tables) or
  // "HH:MM" in others. Accept both.
  const s = String(v ?? "").trim();
  if (!s || s === "0" || s === "00:00" || s === "00:00:00") return "";
  if (/^\d+$/.test(s)) {
    const total = parseInt(s, 10);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  return s;
}

function parseTags(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinName(first: any, last: any): string {
  return [first, last]
    .map((p) => (p ? String(p).trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function firstName(full: string): string {
  return (full || "").split(/\s+/)[0] || full;
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
