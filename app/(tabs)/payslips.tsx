import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useMyPayslips, type PayslipRow } from "@/lib/queries/my";

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
  if (status?.includes("paid")) return { text: "Paid", color: "#16A34A", bg: "#D1FAE5" };
  if (status?.includes("publish")) return { text: "Published", color: "#0284C7", bg: "#DBEAFE" };
  if (status?.includes("close")) return { text: "Closed", color: "#475569", bg: "#E2E8F0" };
  return { text: "Draft", color: "#B45309", bg: "#FEF3C7" };
}

function PayslipCard({ row }: { row: PayslipRow }) {
  const status = statusBadge(row.payslip_status);
  const gross = parseFloat(row.gross_pay || "0");
  const deductions = parseFloat(row.total_deductions || "0");
  const net = parseFloat(row.net_pay || "0");

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

      {/* Gross / Deductions / Net mini-breakdown */}
      <View className="flex-row mt-3 pt-3 border-t border-slate-100 gap-x-4">
        <View className="flex-1">
          <Text className="text-[10px] text-slate-400 uppercase">Gross</Text>
          <Text className="text-xs font-medium text-slate-700">
            {fmtMoney(row.gross_pay, null)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[10px] text-slate-400 uppercase">Deductions</Text>
          <Text className="text-xs font-medium text-rose-600">
            -{fmtMoney(row.total_deductions, null)}
          </Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-[10px] text-slate-400 uppercase">Net</Text>
          <Text className="text-base font-bold text-foreground">
            {fmtMoney(row.net_pay, row.to_currency_name || row.from_currency_name)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-end mt-2">
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}

export default function PayslipsScreen() {
  const q = useMyPayslips();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  const filteredPayslips = useMemo(() => {
    if (!q.data) return [];
    return q.data.filter((row) => {
      const month = row.month || row.payslip_month;
      if (!month) return true;
      const d = new Date(month.replace(" ", "T"));
      return !isNaN(d.getTime()) ? d.getFullYear() === selectedYear : true;
    });
  }, [q.data, selectedYear]);

  const totalNet = useMemo(() => {
    return filteredPayslips.reduce((sum, r) => sum + parseFloat(r.net_pay || "0"), 0);
  }, [filteredPayslips]);

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
        {/* Year filter */}
        <View className="flex-row gap-2 mb-4">
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              onPress={() => setSelectedYear(year)}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: selectedYear === year ? "#0284C7" : "#F1F5F9" }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: selectedYear === year ? "#FFF" : "#475569" }}
              >
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary card */}
        {filteredPayslips.length > 0 ? (
          <View className="bg-gradient-to-r from-sky-50 to-blue-50 bg-sky-50 rounded-2xl p-4 mb-4 border border-sky-100">
            <Text className="text-xs text-sky-700 uppercase tracking-wide">
              {selectedYear} Total Net (×{filteredPayslips.length} slips)
            </Text>
            <Text className="text-2xl font-bold text-sky-900 mt-1">
              {totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        ) : null}

        {/* Payslip cards */}
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
        ) : filteredPayslips.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="document-text-outline" size={32} color="#94A3B8" />
            <Text className="text-sm text-muted mt-2 text-center">
              No payslips for {selectedYear}
            </Text>
            <Text className="text-xs text-muted mt-1 text-center">
              Your payslip will appear here once HR publishes it
            </Text>
          </View>
        ) : (
          filteredPayslips.map((row) => <PayslipCard key={row.id} row={row} />)
        )}
      </ScrollView>
    </View>
  );
}
