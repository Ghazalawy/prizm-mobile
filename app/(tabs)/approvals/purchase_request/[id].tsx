import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  usePurchaseApproval,
  type PRApproval,
  type PRApprovalRow,
  type PRAttachment,
  type PRActivityLogItem,
  type PRLineItem,
  type PRQuotationSummaryRow,
  type PurchaseApprovalKind,
} from "@/lib/queries/purchase-request";
import { ApprovalActionPanel } from "@/components/approvals/ApprovalActionPanel";
import { FilePreview, type PreviewFile } from "@/components/FilePreview";
import { rtlTextStyle } from "@/lib/rtl";
import { API_URL, staffAvatarUrl } from "@/lib/config";
import { buildAuthHeaders, buildQS } from "@/lib/api";
import {
  navigateInAppOrExternalLink,
  routeForModuleEdit,
} from "@/lib/native-routing";

// Enable Android layout animations once for smooth line-item collapse.
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Native Purchase Request approval screen — v1.6.
 *
 * Tabs across the top mirror the web admin's structure (Info /
 * Attachments / Comparison / Activity). Inside the Info tab the layout
 * matches what view_pur_request.php renders:
 *
 *   - Hero: PR code, title, requester avatar+name, currency-aware total,
 *           cost centers + department chips
 *   - Per-stage approver grid (every configured approver with their
 *     individual stamp — green tick, red X, clock, empty), mirroring
 *     the web's lines 510-520
 *   - Line items: compact by default, tap to expand to long_name + spec
 *   - Notes (URL-detected, multiline)
 *   - Action panel (only when viewer has an actionable row)
 *   - Resubmit button (only when viewer is the requester AND there's a
 *     rejected approver row, matching web line 496)
 *
 * Backend: GET /api/purchase_api/requests/{id}/approval — see
 * Purchase_api::requests_approval_get. Returns request + line_items +
 * approval_rows + attachments + activity_log + quotation_summary +
 * viewer block. See lib/queries/purchase-request.ts for the shape.
 */
type TabKey = "info" | "attachments" | "comparison" | "activity";

const APPROVAL_CONFIG: Record<PurchaseApprovalKind, {
  fallbackPrefix: string;
  label: string;
  endpointBase: string;
  moduleKey: string;
  webPath: (id: number) => string;
}> = {
  purchase_request: {
    fallbackPrefix: "PR-",
    label: "request",
    endpointBase: "purchase_api/requests",
    moduleKey: "purchase_requests",
    webPath: (id) => `przpurchase/ag_view_purchase_request/${id}`,
  },
  purchase_order: {
    fallbackPrefix: "PO-",
    label: "purchase order",
    endpointBase: "purchase_api/orders",
    moduleKey: "purchase_orders",
    webPath: (id) => `przpurchase/PurOrder/ag_view_purchase_order/${id}`,
  },
  payment_request: {
    fallbackPrefix: "MT-",
    label: "payment request",
    endpointBase: "purchase_api/payment_requests",
    moduleKey: "purchase_payment_requests",
    webPath: (id) => `przpurchase/Payment_Request/view_payment_request/${id}`,
  },
  expense_request: {
    fallbackPrefix: "ER-",
    label: "expense request",
    endpointBase: "purchase_api/expense_requests",
    moduleKey: "purchase_expense_requests",
    webPath: (id) => `przpurchase/Expense_Request/view_expense_request/${id}`,
  },
};

