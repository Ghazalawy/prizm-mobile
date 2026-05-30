import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useLeadDetail,
  useLeadSources,
  useLeadStatuses,
  useChangeLeadStatus,
  useConvertToCustomer,
  useDeleteLead,
  useMarkLeadLost,
  useMarkLeadJunk,
} from "@/lib/queries/leads";
import type { LeadStatus } from "@/lib/queries/leads";
import { rtlTextStyle } from "@/lib/rtl";
import { colors } from "@/lib/theme";
import { FilesTab } from "@/components/crud/FilesTab";
import { NotesPanel } from "@/components/crud/NotesPanel";
import { navigateInAppOrExternalLink } from "@/lib/native-routing";
import Toast from "react-native-toast-message";

type Props = { id: string };

const DEFAULT_STATUS_COLORS: Record<string, string> = {
  "1": "#3B82F6", "2": "#F59E0B", "3": "#8B5CF6", "4": "#16A34A",
  "5": "#DC2626", "6": "#64748B", "7": "#0891B2", "8": "#EA580C",
};

type TabKey = "tasks" | "files" | "notes";

export function LeadDetailScreen({ id }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("tasks");
  const qc = useQueryClient();

  const leadQuery = useLeadDetail(id);
  const sourcesQuery = useLeadSources();
  const statusesQuery = useLeadStatuses();
  const changeStatus = useChangeLeadStatus();
  const convert = useConvertToCustomer();
  const deleteLead = useDeleteLead();
  const markLost = useMarkLeadLost();
  const markJunk = useMarkLeadJunk();

  const lead = leadQuery.data;
  const statuses = statusesQuery.data ?? [];
  const sources = sourcesQuery.data ?? [];

  const statusMap = useMemo(() => {
    const m = new Map<string, LeadStatus>();
    for (const s of statuses) m.set(String(s.id), s);
    return m;
  }, [statuses]);

  const status = statusMap.get(String(lead?.status));
  const statusColor = status?.color || DEFAULT_STATUS_COLORS[String(lead?.status)] || "#64748B";
  const sourceName = sources.find((s) => String(s.id) === String(lead?.source))?.name;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await leadQuery.refetch();
    setRefreshing(false);
  }, [leadQuery]);

  const handleChangeStatus = useCallback(() => {
    if (statuses.length === 0) {
      Alert.alert("No statuses loaded", "Please try again.");
      return;
    }
    const buttons = statuses.map((s) => ({
      text: s.name,
      onPress: () => {
        changeStatus.mutate(
          { leadId: id, status: s.id },
          {
            onSuccess: () => {
              Toast.show({ type: "success", text1: "Status updated" });
              leadQuery.refetch();
            },
            onError: (e: any) => Toast.show({ type: "error", text1: "Failed", text2: e?.message }),
          }
        );
      },
    }));
    buttons.push({ text: "Cancel", onPress: () => {} });
    Alert.alert("Change Status", "Select new status:", buttons);
  }, [statuses, id, changeStatus, leadQuery]);

  const handleConvert = useCallback(() => {
    Alert.alert(
      "Convert to Customer",
      "This lead will be converted to a customer.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Convert",
          onPress: () => {
            convert.mutate(id, {
              onSuccess: () => {
                Toast.show({ type: "success", text1: "Lead converted to customer" });
                router.back();
              },
              onError: (e: any) => Toast.show({ type: "error", text1: "Failed", text2: e?.message }),
            });
          },
        },
      ]
    );
  }, [id, convert]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Lead",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteLead.mutate(id, {
              onSuccess: () => router.back(),
              onError: (e: any) => Toast.show({ type: "error", text1: "Failed", text2: e?.message }),
            });
          },
        },
      ]
    );
  }, [id, deleteLead]);

  if (leadQuery.isLoading && !lead) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (leadQuery.isError || !lead) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <Ionicons name="cloud-offline-outline" size={42} color="#EF4444" />
        <Text className="text-foreground font-semibold mt-3">Couldn't load lead</Text>
        <TouchableOpacity onPress={() => leadQuery.refetch()} className="mt-4 bg-primary px-5 py-2 rounded-lg">
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const description = cleanHtml(lead.description || "");

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 flex-row items-center px-3" style={{ minHeight: 48 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-2 text-base font-semibold text-foreground flex-1" numberOfLines={1}>
          {lead.name}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/leads/${encodeURIComponent(id)}/edit` as any)}
          className="w-8 h-8 items-center justify-center"
          hitSlop={6}
        >
          <Ionicons name="create-outline" size={20} color="#0F172A" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} className="w-8 h-8 items-center justify-center" hitSlop={6}>
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Hero card */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-start">
            <View
              className="w-11 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: statusColor + "1A" }}
            >
              <Ionicons name="people-outline" size={22} color={statusColor} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-lg font-bold text-foreground" selectable style={rtlTextStyle(lead.name)}>
                {lead.name}
              </Text>
              {lead.company ? (
                <Text className="text-sm text-slate-600 mt-0.5">{lead.company}</Text>
              ) : null}
              <View className="flex-row items-center mt-1.5 flex-wrap">
                <StatusPill color={statusColor} label={status?.name || `Status ${lead.status}`} />
                {sourceName ? (
                  <View className="ml-1.5 flex-row items-center bg-slate-100 rounded-full px-2 py-0.5">
                    <Ionicons name="git-branch-outline" size={10} color="#64748B" />
                    <Text className="text-[10px] text-slate-500 ml-1">{sourceName}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Contact section */}
        <Section title="Contact" icon="person-outline">
          {lead.email ? (
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={lead.email}
              onPress={() => Linking.openURL(`mailto:${lead.email}`)}
              actionColor="#2563EB"
            />
          ) : null}
          {lead.phonenumber ? (
            <InfoRow
              icon="call-outline"
              label="Phone"
              value={lead.phonenumber}
              onPress={() => Linking.openURL(`tel:${lead.phonenumber}`)}
              actionColor="#16A34A"
            />
          ) : null}
          {lead.website ? (
            <InfoRow
              icon="globe-outline"
              label="Website"
              value={lead.website}
              onPress={() => {
                const url = lead.website!.startsWith("http") ? lead.website! : `https://${lead.website}`;
                void navigateInAppOrExternalLink(url);
              }}
              actionColor="#0891B2"
            />
          ) : null}
          {lead.contact ? <InfoRow icon="person-outline" label="Contact Person" value={lead.contact} /> : null}
          {lead.title ? <InfoRow icon="briefcase-outline" label="Title" value={lead.title} /> : null}
        </Section>

        {/* Address section */}
        {(lead.address || lead.city || lead.state || lead.country) ? (
          <Section title="Address" icon="location-outline">
            <Text className="text-sm text-foreground" selectable>
              {[lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(", ")}
            </Text>
            {lead.address ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent([lead.address, lead.city, lead.state].filter(Boolean).join(", "))}`)}
                className="mt-2 flex-row items-center"
              >
                <Ionicons name="map-outline" size={14} color="#2563EB" />
                <Text className="text-xs text-blue-600 ml-1 font-medium">Open in Maps</Text>
              </TouchableOpacity>
            ) : null}
          </Section>
        ) : null}

        {/* Description */}
        {description ? (
          <Section title="Description" icon="document-text-outline">
            <Text className="text-sm text-foreground leading-5" selectable style={rtlTextStyle(description)}>
              {description}
            </Text>
          </Section>
        ) : null}

        {/* Tabs: Tasks & Files */}
        <View className="mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8 }}>
            {(["tasks", "notes", "files"] as TabKey[]).map((k) => (
              <TouchableOpacity
                key={k}
                onPress={() => setTab(k)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: tab === k ? colors.primary : "#F1F5F9",
                  marginRight: 6,
                }}
              >
                <Text style={{ color: tab === k ? "#FFF" : "#475569", fontWeight: "600", fontSize: 12 }}>
                  {k === "tasks" ? "Tasks" : k === "notes" ? "Notes" : "Files"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View className="border-t border-slate-100" style={{ minHeight: 200 }}>
            {tab === "files" ? (
              <FilesTab relType="lead" relId={id} color={colors.primary} />
            ) : tab === "notes" ? (
              <NotesPanel
                queryKey={["leads", id, "notes"]}
                fetchEndpoint={`leads/notes?lead_id=${id}`}
                postEndpoint="leads/notes"
                parentIdKey="lead_id"
                parentId={id}
                accent={colors.primary}
              />
            ) : (
              <View className="px-4 py-6 items-center">
                <Text className="text-xs text-slate-400">Related tasks shown in ERP module view</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View className="mt-3">
          <Text className="text-xs uppercase text-slate-400 font-semibold mb-2 px-1">Actions</Text>
          <View className="flex-row flex-wrap">
            <ActionButton
              icon="swap-vertical-outline"
              label="Change Status"
              color="#2563EB"
              bg="#EFF6FF"
              onPress={handleChangeStatus}
            />
            <ActionButton
              icon="person-add-outline"
              label="Convert to Customer"
              color="#16A34A"
              bg="#F0FDF4"
              onPress={handleConvert}
              marginLeft={8}
            />
            <ActionButton
              icon="close-circle-outline"
              label="Mark Lost"
              color="#DC2626"
              bg="#FEF2F2"
              onPress={() =>
                markLost.mutate(id, {
                  onSuccess: () => {
                    Toast.show({ type: "success", text1: "Marked as lost" });
                    leadQuery.refetch();
                  },
                })
              }
              marginLeft={8}
            />
            <ActionButton
              icon="trash-bin-outline"
              label="Mark Junk"
              color="#64748B"
              bg="#F1F5F9"
              onPress={() =>
                markJunk.mutate(id, {
                  onSuccess: () => {
                    Toast.show({ type: "success", text1: "Marked as junk" });
                    leadQuery.refetch();
                  },
                })
              }
              marginLeft={8}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Reusable Components ─────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl p-4 mt-3 shadow-sm">
      <View className="flex-row items-center mb-2">
        <Ionicons name={icon} size={14} color="#64748B" />
        <Text className="text-xs uppercase tracking-wide text-slate-400 ml-1.5 font-semibold">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
  actionColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  actionColor?: string;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} className="flex-row items-center py-1.5" activeOpacity={0.7}>
      <Ionicons name={icon} size={14} color="#94A3B8" />
      <Text className="text-xs text-slate-400 ml-2 w-16">{label}</Text>
      <Text
        className="flex-1 text-sm font-medium"
        style={{ color: onPress ? (actionColor || "#2563EB") : "#0F172A" }}
        numberOfLines={1}
      >
        {value}
      </Text>
      {onPress ? <Ionicons name="open-outline" size={12} color={actionColor || "#2563EB"} /> : null}
    </Wrapper>
  );
}

function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ backgroundColor: color + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color, fontSize: 10, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  bg,
  onPress,
  marginLeft = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
  marginLeft?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        paddingVertical: 11,
        borderRadius: 12,
        marginLeft,
      }}
    >
      <Ionicons name={icon} size={16} color={color} style={{ marginRight: 6 }} />
      <Text style={{ color, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

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
