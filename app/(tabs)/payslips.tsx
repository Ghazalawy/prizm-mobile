import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useMyPayslips, type PayslipRow } from "@/lib/queries/my";

/**
 * My Payslips — list of the staff's payslip-detail rows, newest first.
 *
 * Each row shows: month, pay_slip_number, net_pay (the headline number),
 * and the parent payslip's status. Tap a row to drill into the detail
 * screen which breaks down gross / deductions / net + leave days used.
 */

function fmtMonth(s: string): string {
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString([], { year: "numeric", month: "long" });
}

function fmtMoney(s: string, currency?: string | null): string {
  const n = parseFloat(s);
  if (isNaN(n)) return s;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

function statusBadge(status: string): { text: string; color: string; bg: string } {
  // Perfex hr_payroll statuses are strings like "payslip_opening", "payslip_published", "payslip_paid"
  if (status?.includes("paid")) return { text: "Paid", color: "#16A34A", bg: "#D1FAE5" };
  if (status?.includes("publish")) return { text: "Published", color: "#0284C7", bg: "#DBEAFE" };
  if (status?.includes("close")) return { text: "Closed", color: "#475569", bg: "#E2E8F0" };
  return { text: "Draft", color: "#B45309", bg: "#FEF3C7" };
}

function PayslipCard({ row }: { row: PayslipRow }) {
  const status = statusBadge(row.payslip_status);
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/payslip-detail?id=${row.id}` as any)}
      activeOpacity={0.7}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-xs uppercase text-muted tracking-wide">
            {fmtMonth(row.month || row.payslip_month)}
          </Text>
          <Text className="text-sm font-semibold text-foreground mt-0.5" numberOfLines={1}>
            {row.payslip_name}
          </Text>
          {row.pay_slip_number ? (
            <Text className="text-xs text-slate-500 mt-0.5">
              # {row.pay_slip_number}
            </Text>
          ) : null}
        </View>
        <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: status.bg }}>
          <Text className="text-[11px] font-semibold" style={{ color: status.color }}>
            {status.text}
          </Text>
        </View>
      </View>

      <View className="flex-row items-end justify-between mt-3 pt-3 border-t border-slate-100">
        <View>
          <Text className="text-xs text-muted">Net pay</Text>
          <Text className="text-2xl font-bold text-foreground">
            {fmtMoney(row.net_pay, row.to_currency_name || row.from_currency_name)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

export default function PayslipsScreen() {
  const q = useMyPayslips();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "My Payslips",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color="#0284C7" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {q.isLoading ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <ActivityIndicator color="#0284C7" />
          </View>
        ) : q.isError ? (
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-sm text-rose-600 text-center">
              {(q.error as Error)?.message?.slice(0, 200) || "Could not load payslips"}
            </Text>
          </View>
        ) : !q.data || q.data.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="document-text-outline" size={32} color="#94A3B8" />
            <Text className="text-sm text-muted mt-2 text-center">
              No payslips yet
            </Text>
            <Text className="text-xs text-muted mt-1 text-center">
              Your payslip will appear here once HR publishes it
            </Text>
          </View>
        ) : (
          q.data.map((row) => <PayslipCard key={row.id} row={row} />)
        )}
      </ScrollView>
    </View>
  );
}
