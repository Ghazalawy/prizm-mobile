import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  useContractDetail,
  useSignContract,
  useSendContract,
  useRenewContract,
  useUnsignContract,
} from "@/lib/queries/contracts";
import { FilesTab } from "@/components/crud/FilesTab";
import { NotesPanel } from "@/components/crud/NotesPanel";
import { colors } from "@/lib/theme";

const ACCENT = "#475569";

function getContractStatusInfo(item: any): {
  label: string;
  color: string;
  bg: string;
} {
  const now = new Date();
  const start = item.datestart ? new Date(item.datestart) : null;
  const end = item.dateend ? new Date(item.dateend) : null;
  const signed = Number(item.signed) === 1;

  if (signed) return { label: "Signed", color: "#2563EB", bg: "#EFF6FF" };
  if (end && end < now) return { label: "Expired", color: "#DC2626", bg: "#FEF2F2" };
  if (start && start > now) return { label: "Draft", color: "#64748B", bg: "#F1F5F9" };

  if (end) {
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 30) return { label: `Expiring (${daysRemaining}d)`, color: "#D97706", bg: "#FFFBEB" };
  }

  return { label: "Active", color: "#16A34A", bg: "#F0FDF4" };
}

function computeDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const s = new Date(start);
  const e = new Date(end);
  const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 31) return `${diffDays} days`;
  const months = Math.round(diffDays / 30.44);
  return months === 1 ? "1 month" : `${months} months`;
}

