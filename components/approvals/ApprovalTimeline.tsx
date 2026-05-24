import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { PRApprovalRow } from "@/lib/queries/purchase-request";

// Android: enable layout animation once. iOS doesn't need this.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Approval workflow visualisation — mirrors what the web admin shows on
 * `przpurchase/ag_view_purchase_request`. Each item is one row from
 * `tblprzpurcahse_req_statusdetail` (the canonical per-approver-per-stage
 * record). The status text/colour comes straight from that row's
 * `status` field, so Approved/Rejected/Submitted/Pending visuals match
 * the web exactly.
 *
 * Rows are grouped by `status_name` (the stage's display label).
 * Within a group, multiple approvers can appear (parallel approvals at
 * the same stage). Each approver's stamp (green tick / red X / clock /
 * empty circle) reflects ONLY that approver's row.
 *
 * The viewer's own row is marked with a subtle blue ring so they can
 * spot "this is mine" at a glance.
 */
export function ApprovalTimeline({
  rows,
  defaultOpen = false,
}: {
  rows: PRApprovalRow[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Group rows by status_name (the stage label). Preserves the order
  // the backend returned them in — already sorted by order_in_list.
  const grouped = (() => {
    const out: Array<{ name: string; statusID: number; rows: PRApprovalRow[] }> = [];
    for (const r of rows) {
      const last = out[out.length - 1];
      const label = r.status_name?.trim() || `Stage ${r.statusID}`;
      if (last && last.statusID === r.statusID) {
        last.rows.push(r);
      } else {
        out.push({ name: label, statusID: r.statusID, rows: [r] });
      }
    }
    return out;
  })();

  const actedCount = rows.filter((r) => {
    const s = (r.status || "").toLowerCase();
    return s === "approved" || s === "rejected";
  }).length;
  const summary =
    rows.length === 0
      ? "No workflow"
      : `${actedCount} of ${rows.length} approver${rows.length === 1 ? "" : "s"} acted`;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View className="bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm">
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.6}
        className="flex-row items-center"
      >
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wide text-muted">
            Approval workflow
          </Text>
          <Text className="text-xs text-muted mt-0.5">{summary}</Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#64748B"
        />
      </TouchableOpacity>
      {!open ? null : grouped.length === 0 ? (
        <Text className="text-sm text-muted py-2">No workflow stages configured.</Text>
      ) : (
        <View className="mt-2">
          {grouped.map((group) => (
            <View
              key={group.statusID}
              className="py-2 border-b border-slate-100 last:border-0"
            >
              <Text
                className="text-xs uppercase tracking-wide text-muted mb-1.5"
                numberOfLines={1}
              >
                {group.name}
              </Text>
              {group.rows.map((r) => (
                <ApproverRow key={r.statusDetailID} row={r} />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ApproverRow({ row }: { row: PRApprovalRow }) {
  const status = (row.status || "").toLowerCase();
  let icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap =
    "ellipse-outline";
  let color = "#94A3B8";
  let stateLabel = row.status || "Pending";
  if (status === "rejected") {
    icon = "close-circle";
    color = "#DC2626";
    stateLabel = "Rejected";
  } else if (status === "approved") {
    icon = "checkmark-circle";
    color = "#16A34A";
    stateLabel = "Approved";
  } else if (row.is_current_status === 1 && row.can_act_now) {
    // Awaiting THIS specific approver right now.
    icon = "time-outline";
    color = "#0284C7";
    stateLabel = "Awaiting";
  } else if (row.is_current_status === 1) {
    // Active stage but not this row's approver's turn.
    icon = "ellipse-outline";
    color = "#94A3B8";
    stateLabel = "Pending";
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
      <Ionicons name={icon} size={18} color={color} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text
          className="text-sm font-medium"
          style={{ color: row.can_act_now ? "#0F172A" : "#475569" }}
          numberOfLines={1}
        >
          {row.approver_name?.trim() || `Staff #${row.approver}`}
          {row.can_act_now ? "  · YOU" : ""}
        </Text>
        <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
          {stateLabel}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </Text>
        {/* Rejection reason under the red stamp. */}
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
