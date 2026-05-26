import { Text, View } from "react-native";
import { memo } from "react";

type DocumentType = "invoice" | "estimate" | "proposal";

type StatusInfo = { label: string; color: string; bg: string };

const INVOICE_STATUS: Record<string, StatusInfo> = {
  "1": { label: "Unpaid", color: "#DC2626", bg: "#FEF2F2" },
  "2": { label: "Sent", color: "#2563EB", bg: "#EFF6FF" },
  "3": { label: "Partially Paid", color: "#F59E0B", bg: "#FFFBEB" },
  "4": { label: "Paid", color: "#16A34A", bg: "#F0FDF4" },
  "5": { label: "Cancelled", color: "#94A3B8", bg: "#F1F5F9" },
  "6": { label: "Draft", color: "#64748B", bg: "#F1F5F9" },
  overdue: { label: "Overdue", color: "#DC2626", bg: "#FEF2F2" },
};

const ESTIMATE_STATUS: Record<string, StatusInfo> = {
  "1": { label: "Draft", color: "#64748B", bg: "#F1F5F9" },
  "2": { label: "Sent", color: "#2563EB", bg: "#EFF6FF" },
  "3": { label: "Declined", color: "#DC2626", bg: "#FEF2F2" },
  "4": { label: "Accepted", color: "#16A34A", bg: "#F0FDF4" },
  "5": { label: "Expired", color: "#94A3B8", bg: "#F1F5F9" },
};

const PROPOSAL_STATUS: Record<string, StatusInfo> = {
  "1": { label: "Open", color: "#2563EB", bg: "#EFF6FF" },
  "2": { label: "Declined", color: "#DC2626", bg: "#FEF2F2" },
  "3": { label: "Accepted", color: "#16A34A", bg: "#F0FDF4" },
  "4": { label: "Sent", color: "#7C3AED", bg: "#F5F3FF" },
  "5": { label: "Revised", color: "#F59E0B", bg: "#FFFBEB" },
  "6": { label: "Draft", color: "#64748B", bg: "#F1F5F9" },
};

const STATUS_MAPS: Record<DocumentType, Record<string, StatusInfo>> = {
  invoice: INVOICE_STATUS,
  estimate: ESTIMATE_STATUS,
  proposal: PROPOSAL_STATUS,
};

const FALLBACK: StatusInfo = { label: "Unknown", color: "#64748B", bg: "#F1F5F9" };

function resolveInvoiceStatus(
  statusCode: string | number,
  dueDate?: string | null,
): StatusInfo {
  const s = String(statusCode);
  if ((s === "1" || s === "2") && dueDate && isOverdue(dueDate)) {
    return INVOICE_STATUS.overdue;
  }
  return INVOICE_STATUS[s] ?? FALLBACK;
}

function isOverdue(dueDate: string): boolean {
  if (!dueDate || dueDate.startsWith("0000")) return false;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

type Props = {
  type: DocumentType;
  status: string | number | undefined | null;
  dueDate?: string | null;
  size?: "sm" | "md" | "lg";
};

export const DocumentStatusBadge = memo(function DocumentStatusBadge({
  type,
  status,
  dueDate,
  size = "sm",
}: Props) {
  if (status === undefined || status === null) return null;

  const info =
    type === "invoice"
      ? resolveInvoiceStatus(status, dueDate)
      : (STATUS_MAPS[type]?.[String(status)] ?? FALLBACK);

  const paddingCls =
    size === "lg" ? "px-4 py-1.5" : size === "md" ? "px-3 py-1" : "px-2 py-0.5";
  const textCls =
    size === "lg" ? "text-sm" : size === "md" ? "text-xs" : "text-[10px]";

  return (
    <View
      className={`self-start rounded-full ${paddingCls}`}
      style={{ backgroundColor: info.bg }}
    >
      <Text
        className={`font-semibold ${textCls}`}
        style={{ color: info.color }}
        numberOfLines={1}
      >
        {info.label}
      </Text>
    </View>
  );
});

export { INVOICE_STATUS, ESTIMATE_STATUS, PROPOSAL_STATUS, isOverdue };
export type { DocumentType, StatusInfo };
