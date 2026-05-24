import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

// Android: enable layout animation once. iOS doesn't need this.
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Approval workflow visualisation. Each stage shows as a row with:
 *   - status icon (done / current / pending)
 *   - stage name
 *   - approver name + timestamp if already acted, OR the list of
 *     active approvers if pending
 */

export type StageItem = {
  id: number;
  status_name: string;
  color?: string | null;
  is_final?: number | boolean;
  approvers?: Array<{ staffid: number; name: string }>;
};

export type HistoryItem = {
  statusID: number;
  approver: number;
  status: string; // 'Approved' / 'Rejected' / 'Partial Approved' / ...
  approver_name?: string | null;
  addeddate?: string | null;
};

export function ApprovalTimeline({
  stages,
  history,
  currentStatusID,
  defaultOpen = false,
}: {
  stages: StageItem[];
  history: HistoryItem[];
  currentStatusID: number;
  /** Collapsed by default — user taps the header to expand. Pass true to
   *  override (e.g. on a "Workflow" full-screen drilldown later). */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Build a quick lookup: which stage IDs have already been acted on, and
  // whether the action was approve/reject.
  const acted = new Map<number, HistoryItem>();
  for (const h of history) {
    acted.set(h.statusID, h);
  }
  const actedCount = acted.size;
  const summary =
    stages.length === 0
      ? "No workflow"
      : `${actedCount} of ${stages.length} stage${stages.length === 1 ? "" : "s"} acted`;

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
      {!open ? null : stages.length === 0 ? (
        <Text className="text-sm text-muted py-2">No workflow stages configured.</Text>
      ) : (
        <View className="mt-2">{stages.map((s, idx) => {
          const past = acted.get(s.id);
          const isCurrent = s.id === currentStatusID && !past;
          let icon: keyof typeof Ionicons.glyphMap = "ellipse-outline";
          let color = "#94A3B8";
          let stateLabel = "Pending";
          if (past) {
            const lower = (past.status || "").toLowerCase();
            if (lower.includes("reject")) {
              icon = "close-circle";
              color = "#DC2626";
              stateLabel = "Rejected";
            } else if (lower.includes("approve")) {
              icon = "checkmark-circle";
              color = "#16A34A";
              stateLabel = past.status;
            } else {
              icon = "checkmark-circle-outline";
              color = "#475569";
              stateLabel = past.status;
            }
          } else if (isCurrent) {
            icon = "time-outline";
            color = "#0284C7";
            stateLabel = "Awaiting";
          }
          const dateLabel = past?.addeddate
            ? new Date(past.addeddate.replace(" ", "T")).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : null;
          return (
            <View
              key={`${s.id}-${idx}`}
              className="flex-row items-start py-2 border-b border-slate-100 last:border-0"
            >
              <Ionicons name={icon} size={20} color={color} style={{ marginTop: 2 }} />
              <View className="ml-3 flex-1">
                <Text
                  className="text-sm font-medium"
                  style={{ color: isCurrent ? "#0F172A" : "#475569" }}
                  numberOfLines={1}
                >
                  {s.status_name || `Stage ${s.id}`}
                </Text>
                {past ? (
                  <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                    {stateLabel} — {past.approver_name?.trim() || `staff #${past.approver}`}
                    {dateLabel ? ` · ${dateLabel}` : ""}
                  </Text>
                ) : isCurrent ? (
                  <Text className="text-xs text-muted mt-0.5" numberOfLines={2}>
                    Awaiting{" "}
                    {(s.approvers || []).map((a) => a.name).filter(Boolean).join(", ") ||
                      "an approver"}
                  </Text>
                ) : (s.approvers && s.approvers.length > 0) ? (
                  <Text className="text-xs text-muted mt-0.5" numberOfLines={2}>
                    {s.approvers.map((a) => a.name).filter(Boolean).join(", ")}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}</View>
      )}
    </View>
  );
}
