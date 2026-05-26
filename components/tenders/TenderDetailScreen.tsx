import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  useTenderDetail,
  useTenderBOQ,
  useTenderRequirements,
  useTenderRisks,
  useMarkTenderWon,
  useMarkTenderLost,
  useChangeTenderStatus,
  useDeleteTender,
} from "@/lib/queries/tenders";
import { FilesTab } from "@/components/crud/FilesTab";
import Toast from "react-native-toast-message";

const ACCENT = "#B45309";

type Tab = "overview" | "boq" | "requirements" | "risks" | "files";

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: "overview", label: "Overview", icon: "information-circle-outline" },
  { key: "boq", label: "BOQ", icon: "list-outline" },
  { key: "requirements", label: "Requirements", icon: "checkmark-circle-outline" },
  { key: "risks", label: "Risks", icon: "warning-outline" },
  { key: "files", label: "Files", icon: "attach-outline" },
];

function getStatusBadge(status: string): { label: string; color: string; bg: string } {
  const s = (status || "").toLowerCase();
  if (s === "won") return { label: "Won", color: "#16A34A", bg: "#D1FAE5" };
  if (s === "awarded") return { label: "Awarded", color: "#2563EB", bg: "#EFF6FF" };
  if (s === "submitted") return { label: "Submitted", color: "#0284C7", bg: "#E0F2FE" };
  if (s === "lost") return { label: "Lost", color: "#DC2626", bg: "#FEE2E2" };
  if (s === "cancelled") return { label: "Cancelled", color: "#64748B", bg: "#F1F5F9" };
  return { label: status || "Draft", color: "#B45309", bg: "#FEF3C7" };
}

function closingCountdown(closingDate: string | null): {
  text: string;
  color: string;
} | null {
  if (!closingDate) return null;
  const close = new Date(closingDate);
  if (isNaN(close.getTime())) return null;
  const days = Math.ceil((close.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "Closed", color: "#64748B" };
  if (days === 0) return { text: "Closes today!", color: "#DC2626" };
  if (days < 7) return { text: `${days} days left`, color: "#DC2626" };
  if (days < 14) return { text: `${days} days left`, color: "#D97706" };
  return { text: `${days} days left`, color: "#16A34A" };
}

export function TenderDetailScreen() {
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const q = useTenderDetail(id);
  const markWon = useMarkTenderWon();
  const markLost = useMarkTenderLost();
  const changeStatus = useChangeTenderStatus();
  const deleteTender = useDeleteTender();

  const tender = q.data as any;

  if (q.isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (q.isError || !tender) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text className="text-slate-900 font-semibold mt-3">Failed to load tender</Text>
        <TouchableOpacity
          onPress={() => q.refetch()}
          className="mt-4 px-5 py-2 rounded-lg"
          style={{ backgroundColor: ACCENT }}
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getStatusBadge(tender.tender_status);
  const countdown = closingCountdown(tender.closing_date);

  const handleMarkWon = () => {
    Alert.alert("Mark as Won?", "This will update the tender status to Won.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Won",
        onPress: () =>
          markWon.mutate(id, {
            onSuccess: () => Toast.show({ type: "success", text1: "Tender marked as Won" }),
            onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
          }),
      },
    ]);
  };

  const handleMarkLost = () => {
    Alert.alert("Mark as Lost?", "This will update the tender status to Lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Lost",
        style: "destructive",
        onPress: () =>
          markLost.mutate(id, {
            onSuccess: () => Toast.show({ type: "success", text1: "Tender marked as Lost" }),
            onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
          }),
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("Delete tender?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteTender.mutate(id, {
            onSuccess: () => {
              Toast.show({ type: "success", text1: "Tender deleted" });
              router.back();
            },
            onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
          }),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="bg-white px-4 pt-4 pb-4 border-b border-slate-100">
          <Text className="text-xl font-bold text-slate-900">
            {tender.tender_description || "Untitled Tender"}
          </Text>
          <View className="flex-row items-center mt-2 flex-wrap gap-2">
            {tender.tender_number ? (
              <View className="bg-slate-100 px-2 py-0.5 rounded">
                <Text className="text-xs font-medium text-slate-600">#{tender.tender_number}</Text>
              </View>
            ) : null}
            {tender.source ? (
              <View className="bg-slate-100 px-2 py-0.5 rounded flex-row items-center">
                <Ionicons name="globe-outline" size={10} color="#64748B" />
                <Text className="text-xs text-slate-600 ml-1">{tender.source}</Text>
              </View>
            ) : null}
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: status.bg }}>
              <Text className="text-[11px] font-bold" style={{ color: status.color }}>
                {status.label}
              </Text>
            </View>
          </View>

          {tender.closing_date ? (
            <View className="flex-row items-center mt-3">
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <Text className="text-sm text-slate-600 ml-1.5">
                Closing: {new Date(tender.closing_date).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })}
              </Text>
              {countdown ? (
                <View
                  className="ml-2 px-2 py-0.5 rounded"
                  style={{ backgroundColor: countdown.color + "18" }}
                >
                  <Text className="text-xs font-bold" style={{ color: countdown.color }}>
                    {countdown.text}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white border-b border-slate-100">
          <View className="flex-row px-2 py-2 gap-1">
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className="flex-row items-center px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: activeTab === tab.key ? ACCENT + "15" : "transparent",
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={activeTab === tab.key ? ACCENT : "#94A3B8"}
                />
                <Text
                  className="ml-1.5 text-xs font-medium"
                  style={{ color: activeTab === tab.key ? ACCENT : "#64748B" }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Tab content */}
        <View className="px-4 pt-4">
          {activeTab === "overview" && <OverviewTab tender={tender} />}
          {activeTab === "boq" && <BOQTab tenderId={id} />}
          {activeTab === "requirements" && <RequirementsTab tenderId={id} />}
          {activeTab === "risks" && <RisksTab tenderId={id} />}
          {activeTab === "files" && <FilesTab relType="tender" relId={id} color={ACCENT} />}
        </View>

        {/* Actions */}
        <View className="px-4 mt-6 gap-2">
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleMarkWon}
              className="flex-1 py-3 rounded-xl items-center bg-emerald-50 border border-emerald-200"
              disabled={markWon.isPending}
            >
              <Text className="text-sm font-semibold text-emerald-700">Mark Won</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleMarkLost}
              className="flex-1 py-3 rounded-xl items-center bg-red-50 border border-red-200"
              disabled={markLost.isPending}
            >
              <Text className="text-sm font-semibold text-red-700">Mark Lost</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handleDelete}
            className="py-3 rounded-xl items-center bg-slate-100"
          >
            <Text className="text-sm font-medium text-slate-600">Delete Tender</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────

