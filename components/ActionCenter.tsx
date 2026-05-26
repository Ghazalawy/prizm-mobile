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
  Platform,
} from "react-native";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL, BASE_URL, staffAvatarUrl } from "@/lib/config";
import { buildAuthHeaders, parseApiResponse } from "@/lib/api";
import { useEffectiveUser } from "@/lib/effective-user";
import { rtlTextStyle } from "@/lib/rtl";
import { colors as prizmColors } from "@/lib/theme";
import {
  useInbox,
  type InboxCategory,
  type InboxItem,
} from "@/lib/queries/inbox";
import {
  inboxKey,
  markRead,
  markAllRead,
  useReadInbox,
} from "@/lib/inbox-read";
import { formatRelativeShort, formatAbsolute } from "@/lib/time";

/**
 * Map a bare Perfex admin path (e.g. "tasks/view/123") to the equivalent
 * native mobile route. Returns null for modules that have no native screen.
 */
const PERFEX_ROUTE_PATTERNS: Array<{ re: RegExp; to: (m: RegExpMatchArray) => string }> = [
  { re: /^(?:admin\/)?tasks\/view\/(\d+)/,                        to: (m) => `/(tabs)/tasks/${m[1]}` },
  { re: /^(?:admin\/)?projects\/view\/(\d+)/,                      to: (m) => `/(tabs)/projects/${m[1]}` },
  { re: /^(?:admin\/)?invoices\/list_invoices\/(\d+)/,             to: (m) => `/(tabs)/invoices/${m[1]}` },
  { re: /^(?:admin\/)?estimates\/list_estimates\/(\d+)/,           to: (m) => `/(tabs)/estimates/${m[1]}` },
  { re: /^(?:admin\/)?proposals\/list_proposals\/(\d+)/,           to: (m) => `/(tabs)/proposals/${m[1]}` },
  { re: /^(?:admin\/)?clients\/client\/(\d+)/,                     to: (m) => `/(tabs)/customers/${m[1]}` },
  { re: /^(?:admin\/)?customers\/client\/(\d+)/,                   to: (m) => `/(tabs)/customers/${m[1]}` },
  { re: /^(?:admin\/)?leads\/index\/(\d+)/,                        to: (m) => `/(tabs)/leads/${m[1]}` },
  { re: /^(?:admin\/)?contracts\/contract\/(\d+)/,                 to: (m) => `/(tabs)/contracts/${m[1]}` },
  { re: /^(?:admin\/)?tickets\/ticket\/(\d+)/,                     to: (m) => `/(tabs)/tickets/${m[1]}` },
  { re: /^(?:admin\/)?expenses\/list_expenses\/(\d+)/,             to: (m) => `/(tabs)/erp/expenses/${m[1]}` },
  { re: /^(?:admin\/)?przpurchase\/Purchase_Requests?\/view[^/]*\/(\d+)/, to: (m) => `/(tabs)/approvals/purchase_request/${m[1]}` },
  { re: /^(?:admin\/)?przpurchase\/Purchase_Order\/view[^/]*\/(\d+)/,     to: (m) => `/(tabs)/approvals/purchase_order/${m[1]}` },
  { re: /^(?:admin\/)?przpurchase\/Payment_Request\/view[^/]*\/(\d+)/,    to: (m) => `/(tabs)/approvals/payment_request/${m[1]}` },
  { re: /^(?:admin\/)?przpurchase\/Expense_Request\/view[^/]*\/(\d+)/,    to: (m) => `/(tabs)/approvals/expense_request/${m[1]}` },
  { re: /^(?:admin\/)?tenders_api\/view\/(\d+)/,                   to: (m) => `/(tabs)/tenders/${m[1]}` },
  { re: /^(?:admin\/)?opportunities_api\/view\/(\d+)/,             to: (m) => `/(tabs)/opportunities/${m[1]}` },
  { re: /^(?:admin\/)?reports\/view\/(\d+)/,                       to: (m) => `/(tabs)/reports/${m[1]}` },
  { re: /^(?:admin\/)?knowledge_base\/article\/(\d+)/,             to: (m) => `/(tabs)/knowledge/${m[1]}` },
];

