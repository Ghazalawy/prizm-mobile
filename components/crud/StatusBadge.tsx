import { Text, View } from "react-native";
import { memo } from "react";
import type { StatusOption } from "@/lib/module-registry";

type StatusBadgeProps = {
  value: string | number | undefined | null;
  statusOptions?: StatusOption[];
  size?: "sm" | "md";
};

const GENERIC_STATUS_COLORS: Record<string, string> = {
  active: "#16A34A",
  inactive: "#DC2626",
  open: "#DC2626",
  closed: "#64748B",
  pending: "#F59E0B",
  approved: "#16A34A",
  rejected: "#DC2626",
  draft: "#64748B",
  sent: "#2563EB",
  paid: "#16A34A",
  overdue: "#DC2626",
  cancelled: "#94A3B8",
  expired: "#94A3B8",
  completed: "#16A34A",
  complete: "#16A34A",
  finished: "#16A34A",
  "in progress": "#2563EB",
  "in_progress": "#2563EB",
  "not started": "#64748B",
  "not_started": "#64748B",
  "on hold": "#F59E0B",
  "on_hold": "#F59E0B",
  won: "#16A34A",
  lost: "#DC2626",
  accepted: "#16A34A",
  declined: "#DC2626",
  new: "#2563EB",
  testing: "#7C3AED",
  "awaiting feedback": "#F59E0B",
  submitted: "#7C3AED",
  identified: "#64748B",
  "partially paid": "#F59E0B",
  low: "#64748B",
  medium: "#F59E0B",
  high: "#EA580C",
  urgent: "#DC2626",
};

const FALLBACK_COLOR = "#64748B";

function resolveColor(
  value: string | number | undefined | null,
  statusOptions?: StatusOption[],
): string {
  if (value === undefined || value === null) return FALLBACK_COLOR;
  const strValue = String(value);

  if (statusOptions?.length) {
    const match = statusOptions.find(
      (opt) => String(opt.value) === strValue,
    );
    if (match?.color) return match.color;
  }

  const lower = strValue.toLowerCase().trim();
  return GENERIC_STATUS_COLORS[lower] ?? FALLBACK_COLOR;
}

function resolveLabel(
  value: string | number | undefined | null,
  statusOptions?: StatusOption[],
): string {
  if (value === undefined || value === null) return "";
  const strValue = String(value);

  if (statusOptions?.length) {
    const match = statusOptions.find(
      (opt) => String(opt.value) === strValue,
    );
    if (match) return match.label;
  }

  return strValue;
}

export const StatusBadge = memo(function StatusBadge({
  value,
  statusOptions,
  size = "sm",
}: StatusBadgeProps) {
  const label = resolveLabel(value, statusOptions);
  if (!label) return null;

  const color = resolveColor(value, statusOptions);
  const isMd = size === "md";

  return (
    <View
      className={`self-start rounded-full ${isMd ? "px-3 py-1" : "px-2 py-0.5"}`}
      style={{ backgroundColor: `${color}1A` }}
    >
      <Text
        className={`font-medium ${isMd ? "text-xs" : "text-[10px]"}`}
        style={{ color }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
});
