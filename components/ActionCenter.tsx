import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
} from "react-native";
import { useState, useMemo, useCallback, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL, BASE_URL, staffAvatarUrl } from "@/lib/config";
import { getAuthToken } from "@/lib/auth";
import { parseApiResponse } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth-context";
import { rtlTextStyle } from "@/lib/rtl";
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

/** Screen-coord rect of an anchor element, captured at tap time so the
 *  popover knows where to float from. */
type AnchorRect = { x: number; y: number; w: number; h: number };

/**
 * Single icon button in the top bar. Shows the muted icon when there's
 * nothing in this category, the category's colored icon + a red dot
 * badge with the count when there is. On press, measures its own screen
 * position and passes it up so the popover can anchor to it.
 */
function HeaderIcon({
  meta,
  count,
  onPress,
}: {
  meta: CategoryMeta;
  count: number;
  onPress: (anchor: AnchorRect) => void;
}) {
  const hot = count > 0;
  const ref = useRef<View | null>(null);

  const handlePress = () => {
    const node = ref.current;
    if (!node) return;
    node.measureInWindow((x, y, w, h) => {
      onPress({ x, y, w, h });
    });
  };

  return (
    <View ref={ref} collapsable={false}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.6}
        hitSlop={6}
        accessibilityLabel={`${meta.label}${count > 0 ? `, ${count} pending` : ""}`}
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: 4,
        }}
      >
        <Ionicons
          name={meta.icon}
          size={24}
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
    </View>
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
  onClose,
}: {
  item: InboxItem;
  onRunAction: (a: NonNullable<InboxItem["actions"]>[number]) => Promise<void>;
  /** Called before navigation so the floating popover doesn't linger
   *  behind the destination screen. */
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  /**
   * Tap dispatcher. Inbox items carry one of three deeplink shapes:
   *
   *   1. Mobile route — starts with "/(tabs)/" → router.push (in-app nav)
   *   2. Full URL    — starts with "http(s)://" → Linking.openURL (system browser)
   *   3. Bare path   — Perfex internal path (e.g. "przpurchase/Payment_Request/view_payment_request/1124")
   *                    Prefix with BASE_URL + "/MS/" + "admin/" and open in browser.
   *                    This is the graceful fallback for modules that don't
   *                    yet have a native mobile screen (materials/payment
   *                    requests today).
   *
   * Always closes the popover first — otherwise it sits on top of the
   * destination screen and the user has to tap-out to dismiss.
   */
  const handleTap = () => {
    const link = item.deeplink;
    if (!link) return;
    onClose();
    if (link.startsWith("/(tabs)/")) {
      router.push(link as any);
      return;
    }
    if (link.startsWith("http://") || link.startsWith("https://")) {
      Linking.openURL(link).catch(() => undefined);
      return;
    }
    // Bare Perfex path → open in web view
    const url = `${BASE_URL}/MS/admin/${link.replace(/^\/+/, "")}`;
    Linking.openURL(url).catch(() => undefined);
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
          <Text
            className="text-sm font-medium text-foreground"
            numberOfLines={2}
            style={rtlTextStyle(item.title)}
          >
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text
              className="text-xs text-muted mt-0.5"
              numberOfLines={1}
              style={rtlTextStyle(item.subtitle)}
            >
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

// Popover sizing — width clipped to the screen, height capped so it
// never crowds the bottom tabs.
const POPOVER_WIDTH = 320;
const POPOVER_MAX_HEIGHT = 420;
const POPOVER_GAP_FROM_ANCHOR = 8;
const POPOVER_SCREEN_MARGIN = 8;

export function ActionCenter() {
  const [openCategory, setOpenCategory] = useState<InboxCategory | null>(null);
  // Screen-coord rect of the icon that opened the current popover.
  // Captured at tap time via View.measureInWindow so the popover floats
  // directly under that specific icon — not a generic bottom sheet.
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const q = useInbox();
  const qc = useQueryClient();
  const user = useCurrentUser();
  const [avatarBroken, setAvatarBroken] = useState(false);

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

  const openWithAnchor = useCallback(
    (cat: InboxCategory) => (rect: AnchorRect) => {
      setAnchor(rect);
      setOpenCategory(cat);
    },
    [],
  );

  const closePopover = useCallback(() => {
    setOpenCategory(null);
    setAnchor(null);
  }, []);

  // First letter of the user's first name → fallback avatar when there's
  // no profile_image on record (or when the Image fetch fails).
  const initial =
    (user?.firstname?.[0] || user?.email?.[0] || "?").toUpperCase();
  const avatarUrl = staffAvatarUrl(user?.staffid, user?.profile_image, "thumb");

  // Popover anchor math — center under the tapped icon, clipped to screen.
  const screenW = Dimensions.get("window").width;
  const popoverTop = anchor ? anchor.y + anchor.h + POPOVER_GAP_FROM_ANCHOR : 0;
  const popoverLeft = anchor
    ? Math.max(
        POPOVER_SCREEN_MARGIN,
        Math.min(
          screenW - POPOVER_WIDTH - POPOVER_SCREEN_MARGIN,
          anchor.x + anchor.w / 2 - POPOVER_WIDTH / 2,
        ),
      )
    : 0;
  // X-position of the little arrow pointing at the icon, relative to popover.
  const arrowLeft = anchor
    ? Math.max(12, Math.min(POPOVER_WIDTH - 24, anchor.x + anchor.w / 2 - popoverLeft - 6))
    : 0;

  return (
    <>
      {/* Top bar — brand on the left, action icons on the right. Mirrors
          the Perfex web admin chrome so users hit the same affordances on
          web and mobile. */}
      <View
        className="flex-row items-center bg-white border-b border-slate-200"
        style={{ minHeight: 56, paddingHorizontal: 12 }}
      >
        {/* Left: brand — logo + "PRIZM ENERGY" wordmark, the whole block
            bounces back to Home so the user can always escape to dashboard. */}
        <Pressable
          onPress={() => router.push("/(tabs)/" as any)}
          accessibilityRole="link"
          accessibilityLabel="Home"
          className="flex-row items-center flex-1"
          hitSlop={6}
        >
          <Image
            source={require("@/assets/images/prizm_logo.png")}
            style={{ width: 34, height: 34, marginRight: 8 }}
            resizeMode="contain"
          />
          <Text
            className="text-base font-bold text-foreground"
            style={{ letterSpacing: 0.5 }}
          >
            PRIZM ENERGY
          </Text>
          {q.isFetching && total > 0 ? (
            <ActivityIndicator
              size="small"
              color="#94A3B8"
              style={{ marginLeft: 8 }}
            />
          ) : null}
        </Pressable>

        {/* Right: action icons + profile avatar */}
        <View className="flex-row items-center">
          {CATEGORIES.map((cat) => (
            <HeaderIcon
              key={cat.key}
              meta={cat}
              count={counts[cat.key]}
              onPress={openWithAnchor(cat.key)}
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
            {avatarUrl && !avatarBroken ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 30, height: 30 }}
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <Text style={{ color: "#0F172A", fontWeight: "700", fontSize: 12 }}>
                {initial}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating popover — anchored to the tapped icon's screen position
          (measureInWindow at tap time), not a bottom sheet. Mirrors the
          web admin's dropdown UX where notifications inflate out of the
          icon itself. */}
      <Modal
        visible={openCategory !== null}
        transparent
        animationType="fade"
        onRequestClose={closePopover}
      >
        <Pressable
          onPress={closePopover}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.15)" }}
        >
          <View style={{ flex: 1 }} />
        </Pressable>
        {openCategory && anchor ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              top: popoverTop,
              left: popoverLeft,
              width: POPOVER_WIDTH,
              maxHeight: POPOVER_MAX_HEIGHT,
            }}
          >
            {/* Little arrow pointing up at the icon */}
            <View
              style={{
                position: "absolute",
                top: -7,
                left: arrowLeft,
                width: 14,
                height: 14,
                backgroundColor: "white",
                transform: [{ rotate: "45deg" }],
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowOffset: { width: 0, height: -2 },
                shadowRadius: 4,
              }}
            />
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 14,
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowOffset: { width: 0, height: 6 },
                shadowRadius: 16,
                elevation: 12,
                overflow: "hidden",
                maxHeight: POPOVER_MAX_HEIGHT,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E2E8F0",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons
                    name={CATEGORIES.find((c) => c.key === openCategory)!.icon}
                    size={16}
                    color={CATEGORIES.find((c) => c.key === openCategory)!.color}
                  />
                  <Text className="text-sm font-bold text-foreground capitalize">
                    {openCategory}
                  </Text>
                  <Text className="text-xs text-muted">({itemsForOpen.length})</Text>
                </View>
                <TouchableOpacity onPress={closePopover} hitSlop={8}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
              {itemsForOpen.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 28 }}>
                  <Ionicons name="checkmark-circle-outline" size={30} color="#16A34A" />
                  <Text className="text-xs text-muted mt-2">Nothing here yet</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: POPOVER_MAX_HEIGHT - 50 }}>
                  {itemsForOpen.map((it) => (
                    <InboxRow
                      key={`${it.type}-${it.id}`}
                      item={it}
                      onRunAction={runAction}
                      onClose={closePopover}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        ) : null}
      </Modal>
    </>
  );
}
