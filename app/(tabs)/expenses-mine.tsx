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
import { useMyExpenses, type ExpenseRow } from "@/lib/queries/my";

/**
 * My Expenses — list of expenses the current staff has submitted.
 *
 * Shows summary card (total submitted / total billed-to-customer) at top,
 * then a list of expenses grouped by month. Tap any row → drill into the
 * standard ERP expense detail screen (uses CrudDetailScreen via the
 * "expenses" module registry entry).
 *
 * Submission form deferred — currently view-only. The /api/my/expenses
 * POST endpoint is live for when we add a form.
 */

function fmtMoney(s: string | number, currency?: string | null): string {
  const n = typeof s === "number" ? s : parseFloat(s);
  if (isNaN(n)) return String(s);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

function fmtDate(s: string): string {
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function ExpenseCard({ row }: { row: ExpenseRow }) {
  const billed = !!row.invoiceid && row.invoiceid > 0;
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/erp/expenses/${row.id}` as any)}
      activeOpacity={0.7}
      className="bg-white rounded-2xl p-4 mb-2.5 shadow-sm"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
            {row.expense_name}
          </Text>
          <Text className="text-xs text-muted mt-0.5">
            {fmtDate(row.date)} · {row.category_name ?? "Uncategorised"}
          </Text>
          {row.note ? (
            <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
              {row.note}
            </Text>
          ) : null}
        </View>
        <View className="items-end ml-3">
          <Text className="text-base font-bold text-foreground">
            {fmtMoney(row.amount, row.currency_name)}
          </Text>
          {billed ? (
            <View className="mt-1 px-2 py-0.5 rounded-full bg-emerald-50">
              <Text className="text-[10px] font-semibold text-emerald-700">BILLED</Text>
            </View>
          ) : row.billable ? (
            <View className="mt-1 px-2 py-0.5 rounded-full bg-amber-50">
              <Text className="text-[10px] font-semibold text-amber-700">BILLABLE</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MyExpensesScreen() {
  const q = useMyExpenses();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const data = q.data;

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "My Expenses",
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
        {/* Summary card */}
        {data && data.summary ? (
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <Text className="text-xs uppercase text-muted tracking-wide mb-3">
              Summary
            </Text>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-slate-600">Total submitted</Text>
              <Text className="text-sm font-semibold text-foreground tabular-nums">
                {fmtMoney(data.summary.total_amount)} · {data.summary.total_count} items
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-slate-600">Billed to customers</Text>
              <Text className="text-sm font-semibold text-emerald-700 tabular-nums">
                {fmtMoney(data.summary.billed_amount)}
              </Text>
            </View>
          </View>
        ) : null}

        {q.isLoading ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <ActivityIndicator color="#0284C7" />
          </View>
        ) : q.isError ? (
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-sm text-rose-600 text-center">
              {(q.error as Error)?.message?.slice(0, 200) || "Could not load expenses"}
            </Text>
          </View>
        ) : !data || data.data.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="cash-outline" size={32} color="#94A3B8" />
            <Text className="text-sm text-muted mt-2 text-center">
              No expenses yet
            </Text>
          </View>
        ) : (
          data.data.map((row) => <ExpenseCard key={row.id} row={row} />)
        )}
      </ScrollView>
    </View>
  );
}
