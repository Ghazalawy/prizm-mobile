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
  useOpportunityDetail,
  useOpportunityBOQ,
  useOpportunityNotes,
  useOpportunityStages,
  useAddOpportunityNote,
  useSubmitForApproval,
  useDeleteOpportunity,
  useConvertOpportunityToProject,
  usePinOpportunity,
  useArchiveOpportunity,
  type OpportunityNote,
} from "@/lib/queries/opportunities";
import {
  ApprovalTab,
  TeamTab,
  MilestonesTab,
  TasksTab,
  TimesheetsTab,
  RfqTab,
  TechnicalInquiriesTab,
  EstimationTab,
  SuppliersTab,
  DiscussionsTab,
  EmailsTab,
  TenderOpsTab,
  ThreadsTab,
} from "./OpportunityExtendedTabs";
import { FilesTab } from "@/components/crud/FilesTab";
import Toast from "react-native-toast-message";

const ACCENT = "#E65100";

type Tab =
  | "overview"
  | "approval"
  | "team"
  | "milestones"
  | "boq"
  | "notes"
  | "tasks"
  | "timesheets"
  | "rfq"
  | "ti"
  | "estimation"
  | "suppliers"
  | "discussions"
  | "tenderops"
  | "emails"
  | "threads"
  | "files";

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: "overview", label: "Overview", icon: "information-circle-outline" },
  { key: "approval", label: "Approval", icon: "shield-checkmark-outline" },
  { key: "team", label: "Team", icon: "people-outline" },
  { key: "milestones", label: "Milestones", icon: "flag-outline" },
  { key: "boq", label: "BOQ", icon: "list-outline" },
  { key: "notes", label: "Notes", icon: "chatbubble-outline" },
  { key: "tasks", label: "Tasks", icon: "checkbox-outline" },
  { key: "timesheets", label: "Timesheets", icon: "time-outline" },
  { key: "rfq", label: "RFQ", icon: "document-text-outline" },
  { key: "ti", label: "TI", icon: "help-circle-outline" },
  { key: "estimation", label: "Estimation", icon: "calculator-outline" },
  { key: "suppliers", label: "Suppliers", icon: "storefront-outline" },
  { key: "discussions", label: "Discussions", icon: "chatbubbles-outline" },
  { key: "tenderops", label: "TenderOps", icon: "layers-outline" },
  { key: "emails", label: "Emails", icon: "mail-outline" },
  { key: "threads", label: "Threads", icon: "logo-microsoft" },
  { key: "files", label: "Files", icon: "attach-outline" },
];

function fmtCurrency(val: string | null): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getOppStatusBadge(status: string): { label: string; color: string; bg: string } {
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "submitted") return { label: status, color: "#0284C7", bg: "#E0F2FE" };
  if (s === "won") return { label: "Won", color: "#16A34A", bg: "#D1FAE5" };
  if (s === "lost") return { label: "Lost", color: "#DC2626", bg: "#FEE2E2" };
  if (s === "draft") return { label: "Draft", color: "#B45309", bg: "#FEF3C7" };
  return { label: status || "—", color: "#64748B", bg: "#F1F5F9" };
}

