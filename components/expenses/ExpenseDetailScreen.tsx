import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useExpenseDetail,
  useMarkBillable,
  useMarkNotBillable,
  useCopyExpense,
  useDeleteExpense,
} from "@/lib/queries/expenses";
import { FilesTab } from "@/components/crud/FilesTab";
import { colors } from "@/lib/theme";
import Toast from "react-native-toast-message";

function fmtMoney(s: string | number, currency?: string | null): string {
  const n = typeof s === "number" ? s : parseFloat(s);
  if (isNaN(n)) return String(s);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

function fmtDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  if (!value) return null;
  return (
    <View className="flex-row items-center py-3 border-b border-slate-100">
      {icon ? (
        <Ionicons name={icon} size={18} color={colors.slate400} className="mr-3" />
      ) : null}
      <View className="flex-1 ml-3">
        <Text className="text-xs text-muted uppercase tracking-wide">
          {label}
        </Text>
        <Text className="text-sm font-medium text-foreground mt-0.5">
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color: btnColor,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      className="flex-1 mx-1 rounded-xl py-3 items-center shadow-sm"
      style={{ backgroundColor: `${btnColor}1A`, opacity: disabled ? 0.5 : 1 }}
    >
      <Ionicons name={icon} size={20} color={btnColor} />
      <Text
        className="text-xs font-semibold mt-1"
        style={{ color: btnColor }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type Props = {
  id: string;
};

export function ExpenseDetailScreen({ id }: Props) {
  const q = useExpenseDetail(id);
  const markBillable = useMarkBillable();
  const markNotBillable = useMarkNotBillable();
  const copyExpense = useCopyExpense();
  const deleteExpense = useDeleteExpense();
  const [refreshing, setRefreshing] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  const expense = q.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const handleToggleBillable = useCallback(() => {
    if (!expense) return;
    const action = expense.billable
      ? markNotBillable
      : markBillable;
    action.mutate(Number(id), {
      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: expense.billable ? "Marked non-billable" : "Marked billable",
        });
        q.refetch();
      },
      onError: (err: any) =>
        Alert.alert("Error", err?.message || "Failed"),
    });
  }, [expense, id, markBillable, markNotBillable, q]);

  const handleCopy = useCallback(() => {
    copyExpense.mutate(Number(id), {
      onSuccess: () => {
        Toast.show({ type: "success", text1: "Expense copied" });
      },
      onError: (err: any) =>
        Alert.alert("Error", err?.message || "Copy failed"),
    });
  }, [id, copyExpense]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete Expense?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteExpense.mutate(Number(id), {
            onSuccess: () => {
              Toast.show({ type: "success", text1: "Expense deleted" });
              router.back();
            },
            onError: (err: any) =>
              Alert.alert("Error", err?.message || "Delete failed"),
          });
        },
      },
    ]);
  }, [id, deleteExpense]);

  if (q.isLoading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (q.isError || !expense) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text className="text-foreground font-semibold mt-3 text-center">
          {(q.error as Error)?.message || "Expense not found"}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-3 rounded-xl"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const billed = !!expense.invoiceid && Number(expense.invoiceid) > 0;

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header card */}
        <View
          className="mx-4 mt-3 rounded-2xl px-5 py-5 shadow-sm"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-white/80 text-xs uppercase tracking-wide">
            {expense.category_name ?? "Expense"}
          </Text>
          <Text className="text-white text-3xl font-bold mt-1">
            {fmtMoney(expense.amount, expense.currency_name)}
          </Text>
          <Text className="text-white text-base mt-1" numberOfLines={2}>
            {expense.expense_name || "Untitled"}
          </Text>
          <Text className="text-white/70 text-sm mt-1">
            {fmtDate(expense.date)}
          </Text>
          {billed ? (
            <View className="self-start mt-2 px-3 py-1 rounded-full bg-white/20">
              <Text className="text-white text-xs font-semibold">BILLED</Text>
            </View>
          ) : expense.billable ? (
            <View className="self-start mt-2 px-3 py-1 rounded-full bg-white/20">
              <Text className="text-white text-xs font-semibold">
                BILLABLE
              </Text>
            </View>
          ) : null}
        </View>

        {/* Details section */}
        <View className="mx-4 mt-3 bg-white rounded-2xl px-5 py-2 shadow-sm">
          <InfoRow
            label="Category"
            value={expense.category_name}
            icon="pricetag-outline"
          />
          <InfoRow
            label="Client"
            value={expense.company}
            icon="business-outline"
          />
          <InfoRow
            label="Payment Mode"
            value={expense.payment_mode_name}
            icon="card-outline"
          />
          <InfoRow
            label="Reference #"
            value={expense.reference_no}
            icon="barcode-outline"
          />
          <InfoRow
            label="Date Added"
            value={fmtDate(expense.dateadded)}
            icon="calendar-outline"
          />
        </View>

        {/* Notes */}
        {expense.note ? (
          <View className="mx-4 mt-3 bg-white rounded-2xl px-5 py-4 shadow-sm">
            <Text className="text-xs text-muted uppercase tracking-wide mb-2">
              Notes
            </Text>
            <Text className="text-sm text-foreground leading-relaxed">
              {expense.note}
            </Text>
          </View>
        ) : null}

        {/* Custom fields */}
        {expense.customfields &&
        Array.isArray(expense.customfields) &&
        expense.customfields.length > 0 ? (
          <View className="mx-4 mt-3 bg-white rounded-2xl px-5 py-2 shadow-sm">
            <Text className="text-xs text-muted uppercase tracking-wide pt-3 pb-1">
              Custom Fields
            </Text>
            {expense.customfields.map((cf: any, i: number) => (
              <InfoRow
                key={i}
                label={cf.name || cf.fieldto || `Field ${i + 1}`}
                value={cf.value}
              />
            ))}
          </View>
        ) : null}

        {/* Actions */}
        <View className="mx-4 mt-4">
          <Text className="text-xs text-muted uppercase tracking-wide mb-2 px-1">
            Actions
          </Text>
          <View className="flex-row">
            <ActionButton
              icon={
                expense.billable
                  ? "close-circle-outline"
                  : "checkmark-circle-outline"
              }
              label={expense.billable ? "Not Billable" : "Billable"}
              color={expense.billable ? colors.warning : colors.success}
              onPress={handleToggleBillable}
              disabled={markBillable.isPending || markNotBillable.isPending}
            />
            <ActionButton
              icon="copy-outline"
              label="Copy"
              color={colors.info}
              onPress={handleCopy}
              disabled={copyExpense.isPending}
            />
            <ActionButton
              icon="trash-outline"
              label="Delete"
              color={colors.error}
              onPress={handleDelete}
              disabled={deleteExpense.isPending}
            />
          </View>
        </View>

        {/* Files / Receipts toggle */}
        <View className="mx-4 mt-4">
          <TouchableOpacity
            onPress={() => setShowFiles((v) => !v)}
            activeOpacity={0.7}
            className="bg-white rounded-2xl px-5 py-4 shadow-sm flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <Ionicons
                name="attach-outline"
                size={20}
                color={colors.primary}
              />
              <Text className="text-sm font-semibold text-foreground ml-2">
                Receipts & Attachments
              </Text>
            </View>
            <Ionicons
              name={showFiles ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.slate400}
            />
          </TouchableOpacity>
        </View>

        {showFiles ? (
          <View className="mx-4 mt-2" style={{ minHeight: 250 }}>
            <FilesTab
              relType="expense"
              relId={id}
              color={colors.primary}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
