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
  useProposalDetail,
  useSendProposal,
  useCopyProposal,
  useMarkProposal,
} from "@/lib/queries/finance";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { LineItemsTable } from "./LineItemsTable";
import { TotalsCard } from "./TotalsCard";
import { FilesTab } from "@/components/crud/FilesTab";
import { rtlTextStyle } from "@/lib/rtl";

const ACCENT = "#0891B2";

type TabKey = "content" | "items" | "files";

type Props = { id: string };

export function ProposalDetailScreen({ id }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("content");

  const proposal = useProposalDetail(id);
  const sendMut = useSendProposal();
  const copyMut = useCopyProposal();
  const markMut = useMarkProposal();

  const row = proposal.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await proposal.refetch();
    setRefreshing(false);
  }, [proposal]);

  if (proposal.isLoading && !row) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (proposal.isError || !row) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-8">
        <Ionicons name="cloud-offline-outline" size={42} color="#EF4444" />
        <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load proposal</Text>
        <TouchableOpacity onPress={() => proposal.refetch()} className="mt-4 bg-primary px-5 py-2 rounded-lg">
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = String(row.status || "6");
  const subject = row.subject || `Proposal #${id}`;
  const recipient = row.proposal_to || "";
  const items = row._items || [];
  const taxes = row._taxes || [];
  const hasItems = items.length > 0;

  const confirmAction = (title: string, msg: string, onConfirm: () => void, destructive = false) => {
    Alert.alert(title, msg, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: destructive ? "destructive" : "default", onPress: onConfirm },
    ]);
  };

  const handleSend = () =>
    confirmAction("Send Proposal", "Email this proposal to the recipient?", () =>
      sendMut.mutate({ id }, {
        onSuccess: () => Toast.show({ type: "success", text1: "Proposal sent" }),
        onError: (e) => Alert.alert("Error", e.message),
      }),
    );

  const handleCopy = () =>
    confirmAction("Copy Proposal", "Make a copy of this proposal?", () =>
      copyMut.mutate(id, {
        onSuccess: () => Toast.show({ type: "success", text1: "Proposal copied" }),
        onError: (e) => Alert.alert("Error", e.message),
      }),
    );

  const handleMark = (action: string, label: string, destructive = false) =>
    confirmAction(`Mark as ${label}`, `Mark this proposal as ${label.toLowerCase()}?`, () =>
      markMut.mutate({ id, action }, {
        onSuccess: () => Toast.show({ type: "success", text1: `Marked ${label.toLowerCase()}` }),
        onError: (e) => Alert.alert("Error", e.message),
      }),
      destructive,
    );

  const contentText = cleanHtml(row.content || "");

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-white border-b border-slate-200 flex-row items-center px-3" style={{ minHeight: 48 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-2 text-base font-semibold text-foreground flex-1" numberOfLines={1}>
          Proposal
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
              <Ionicons name="newspaper-outline" size={24} color={ACCENT} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-lg font-bold text-foreground" style={rtlTextStyle(subject)}>
                {subject}
              </Text>
              {recipient ? <Text className="text-sm text-muted mt-0.5">{recipient}</Text> : null}
              {row.email ? <Text className="text-xs text-muted">{row.email}</Text> : null}
              <View className="flex-row items-center mt-2 flex-wrap gap-1.5">
                <DocumentStatusBadge type="proposal" status={status} size="md" />
                {row.date ? <InfoPill icon="calendar-outline" label={row.date} /> : null}
                {row.open_till && !row.open_till.startsWith("0000") ? (
                  <InfoPill icon="hourglass-outline" label={`Open till: ${row.open_till}`} />
                ) : null}
              </View>
            </View>
          </View>

          {Number(row.total || 0) > 0 ? (
            <View className="mt-4 bg-slate-50 rounded-xl p-3 items-center">
              <Text className="text-xl font-bold font-mono" style={{ color: ACCENT }}>
                {Number(row.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              <Text className="text-[10px] text-muted mt-0.5">Total</Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View className="flex-row mt-3 gap-2 flex-wrap">
          <ActionBtn icon="paper-plane-outline" label="Send" color="#2563EB" loading={sendMut.isPending} onPress={handleSend} />
          <ActionBtn icon="copy-outline" label="Copy" color="#64748B" loading={copyMut.isPending} onPress={handleCopy} />
          {status !== "3" ? (
            <ActionBtn icon="thumbs-up-outline" label="Accept" color="#16A34A" loading={markMut.isPending} onPress={() => handleMark("accepted", "Accepted")} />
          ) : null}
          {status !== "2" ? (
            <ActionBtn icon="thumbs-down-outline" label="Decline" color="#DC2626" loading={markMut.isPending} onPress={() => handleMark("declined", "Declined", true)} />
          ) : null}
        </View>

        {/* Tabs */}
        <View className="mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8 }}>
            <TabPill active={tab === "content"} label="Content" onPress={() => setTab("content")} />
            {hasItems ? <TabPill active={tab === "items"} label="Line Items" onPress={() => setTab("items")} /> : null}
            <TabPill active={tab === "files"} label="Files" onPress={() => setTab("files")} />
          </ScrollView>

          <View className="border-t border-slate-100">
            {tab === "content" ? (
              <View className="px-4 py-4">
                {contentText ? (
                  <Text className="text-sm text-foreground leading-6" style={rtlTextStyle(contentText)} selectable>
                    {contentText}
                  </Text>
                ) : (
                  <Text className="text-sm text-muted text-center py-4">No content</Text>
                )}
              </View>
            ) : null}

            {tab === "items" ? (
              <View>
                <LineItemsTable items={items} currency={row.currency_name || row.symbol} variant="compact" />
                {Number(row.total || 0) > 0 ? (
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
                ) : null}
              </View>
            ) : null}

            {tab === "files" ? (
              <View style={{ height: 400 }}>
                <FilesTab relType="proposal" relId={id} color={ACCENT} />
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
      className="flex-1 flex-row items-center justify-center bg-white rounded-xl py-3 shadow-sm min-w-[80]"
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
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