function OverviewTab({ tender }: { tender: any }) {
  return (
    <View className="gap-4">
      {tender.description || tender.notes ? (
        <View className="bg-white rounded-xl p-4">
          <Text className="text-xs uppercase text-slate-400 tracking-wide mb-2">Description</Text>
          <Text className="text-sm text-slate-700 leading-5">
            {tender.description || tender.notes || "No description"}
          </Text>
        </View>
      ) : null}

      <View className="bg-white rounded-xl p-4">
        <Text className="text-xs uppercase text-slate-400 tracking-wide mb-3">Details</Text>
        <InfoRow label="Tender Number" value={tender.tender_number} />
        <InfoRow label="Source" value={tender.source} />
        <InfoRow label="Opening Date" value={tender.opening_date ? new Date(tender.opening_date).toLocaleDateString() : null} />
        <InfoRow label="Closing Date" value={tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : null} />
        <InfoRow label="Budget" value={tender.budget} />
        <InfoRow label="Location" value={tender.location} />
        <InfoRow label="Submission Method" value={tender.submission_method} />
        <InfoRow label="Contact Person" value={tender.contact_person} />
        <InfoRow label="Contact Email" value={tender.contact_email} />
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-slate-50">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="text-sm text-slate-800 font-medium">{value}</Text>
    </View>
  );
}

// ─── BOQ Tab ─────────────────────────────────────────────────────────────

