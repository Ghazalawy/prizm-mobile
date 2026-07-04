import { View, Text, Pressable, LayoutAnimation } from "react-native";
import { memo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { rtlTextStyle } from "@/lib/rtl";
import type { PRLineItem } from "@/lib/queries/purchase-request";

type Props = {
  items: PRLineItem[];
  currencySymbol: string | null;
  formatCurrency: (amount: number, symbol: string | null) => string;
};

function num(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function statusTone(status: string | null): { bg: string; fg: string } {
  const s = (status || "").toLowerCase();
  if (s.includes("approv")) return { bg: "#DCFCE7", fg: "#15803D" };
  if (s.includes("reject")) return { bg: "#FEE2E2", fg: "#B91C1C" };
  return { bg: "#F1F5F9", fg: "#475569" };
}

/**
 * Compact line items table for workflow approvals (PR/PO/MT/ER).
 */
export const WorkflowLineItemsTable = memo(function WorkflowLineItemsTable({
  items,
  currencySymbol,
  formatCurrency,
}: Props) {
  if (items.length === 0) {
    return <Text className="text-sm text-muted py-2">No items on this request.</Text>;
  }

  const total = items.reduce((sum, item) => sum + (num(item.subtotal) || num(item.qty) * num(item.rate)), 0);

  return (
    <View className="overflow-hidden">
      <View className="flex-row bg-slate-50 px-2 py-1.5 border-b border-slate-200">
        <Text className="flex-1 text-[9px] font-semibold uppercase text-muted">Item</Text>
        <Text className="w-10 text-[9px] font-semibold uppercase text-muted text-right">Qty</Text>
        <Text className="w-14 text-[9px] font-semibold uppercase text-muted text-right">Rate</Text>
        <Text className="w-16 text-[9px] font-semibold uppercase text-muted text-right">Total</Text>
      </View>
      {items.map((item, idx) => (
        <CompactLineRow
          key={item.id ?? idx}
          item={item}
          currencySymbol={currencySymbol}
          formatCurrency={formatCurrency}
          isLast={idx === items.length - 1}
        />
      ))}
      <View className="flex-row items-center px-2 py-2 border-t border-slate-200 bg-slate-50">
        <Text className="flex-1 text-xs uppercase text-muted font-semibold">Sum of items</Text>
        <Text className="text-sm font-bold text-foreground">
          {formatCurrency(total, currencySymbol) || total.toLocaleString()}
        </Text>
      </View>
    </View>
  );
});

function CompactLineRow({
  item,
  currencySymbol,
  formatCurrency,
  isLast,
}: {
  item: PRLineItem;
  currencySymbol: string | null;
  formatCurrency: (amount: number, symbol: string | null) => string;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const qty = num(item.qty);
  const rate = num(item.rate);
  const sub = num(item.subtotal) || qty * rate;
  const hasDetails = !!(item.item_long_name || item.spec || item.approved_qty || item.approved_price);
  const tone = statusTone(item.status);

  const toggle = () => {
    if (!hasDetails) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <Pressable
      onPress={toggle}
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F1F5F9",
      }}
    >
      <View className="flex-row items-center px-2 py-2">
        <View className="flex-1 pr-1 min-w-0">
          <Text className="text-xs font-medium text-foreground" numberOfLines={expanded ? undefined : 1} style={rtlTextStyle(item.name)}>
            {item.name || "Untitled item"}
          </Text>
          {item.status ? (
            <View className="self-start mt-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: tone.bg }}>
              <Text style={{ fontSize: 9, fontWeight: "600", color: tone.fg }}>{item.status}</Text>
            </View>
          ) : null}
        </View>
        <Text className="w-10 text-xs text-foreground text-right">
          {qty ? `${qty}${item.item_unit ? ` ${item.item_unit}` : ""}` : "—"}
        </Text>
        <Text className="w-14 text-xs text-muted text-right">{rate ? rate.toLocaleString() : "—"}</Text>
        <View className="w-16 items-end">
          <Text className="text-xs font-semibold text-foreground text-right">
            {formatCurrency(sub, currencySymbol) || sub.toLocaleString()}
          </Text>
          {hasDetails ? (
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={12} color="#94A3B8" />
          ) : null}
        </View>
      </View>
      {expanded && hasDetails ? (
        <View className="px-2 pb-2 border-t border-slate-100">
          {item.item_long_name ? (
            <Text className="text-[10px] text-foreground/80 mt-1" style={rtlTextStyle(item.item_long_name)}>
              {item.item_long_name}
            </Text>
          ) : null}
          {item.spec ? (
            <Text className="text-[10px] text-muted mt-0.5" style={rtlTextStyle(item.spec)}>
              {item.spec}
            </Text>
          ) : null}
          {(item.approved_qty || item.approved_price) ? (
            <Text className="text-[10px] text-muted mt-0.5">
              Approved: {item.approved_qty ?? "—"} × {item.approved_price ?? "—"}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
