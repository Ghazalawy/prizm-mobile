import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import Toast from "react-native-toast-message";

import {
  useEstimateDetail,
  useSendEstimate,
  useMarkEstimate,
  useConvertToInvoice,
} from "@/lib/queries/finance";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { LineItemsTable } from "./LineItemsTable";
import { TotalsCard } from "./TotalsCard";
import { FilesTab } from "@/components/crud/FilesTab";
import { rtlTextStyle } from "@/lib/rtl";

const ACCENT = "#7C3AED";

type TabKey = "details" | "notes" | "files";

type Props = { id: string };

export function EstimateDetailScreen({ id }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("details");

  const estimate = useEstimateDetail(id);
  const sendMut = useSendEstimate();
  const markMut = useMarkEstimate();
  const convertMut = useConvertToInvoice();

  const row = estimate.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await estimate.refetch();
    setRefreshing(false);
  }, [estimate]);

  if (estimate.isLoading && !row) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (estimate.isError || !row) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-8">
        <Ionicons name="cloud-offline-outline" size={42} color="#EF4444" />
        <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load estimate</Text>
        <TouchableOpacity onPress={() => estimate.refetch()} className="mt-4 bg-primary px-5 py-2 rounded-lg">
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = String(row.status || "1");
  const estimateNum = row.estimate_number || row.number || `#${id}`;
  const clientName = row.company || row.client_name || "";
  const items = row._items || [];
  const taxes = row._taxes || [];

  const confirmAction = (title: string, msg: string, onConfirm: () => void, destructive = false) => {
    Alert.alert(title, msg, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: destructive ? "destructive" : "default", onPress: onConfirm },
    ]);
  };

  const handleSend = () =>
    confirmAction("Send Estimate", "Email this estimate to the client?", () =>
      sendMut.mutate(id, {
        onSuccess: () => Toast.show({ type: "success", text1: "Estimate sent" }),
        onError: (e) => Alert.alert("Error", e.message),
      }),
    );

  const handleMark = (action: string, label: string, destructive = false) =>
    confirmAction(`Mark as ${label}`, `Mark this estimate as ${label.toLowerCase()}?`, () =>
      markMut.mutate({ id, action }, {
        onSuccess: () => Toast.show({ type: "success", text1: `Marked ${label.toLowerCase()}` }),
        onError: (e) => Alert.alert("Error", e.message),
      }),
      destructive,
    );

  const handleConvert = () =>
    confirmAction("Convert to Invoice", "Convert this estimate to an invoice?", () =>
      convertMut.mutate(id, {
        onSuccess: () => {
          Toast.show({ type: "success", text1: "Converted to invoice" });
          router.back();
        },
        onError: (e) => Alert.alert("Error", e.message),
      }),
    );

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-white border-b border-slate-200 flex-row items-center px-3" style={{ minHeight: 48 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-2 text-base font-semibold text-foreground flex-1" numberOfLines={1}>
          Estimate {estimateNum}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {/* Hero */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-start">
            <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: `${ACCENT}1A` }}>
              <Ionicons name="reader-outline" size={24} color={ACCENT} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-xl font-bold text-foreground">{estimateNum}</Text>
              {clientName ? <Text className="text-sm text-muted mt-0.5">{clientName}</Text> : null}
              <View className="flex-row items-center mt-2 flex-wrap gap-1.5">
                <DocumentStatusBadge type="estimate" status={status} size="md" />
                {row.date ? <InfoPill icon="calendar-outline" label={row.date} /> : null}
                {row.expirydate && !row.expirydate.startsWith("0000") ? (
                  <InfoPill icon="hourglass-outline" label={`Valid until: ${row.expirydate}`} />
                ) : null}
              </View>
            </View>
          </View>

          <View className="flex-row mt-4 -mx-1">
            <View className="flex-1 mx-1 bg-slate-50 rounded-xl p-3 items-center">
              <Text className="text-xl font-bold font-mono" style={{ color: ACCENT }}>
                {Number(row.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              <Text className="text-[10px] text-muted mt-0.5">Total</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row mt-3 gap-2 flex-wrap">
          {status === "1" || status === "2" ? (
            <ActionBtn icon="paper-plane-outline" label="Send" color="#2563EB" loading={sendMut.isPending} onPress={handleSend} />
          ) : null}
          {status !== "4" && status !== "3" ? (
            <ActionBtn icon="thumbs-up-outline" label="Accept" color="#16A34A" loading={markMut.isPending} onPress={() => handleMark("accepted", "Accepted")} />
          ) : null}
          {status !== "3" && status !== "4" ? (
            <ActionBtn icon="thumbs-down-outline" label="Decline" color="#DC2626" loading={markMut.isPending} onPress={() => handleMark("declined", "Declined", true)} />
          ) : null}
          {status === "4" ? (
            <ActionBtn icon="swap-horizontal-outline" label="Convert to Invoice" color="#7C3AED" loading={convertMut.isPending} onPress={handleConvert} />
          ) : null}
        </View>

        {/* Tabs */}
        <View className="mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8 }}>
            {(["details", "notes", "files"] as TabKey[]).map((k) => (
              <TabPill key={k} active={tab === k} label={k === "details" ? "Details" : k === "notes" ? "Notes" : "Files"} onPress={() => setTab(k)} />
            ))}
          </ScrollView>

          <View className="border-t border-slate-100">
            {tab === "details" ? (
              <View>
                <LineItemsTable items={items} currency={row.currency_name || row.symbol} variant="compact" />
                <View className="px-3 pb-3 pt-2">
                  <TotalsCard
                    data={{
                      subtotal: row.subtotal,
                      discount_percent: row.discount_percent,
                      discount_total: row.discount_total,
                      taxes,
                      adjustment: row.adjustment,
                      total: row.total,
                      currency_symbol: row.symbol || row.currency_name,
                    }}
                  />
                </View>
              </View>
            ) : null}

            {tab === "notes" ? (
              <NotesPanel row={row} />
            ) : null}

            {tab === "files" ? (
              <View style={{ height: 400 }}>
                <FilesTab relType="estimate" relId={id} color={ACCENT} />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center bg-slate-100 px-2 py-1 rounded-full">
      <Ionicons name={icon} size={11} color="#475569" style={{ marginRight: 4 }} />
      <Text className="text-[11px] font-medium text-slate-600">{label}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, color, loading, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; color: string; loading?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className="flex-1 flex-row items-center justify-center bg-white rounded-xl py-3 shadow-sm min-w-[100]"
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          <Ionicons name={icon} size={16} color={color} />
          <Text className="ml-1.5 text-xs font-semibold" style={{ color }} numberOfLines={1}>{label}</Text>
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
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
        backgroundColor: active ? ACCENT : "#F1F5F9", marginRight: 6,
      }}
    >
      <Text style={{ color: active ? "#FFF" : "#475569", fontWeight: "600", fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function NotesPanel({ row }: { row: any }) {
  const hasNotes = row.adminnote || row.clientnote || row.terms;
  if (!hasNotes) {
    return <View className="px-4 py-8 items-center"><Text className="text-sm text-muted">No notes</Text></View>;
  }
  return (
    <View className="px-4 py-3">
      {row.adminnote ? <NoteSection title="Admin Note" text={row.adminnote} /> : null}
      {row.clientnote ? <NoteSection title="Client Note" text={row.clientnote} /> : null}
      {row.terms ? <NoteSection title="Terms & Conditions" text={row.terms} /> : null}
    </View>
  );
}

function NoteSection({ title, text }: { title: string; text: string }) {
  const cleaned = text.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  return (
    <View className="mb-4">
      <Text className="text-xs uppercase text-muted font-semibold tracking-wide mb-1">{title}</Text>
      <Text className="text-sm text-foreground leading-5" style={rtlTextStyle(cleaned)} selectable>{cleaned}</Text>
    </View>
  );
}
