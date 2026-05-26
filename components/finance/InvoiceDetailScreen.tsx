import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import Toast from "react-native-toast-message";

import {
  useInvoiceDetail,
  useInvoicePayments,
  useRecordPayment,
  useSendInvoice,
  useMarkInvoiceCancelled,
} from "@/lib/queries/finance";
import { DocumentStatusBadge, isOverdue } from "./DocumentStatusBadge";
import { LineItemsTable } from "./LineItemsTable";
import { TotalsCard } from "./TotalsCard";
import { FilesTab } from "@/components/crud/FilesTab";
import { rtlTextStyle } from "@/lib/rtl";

const ACCENT = "#DC2626";

type TabKey = "details" | "payments" | "notes" | "files";

type Props = { id: string };

export function InvoiceDetailScreen({ id }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("details");
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);

  const invoice = useInvoiceDetail(id);
  const payments = useInvoicePayments(id);
  const sendMut = useSendInvoice();
  const cancelMut = useMarkInvoiceCancelled();

  const row = invoice.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([invoice.refetch(), payments.refetch()]);
    setRefreshing(false);
  }, [invoice, payments]);

  if (invoice.isLoading && !row) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (invoice.isError || !row) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-8">
        <Ionicons name="cloud-offline-outline" size={42} color="#EF4444" />
        <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load invoice</Text>
        <Text className="text-muted text-sm mt-1 text-center">
          {(invoice.error as Error)?.message || "Invoice not found"}
        </Text>
        <TouchableOpacity onPress={() => invoice.refetch()} className="mt-4 bg-primary px-5 py-2 rounded-lg">
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = String(row.status || "1");
  const overdue = isOverdue(row.duedate) && (status === "1" || status === "2");
  const invoiceNum = row.invoice_number || row.number || `#${id}`;
  const clientName = row.company || row.client_name || "";
  const items = row._items || [];
  const taxes = row._taxes || [];
  const paymentList = payments.data || row._payments || [];

  const totalPaid = paymentList.reduce(
    (s: number, p: any) => s + Number(p.amount || 0),
    0,
  );
  const total = Number(row.total || 0);
  const amountDue = total - totalPaid - Number(row.credits_applied || 0);

  const handleSend = () => {
    Alert.alert("Send Invoice", "Email this invoice to the client?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: () =>
          sendMut.mutate(id, {
            onSuccess: () => Toast.show({ type: "success", text1: "Invoice sent" }),
            onError: (e) => Alert.alert("Error", e.message),
          }),
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert("Cancel Invoice", "Mark this invoice as cancelled?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Invoice",
        style: "destructive",
        onPress: () =>
          cancelMut.mutate(id, {
            onSuccess: () => Toast.show({ type: "success", text1: "Invoice cancelled" }),
            onError: (e) => Alert.alert("Error", e.message),
          }),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-surface">
      {/* Header bar */}
      <View className="bg-white border-b border-slate-200 flex-row items-center px-3" style={{ minHeight: 48 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-2 text-base font-semibold text-foreground flex-1" numberOfLines={1}>
          Invoice {invoiceNum}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* Overdue banner */}
        {overdue ? (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3 flex-row items-center">
            <Ionicons name="warning-outline" size={20} color="#DC2626" />
            <Text className="text-red-800 font-semibold ml-2 flex-1">
              This invoice is overdue — due {row.duedate}
            </Text>
          </View>
        ) : null}

        {/* Hero card */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-start">
            <View
              className="w-12 h-12 rounded-xl items-center justify-center"
              style={{ backgroundColor: `${ACCENT}1A` }}
            >
              <Ionicons name="document-text-outline" size={24} color={ACCENT} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-xl font-bold text-foreground">{invoiceNum}</Text>
              {clientName ? (
                <Text className="text-sm text-muted mt-0.5">{clientName}</Text>
              ) : null}
              <View className="flex-row items-center mt-2 flex-wrap gap-1.5">
                <DocumentStatusBadge type="invoice" status={status} dueDate={row.duedate} size="md" />
                {row.date ? (
                  <InfoPill icon="calendar-outline" label={row.date} />
                ) : null}
                {row.duedate && !row.duedate.startsWith("0000") ? (
                  <InfoPill icon="flag-outline" label={`Due: ${row.duedate}`} />
                ) : null}
              </View>
            </View>
          </View>

          {/* Amount summary */}
          <View className="flex-row mt-4 -mx-1">
            <MetricBox label="Total" value={fmtShort(total)} color={ACCENT} />
            <MetricBox label="Paid" value={fmtShort(totalPaid)} color="#16A34A" />
            <MetricBox
              label="Due"
              value={fmtShort(amountDue)}
              color={amountDue > 0 ? "#DC2626" : "#16A34A"}
            />
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row mt-3 gap-2">
          {(status === "6" || status === "1") ? (
            <ActionBtn
              icon="paper-plane-outline"
              label="Send"
              color="#2563EB"
              loading={sendMut.isPending}
              onPress={handleSend}
            />
          ) : null}
          {(status === "1" || status === "2" || status === "3") ? (
            <ActionBtn
              icon="cash-outline"
              label="Record Payment"
              color="#16A34A"
              onPress={() => setPaymentSheetVisible(true)}
            />
          ) : null}
          {status !== "4" && status !== "5" ? (
            <ActionBtn
              icon="close-circle-outline"
              label="Cancel"
              color="#94A3B8"
              loading={cancelMut.isPending}
              onPress={handleCancel}
            />
          ) : null}
        </View>

        {/* Tabs */}
        <View className="mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8 }}>
            {(["details", "payments", "notes", "files"] as TabKey[]).map((k) => (
              <TabPill key={k} active={tab === k} label={tabLabel(k)} onPress={() => setTab(k)} />
            ))}
          </ScrollView>

          <View className="border-t border-slate-100">
            {tab === "details" ? (
              <View>
                <LineItemsTable items={items} currency={row.currency_name || row.symbol} />
                <View className="px-3 pb-3 pt-2">
                  <TotalsCard
                    data={{
                      subtotal: row.subtotal,
                      discount_percent: row.discount_percent,
                      discount_total: row.discount_total,
                      discount_type: row.discount_type,
                      taxes,
                      adjustment: row.adjustment,
                      total: row.total,
                      total_paid: totalPaid,
                      amount_due: amountDue,
                      credits_applied: row.credits_applied,
                      currency_symbol: row.symbol || row.currency_name,
                    }}
                    showPaymentInfo
                  />
                </View>
              </View>
            ) : null}

            {tab === "payments" ? (
              <PaymentsPanel payments={paymentList} />
            ) : null}

            {tab === "notes" ? (
              <NotesPanel row={row} />
            ) : null}

            {tab === "files" ? (
              <View style={{ height: 400 }}>
                <FilesTab relType="invoice" relId={id} color={ACCENT} />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Record Payment Sheet */}
      <RecordPaymentSheet
        visible={paymentSheetVisible}
        onClose={() => setPaymentSheetVisible(false)}
        invoiceId={id}
        remainingBalance={amountDue}
      />
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function InfoPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center bg-slate-100 px-2 py-1 rounded-full">
      <Ionicons name={icon} size={11} color="#475569" style={{ marginRight: 4 }} />
      <Text className="text-[11px] font-medium text-slate-600">{label}</Text>
    </View>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="flex-1 mx-1 bg-slate-50 rounded-xl p-3 items-center">
      <Text className="text-lg font-bold font-mono" style={{ color }}>{value}</Text>
      <Text className="text-[10px] text-muted mt-0.5">{label}</Text>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  color,
  loading,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className="flex-1 flex-row items-center justify-center bg-white rounded-xl py-3 shadow-sm"
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          <Ionicons name={icon} size={16} color={color} />
          <Text className="ml-1.5 text-xs font-semibold" style={{ color }}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function TabPill({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: active ? ACCENT : "#F1F5F9",
        marginRight: 6,
      }}
    >
      <Text style={{ color: active ? "#FFF" : "#475569", fontWeight: "600", fontSize: 12 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PaymentsPanel({ payments }: { payments: any[] }) {
  if (payments.length === 0) {
    return (
      <View className="px-4 py-8 items-center">
        <Ionicons name="card-outline" size={32} color="#CBD5E1" />
        <Text className="text-sm text-muted mt-2">No payments recorded yet</Text>
      </View>
    );
  }

  return (
    <View className="px-4 py-3">
      {payments.map((p: any, idx: number) => (
        <View
          key={p.id ?? idx}
          className="flex-row items-center py-3 border-b border-slate-100"
        >
          <View className="w-8 h-8 rounded-full bg-green-50 items-center justify-center">
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-sm font-medium text-foreground">
              {Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
            <Text className="text-xs text-muted">
              {[p.date, p.paymentmethod || p.paymentmode, p.transactionid]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function NotesPanel({ row }: { row: any }) {
  const hasNotes = row.adminnote || row.clientnote || row.terms;
  if (!hasNotes) {
    return (
      <View className="px-4 py-8 items-center">
        <Text className="text-sm text-muted">No notes</Text>
      </View>
    );
  }
  return (
    <View className="px-4 py-3">
      {row.adminnote ? (
        <NoteSection title="Admin Note" text={row.adminnote} />
      ) : null}
      {row.clientnote ? (
        <NoteSection title="Client Note" text={row.clientnote} />
      ) : null}
      {row.terms ? (
        <NoteSection title="Terms & Conditions" text={row.terms} />
      ) : null}
    </View>
  );
}

function NoteSection({ title, text }: { title: string; text: string }) {
  const cleaned = cleanHtml(text);
  return (
    <View className="mb-4">
      <Text className="text-xs uppercase text-muted font-semibold tracking-wide mb-1">
        {title}
      </Text>
      <Text className="text-sm text-foreground leading-5" style={rtlTextStyle(cleaned)} selectable>
        {cleaned}
      </Text>
    </View>
  );
}

// ─── Record Payment Sheet ────────────────────────────────────────────────

function RecordPaymentSheet({
  visible,
  onClose,
  invoiceId,
  remainingBalance,
}: {
  visible: boolean;
  onClose: () => void;
  invoiceId: string;
  remainingBalance: number;
}) {
  const [amount, setAmount] = useState(String(Math.max(0, remainingBalance).toFixed(2)));
  const [paymentMode, setPaymentMode] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const recordPayment = useRecordPayment();

  const handleSubmit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid payment amount.");
      return;
    }
    recordPayment.mutate(
      {
        invoiceId,
        payload: {
          amount: amt,
          paymentmode: paymentMode || undefined,
          date: date || undefined,
          transactionid: transactionId || undefined,
          note: note || undefined,
        },
      },
      {
        onSuccess: () => {
          Toast.show({ type: "success", text1: "Payment recorded" });
          onClose();
        },
        onError: (e) => Alert.alert("Error", e.message),
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">Record Payment</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <SheetField label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <SheetField label="Payment Mode" value={paymentMode} onChangeText={setPaymentMode} placeholder="e.g. Bank Transfer, Cash" />
          <SheetField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <SheetField label="Transaction ID" value={transactionId} onChangeText={setTransactionId} placeholder="Optional" />
          <SheetField label="Note" value={note} onChangeText={setNote} placeholder="Optional" multiline />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={recordPayment.isPending}
            className="mt-4 rounded-xl py-4 items-center"
            style={{ backgroundColor: "#16A34A" }}
            activeOpacity={0.8}
          >
            {recordPayment.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text className="text-white font-bold text-base">Record Payment</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SheetField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "decimal-pad" | "default";
  multiline?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className="text-xs text-muted font-semibold mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType || "default"}
        multiline={multiline}
        className="border border-slate-200 rounded-xl px-3 py-2.5 text-foreground"
        style={multiline ? { minHeight: 60, textAlignVertical: "top" } : undefined}
      />
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function tabLabel(k: TabKey): string {
  switch (k) {
    case "details": return "Details";
    case "payments": return "Payments";
    case "notes": return "Notes";
    case "files": return "Files";
  }
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cleanHtml(value: string): string {
  return value
    .replace(/<\/(p|div|li|br|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}
