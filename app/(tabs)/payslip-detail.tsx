import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMyPayslip, type PayslipDetail } from "@/lib/queries/my";

/**
 * Single payslip view — full breakdown of gross / deductions / net,
 * standard vs actual workdays, paid + unpaid leave.
 *
 * PDF download deferred to a follow-up batch (requires expo-file-system
 * pattern same as the APK update flow).
 */

function fmtMoney(s: string | undefined, currency?: string | null): string {
  if (!s) return "—";
  const n = parseFloat(s);
  if (isNaN(n)) return s;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

function fmtMonth(s: string): string {
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString([], { year: "numeric", month: "long" });
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <Text className={`text-sm ${bold ? "text-foreground font-semibold" : "text-slate-600"}`}>
        {label}
      </Text>
      <Text
        className={`text-sm tabular-nums ${
          bold ? "text-foreground font-bold" : "text-foreground"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

export default function PayslipDetailScreen() {
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? parseInt(params.id, 10) : 0;
  const q = useMyPayslip(id);

  const p = q.data as PayslipDetail | undefined;
  const currency = p?.to_currency_name || p?.from_currency_name || undefined;

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "Payslip",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color="#0284C7" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {q.isLoading ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <ActivityIndicator color="#0284C7" />
          </View>
        ) : q.isError || !p ? (
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-sm text-rose-600 text-center">
              {(q.error as Error)?.message?.slice(0, 200) || "Payslip not found"}
            </Text>
          </View>
        ) : (
          <>
            {/* Header card with net pay */}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-xs uppercase text-muted tracking-wide">
                {fmtMonth(p.month || p.payslip_month)}
              </Text>
              <Text className="text-base font-semibold text-foreground mt-1">
                {p.payslip_name}
              </Text>
              {p.pay_slip_number ? (
                <Text className="text-xs text-muted mt-0.5">#{p.pay_slip_number}</Text>
              ) : null}
              <View className="mt-4 pt-4 border-t border-slate-100">
                <Text className="text-xs text-muted">Net pay</Text>
                <Text className="text-3xl font-bold text-foreground mt-1">
                  {fmtMoney(p.net_pay, currency)}
                </Text>
              </View>
            </View>

            {/* Breakdown */}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-xs uppercase text-muted tracking-wide mb-3">
                Pay breakdown
              </Text>
              <Row label="Gross pay" value={fmtMoney(p.gross_pay, currency)} />
              <Row label="Total deductions" value={fmtMoney(p.total_deductions, currency)} />
              {p.income_tax_paye && parseFloat(p.income_tax_paye) > 0 ? (
                <Row label="Income tax (PAYE)" value={fmtMoney(p.income_tax_paye, currency)} />
              ) : null}
              <Row label="Net pay" value={fmtMoney(p.net_pay, currency)} bold />
            </View>

            {/* Workdays + leave */}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-xs uppercase text-muted tracking-wide mb-3">
                Days
              </Text>
              <Row label="Standard workdays" value={p.standard_workday} />
              <Row label="Actual workdays" value={p.actual_workday} />
              <Row label="Paid leave days" value={p.paid_leave} />
              <Row label="Unpaid leave days" value={p.unpaid_leave} />
            </View>

            {/* Meta */}
            <View className="bg-white rounded-2xl p-5">
              <Text className="text-xs uppercase text-muted tracking-wide mb-3">
                Details
              </Text>
              {p.employee_name ? <Row label="Employee" value={p.employee_name} /> : null}
              {p.dept_name ? <Row label="Department" value={p.dept_name} /> : null}
              {p.payment_run_date ? (
                <Row label="Payment run date" value={p.payment_run_date} />
              ) : null}
              {currency ? <Row label="Currency" value={currency} /> : null}
            </View>

            <Text className="text-xs text-muted text-center mt-4 mx-4">
              PDF download coming in a future update.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
