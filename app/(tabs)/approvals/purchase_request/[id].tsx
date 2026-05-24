import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Share,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { usePRApproval, type PRApproval } from "@/lib/queries/purchase-request";
import { ApprovalHeader } from "@/components/approvals/ApprovalHeader";
import { ApprovalTimeline } from "@/components/approvals/ApprovalTimeline";
import { ApprovalActionPanel } from "@/components/approvals/ApprovalActionPanel";
import { InfoRow } from "@/components/approvals/InfoRow";
import { rtlTextStyle } from "@/lib/rtl";
import { BASE_URL } from "@/lib/config";

/**
 * Native Purchase Request approval screen.
 *
 * Replaces the generic CRUD detail page for PRs surfaced via approval
 * notifications. Renders the request header, line items, approval
 * workflow + history, and an action panel. v1 is READ-ONLY for the
 * approve/reject mutation (web fallback) — see ApprovalActionPanel
 * for the rationale.
 *
 * Routed from:
 *   - PR notifications (Inbox_api maps przpurchase/ag_view_purchase_request/N
 *     to /(tabs)/approvals/purchase_request/N)
 *   - Approval popover Approve rows (same deeplink)
 */
export default function PurchaseRequestApprovalScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const idNum = Number(params.id);
  const validId = Number.isFinite(idNum) && idNum > 0 ? idNum : null;
  const q = usePRApproval(validId);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  // Hide the default Stack header everywhere — we render a compact inline
  // back+title+share bar inside each render branch instead. The Stack header
  // was rendering a tall white "PR-1666" container that ate vertical space.
  const stackHeaderHidden = <Stack.Screen options={{ headerShown: false }} />;

  if (!validId) {
    return (
      <>
        {stackHeaderHidden}
        <View className="flex-1 items-center justify-center bg-surface px-6">
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <Text className="text-sm text-muted mt-2 text-center">
            Invalid request id.
          </Text>
        </View>
      </>
    );
  }

  if (q.isLoading) {
    return (
      <>
        {stackHeaderHidden}
        <View className="flex-1 items-center justify-center bg-surface">
          <ActivityIndicator color="#0284C7" />
        </View>
      </>
    );
  }

  if (q.isError || !q.data) {
    return (
      <>
        {stackHeaderHidden}
        <View className="flex-1 items-center justify-center bg-surface px-6">
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <Text className="text-sm text-muted mt-2 text-center">
            {(q.error as any)?.message || "Couldn't load this purchase request."}
          </Text>
        </View>
      </>
    );
  }

  const { request, line_items, stages, history, viewer } = q.data;
  const code =
    (request.prefix || "PR-") + (request.number != null ? request.number : request.id);

  // Did anyone reject this PR already? Drives the status pill colour.
  const rejected = history.some((h) => (h.status || "").toLowerCase().includes("reject"));
  const finalStage = stages.find((s) => s.is_final);
  const isFinal = finalStage && finalStage.id === viewer.current_status;

  const tone = rejected
    ? "rejected"
    : viewer.is_current_approver
    ? "your-turn"
    : isFinal
    ? "approved"
    : "pending";
  const statusLabel = rejected
    ? "Rejected"
    : viewer.is_current_approver
    ? "Your turn to approve"
    : isFinal
    ? "Fully approved"
    : "In approval workflow";

  // Line-item totals — sum subtotals defensively (server values can be string
  // decimals or null).
  const totalFromItems = line_items.reduce((acc, li) => {
    const v = Number(li.subtotal);
    return acc + (Number.isFinite(v) ? v : 0);
  }, 0);
  const displayedTotal = Number(request.total_amount) || totalFromItems;

  const requestedAt = request.requested_date
    ? new Date(request.requested_date.replace(" ", "T")).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleShare = async () => {
    const summary =
      `${code} · ${request.title || "Untitled"}\n` +
      `Requested by ${request.requester_name?.trim() || `staff #${request.staff_id}`}\n` +
      (displayedTotal ? `Total: ${displayedTotal.toLocaleString()}\n` : "") +
      `Status: ${statusLabel}\n` +
      `${BASE_URL}/MS/admin/przpurchase/ag_view_purchase_request/${request.id}`;
    try {
      await Share.share({ title: code, message: summary });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      {stackHeaderHidden}
      <View className="flex-1 bg-surface">
        {/* Inline header bar — replaces the bulky Stack header. Same height
            as the Action Center top bar above so they read as one row. */}
        <View
          className="flex-row items-center px-2 py-2 bg-surface"
          style={{ minHeight: 44 }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={10}
            className="p-2"
          >
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text
            className="text-base font-bold text-foreground flex-1"
            numberOfLines={1}
            style={rtlTextStyle(code)}
          >
            {code}
          </Text>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={10}
            className="p-2"
            accessibilityLabel="Share"
          >
            <Ionicons name="share-social-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="p-3"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
        }
      >
        <ApprovalHeader
          title={`${code} · ${request.title || "Untitled request"}`}
          subtitle={`Requested by ${request.requester_name?.trim() || `staff #${request.staff_id}`}`}
          statusLabel={statusLabel}
          tone={tone}
        />

        {/* Header info */}
        <View className="bg-white rounded-2xl px-4 py-2 mb-3 shadow-sm">
          <InfoRow label="Requested" value={requestedAt || "—"} />
          <InfoRow label="Total" value={displayedTotal ? displayedTotal.toLocaleString() : "—"} />
          {request.rel_type ? (
            <InfoRow label="Type" value={request.rel_type} />
          ) : null}
          {request.notes ? (
            <InfoRow label="Notes" value={request.notes} numberOfLines={6} />
          ) : null}
        </View>

        {/* Line items */}
        <View className="bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm">
          <Text className="text-xs uppercase tracking-wide text-muted mb-2">
            Line items ({line_items.length})
          </Text>
          {line_items.length === 0 ? (
            <Text className="text-sm text-muted py-2">No items on this request.</Text>
          ) : (
            line_items.map((li, idx) => {
              const qty = Number(li.qty) || 0;
              const rate = Number(li.rate) || 0;
              const sub = Number(li.subtotal) || qty * rate;
              return (
                <View
                  key={li.id ?? idx}
                  className="py-2 border-b border-slate-100 last:border-0"
                >
                  <Text
                    className="text-sm font-medium text-foreground"
                    numberOfLines={2}
                    style={rtlTextStyle(li.name)}
                  >
                    {li.name || "Untitled item"}
                  </Text>
                  {li.spec ? (
                    <Text
                      className="text-xs text-muted mt-0.5"
                      numberOfLines={2}
                      style={rtlTextStyle(li.spec)}
                    >
                      {li.spec}
                    </Text>
                  ) : null}
                  <View className="flex-row items-center mt-1">
                    <Text className="text-xs text-muted">
                      {qty.toLocaleString()} {li.item_unit || ""} × {rate.toLocaleString()}
                    </Text>
                    <Text className="text-xs font-semibold text-foreground ml-auto">
                      {sub.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Workflow timeline */}
        <ApprovalTimeline
          stages={stages}
          history={history}
          currentStatusID={viewer.current_status}
        />

        {/* Action panel (web fallback for v1) */}
        <ApprovalActionPanel
          isCurrentApprover={viewer.is_current_approver}
          webFallbackPath={`przpurchase/ag_view_purchase_request/${request.id}`}
        />
      </ScrollView>
      </View>
    </>
  );
}