function BOQTab({ tenderId }: { tenderId: string }) {
  const q = useTenderBOQ(tenderId);

  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  if (q.isError) return <Text className="text-rose-600 text-sm py-4">Failed to load BOQ</Text>;

  const items = q.data || [];
  if (items.length === 0) {
    return (
      <View className="bg-white rounded-xl p-6 items-center">
        <Ionicons name="list-outline" size={32} color="#94A3B8" />
        <Text className="text-sm text-slate-500 mt-2">No BOQ items</Text>
      </View>
    );
  }

  const total = items.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);

  return (
    <View className="bg-white rounded-xl overflow-hidden">
      {/* Table header */}
      <View className="flex-row px-3 py-2 bg-slate-50 border-b border-slate-100">
        <Text className="flex-1 text-[10px] font-bold text-slate-500 uppercase">Item</Text>
        <Text className="w-12 text-[10px] font-bold text-slate-500 uppercase text-right">Qty</Text>
        <Text className="w-12 text-[10px] font-bold text-slate-500 uppercase text-right">Unit</Text>
        <Text className="w-16 text-[10px] font-bold text-slate-500 uppercase text-right">Rate</Text>
        <Text className="w-20 text-[10px] font-bold text-slate-500 uppercase text-right">Amount</Text>
      </View>
      {items.map((item, idx) => (
        <View
          key={item.id}
          className={`flex-row px-3 py-2.5 ${idx < items.length - 1 ? "border-b border-slate-50" : ""}`}
        >
          <View className="flex-1 pr-1">
            {item.item_no ? (
              <Text className="text-[10px] text-slate-400">{item.item_no}</Text>
            ) : null}
            <Text className="text-xs text-slate-700" numberOfLines={2}>{item.description}</Text>
          </View>
          <Text className="w-12 text-xs text-slate-600 text-right">{item.quantity}</Text>
          <Text className="w-12 text-xs text-slate-500 text-right">{item.unit}</Text>
          <Text className="w-16 text-xs text-slate-600 text-right">{parseFloat(item.rate || "0").toLocaleString()}</Text>
          <Text className="w-20 text-xs text-slate-800 font-medium text-right">
            {parseFloat(item.amount || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
      ))}
      {/* Total */}
      <View className="flex-row px-3 py-3 bg-amber-50 border-t border-amber-100">
        <Text className="flex-1 text-sm font-bold text-amber-900">Total</Text>
        <Text className="text-sm font-bold text-amber-900">
          {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
      </View>
    </View>
  );
}

// ─── Requirements Tab ────────────────────────────────────────────────────

function RequirementsTab({ tenderId }: { tenderId: string }) {
  const q = useTenderRequirements(tenderId);

  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  if (q.isError) return <Text className="text-rose-600 text-sm py-4">Failed to load requirements</Text>;

  const items = q.data || [];
  if (items.length === 0) {
    return (
      <View className="bg-white rounded-xl p-6 items-center">
        <Ionicons name="checkmark-circle-outline" size={32} color="#94A3B8" />
        <Text className="text-sm text-slate-500 mt-2">No requirements recorded</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-xl overflow-hidden">
      {items.map((item, idx) => {
        const reqStatus = (item.status || "").toLowerCase();
        const statusColor =
          reqStatus === "met" ? "#16A34A" :
          reqStatus === "not met" ? "#DC2626" : "#B45309";
        const statusBg =
          reqStatus === "met" ? "#D1FAE5" :
          reqStatus === "not met" ? "#FEE2E2" : "#FEF3C7";

        return (
          <View
            key={item.id}
            className={`px-4 py-3 ${idx < items.length - 1 ? "border-b border-slate-100" : ""}`}
          >
            <View className="flex-row items-start">
              <View className="flex-1 mr-2">
                <Text className="text-sm text-slate-800">{item.requirement}</Text>
                {item.notes ? (
                  <Text className="text-xs text-slate-500 mt-1">{item.notes}</Text>
                ) : null}
              </View>
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: statusBg }}>
                <Text className="text-[10px] font-bold" style={{ color: statusColor }}>
                  {item.status || "Pending"}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Risks Tab ───────────────────────────────────────────────────────────

function RisksTab({ tenderId }: { tenderId: string }) {
  const q = useTenderRisks(tenderId);

  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  if (q.isError) return <Text className="text-rose-600 text-sm py-4">Failed to load risks</Text>;

  const items = q.data || [];
  if (items.length === 0) {
    return (
      <View className="bg-white rounded-xl p-6 items-center">
        <Ionicons name="warning-outline" size={32} color="#94A3B8" />
        <Text className="text-sm text-slate-500 mt-2">No risks identified</Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {items.map((item) => {
        const impact = (item.impact_level || "").toLowerCase();
        const impactColor =
          impact === "high" || impact === "critical" ? "#DC2626" :
          impact === "medium" ? "#D97706" : "#16A34A";

        return (
          <View key={item.id} className="bg-white rounded-xl p-4">
            <View className="flex-row items-start">
              <View
                className="w-2 h-2 rounded-full mt-1.5 mr-2"
                style={{ backgroundColor: impactColor }}
              />
              <View className="flex-1">
                <Text className="text-sm text-slate-800 font-medium">{item.risk_description}</Text>
                <View className="flex-row items-center mt-1 gap-x-2">
                  <Text className="text-xs font-semibold" style={{ color: impactColor }}>
                    {item.impact_level || "Unknown"} impact
                  </Text>
                  {item.status ? (
                    <Text className="text-xs text-slate-500">• {item.status}</Text>
                  ) : null}
                </View>
                {item.mitigation ? (
                  <Text className="text-xs text-slate-600 mt-1.5 italic">
                    Mitigation: {item.mitigation}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