function daysRemaining(end: string | null): number | null {
  if (!end) return null;
  const diff = Math.ceil((new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<\/(p|div|li|br|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "notes" | "files">("details");
  const [showRenew, setShowRenew] = useState(false);
  const [renewStart, setRenewStart] = useState("");
  const [renewEnd, setRenewEnd] = useState("");
  const [renewValue, setRenewValue] = useState("");

  const detail = useContractDetail(id!);
  const signMutation = useSignContract();
  const sendMutation = useSendContract();
  const renewMutation = useRenewContract();
  const unsignMutation = useUnsignContract();

  if (detail.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-slate-50">
        <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
        <Text className="text-slate-900 font-semibold mt-3">Couldn&apos;t load contract</Text>
        <TouchableOpacity
          onPress={() => detail.refetch()}
          className="mt-4 px-5 py-2 rounded-lg"
          style={{ backgroundColor: ACCENT }}
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const c = detail.data;
  const status = getContractStatusInfo(c);
  const duration = computeDuration(c.datestart, c.dateend);
  const remaining = daysRemaining(c.dateend);
  const isSigned = Number(c.signed) === 1;
  const contentText = stripHtml(c.content || c.description);

  const handleSign = () => {
    Alert.alert("Mark as Signed", "Are you sure you want to mark this contract as signed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign",
        onPress: () => signMutation.mutate(id!),
      },
    ]);
  };

  const handleSend = () => {
    Alert.alert("Send to Client", "Email this contract to the client?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: () => sendMutation.mutate(id!),
      },
    ]);
  };

  const handleUnsign = () => {
    Alert.alert("Clear Signature", "Remove the signed status from this contract?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unsign",
        style: "destructive",
        onPress: () => unsignMutation.mutate(id!),
      },
    ]);
  };

  const handleRenew = () => {
    if (!renewStart || !renewEnd) {
      Alert.alert("Missing Dates", "Please provide both start and end dates (YYYY-MM-DD).");
      return;
    }
    renewMutation.mutate(
      {
        id: id!,
        payload: {
          date_start: renewStart,
          date_end: renewEnd,
          ...(renewValue ? { value: Number(renewValue) } : {}),
        },
      },
      {
        onSuccess: () => {
          setShowRenew(false);
          setRenewStart("");
          setRenewEnd("");
          setRenewValue("");
        },
      }
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center mb-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[9px] font-bold uppercase tracking-[1.2px] text-slate-500 mb-0.5">CRM · Contract</Text>
            <Text className="text-lg font-bold text-slate-900" numberOfLines={2}>
              {c.subject || "Untitled Contract"}
            </Text>
            {(c.company || c.client_name) && (
              <Text className="text-sm text-slate-600 mt-0.5">
                {c.company || c.client_name}
              </Text>
            )}
          </View>
          <View
            className="px-2.5 py-1 rounded-full"
            style={{ backgroundColor: status.bg }}
          >
            <Text className="text-xs font-bold" style={{ color: status.color }}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Value + dates */}
        <View className="flex-row items-center gap-x-4 mb-2">
          {Number(c.contract_value || 0) > 0 && (
            <View className="flex-row items-center">
              <Ionicons name="cash-outline" size={14} color="#475569" />
              <Text className="text-sm font-bold text-slate-800 ml-1">
                {Number(c.contract_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
          )}
          {isSigned && (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-done-circle" size={14} color="#2563EB" />
              <Text className="text-xs font-semibold text-blue-700 ml-1">Signed</Text>
            </View>
          )}
        </View>

        {/* Timeline */}
        <View className="bg-slate-50 rounded-xl p-3">
          <View className="flex-row items-center justify-between">
            <View className="items-center">
              <Text className="text-[10px] text-slate-500">Start</Text>
              <Text className="text-sm font-semibold text-slate-900">{c.datestart || "–"}</Text>
            </View>
            <View className="flex-1 mx-3 items-center">
              <View className="h-px w-full bg-slate-300" />
              {duration ? (
                <Text className="text-[10px] text-slate-500 mt-1">{duration}</Text>
              ) : null}
            </View>
            <View className="items-center">
              <Text className="text-[10px] text-slate-500">End</Text>
              <Text className="text-sm font-semibold text-slate-900">{c.dateend || "Ongoing"}</Text>
            </View>
          </View>
          {remaining !== null && remaining > 0 && (
            <View className="flex-row items-center justify-center mt-2">
              <Ionicons
                name="time-outline"
                size={12}
                color={remaining <= 30 ? "#D97706" : "#64748B"}
              />
              <Text
                className="text-xs font-medium ml-1"
                style={{ color: remaining <= 30 ? "#D97706" : "#64748B" }}
              >
                {remaining} days remaining
              </Text>
            </View>
          )}
          {remaining !== null && remaining <= 0 && (
            <View className="flex-row items-center justify-center mt-2">
              <Ionicons name="alert-circle-outline" size={12} color="#DC2626" />
              <Text className="text-xs font-medium text-red-600 ml-1">
                Expired {Math.abs(remaining)} days ago
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab switch */}
      <View className="flex-row px-4 pt-3 gap-2 flex-wrap">
        {(["details", "comments", "notes", "files"] as const).map((tabKey) => (
          <TouchableOpacity
            key={tabKey}
            onPress={() => setActiveTab(tabKey)}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: activeTab === tabKey ? ACCENT : "#F1F5F9" }}
          >
            <Text
              className="text-xs font-semibold capitalize"
              style={{ color: activeTab === tabKey ? "#FFF" : "#475569" }}
            >
              {tabKey}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === "comments" ? (
        <NotesPanel
          queryKey={["contract", id!, "comments"]}
          fetchEndpoint={`contracts/comments?contract_id=${id}`}
          postEndpoint="contracts/comments"
          parentIdKey="contract_id"
          parentId={id!}
          accent={ACCENT}
          placeholder="Add a comment…"
        />
      ) : activeTab === "notes" ? (
        <NotesPanel
          queryKey={["contract", id!, "notes"]}
          fetchEndpoint={`contracts/notes?contract_id=${id}`}
          postEndpoint="contracts/notes"
          parentIdKey="contract_id"
          parentId={id!}
          accent={ACCENT}
        />
      ) : activeTab === "files" ? (
        <FilesTab relType="contract" relId={id!} color={ACCENT} />
      ) : (
        <ScrollView className="flex-1 px-4 pt-3" contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Content/Description */}
          {contentText ? (
            <View className="bg-white rounded-xl p-4 shadow-sm mb-3">
              <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Contract Content
              </Text>
              <Text className="text-sm text-slate-800 leading-5">{contentText}</Text>
            </View>
          ) : null}

          {/* Renew form */}
          {showRenew && (
            <View className="bg-white rounded-xl p-4 shadow-sm mb-3 border border-amber-200">
              <Text className="text-xs font-semibold text-slate-500 uppercase mb-3">
                Renew Contract
              </Text>
              <View className="gap-3">
                <View>
                  <Text className="text-xs text-slate-600 mb-1">New Start Date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={renewStart}
                    onChangeText={setRenewStart}
                    placeholder="2025-01-01"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </View>
                <View>
                  <Text className="text-xs text-slate-600 mb-1">New End Date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={renewEnd}
                    onChangeText={setRenewEnd}
                    placeholder="2025-12-31"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </View>
                <View>
                  <Text className="text-xs text-slate-600 mb-1">Value (optional)</Text>
                  <TextInput
                    value={renewValue}
                    onChangeText={setRenewValue}
                    placeholder="50000"
                    keyboardType="numeric"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </View>
                <View className="flex-row gap-2 mt-1">
                  <TouchableOpacity
                    onPress={handleRenew}
                    className="flex-1 py-2.5 rounded-lg items-center"
                    style={{ backgroundColor: "#16A34A" }}
                    disabled={renewMutation.isPending}
                  >
                    <Text className="text-white font-semibold text-sm">
                      {renewMutation.isPending ? "Renewing…" : "Confirm Renew"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowRenew(false)}
                    className="flex-1 py-2.5 rounded-lg items-center bg-slate-100"
                  >
                    <Text className="text-slate-700 font-semibold text-sm">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Bottom Actions */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 flex-row gap-2">
        {!isSigned && (
          <TouchableOpacity
            onPress={handleSign}
            className="flex-1 py-3 rounded-xl items-center"
            style={{ backgroundColor: "#2563EB" }}
            disabled={signMutation.isPending}
          >
            <View className="flex-row items-center">
              <Ionicons name="checkmark-done-circle-outline" size={18} color="#FFF" />
              <Text className="text-white font-semibold ml-1.5">
                {signMutation.isPending ? "Signing…" : "Sign"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {isSigned && (
          <TouchableOpacity
            onPress={handleUnsign}
            className="flex-1 py-3 rounded-xl items-center bg-red-50"
            disabled={unsignMutation.isPending}
          >
            <View className="flex-row items-center">
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text className="text-red-700 font-semibold ml-1.5">Unsign</Text>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSend}
          className="flex-1 py-3 rounded-xl items-center bg-slate-100"
          disabled={sendMutation.isPending}
        >
          <View className="flex-row items-center">
            <Ionicons name="paper-plane-outline" size={16} color="#475569" />
            <Text className="text-slate-700 font-semibold ml-1.5">
              {sendMutation.isPending ? "Sending…" : "Send"}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowRenew(!showRenew)}
          className="flex-1 py-3 rounded-xl items-center bg-slate-100"
        >
          <View className="flex-row items-center">
            <Ionicons name="refresh-outline" size={16} color="#475569" />
            <Text className="text-slate-700 font-semibold ml-1.5">Renew</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