export function OpportunityDetailScreen() {
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const q = useOpportunityDetail(id);
  const stagesQ = useOpportunityStages();
  const submitApproval = useSubmitForApproval();
  const deleteOpp = useDeleteOpportunity();
  const convert = useConvertOpportunityToProject();
  const pin = usePinOpportunity();
  const archive = useArchiveOpportunity();

  const opp = q.data as any;

  if (q.isLoading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (q.isError || !opp) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text className="text-slate-900 font-semibold mt-3">Failed to load opportunity</Text>
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

  const status = getOppStatusBadge(opp.status);
  const value = opp.estimated_price || opp.client_price;
  const stage = (stagesQ.data || []).find((s: any) => s.id === Number(opp.stage));

  const handleSubmitApproval = () => {
    Alert.alert("Submit for Approval?", "This will initialize stages and submit the opportunity.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Submit",
        onPress: () =>
          submitApproval.mutate(
            { id: Number(id) },
            {
              onSuccess: () => Toast.show({ type: "success", text1: "Submitted for approval" }),
              onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
            }
          ),
      },
    ]);
  };

  const handleConvert = () => {
    Alert.alert("Convert to project?", "Creates a project from this opportunity.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Convert",
        onPress: () =>
          convert.mutate(Number(id), {
            onSuccess: () => Toast.show({ type: "success", text1: "Converted to project" }),
            onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
          }),
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("Delete opportunity?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteOpp.mutate(id, {
            onSuccess: () => {
              Toast.show({ type: "success", text1: "Opportunity deleted" });
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
          <Text className="text-[9px] font-bold uppercase tracking-[1.2px] text-blue-600 mb-0.5">Sales · Opportunity</Text>
          <Text className="text-xl font-bold text-slate-900">
            {opp.opportunity_name || "Untitled"}
          </Text>
          <View className="flex-row items-center mt-2 flex-wrap gap-2">
            {opp.opportunity_code ? (
              <View className="bg-slate-100 px-2 py-0.5 rounded">
                <Text className="text-xs font-medium text-slate-600">{opp.opportunity_code}</Text>
              </View>
            ) : null}
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: status.bg }}>
              <Text className="text-[11px] font-bold" style={{ color: status.color }}>
                {status.label}
              </Text>
            </View>
            {stage ? (
              <View className="bg-blue-50 px-2 py-0.5 rounded">
                <Text className="text-xs font-medium text-blue-700">{stage.stage_name}</Text>
              </View>
            ) : null}
          </View>

          {opp.company ? (
            <View className="flex-row items-center mt-2">
              <Ionicons name="business-outline" size={14} color="#64748B" />
              <Text className="text-sm text-slate-600 ml-1.5">{opp.company}</Text>
            </View>
          ) : null}

          {value ? (
            <Text className="text-2xl font-bold mt-3" style={{ color: ACCENT }}>
              AED {fmtCurrency(value)}
            </Text>
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
          {activeTab === "overview" && <OverviewTab opp={opp} />}
          {activeTab === "approval" && <ApprovalTab oppId={id} oppStatus={opp.status} />}
          {activeTab === "team" && <TeamTab oppId={id} />}
          {activeTab === "milestones" && <MilestonesTab oppId={id} />}
          {activeTab === "boq" && <BOQTab oppId={id} />}
          {activeTab === "notes" && <NotesTab oppId={id} />}
          {activeTab === "tasks" && <TasksTab oppId={id} />}
          {activeTab === "timesheets" && <TimesheetsTab oppId={id} />}
          {activeTab === "rfq" && <RfqTab oppId={id} />}
          {activeTab === "ti" && <TechnicalInquiriesTab oppId={id} />}
          {activeTab === "estimation" && <EstimationTab oppId={id} />}
          {activeTab === "suppliers" && <SuppliersTab oppId={id} />}
          {activeTab === "discussions" && <DiscussionsTab oppId={id} />}
          {activeTab === "tenderops" && <TenderOpsTab oppId={id} />}
          {activeTab === "emails" && <EmailsTab oppId={id} />}
          {activeTab === "threads" && <ThreadsTab teamsChannel={opp.teams_channel} />}
          {activeTab === "files" && <FilesTab relType="opportunity" relId={id} color={ACCENT} />}
        </View>

        {/* Actions */}
        <View className="px-4 mt-6 gap-2">
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/opportunities/${id}/edit` as any)}
            className="py-3 rounded-xl items-center bg-white border border-slate-200"
          >
            <Text className="text-sm font-medium text-slate-700">Edit Opportunity</Text>
          </TouchableOpacity>
          {opp.status === "Draft" ? (
            <TouchableOpacity
              onPress={handleSubmitApproval}
              className="py-3.5 rounded-xl items-center"
              style={{ backgroundColor: ACCENT }}
              disabled={submitApproval.isPending}
            >
              <Text className="text-base font-semibold text-white">
                {submitApproval.isPending ? "Submitting…" : "Submit for Approval"}
              </Text>
            </TouchableOpacity>
          ) : null}
          {!opp.project_id && !opp.Is_converted_to_project ? (
            <TouchableOpacity onPress={handleConvert} className="py-3 rounded-xl items-center bg-slate-100">
              <Text className="text-sm font-medium text-slate-700">Convert to Project</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() =>
              pin.mutate(Number(id), {
                onSuccess: () => Toast.show({ type: "success", text1: "Pinned" }),
                onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
              })
            }
            className="py-3 rounded-xl items-center bg-slate-100"
          >
            <Text className="text-sm font-medium text-slate-700">Pin Opportunity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              archive.mutate(Number(id), {
                onSuccess: () => {
                  Toast.show({ type: "success", text1: "Archived" });
                  router.back();
                },
                onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
              })
            }
            className="py-3 rounded-xl items-center bg-slate-100"
          >
            <Text className="text-sm font-medium text-slate-700">Archive</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="py-3 rounded-xl items-center bg-slate-100"
          >
            <Text className="text-sm font-medium text-slate-600">Delete Opportunity</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────

function OverviewTab({ opp }: { opp: any }) {
  return (
    <View className="gap-4">
      {opp.summary ? (
        <View className="bg-white rounded-xl p-4">
          <Text className="text-xs uppercase text-slate-400 tracking-wide mb-2">Description</Text>
          <Text className="text-sm text-slate-700 leading-5">{opp.summary}</Text>
        </View>
      ) : null}

      <View className="bg-white rounded-xl p-4">
        <Text className="text-xs uppercase text-slate-400 tracking-wide mb-3">Details</Text>
        <InfoRow label="Code" value={opp.opportunity_code} />
        <InfoRow label="Customer" value={opp.company} />
        <InfoRow label="Responsible" value={opp.resonsible_staff_name} />
        <InfoRow label="Assigned" value={opp.staff_name} />
        <InfoRow label="Start Date" value={opp.start_date} />
        <InfoRow label="End Date" value={opp.end_date} />
        <InfoRow label="Expiry Date" value={opp.expiry_date} />
        <InfoRow label="Priority" value={opp.priority} />
        <InfoRow label="Job Type" value={opp.opportunity_job_type} />
        <InfoRow label="Field" value={opp.opportunity_field} />
        <InfoRow label="Sector" value={opp.business_sector} />
        <InfoRow label="Entity" value={opp.entity} />
        <InfoRow label="Country" value={opp.country} />
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-slate-50">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="text-sm text-slate-800 font-medium" numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── BOQ Tab ─────────────────────────────────────────────────────────────

function BOQTab({ oppId }: { oppId: string }) {
  const q = useOpportunityBOQ(oppId);

  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  if (q.isError) return <Text className="text-rose-600 text-sm py-4">Failed to load BOQ</Text>;

  const items = q.data?.items || [];
  if (items.length === 0) {
    return (
      <View className="bg-white rounded-xl p-6 items-center">
        <Ionicons name="list-outline" size={32} color="#94A3B8" />
        <Text className="text-sm text-slate-500 mt-2">No BOQ items</Text>
      </View>
    );
  }

  const total = items.reduce((sum, i) => sum + parseFloat(i.total_amount || "0"), 0);

  return (
    <View className="bg-white rounded-xl overflow-hidden">
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
            {item.item_code ? (
              <Text className="text-[10px] text-slate-400">{item.item_code}</Text>
            ) : null}
            <Text className="text-xs font-medium text-slate-700" numberOfLines={1}>{item.item_name}</Text>
            {item.description ? (
              <Text className="text-[11px] text-slate-500" numberOfLines={2}>{item.description}</Text>
            ) : null}
          </View>
          <Text className="w-12 text-xs text-slate-600 text-right">{item.quantity}</Text>
          <Text className="w-12 text-xs text-slate-500 text-right">{item.unit_id ?? "—"}</Text>
          <Text className="w-16 text-xs text-slate-600 text-right">{parseFloat(item.unit_rate || "0").toLocaleString()}</Text>
          <Text className="w-20 text-xs text-slate-800 font-medium text-right">
            {parseFloat(item.total_amount || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
      ))}
      <View className="flex-row px-3 py-3 bg-orange-50 border-t border-orange-100">
        <Text className="flex-1 text-sm font-bold text-orange-900">Total</Text>
        <Text className="text-sm font-bold text-orange-900">
          {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
      </View>
    </View>
  );
}

// ─── Notes Tab ───────────────────────────────────────────────────────────

function NotesTab({ oppId }: { oppId: string }) {
  const q = useOpportunityNotes(oppId);
  const addNote = useAddOpportunityNote();
  const [newNote, setNewNote] = useState("");

  const handleAdd = () => {
    if (!newNote.trim()) return;
    addNote.mutate(
      { opportunity_id: Number(oppId), content: newNote.trim() },
      {
        onSuccess: () => {
          setNewNote("");
          Toast.show({ type: "success", text1: "Note added" });
        },
        onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed to add note" }),
      }
    );
  };

  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;

  const notes = (q.data || []) as OpportunityNote[];

  return (
    <View className="gap-3">
      {/* Composer */}
      <View className="bg-white rounded-xl p-3">
        <TextInput
          value={newNote}
          onChangeText={setNewNote}
          placeholder="Add a note…"
          placeholderTextColor="#94A3B8"
          multiline
          className="text-sm text-slate-800 min-h-[60px]"
          style={{ textAlignVertical: "top" }}
        />
        <TouchableOpacity
          onPress={handleAdd}
          disabled={!newNote.trim() || addNote.isPending}
          className="self-end mt-2 px-4 py-2 rounded-lg"
          style={{ backgroundColor: newNote.trim() ? ACCENT : "#E2E8F0" }}
        >
          <Text className="text-xs font-semibold" style={{ color: newNote.trim() ? "#FFF" : "#94A3B8" }}>
            {addNote.isPending ? "Adding…" : "Add Note"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Note list */}
      {notes.length === 0 ? (
        <View className="bg-white rounded-xl p-6 items-center">
          <Ionicons name="chatbubble-outline" size={32} color="#94A3B8" />
          <Text className="text-sm text-slate-500 mt-2">No notes yet</Text>
        </View>
      ) : (
        notes.map((note) => (
          <View key={note.id} className="bg-white rounded-xl p-4">
            <Text className="text-sm text-slate-800">{note.content}</Text>
            <Text className="text-[10px] text-slate-400 mt-2">
              {note.staff_name || `Staff #${note.staff_id}`}
              {note.created_at ? ` • ${new Date(note.created_at).toLocaleDateString()}` : ""}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
