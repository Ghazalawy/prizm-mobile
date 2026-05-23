import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useState, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL } from "@/lib/config";
import { getAuthToken } from "@/lib/auth";
import { parseApiResponse } from "@/lib/api";
import {
  useInbox,
  type InboxCategory,
  type InboxItem,
} from "@/lib/queries/inbox";

/**
 * Action Center — the persistent "what needs my attention" strip pinned
 * at the top of every authenticated screen. Renders 4 chips with badge
 * counts; tap a chip to open a bottom sheet listing items in that
 * category. Each item drills into the relevant detail screen, or
 * exposes inline quick actions (approve / reject).
 *
 * Data: useInbox() (lib/queries/inbox.ts) polls GET /api/inbox every
 * 90 s. While the backend is being deployed, the hook returns an empty
 * shape and the strip collapses to "All caught up".
 */

type CategoryMeta = {
  key: InboxCategory;
  label: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  color: string;
};

const CATEGORIES: CategoryMeta[] = [
  { key: "approvals", label: "Approvals", icon: "checkmark-done-circle-outline", color: "#DC2626" },
  { key: "tasks", label: "Tasks", icon: "list-outline", color: "#F59E0B" },
  { key: "mentions", label: "Mentions", icon: "at-outline", color: "#0284C7" },
  { key: "compliance", label: "Compliance", icon: "shield-checkmark-outline", color: "#16A34A" },
];