function resolveToNativeRoute(path: string): string | null {
  const cleaned = path.replace(/^\/+/, "");
  for (const { re, to } of PERFEX_ROUTE_PATTERNS) {
    const m = cleaned.match(re);
    if (m) return to(m);
  }
  return null;
}

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
  { key: "todos", label: "To Do", icon: "checkbox-outline", color: "#F59E0B" },
  { key: "mentions", label: "Mentions", icon: "list-outline", color: "#CA8A04" },
  { key: "notifications", label: "Notifications", icon: "notifications-outline", color: "#E65100" },
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
          width: 36,
          height: 42,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: 2,
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
  const headers = await buildAuthHeaders();
  const url = action.endpoint.startsWith("http")
    ? action.endpoint
    : `${API_URL}/${action.endpoint.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method: action.method || "POST",
    headers,
    body: action.body ? JSON.stringify(action.body) : undefined,
  });
  const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"]);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) {
    const txt = typeof body === "string" ? body : JSON.stringify(body ?? "");
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 120)}`);
  }
  if (body && body.status === false) throw new Error(body.message || "Action failed");
}

function InboxRow({
  item,
  unread,
  onRunAction,
  onClose,
}: {
  item: InboxItem;
  /** Pre-computed: parent does the lookup once per render against the
   *  read-set so each row doesn't re-query the store. */
  unread: boolean;
  onRunAction: (a: NonNullable<InboxItem["actions"]>[number]) => Promise<void>;
  /** Called before navigation so the floating popover doesn't linger
   *  behind the destination screen. */
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const handleTap = () => {
    markRead(inboxKey(item.type, item.id));
    const link = item.deeplink;
    if (!link) {
      onClose();
      return;
    }
    onClose();
    if (link.startsWith("/(tabs)/")) {
      router.push(link as any);
      return;
    }
    if (link.startsWith("http://") || link.startsWith("https://")) {
      Linking.openURL(link).catch(() => undefined);
      return;
    }
    const nativeRoute = resolveToNativeRoute(link);
    if (nativeRoute) {
      router.push(nativeRoute as any);
      return;
    }
    const url = `${BASE_URL}/MS/admin/${link.replace(/^\/+/, "")}`;
    Linking.openURL(url).catch(() => undefined);
  };

  const priorityColor =
    item.priority === "high"
      ? "#DC2626"
      : item.priority === "low"
      ? "#94A3B8"
      : "#475569";

  // Compact "3h" / "2d" / "Sep 12" label for the right corner.
  // Source order: triggered_at (backend ISO) → due_at (futures show as
  // absolute date). Falls back to null which suppresses the badge.
  const relLabel = formatRelativeShort(item.triggered_at ?? item.due_at);
  const absLabel = formatAbsolute(item.triggered_at ?? item.due_at);

  return (
    <Pressable
      onPress={handleTap}
      // Long-press to surface the exact timestamp — mirrors the web
      // tooltip pattern ("25-05-2026 5:21 PM"). No-op if no time data.
      onLongPress={absLabel ? () => Toast.show({
        type: "info", text1: item.title.slice(0, 60), text2: absLabel,
      }) : undefined}
      android_ripple={{ color: "#E2E8F0" }}
      className="px-4 py-3 border-b border-slate-100"
      // Unread = very light blue wash so the eye picks up "needs attention"
      // at a glance. Read rows reset to white so the contrast does the work.
      style={unread ? { backgroundColor: "#EFF6FF" } : undefined}
    >
      <View className="flex-row items-start gap-3">
        {/* Unread dot — drops away once tapped. Reserve the slot when read
            so the text doesn't jump horizontally between states. */}
        {unread ? (
          <View
            className="w-2 h-2 mt-2 rounded-full"
            style={{ backgroundColor: priorityColor }}
          />
        ) : (
          <View className="w-2 mt-2" />
        )}
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text
              className={`text-sm flex-1 ${unread ? "font-bold" : "font-normal"} text-foreground`}
              numberOfLines={2}
              style={rtlTextStyle(item.title)}
            >
              {item.title}
            </Text>
            {/* Right-aligned compact time-ago badge. Mirrors the web's
                'hrs ago' label but in the Gmail-style short form so it
                doesn't crowd the row. Long-press the row to see the
                full timestamp. */}
            {relLabel ? (
              <Text
                className="text-[11px] text-muted shrink-0 mt-0.5"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {relLabel}
              </Text>
            ) : null}
          </View>
          {item.subtitle ? (
            <Text
              className={`text-xs mt-0.5 ${unread ? "text-foreground/80" : "text-muted"}`}
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
                    <ActivityIndicator size="small" color={a.destructive ? "#DC2626" : prizmColors.primary} />
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
  // Renders the IMPERSONATED user when in a View-As session, real user
  // otherwise. Avatar in top-right thus reflects who you're acting as,
  // matching the rest of the UI's perspective.
  const user = useEffectiveUser();
  const [avatarBroken, setAvatarBroken] = useState(false);
  const insets = useSafeAreaInsets();
  const readKeys = useReadInbox();
  // On Android, Modal with statusBarTranslucent=true uses window-absolute
  // coords (same as measureInWindow). On iOS, Modal already uses window
  // coords. So no offset needed in either case — but if a device reports
  // a custom translucent status bar height that React Native didn't pick
  // up via insets.top, fall back to StatusBar.currentHeight as a safety
  // net for the popover y math.
  // Empirically on Android with statusBarTranslucent={true} on the Modal:
  //   - Modal coord origin is at SCREEN top (y=0 = under status bar)
  //   - But measureInWindow() returns the bell's y WITHOUT the status bar
  //     offset (window = below status bar in the parent activity layout)
  //   - So we add insets.top to anchor.y so the popover lands BELOW the
  //     bell, not behind the status bar.
  // On iOS this isn't a problem (insets.top is the safe-area top, Modal
  // doesn't change coord systems).
  const statusBarOffset = Platform.OS === "android" ? insets.top : 0;

  // Approval badge follows the web header's pending-action count from
  // tblapprovals. Local read-state may soften a row after it is tapped,
  // but it must not reduce the approval counter; only the server-side
  // approval notification state does that. Other categories keep the
  // local unread behavior.
  const counts = useMemo(() => {
    const unreadFor = (cat: InboxCategory): number => {
      const rows = q.data?.[cat] ?? [];
      let n = 0;
      for (const it of rows) {
        if (!readKeys.has(inboxKey(it.type, it.id))) n++;
      }
      return n;
    };
    return {
      approvals: Number(q.data?.summary?.approvals ?? unreadFor("approvals")),
      todos: Number(q.data?.summary?.todos ?? unreadFor("todos")),
      tasks: unreadFor("tasks"),
      mentions: unreadFor("mentions"),
      notifications: unreadFor("notifications"),
      compliance: unreadFor("compliance"),
    };
  }, [q.data, readKeys]);

  const total = counts.approvals + counts.todos + counts.mentions + counts.notifications + counts.compliance;
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
  useEffect(() => {
    setAvatarBroken(false);
  }, [avatarUrl]);

  // Popover anchor math — center under the tapped icon, clipped to screen.
  //
  // measureInWindow returns coords in the same space the Modal renders in
  // (when statusBarTranslucent=true the Modal covers the full window, so
  // anchor.y is correct as-is). On older Android builds without
  // statusBarTranslucent, the Modal positions BELOW the status bar — in
  // that case we'd need to subtract insets.top from anchor.y. We use
  // statusBarTranslucent below so the simple math works everywhere.
  const screenW = Dimensions.get("window").width;
  const screenH = Dimensions.get("window").height;
  // Tail: the rough bottom edge of the bell icon in window coords. The
  // gap is small (8px) so the popover visually "grows out of" the bell.
  const anchorBottom = anchor ? anchor.y + anchor.h : 0;
  const popoverTop = anchor
    ? anchorBottom + POPOVER_GAP_FROM_ANCHOR + statusBarOffset
    : 0;
  // Cap maxHeight so the popover never spills under the bottom tab bar.
  const popoverAvailableHeight = anchor
    ? Math.max(220, screenH - popoverTop - 80)
    : POPOVER_MAX_HEIGHT;
  const popoverEffectiveMaxHeight = Math.min(POPOVER_MAX_HEIGHT, popoverAvailableHeight);
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
  // Clamp so it stays visually attached to the popover edge even when the
  // bell is in the far-right corner (popover is left-clipped).
  const arrowLeft = anchor
    ? Math.max(12, Math.min(POPOVER_WIDTH - 24, anchor.x + anchor.w / 2 - popoverLeft - 7))
    : 0;

  // Compute unread counts per category once per render so each row doesn't
  // run an O(n) lookup. Also drives the "Mark all read" affordance.
  const unreadInOpen = openCategory && openCategory !== "approvals"
    ? itemsForOpen.filter((it) => !readKeys.has(inboxKey(it.type, it.id))).length
    : 0;
  const markAllOpenRead = useCallback(() => {
    if (!openCategory || openCategory === "approvals") return;
    const keys = itemsForOpen.map((it) => inboxKey(it.type, it.id));
    markAllRead(keys);
  }, [openCategory, itemsForOpen]);

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
            style={{ width: 32, height: 32, marginRight: 7 }}
            resizeMode="contain"
          />
          <Text
            className="text-base font-bold text-foreground"
            numberOfLines={1}
            style={{ letterSpacing: 0.5, flexShrink: 1 }}
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

        {/* Right: search + action icons + profile avatar */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/search" as any)}
            activeOpacity={0.6}
            hitSlop={6}
            accessibilityLabel="Search"
            style={{
              width: 36,
              height: 42,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="search-outline" size={22} color="#475569" />
          </TouchableOpacity>
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
        // CRITICAL: with statusBarTranslucent the Modal covers the whole
        // window. measureInWindow returns window-absolute coords, so the
        // popover's "top" lines up with the bell's actual on-screen y. The
        // previous behaviour (Modal positioned below the status bar) made
        // the popover paint ON TOP of the bell on devices where the status
        // bar height differed from RN's default inset.
        statusBarTranslucent={Platform.OS === "android"}
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
              maxHeight: popoverEffectiveMaxHeight,
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
                maxHeight: popoverEffectiveMaxHeight,
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                  <Ionicons
                    name={CATEGORIES.find((c) => c.key === openCategory)!.icon}
                    size={16}
                    color={CATEGORIES.find((c) => c.key === openCategory)!.color}
                  />
                  <Text className="text-sm font-bold text-foreground capitalize">
                    {CATEGORIES.find((c) => c.key === openCategory)?.label ?? openCategory}
                  </Text>
                  <Text className="text-xs text-muted">({itemsForOpen.length})</Text>
                </View>
                {unreadInOpen > 0 ? (
                  <TouchableOpacity
                    onPress={markAllOpenRead}
                    hitSlop={6}
                    style={{ marginRight: 10 }}
                    accessibilityLabel={`Mark all ${unreadInOpen} as read`}
                  >
                    <Text className="text-[11px] font-medium text-primary">
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                ) : null}
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
                <ScrollView style={{ maxHeight: popoverEffectiveMaxHeight - 50 }}>
                  {itemsForOpen.map((it) => (
                    <InboxRow
                      key={`${it.type}-${it.id}`}
                      item={it}
                      unread={!readKeys.has(inboxKey(it.type, it.id))}
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
