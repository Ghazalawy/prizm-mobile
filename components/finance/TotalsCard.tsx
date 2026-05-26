import { Text, View } from "react-native";
import { memo } from "react";

export type TaxLine = {
  name?: string;
  taxname?: string;
  rate?: number | string;
  taxrate?: number | string;
  amount?: number | string;
};

export type TotalsData = {
  subtotal?: number | string;
  discount_percent?: number | string;
  discount_total?: number | string;
  discount_type?: string;
  taxes?: TaxLine[];
  adjustment?: number | string;
  total?: number | string;
  total_paid?: number | string;
  amount_due?: number | string;
  credits_applied?: number | string;
  currency_symbol?: string;
};

type Props = {
  data: TotalsData;
  showPaymentInfo?: boolean;
};

function num(v: number | string | undefined | null): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function fmtMoney(v: number | string | undefined | null, sym?: string): string {
  const n = num(v);
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return sym ? `${sym} ${formatted}` : formatted;
}

export const TotalsCard = memo(function TotalsCard({ data, showPaymentInfo }: Props) {
  const sym = data.currency_symbol;
  const subtotal = num(data.subtotal);
  const total = num(data.total);
  const discountPct = num(data.discount_percent);
  const discountTotal = num(data.discount_total);
  const adjustment = num(data.adjustment);
  const paid = num(data.total_paid);
  const credits = num(data.credits_applied);
  const due = num(data.amount_due) || total - paid - credits;

  const hasDiscount = discountPct > 0 || discountTotal > 0;
  const hasAdjustment = adjustment !== 0;
  const hasTaxes = data.taxes && data.taxes.length > 0;

  return (
    <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-xs uppercase tracking-wide text-muted font-semibold">
          Financial Summary
        </Text>
      </View>

      <View className="px-4 pb-4">
        {/* Subtotal */}
        <TotalRow label="Subtotal" value={fmtMoney(subtotal, sym)} />

        {/* Discount */}
        {hasDiscount ? (
          <TotalRow
            label={`Discount${discountPct > 0 ? ` (${discountPct}%)` : ""}`}
            value={`-${fmtMoney(discountTotal || subtotal * (discountPct / 100), sym)}`}
            valueColor="#DC2626"
          />
        ) : null}

        {/* Taxes */}
        {hasTaxes
          ? data.taxes!.map((tax, i) => {
              const taxName = tax.name || tax.taxname || "Tax";
              const taxRate = num(tax.rate || tax.taxrate);
              const taxAmount = num(tax.amount);
              return (
                <TotalRow
                  key={`tax-${i}`}
                  label={`${taxName}${taxRate > 0 ? ` (${taxRate}%)` : ""}`}
                  value={fmtMoney(taxAmount, sym)}
                />
              );
            })
          : null}

        {/* Adjustment */}
        {hasAdjustment ? (
          <TotalRow
            label="Adjustment"
            value={`${adjustment > 0 ? "+" : ""}${fmtMoney(adjustment, sym)}`}
            valueColor={adjustment > 0 ? "#16A34A" : "#DC2626"}
          />
        ) : null}

        {/* Grand Total */}
        <View className="flex-row justify-between items-center pt-3 mt-2 border-t border-slate-200">
          <Text className="text-base font-bold text-foreground">Grand Total</Text>
          <Text className="text-xl font-bold text-foreground font-mono">
            {fmtMoney(total, sym)}
          </Text>
        </View>

        {/* Payment info for invoices */}
        {showPaymentInfo ? (
          <View className="mt-3 pt-3 border-t border-dashed border-slate-200">
            {paid > 0 ? (
              <TotalRow
                label="Amount Paid"
                value={fmtMoney(paid, sym)}
                valueColor="#16A34A"
              />
            ) : null}
            {credits > 0 ? (
              <TotalRow
                label="Credits Applied"
                value={fmtMoney(credits, sym)}
                valueColor="#2563EB"
              />
            ) : null}
            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-sm font-bold text-foreground">Amount Due</Text>
              <Text
                className="text-lg font-bold font-mono"
                style={{ color: due > 0 ? "#DC2626" : "#16A34A" }}
              >
                {fmtMoney(due, sym)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
});

function TotalRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View className="flex-row justify-between items-center py-1.5">
      <Text className="text-sm text-muted">{label}</Text>
      <Text
        className="text-sm font-medium font-mono"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </Text>
    </View>
  );
}
