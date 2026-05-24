import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { useState, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL, staffAvatarUrl } from "@/lib/config";
import { getAuthToken } from "@/lib/auth";
import { parseApiResponse } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth-context";
import {
  useInbox,
  type InboxCategory,
  type InboxItem,
} from "@/lib/queries/inbox";

/**
 * Top bar (Action Center) — pinned at the top of every authenticated screen.
 * Mirrors the Perfex web admin chrome: brand on the left, action icons on
 * the right. Each icon shows a red badge with its inbox count; tapping
 * opens a bottom sheet with the items in that category. The avatar at the
 * far right routes to Settings (where Sign Out lives).
 *
 * Data: useInbox() (lib/queries/inbox.ts) polls GET /api/inbox every 90 s.
 * Drill-down sheet uses the same data and quick-action runner as before —
 * only the trigger UI changed (chips → icons).
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
  { key: "mentions", label: "Mentions", icon: "notifications-outline", color: "#0284C7" },
  { key: "compliance", label: "Compliance", icon: "shield-checkmark-outline", color: "#16A34A" },
];

/**
 * Single icon button in the top bar. Shows the muted icon when there's
 * nothing in this category, the category's colored icon + a red dot
 * badge with the count when there is.
 */
function HeaderIcon({
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
      activeOpacity={0.6}
      hitSlop={6}
      accessibilityLabel={`${meta.label}${count > 0 ? `, ${count} pending` : ""}`}
      style={{
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 2,
      }}
    >
      <Ionicons
        name={meta.icon}
        size={22}
        color={hot ? meta.color : "#475569"}
      />
      {hot ? (
        <View
          style={{
            position: "absolute",
            top: 4,
            right: 2,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 3,
            borderRadius: 8,
            backgroundColor: "#DC2626",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: "#FFFFFF",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "700" }}>
            {count > 99 ? "99+" : count}
          </Text>
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
  const user = useCurrentUser();

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

  // First letter of the user's first name → fallback avatar when there's
  // no profile_image on record.
  const initial =
    (user?.firstname?.[0] || user?.email?.[0] || "?").toUpperCase();
  const avatarUrl = staffAvatarUrl(user?.staffid, user?.profile_image, "thumb");

  return (
    <>
      {/* Top bar — brand on the left, action icons on the right. Mirrors
          the Perfex web admin chrome so users hit the same affordances on
          web and mobile. */}
      <View
        className="flex-row items-center bg-white border-b border-slate-200"
        style={{ minHeight: 48, paddingHorizontal: 12 }}
      >
        {/* Left: brand */}
        <View className="flex-row items-center flex-1">
          <Image
            source={require("@/assets/images/prizm_logo.png")}
            style={{ width: 30, height: 30, marginRight: 8 }}
            resizeMode="contain"
          />
          <Text
            className="text-base font-bold text-foreground"
            style={{ letterSpacing: 0.2 }}
          >
            Prizm
          </Text>
          {q.isFetching && total > 0 ? (
            <ActivityIndicator
              size="small"
              color="#94A3B8"
              style={{ marginLeft: 8 }}
            />
          ) : null}
        </View>

        {/* Right: action icons + profile avatar */}
        <View className="flex-row items-center">
          {CATEGORIES.map((cat) => (
            <HeaderIcon
              key={cat.key}
              meta={cat}
              count={counts[cat.key]}
              onPress={() => setOpenCategory(cat.key)}
            />
          ))}
          {/* Profile / avatar — taps through to Settings. */}
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
            hitSlop={6}
            accessibilityLabel="Profile"
            style={{
              marginLeft: 6,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: "#E2E8F0",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 30, height: 30 }}
              />
            ) : (
              <Text style={{ color: "#0F172A", fontWeight: "700", fontSize: 12 }}>
                {initial}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