export function PurchaseWorkflowApprovalScreen({
  kind = "purchase_request",
  id,
}: {
  kind?: PurchaseApprovalKind;
  id?: string;
}) {
  const params = useLocalSearchParams<{ id?: string }>();
  const cfg = APPROVAL_CONFIG[kind];
  const idNum = Number(id ?? params.id);
  const validId = Number.isFinite(idNum) && idNum > 0 ? idNum : null;
  const q = usePurchaseApproval(kind, validId);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("info");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const stackHeaderHidden = <Stack.Screen options={{ headerShown: false }} />;

  if (!validId) {
    return (
      <>
        {stackHeaderHidden}
        <ErrorState message="Invalid request id." />
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
        <ErrorState
          message={
            (q.error as any)?.message || `Couldn't load this ${cfg.label}.`
          }
        />
      </>
    );
  }

  const { request, viewer } = q.data;
  const code =
    request.display_code ||
    request.display_number ||
    (request.prefix || cfg.fallbackPrefix) +
      (request.sequence_number != null ? request.sequence_number : request.id);

  // Status pill tone shown in the hero.
  const rejected = q.data.approval_rows.some(
    (r) => (r.status || "").toLowerCase() === "rejected",
  );
  const allApproved =
    q.data.approval_rows.length > 0 &&
    q.data.approval_rows.every(
      (r) => (r.status || "").toLowerCase() === "approved",
    );

  const handleShare = async () => {
    const cur = formatCurrency(
      Number(request.total_amount) || sumLineItems(q.data.line_items),
      request.currency_symbol,
    );
    const summary =
      `${code} · ${request.title || "Untitled"}\n` +
      `Requested by ${request.requester_name?.trim() || `staff #${request.staff_id}`}\n` +
      (cur ? `Total: ${cur}\n` : "") +
      "Open it from Prizm CRM mobile.";
    try {
      await Share.share({ title: code, message: summary });
    } catch {
      /* cancelled */
    }
  };

  return (
    <>
      {stackHeaderHidden}
      <View className="flex-1 bg-surface">
        {/* Slim inline header — back / code / share */}
        <View
          className="flex-row items-center px-2 py-2 bg-surface"
          style={{ minHeight: 44 }}
        >
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} className="p-2">
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text
            className="text-base font-bold text-foreground flex-1"
            numberOfLines={1}
            style={rtlTextStyle(code)}
          >
            {code}
          </Text>
          <TouchableOpacity onPress={handleShare} hitSlop={10} className="p-2" accessibilityLabel="Share">
            <Ionicons name="share-social-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Tabs — Info / Attachments / Comparison / Activity. Counts on
            each chip give an at-a-glance "is this section worth opening". */}
        <TabBar
          tab={tab}
          onChange={setTab}
          counts={{
            attachments: q.data.attachments.length,
            comparison: q.data.quotation_summary.length,
            activity: q.data.activity_log.length,
          }}
        />

        <ScrollView
          className="flex-1 bg-surface"
          contentContainerClassName="p-3 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0284C7"
            />
          }
        >
          {tab === "info" ? (
            <InfoTab
              data={q.data}
              code={code}
              rejected={rejected}
              allApproved={allApproved}
              config={cfg}
              kind={kind}
            />
          ) : null}
          {tab === "attachments" ? <AttachmentsTab attachments={q.data.attachments} /> : null}
          {tab === "comparison" ? (
            <ComparisonTab
              rows={q.data.quotation_summary}
              currencySymbol={request.currency_symbol}
            />
          ) : null}
          {tab === "activity" ? <ActivityTab entries={q.data.activity_log} /> : null}
        </ScrollView>
      </View>
    </>
  );
}

export default function PurchaseRequestApprovalScreen() {
  return <PurchaseWorkflowApprovalScreen kind="purchase_request" />;
}

/* ───────────────────────────────────────────────────────────── */
/*                          Sub-views                            */
/* ───────────────────────────────────────────────────────────── */

