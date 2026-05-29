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
import { router } from "expo-router";
import {
  useExpensesList,
  type ExpenseListItem,
  type ExpenseFilters,
} from "@/lib/queries/expenses";
import { colors } from "@/lib/theme";
import { FilterChip } from "@/components/ui/FilterChip";

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  travel: "airplane-outline",
  meals: "restaurant-outline",
  food: "restaurant-outline",
  supplies: "cart-outline",
  equipment: "hardware-chip-outline",
  hosting: "cloud-outline",
  software: "code-outline",
  office: "business-outline",
  fuel: "car-outline",
  transport: "bus-outline",
  phone: "call-outline",
  utilities: "flash-outline",
  marketing: "megaphone-outline",
  training: "school-outline",
};

function categoryIcon(name?: string | null): keyof typeof Ionicons.glyphMap {
  if (!name) return "receipt-outline";
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "receipt-outline";
}

type BillableFilter = "all" | "billable" | "not_billable";
type SortMode = "date" | "amount";

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
  return d.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ExpenseRow({ item }: { item: ExpenseListItem }) {
  const billed = !!item.invoiceid && Number(item.invoiceid) > 0;
  return (
    <TouchableOpacity
      onPress={() =>
        router.push(`/(tabs)/erp/expenses/${item.id}` as any)
      }
      activeOpacity={0.7}
      className="bg-white rounded-2xl p-4 mb-2.5 shadow-sm"
    >
      <View className="flex-row items-center">
        <View
          className="w-11 h-11 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: `${colors.primary}1A` }}
        >
          <Ionicons
            name={categoryIcon(item.category_name)}
            size={22}
            color={colors.primary}
          />
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-semibold text-foreground"
            numberOfLines={1}
          >
            {item.expense_name || "Untitled"}
          </Text>
          <Text className="text-xs text-muted mt-0.5">
            {fmtDate(item.date)} · {item.category_name ?? "Uncategorised"}
          </Text>
          {item.company ? (
            <Text
              className="text-xs text-slate-500 mt-0.5"
              numberOfLines={1}
            >
              {item.company}
            </Text>
          ) : null}
        </View>
        <View className="items-end ml-3">
          <Text className="text-lg font-bold text-foreground">
            {fmtMoney(item.amount, item.currency_name)}
          </Text>
          {billed ? (
            <View className="mt-1 px-2 py-0.5 rounded-full bg-emerald-50">
              <Text className="text-[10px] font-semibold text-emerald-700">
                BILLED
              </Text>
            </View>
          ) : item.billable ? (
            <View className="mt-1 px-2 py-0.5 rounded-full bg-amber-50">
              <Text className="text-[10px] font-semibold text-amber-700">
                BILLABLE
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function ExpenseListScreen() {
  const [billable, setBillable] = useState<BillableFilter>("all");
  const [sort, setSort] = useState<SortMode>("date");
  const [refreshing, setRefreshing] = useState(false);

  const filters: ExpenseFilters = useMemo(
    () => ({
      billable,
      sort,
      sortDir: "desc",
      limit: 200,
    }),
    [billable, sort]
  );

  const q = useExpensesList(filters);
  const data = q.data ?? [];

  const monthlyTotal = useMemo(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const prefix = `${yyyy}-${mm}`;
    return data
      .filter((e) => e.date.startsWith(prefix))
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  }, [data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  return (
    <View className="flex-1 bg-surface">
      {/* Monthly summary bar */}
      <View
        className="mx-4 mt-3 rounded-2xl px-5 py-4 shadow-sm"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-white/80 text-xs uppercase tracking-wide">
          This Month
        </Text>
        <Text className="text-white text-3xl font-bold mt-1">
          {fmtMoney(monthlyTotal)}
        </Text>
        <Text className="text-white/70 text-xs mt-1">
          {data.length} total expense{data.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <FilterChip
          label="All"
          active={billable === "all"}
          onPress={() => setBillable("all")}
        />
        <FilterChip
          label="Billable"
          active={billable === "billable"}
          onPress={() => setBillable("billable")}
        />
        <FilterChip
          label="Non-Billable"
          active={billable === "not_billable"}
          onPress={() => setBillable("not_billable")}
        />
        <View className="w-px h-6 bg-slate-200 mx-2 self-center" />
        <FilterChip
          label={sort === "date" ? "By Date" : "By Amount"}
          active
          onPress={() => setSort((s) => (s === "date" ? "amount" : "date"))}
        />
      </ScrollView>

      {/* List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {q.isLoading ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : q.isError ? (
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-sm text-rose-600 text-center">
              {(q.error as Error)?.message?.slice(0, 200) ||
                "Could not load expenses"}
            </Text>
          </View>
        ) : data.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="receipt-outline" size={40} color="#94A3B8" />
            <Text className="text-sm text-muted mt-2 text-center">
              No expenses found
            </Text>
          </View>
        ) : (
          data.map((row) => <ExpenseRow key={row.id} item={row} />)
        )}
      </ScrollView>

      {/* FAB: Quick Expense */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/quick-expense" as any)}
        activeOpacity={0.85}
        className="absolute bottom-6 right-6 w-16 h-16 rounded-full items-center justify-center shadow-lg"
        style={{ backgroundColor: colors.primary, elevation: 8 }}
      >
        <Ionicons name="add" size={32} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}