function Chip({
  meta,
  count,
  onPress,
}: {
  meta: CategoryMeta;
  count: number;
  onPress: () => void;
}) {
  const hot = count > 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full mr-1.5"
      style={{
        backgroundColor: hot ? `${meta.color}1A` : "#F1F5F9",
      }}
    >
      <Ionicons name={meta.icon} size={14} color={hot ? meta.color : "#64748B"} />
      <Text
        className="text-xs font-medium"
        style={{ color: hot ? meta.color : "#475569" }}
      >
        {meta.label}
      </Text>
      {hot ? (
        <View
          className="min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center"
          style={{ backgroundColor: meta.color }}
        >
          <Text className="text-white text-[10px] font-bold">{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

async function runQuickAction(action: NonNullable<InboxItem["actions"]>[number]) {
  const token = await getAuthToken();
  const url = action.endpoint.startsWith("http")
    ? action.endpoint
    : `${API_URL}/${action.endpoint.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method: action.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { authtoken: token } : {}),
    },
    body: action.body ? JSON.stringify(action.body) : undefined,
  });
  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) {
    const txt = typeof body === "string" ? body : JSON.stringify(body ?? "");
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 120)}`);
  }
  if (body && body.status === false) throw new Error(body.message || "Action failed");
}

function InboxRow({
  item,
  onRunAction,
}: {
  item: InboxItem;
  onRunAction: (a: NonNullable<InboxItem["actions"]>[number]) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const handleTap = () => {
    if (item.deeplink) {
      router.push(item.deeplink as any);
    }
  };

  const priorityColor =
    item.priority === "high"
      ? "#DC2626"
      : item.priority === "low"
      ? "#94A3B8"
      : "#475569";

  return (
    <Pressable
      onPress={handleTap}
      android_ripple={{ color: "#E2E8F0" }}
      className="px-4 py-3 border-b border-slate-100"
    >
      <View className="flex-row items-start gap-3">
        <View
          className="w-2 h-2 mt-2 rounded-full"
          style={{ backgroundColor: priorityColor }}
        />
        <View className="flex-1">
          <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
          {item.actions && item.actions.length > 0 ? (
            <View className="flex-row gap-2 mt-2">
              {item.actions.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  disabled={!!busy}
                  onPress={async () => {
                    setBusy(a.key);
                    try {
                      await onRunAction(a);
                      Toast.show({ type: "success", text1: `${a.title} ✓` });
                    } catch (err: any) {
                      Toast.show({
                        type: "error",
                        text1: a.title + " failed",
                        text2: err?.message?.slice(0, 80),
                      });
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md ${
                    a.destructive ? "bg-rose-50" : "bg-sky-50"
                  }`}
                >
                  {busy === a.key ? (
                    <ActivityIndicator size="small" color={a.destructive ? "#DC2626" : "#0284C7"} />
                  ) : (
                    <Text
                      className={`text-xs font-medium ${
                        a.destructive ? "text-rose-600" : "text-sky-600"
                      }`}
                    >
                      {a.title}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
        {item.deeplink ? (
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        ) : null}
      </View>
    </Pressable>
  );
}

export function ActionCenter() {
  const [openCategory, setOpenCategory] = useState<InboxCategory | null>(null);
  const q = useInbox();
  const qc = useQueryClient();

  const counts = useMemo(
    () => ({
      approvals: q.data?.summary.approvals ?? 0,
      tasks: q.data?.summary.tasks ?? 0,
      mentions: q.data?.summary.mentions ?? 0,
      compliance: q.data?.summary.compliance ?? 0,
    }),
    [q.data]
  );

  const total = counts.approvals + counts.tasks + counts.mentions + counts.compliance;
  const itemsForOpen: InboxItem[] = openCategory ? (q.data?.[openCategory] ?? []) : [];

  const runAction = useCallback(
    async (a: NonNullable<InboxItem["actions"]>[number]) => {
      await runQuickAction(a);
      // Refresh inbox + any related module's queries (best-effort).
      await qc.invalidateQueries({ queryKey: ["inbox"] });
    },
    [qc]
  );

  return (
    <>
      {/* Strip — always rendered, very thin */}
      <View
        className="flex-row items-center px-3 py-2 bg-white border-b border-slate-200"
        style={{ minHeight: 44 }}
      >
        <Ionicons name="notifications-outline" size={18} color="#0F172A" />
        <Text className="text-xs font-semibold text-foreground ml-2 mr-3">
          Inbox
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center" }}
          className="flex-1"
        >
          {total === 0 && !q.isLoading ? (
            <Text className="text-xs text-muted">All caught up</Text>
          ) : (
            CATEGORIES.map((cat) => (
              <Chip
                key={cat.key}
                meta={cat}
                count={counts[cat.key]}
                onPress={() => setOpenCategory(cat.key)}
              />
            ))
          )}
        </ScrollView>
        {q.isFetching && total > 0 ? (
          <ActivityIndicator size="small" color="#94A3B8" />
        ) : null}
      </View>

      {/* Bottom sheet (modal) */}
      <Modal
        visible={openCategory !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenCategory(null)}
      >
        <Pressable
          onPress={() => setOpenCategory(null)}
          className="flex-1 bg-black/40"
        >
          <View className="flex-1" />
        </Pressable>
        <View
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl"
          style={{ maxHeight: "75%" }}
        >
          {openCategory ? (
            <View className="flex-1">
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200">
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name={CATEGORIES.find((c) => c.key === openCategory)!.icon}
                    size={20}
                    color={CATEGORIES.find((c) => c.key === openCategory)!.color}
                  />
                  <Text className="text-base font-bold text-foreground capitalize">
                    {openCategory}
                  </Text>
                  <Text className="text-xs text-muted">({itemsForOpen.length})</Text>
                </View>
                <TouchableOpacity onPress={() => setOpenCategory(null)} className="p-2">
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>
              {itemsForOpen.length === 0 ? (
                <View className="flex-1 items-center justify-center p-6">
                  <Ionicons name="checkmark-circle-outline" size={36} color="#16A34A" />
                  <Text className="text-sm text-muted mt-2">Nothing here yet</Text>
                </View>
              ) : (
                <ScrollView>
                  {itemsForOpen.map((it) => (
                    <InboxRow
                      key={`${it.type}-${it.id}`}
                      item={it}
                      onRunAction={runAction}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
