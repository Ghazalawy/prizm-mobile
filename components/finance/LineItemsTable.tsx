import { Text, View } from "react-native";
import { memo } from "react";
import { rtlTextStyle } from "@/lib/rtl";

export type LineItem = {
  description?: string;
  long_description?: string;
  qty?: number | string;
  rate?: number | string;
  unit?: string;
  amount?: number | string;
  taxname?: string;
  taxrate?: number | string;
};

type Props = {
  items: LineItem[];
  currency?: string;
};

function num(v: number | string | undefined | null): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function fmtMoney(v: number | string | undefined | null, currency?: string): string {
  const n = num(v);
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

export const LineItemsTable = memo(function LineItemsTable({ items, currency }: Props) {
  if (!items || items.length === 0) {
    return (
      <View className="px-4 py-6 items-center">
        <Text className="text-sm text-muted">No line items</Text>
      </View>
    );
  }

  const total = items.reduce((sum, item) => {
    const qty = num(item.qty);
    const rate = num(item.rate);
    return sum + (num(item.amount) || qty * rate);
  }, 0);

  return (
    <View className="overflow-hidden">
      {/* Header */}
      <View className="flex-row bg-slate-50 px-4 py-2.5 border-b border-slate-200">
        <Text className="flex-1 text-[10px] font-semibold uppercase text-muted tracking-wide">
          Item
        </Text>
        <Text className="w-12 text-[10px] font-semibold uppercase text-muted tracking-wide text-right">
          Qty
        </Text>
        <Text className="w-20 text-[10px] font-semibold uppercase text-muted tracking-wide text-right">
          Rate
        </Text>
        <Text className="w-24 text-[10px] font-semibold uppercase text-muted tracking-wide text-right">
          Amount
        </Text>
      </View>

      {/* Rows */}
      {items.map((item, idx) => {
        const qty = num(item.qty);
        const rate = num(item.rate);
        const amount = num(item.amount) || qty * rate;
        const desc = item.description || item.long_description || `Item ${idx + 1}`;
        const isAlt = idx % 2 === 1;

        return (
          <View
            key={`item-${idx}`}
            className={`flex-row px-4 py-3 border-b border-slate-100 ${isAlt ? "bg-slate-50/50" : "bg-white"}`}
          >
            <View className="flex-1 pr-2">
              <Text
                className="text-sm text-foreground"
                style={rtlTextStyle(desc)}
                numberOfLines={3}
              >
                {desc}
              </Text>
              {item.long_description && item.description ? (
                <Text
                  className="text-xs text-muted mt-0.5"
                  style={rtlTextStyle(item.long_description)}
                  numberOfLines={2}
                >
                  {item.long_description}
                </Text>
              ) : null}
              {item.unit ? (
                <Text className="text-[10px] text-muted mt-0.5">{item.unit}</Text>
              ) : null}
              {item.taxname ? (
                <Text className="text-[10px] text-muted mt-0.5">
                  Tax: {item.taxname} ({item.taxrate}%)
                </Text>
              ) : null}
            </View>
            <Text className="w-12 text-sm text-foreground text-right font-mono">
              {qty || "—"}
            </Text>
            <Text className="w-20 text-sm text-foreground text-right font-mono">
              {fmtMoney(rate)}
            </Text>
            <Text className="w-24 text-sm text-foreground text-right font-semibold font-mono">
              {fmtMoney(amount)}
            </Text>
          </View>
        );
      })}

      {/* Total row */}
      <View className="flex-row px-4 py-3 bg-slate-100">
        <Text className="flex-1 text-sm font-semibold text-foreground">
          Line Items Total
        </Text>
        <Text className="w-24 text-sm font-bold text-foreground text-right font-mono">
          {fmtMoney(total, currency)}
        </Text>
      </View>
    </View>
  );
});