function InfoTab({
  data,
  code,
  rejected,
  allApproved,
  config,
  kind,
}: {
  data: PRApproval;
  code: string;
  rejected: boolean;
  allApproved: boolean;
  config: (typeof APPROVAL_CONFIG)[PurchaseApprovalKind];
  kind: PurchaseApprovalKind;
}) {
  const { request, line_items, approval_rows, viewer } = data;
  const sumItems = useMemo(() => sumLineItems(line_items), [line_items]);
  const statedTotal = Number(request.total_amount) || 0;
  const displayedTotal = statedTotal || sumItems;
  // Flag a sanity-check warning if the stored total disagrees with the
  // line-item sum by more than 0.01 — catches stale totals the web's
  // auto-calc missed.
  const totalMismatch =
    statedTotal > 0 && Math.abs(statedTotal - sumItems) > 0.01;

  const requestedAt = request.requested_date
    ? new Date(request.requested_date.replace(" ", "T")).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const tone = rejected ? "rejected" : viewer.is_current_approver ? "your-turn" : allApproved ? "approved" : "pending";
  const statusLabel = rejected
    ? "Rejected"
    : viewer.is_current_approver
    ? "Your turn to approve"
    : allApproved
    ? "Fully approved"
    : "In approval workflow";

  return (
    <>
      {/* Hero */}
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <Text
          className="text-lg font-bold text-foreground"
          numberOfLines={3}
          style={rtlTextStyle(request.title)}
        >
          {request.title || "Untitled request"}
        </Text>
        <Pill tone={tone} label={statusLabel} className="mt-2 self-start" />

        {/* Requester row with avatar */}
        <View className="flex-row items-center mt-3">
          <Avatar
            staffid={request.staff_id}
            profileImage={request.requester_profile_image}
            name={request.requester_name || ""}
            size={32}
          />
          <View className="ml-2 flex-1">
            <Text className="text-[10px] uppercase text-muted">Requested by</Text>
            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
              {request.requester_name?.trim() || `Staff #${request.staff_id}`}
            </Text>
          </View>
          {requestedAt ? (
            <Text className="text-xs text-muted" numberOfLines={1}>
              {requestedAt}
            </Text>
          ) : null}
        </View>

        {/* Department + cost-center chips */}
        {(request.department_name || (request.cost_centers && request.cost_centers.length > 0)) ? (
          <View className="flex-row flex-wrap mt-2 -mr-1">
            {request.department_name ? (
              <Chip
                icon="business-outline"
                label={request.department_name}
                color="#0369A1"
                bg="#E0F2FE"
              />
            ) : null}
            {(request.cost_centers || []).map((cc) => (
              <Chip
                key={cc.id}
                icon="cube-outline"
                label={`${cc.code || ""}${cc.code && cc.title ? " · " : ""}${cc.title || ""}`.trim()}
                color="#7C3AED"
                bg="#EDE9FE"
              />
            ))}
          </View>
        ) : null}

        {/* Total — currency-aware */}
        <View className="flex-row items-baseline mt-3 pt-3 border-t border-slate-100">
          <Text className="text-[10px] uppercase text-muted">Total</Text>
          <Text className="text-xl font-bold text-foreground ml-2">
            {formatCurrency(displayedTotal, request.currency_symbol) || "—"}
          </Text>
          {totalMismatch ? (
            <View
              className="ml-2"
              style={{
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 4,
                backgroundColor: "#FEF3C7",
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#B45309" }}>
                MISMATCH
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Approvers grid — grouped by stage */}
      <ApproversGrid rows={approval_rows} />

      {/* Action panel — only renders Approve/Reject when the viewer has
          an actionable row; otherwise it's null (the grid above already
          says "view only" via stamps). */}
      <ApprovalActionPanel
        isCurrentApprover={viewer.is_current_approver}
        statusDetailID={viewer.actionable_status_detail_id}
        requestId={request.id}
        endpointBase={request.approval_endpoint || config.endpointBase}
        entityLabel={config.label}
        queryKey={["purchase_approval", kind, request.id]}
      />

      {/* Resubmit button — only when the viewer is the requester AND
          there's a rejected row. Keep it inside mobile; the edit screen
          is the native replacement for the old web-admin handoff. */}
      {viewer.is_submitter && rejected ? (
        <TouchableOpacity
          onPress={() => {
            const editRoute = routeForModuleEdit(config.moduleKey, request.id);
            if (editRoute) router.push(editRoute as any);
          }}
          activeOpacity={0.85}
          className="bg-amber-500 rounded-2xl p-4 mb-3 flex-row items-center justify-center shadow-sm"
        >
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
          <Text className="text-white font-semibold ml-2">Edit and resubmit</Text>
        </TouchableOpacity>
      ) : null}

      {/* Line items — collapsible per row */}
      <View className="bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm">
        <Text className="text-xs uppercase tracking-wide text-muted mb-2">
          Line items ({line_items.length})
        </Text>
        {line_items.length === 0 ? (
          <Text className="text-sm text-muted py-2">No items on this request.</Text>
        ) : (
          line_items.map((li, idx) => (
            <LineItemRow
              key={li.id ?? idx}
              item={li}
              currencySymbol={request.currency_symbol}
              isLast={idx === line_items.length - 1}
            />
          ))
        )}
        {line_items.length > 0 ? (
          <View className="flex-row items-center pt-2 mt-2 border-t border-slate-200">
            <Text className="text-xs uppercase text-muted">Sum of items</Text>
            <Text className="text-base font-bold text-foreground ml-auto">
              {formatCurrency(sumItems, request.currency_symbol) || "—"}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Notes — preserves line breaks + links */}
      {request.notes?.trim() ? (
        <View className="bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm">
          <Text className="text-xs uppercase tracking-wide text-muted mb-2">Notes</Text>
          <NotesText raw={request.notes} />
        </View>
      ) : null}
    </>
  );
}

function AttachmentsTab({ attachments }: { attachments: PRAttachment[] }) {
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleOpen = useCallback(async (file: PRAttachment) => {
    try {
      const headers = await buildAuthHeaders();
      const url = `${API_URL}/files/download/${encodeURIComponent(String(file.id))}${buildQS({
        authtoken: headers["authtoken"] ?? "",
      })}`;
      setPreviewUrl(url);
      setPreviewFile(file);
    } catch {
      setPreviewFile(file);
      setPreviewUrl(null);
    }
  }, []);

  const closePreview = useCallback(() => {
    setPreviewFile(null);
    setPreviewUrl(null);
  }, []);

  if (attachments.length === 0) {
    return <EmptyState icon="document-attach-outline" label="No attachments" />;
  }
  return (
    <>
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {attachments.map((a, idx) => (
          <TouchableOpacity
            key={a.id}
            activeOpacity={0.7}
            onPress={() => void handleOpen(a)}
            className={`flex-row items-center px-4 py-3 ${idx > 0 ? "border-t border-slate-100" : ""}`}
          >
            <Ionicons
              name={iconForFiletype(a.filetype)}
              size={22}
              color="#0284C7"
            />
            <View className="flex-1 ml-3">
              <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                {a.file_name}
              </Text>
              <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                {a.dateadded?.replace("T", " ").slice(0, 16)}
              </Text>
            </View>
            <Ionicons name="eye-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </View>
      <FilePreview
        file={previewFile}
        directUrl={previewUrl}
        color="#0284C7"
        onClose={closePreview}
      />
    </>
  );
}

function ComparisonTab({
  rows,
  currencySymbol,
}: {
  rows: PRQuotationSummaryRow[];
  currencySymbol: string | null;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="git-compare-outline"
        label="No quotations linked yet"
        sub="Suppliers will appear here once RFQ responses are received."
      />
    );
  }
  // Top supplier (cheapest) wins the green ribbon.
  return (
    <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {rows.map((r, idx) => (
        <View
          key={`${r.supplier_id}-${idx}`}
          className={`flex-row items-center px-4 py-3 ${idx > 0 ? "border-t border-slate-100" : ""}`}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: idx === 0 ? "#16A34A" : "#E2E8F0",
            }}
          >
            <Text
              style={{
                color: idx === 0 ? "#FFFFFF" : "#475569",
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {idx + 1}
            </Text>
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
              {r.supplier_name || `Supplier #${r.supplier_id}`}
            </Text>
            <Text className="text-xs text-muted mt-0.5">
              {r.items_quoted} item{r.items_quoted === 1 ? "" : "s"} quoted
            </Text>
          </View>
          <Text className="text-sm font-bold text-foreground">
            {formatCurrency(r.supplier_total, currencySymbol) || "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ActivityTab({ entries }: { entries: PRActivityLogItem[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon="time-outline"
        label="No activity yet"
        sub="Add / approve / reject / publish events will show up here."
      />
    );
  }
  return (
    <View>
      {entries.map((e, idx) => (
        <View
          key={e.id}
          className="bg-white rounded-2xl px-4 py-3 mb-2 shadow-sm flex-row items-start"
        >
          <Avatar
            staffid={e.staff_id}
            profileImage={e.profile_image}
            name={e.staff_name || `Staff #${e.staff_id}`}
            size={26}
          />
          <View className="ml-3 flex-1">
            <Text className="text-xs text-muted mb-0.5">
              {e.add_date?.replace("T", " ").slice(0, 16)}
            </Text>
            <Text className="text-sm text-foreground" selectable>
              <Text className="font-semibold">
                {e.staff_name?.trim() || `Staff #${e.staff_id}`}
              </Text>
              {": "}
              {e.log_details}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ───────────────────────────────────────────────────────────── */
/*                       Stage→Approvers grid                    */
/* ───────────────────────────────────────────────────────────── */

function ApproversGrid({ rows }: { rows: PRApprovalRow[] }) {
  // Group by stage (status_name) preserving the order_in_list order.
  const grouped = useMemo(() => {
    const out: Array<{ name: string; statusID: number; rows: PRApprovalRow[] }> = [];
    for (const r of rows) {
      const label = r.status_name?.trim() || `Stage ${r.statusID}`;
      const last = out[out.length - 1];
      if (last && last.statusID === r.statusID) last.rows.push(r);
      else out.push({ name: label, statusID: r.statusID, rows: [r] });
    }
    return out;
  }, [rows]);

  if (grouped.length === 0) {
    return (
      <View className="bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm">
        <Text className="text-xs uppercase tracking-wide text-muted mb-1">
          Approvers
        </Text>
        <Text className="text-sm text-muted py-1">
          No approval workflow configured for this request.
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm">
      <Text className="text-xs uppercase tracking-wide text-muted mb-2">
        Approvers
      </Text>
      {grouped.map((group, gIdx) => {
        // The "active" stage is the one where any row has
        // is_current_status=1 — we mark it visually.
        const isActiveStage = group.rows.some((r) => r.is_current_status === 1);
        return (
          <View
            key={group.statusID}
            className={`py-2 ${gIdx > 0 ? "border-t border-slate-100" : ""}`}
          >
            <View className="flex-row items-center mb-1.5">
              <Text className="text-xs font-semibold text-foreground flex-1" numberOfLines={1}>
                {group.name}
              </Text>
              {isActiveStage ? (
                <Pill tone="your-turn" label="Active" small />
              ) : null}
            </View>
            {group.rows.map((r) => (
              <ApproverChip key={r.statusDetailID} row={r} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function ApproverChip({ row }: { row: PRApprovalRow }) {
  const status = (row.status || "").toLowerCase();
  let icon: keyof typeof Ionicons.glyphMap = "ellipse-outline";
  let color = "#94A3B8";
  let stateLabel: string = row.status || "Pending";
  if (status === "rejected") {
    icon = "close-circle";
    color = "#DC2626";
    stateLabel = "Rejected";
  } else if (status === "approved") {
    icon = "checkmark-circle";
    color = "#16A34A";
    stateLabel = "Approved";
  } else if (row.is_current_status === 1 && row.can_act_now) {
    icon = "time-outline";
    color = "#0284C7";
    stateLabel = "Awaiting your action";
  } else if (row.is_current_status === 1) {
    icon = "hourglass-outline";
    color = "#0284C7";
    stateLabel = "Awaiting";
  }
  const dateLabel = row.updateddate
    ? new Date(row.updateddate.replace(" ", "T")).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 5,
        paddingLeft: row.can_act_now ? 6 : 0,
        borderLeftWidth: row.can_act_now ? 2 : 0,
        borderLeftColor: row.can_act_now ? "#0284C7" : "transparent",
      }}
    >
      <Avatar
        staffid={row.approver}
        profileImage={row.approver_profile_image ?? null}
        name={row.approver_name || `Staff #${row.approver}`}
        size={24}
      />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <View className="flex-row items-center">
          <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
            {row.approver_name?.trim() || `Staff #${row.approver}`}
          </Text>
          {row.can_act_now ? (
            <View
              className="ml-1.5"
              style={{
                paddingHorizontal: 5,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: "#DBEAFE",
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#0369A1" }}>
                YOU
              </Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-center mt-0.5">
          <Ionicons name={icon} size={12} color={color} />
          <Text className="text-xs ml-1" style={{ color }}>
            {stateLabel}
          </Text>
          {dateLabel ? (
            <Text className="text-xs text-muted ml-1">· {dateLabel}</Text>
          ) : null}
        </View>
        {status === "rejected" && row.rejection_reason?.trim() ? (
          <View
            style={{
              marginTop: 4,
              paddingHorizontal: 8,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: "#FEF2F2",
              borderLeftWidth: 3,
              borderLeftColor: "#DC2626",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: "#0F172A",
                lineHeight: 16,
                fontStyle: "italic",
              }}
            >
              "{row.rejection_reason.trim()}"
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ───────────────────────────────────────────────────────────── */
/*                       Line item with details                  */
/* ───────────────────────────────────────────────────────────── */

function LineItemRow({
  item,
  currencySymbol,
  isLast,
}: {
  item: PRLineItem;
  currencySymbol: string | null;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const qty = Number(item.qty) || 0;
  const rate = Number(item.rate) || 0;
  const sub = Number(item.subtotal) || qty * rate;
  const hasDetails = !!(item.item_long_name || item.spec || item.approved_qty || item.approved_price);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };
  return (
    <Pressable
      onPress={hasDetails ? toggle : undefined}
      android_ripple={hasDetails ? { color: "#F1F5F9" } : undefined}
      style={{
        paddingVertical: 8,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F1F5F9",
      }}
    >
      <View className="flex-row items-start">
        <View className="flex-1">
          <Text
            className="text-sm font-medium text-foreground"
            numberOfLines={expanded ? undefined : 1}
            style={rtlTextStyle(item.name)}
          >
            {item.name || "Untitled item"}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-muted">
              {qty.toLocaleString()} {item.item_unit || ""} × {rate.toLocaleString()}
            </Text>
          </View>
        </View>
        <View className="items-end ml-2">
          <Text className="text-sm font-semibold text-foreground">
            {formatCurrency(sub, currencySymbol) || sub.toLocaleString()}
          </Text>
          {hasDetails ? (
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={14}
              color="#94A3B8"
              style={{ marginTop: 2 }}
            />
          ) : null}
        </View>
      </View>
      {expanded ? (
        <View
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopColor: "#F1F5F9",
          }}
        >
          {item.item_long_name ? (
            <Text className="text-xs text-foreground/80 mb-1" style={rtlTextStyle(item.item_long_name)}>
              {item.item_long_name}
            </Text>
          ) : null}
          {item.spec ? (
            <Text className="text-xs text-muted mb-1" style={rtlTextStyle(item.spec)}>
              {item.spec}
            </Text>
          ) : null}
          {item.approved_qty != null || item.approved_price != null ? (
            <View className="flex-row items-center mt-1">
              <Text className="text-[10px] uppercase text-muted">Approved</Text>
              <Text className="text-xs text-foreground ml-2">
                {Number(item.approved_qty || 0).toLocaleString()} × {Number(item.approved_price || 0).toLocaleString()}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

/* ───────────────────────────────────────────────────────────── */
/*                          Bits + bobs                          */
/* ───────────────────────────────────────────────────────────── */

function TabBar({
  tab,
  onChange,
  counts,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  counts: { attachments: number; comparison: number; activity: number };
}) {
  const items: Array<{ key: TabKey; label: string; badge?: number }> = [
    { key: "info", label: "Info" },
    { key: "attachments", label: "Attachments", badge: counts.attachments },
    { key: "comparison", label: "Comparison", badge: counts.comparison },
    { key: "activity", label: "Activity", badge: counts.activity },
  ];
  return (
    <View className="bg-white border-b border-slate-200">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 8 }}
      >
        {items.map((it) => {
          const active = it.key === tab;
          return (
            <TouchableOpacity
              key={it.key}
              onPress={() => onChange(it.key)}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? "#0284C7" : "#F1F5F9",
                marginRight: 6,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: active ? "#FFFFFF" : "#475569",
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {it.label}
              </Text>
              {it.badge && it.badge > 0 ? (
                <View
                  style={{
                    marginLeft: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 999,
                    backgroundColor: active ? "rgba(255,255,255,0.25)" : "#0284C7",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {it.badge}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Pill({
  tone,
  label,
  small,
  className = "",
}: {
  tone: "your-turn" | "approved" | "rejected" | "pending";
  label: string;
  small?: boolean;
  className?: string;
}) {
  const cfg = {
    "your-turn": { bg: "#DBEAFE", fg: "#0369A1" },
    approved:    { bg: "#DCFCE7", fg: "#15803D" },
    rejected:    { bg: "#FEE2E2", fg: "#B91C1C" },
    pending:     { bg: "#F1F5F9", fg: "#475569" },
  }[tone];
  return (
    <View
      className={className}
      style={{
        backgroundColor: cfg.bg,
        paddingHorizontal: small ? 6 : 10,
        paddingVertical: small ? 2 : 4,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: cfg.fg, fontSize: small ? 10 : 12, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

function Chip({
  icon,
  label,
  color,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
}) {
  if (!label?.trim()) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: bg,
        marginRight: 6,
        marginBottom: 4,
      }}
    >
      <Ionicons name={icon} size={11} color={color} />
      <Text
        style={{
          color,
          fontSize: 11,
          fontWeight: "600",
          marginLeft: 3,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function Avatar({
  staffid,
  profileImage,
  name,
  size = 28,
}: {
  staffid: number;
  profileImage: string | null;
  name: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const initial = (name?.[0] || "?").toUpperCase();
  const url = staffAvatarUrl(staffid, profileImage, "thumb");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {url && !broken ? (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          onError={() => setBroken(true)}
        />
      ) : (
        <Text style={{ color: "#0F172A", fontWeight: "700", fontSize: size * 0.42 }}>
          {initial}
        </Text>
      )}
    </View>
  );
}

function NotesText({ raw }: { raw: string }) {
  // Strip block-level HTML tags + decode common entities + preserve line
  // breaks. Then linkify URLs.
  const cleaned = useMemo(() => {
    return raw
      .replace(/<\/(p|div|li|br|tr|h[1-6])>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]+/g, " ")
      .trim();
  }, [raw]);
  // Linkify
  const parts = useMemo(() => splitLinks(cleaned), [cleaned]);
  return (
    <Text className="text-sm text-foreground leading-relaxed" selectable>
      {parts.map((p, i) =>
        p.kind === "url" ? (
          <Text
            key={i}
            className="text-primary underline"
            onPress={() => void navigateInAppOrExternalLink(p.text)}
          >
            {p.text}
          </Text>
        ) : (
          <Text key={i} style={rtlTextStyle(p.text)}>
            {p.text}
          </Text>
        ),
      )}
    </Text>
  );
}

function EmptyState({
  icon,
  label,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
}) {
  return (
    <View className="items-center py-16 px-6">
      <Ionicons name={icon} size={42} color="#94A3B8" />
      <Text className="text-base font-medium text-foreground mt-3">{label}</Text>
      {sub ? (
        <Text className="text-xs text-muted text-center mt-1 max-w-[260px]">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-surface px-6">
      <Ionicons name="warning-outline" size={48} color="#EF4444" />
      <Text className="text-sm text-muted mt-2 text-center">{message}</Text>
    </View>
  );
}

/* ───────────────────────────────────────────────────────────── */
/*                            Helpers                            */
/* ───────────────────────────────────────────────────────────── */

function formatCurrency(value: number, symbol: string | null | undefined): string {
  if (!Number.isFinite(value) || value === 0) return "";
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${formatted} ${symbol}` : formatted;
}

function sumLineItems(items: PRLineItem[]): number {
  return items.reduce((acc, li) => {
    const qty = Number(li.qty) || 0;
    const rate = Number(li.rate) || 0;
    const v = Number(li.subtotal) || qty * rate;
    return acc + (Number.isFinite(v) ? v : 0);
  }, 0);
}

function iconForFiletype(t: string | null | undefined): keyof typeof Ionicons.glyphMap {
  const s = (t || "").toLowerCase();
  if (s.includes("pdf")) return "document-text-outline";
  if (s.includes("image") || /jpe?g|png|gif|webp/.test(s)) return "image-outline";
  if (s.includes("excel") || /xlsx?|csv/.test(s)) return "grid-outline";
  if (s.includes("word") || /docx?/.test(s)) return "document-outline";
  if (s.includes("zip") || /rar|7z/.test(s)) return "archive-outline";
  return "document-attach-outline";
}

function splitLinks(text: string): Array<{ kind: "text" | "url"; text: string }> {
  const out: Array<{ kind: "text" | "url"; text: string }> = [];
  const re = /(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      out.push({ kind: "text", text: text.slice(lastIndex, m.index) });
    }
    out.push({ kind: "url", text: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    out.push({ kind: "text", text: text.slice(lastIndex) });
  }
  return out;
}
