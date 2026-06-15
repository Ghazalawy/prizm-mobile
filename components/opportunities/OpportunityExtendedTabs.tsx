import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import Toast from "react-native-toast-message";
import {
  useOpportunityApprovalInfo,
  useOpportunityMembers,
  useAddOpportunityMember,
  useRemoveOpportunityMember,
  useApproveOpportunity,
  useRejectOpportunity,
  useResubmitOpportunity,
  useOpportunityMilestones,
  useCreateOpportunityMilestone,
  useDeleteOpportunityMilestone,
  useOpportunityTasks,
  useOpportunityTimesheets,
  useOpportunityRFQ,
  useOpportunityTechnicalInquiries,
  useOpportunityEstimation,
  useOpportunitySuppliers,
  useOpportunityDiscussions,
  useCreateOpportunityDiscussion,
  useOpportunityEmails,
  useOpportunityTenderOpsStages,
} from "@/lib/queries/opportunities";

const ACCENT = "#E65100";

function EmptyState({ icon, label }: { icon: string; label: string }) {
  return (
    <View className="bg-white rounded-xl p-6 items-center">
      <Ionicons name={icon as any} size={32} color="#94A3B8" />
      <Text className="text-sm text-slate-500 mt-2">{label}</Text>
    </View>
  );
}

function LinkedListTab({
  oppId,
  title,
  useHook,
}: {
  oppId: string;
  title: string;
  useHook: (id: string) => { data: unknown; isLoading: boolean; isError: boolean };
}) {
  const q = useHook(oppId);
  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  if (q.isError) return <Text className="text-rose-600 text-sm py-4">Failed to load {title}</Text>;
  const rows = Array.isArray(q.data) ? q.data : [];
  if (rows.length === 0) return <EmptyState icon="folder-open-outline" label={`No ${title.toLowerCase()}`} />;
  return (
    <View className="gap-2">
      {rows.map((row: any, idx: number) => (
        <View key={row.id ?? idx} className="bg-white rounded-xl p-4">
          <Text className="text-sm font-semibold text-slate-900">
            {row.name || row.subject || row.title || row.description || `#${row.id ?? idx + 1}`}
          </Text>
          {row.status ? <Text className="text-xs text-slate-500 mt-1">Status: {row.status}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export function ApprovalTab({ oppId, oppStatus }: { oppId: string; oppStatus: string }) {
  const q = useOpportunityApprovalInfo(oppId);
  const approve = useApproveOpportunity();
  const reject = useRejectOpportunity();
  const resubmit = useResubmitOpportunity();
  const [comment, setComment] = useState("");

  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  const info = q.data?.approval_info ?? [];
  const rejection = q.data?.rejection;

  const handleApprove = (requestId: number) => {
    approve.mutate(
      { id: Number(oppId), request_id: requestId, comment: comment || undefined },
      {
        onSuccess: () => Toast.show({ type: "success", text1: "Approved" }),
        onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
      }
    );
  };

  const handleReject = (requestId: number) => {
    Alert.alert("Reject?", "This will reject the current approval step.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () =>
          reject.mutate(
            { id: Number(oppId), request_id: requestId, comment: comment || undefined },
            {
              onSuccess: () => Toast.show({ type: "success", text1: "Rejected" }),
              onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
            }
          ),
      },
    ]);
  };

  return (
    <View className="gap-3">
      {rejection ? (
        <View className="bg-rose-50 rounded-xl p-4 border border-rose-100">
          <Text className="text-sm font-semibold text-rose-800">Rejected</Text>
          <Text className="text-xs text-rose-700 mt-1">{String(rejection)}</Text>
          {oppStatus !== "Draft" ? (
            <TouchableOpacity
              onPress={() =>
                resubmit.mutate(Number(oppId), {
                  onSuccess: () => Toast.show({ type: "success", text1: "Resubmitted" }),
                  onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
                })
              }
              className="mt-3 py-2 px-4 rounded-lg bg-rose-600 self-start"
            >
              <Text className="text-white text-xs font-semibold">Resubmit</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View className="bg-white rounded-xl p-3">
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Approval comment (optional)"
          placeholderTextColor="#94A3B8"
          className="text-sm text-slate-800"
        />
      </View>

      {info.length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" label="No workflow steps yet — submit for approval first" />
      ) : (
        info.map((row: any, idx: number) => {
          const requestId = Number(row.id ?? row.statusDetailID ?? row.request_id ?? 0);
          const canAct = Boolean(row.can_approve ?? row.buttonEnabled);
          return (
            <View key={requestId || idx} className="bg-white rounded-xl p-4">
              <Text className="text-sm font-semibold text-slate-900">
                {row.stage_name || `Stage ${row.stage}`} — {row.status_name || row.status}
              </Text>
              {row.staff_name ? (
                <Text className="text-xs text-slate-500 mt-1">Approver: {row.staff_name}</Text>
              ) : null}
              {canAct && requestId > 0 ? (
                <View className="flex-row gap-2 mt-3">
                  <TouchableOpacity
                    onPress={() => handleApprove(requestId)}
                    className="flex-1 py-2 rounded-lg items-center"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <Text className="text-white text-xs font-semibold">Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleReject(requestId)}
                    className="flex-1 py-2 rounded-lg items-center bg-slate-100"
                  >
                    <Text className="text-slate-700 text-xs font-semibold">Reject</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

export function TeamTab({ oppId }: { oppId: string }) {
  const q = useOpportunityMembers(oppId);
  const remove = useRemoveOpportunityMember();
  const add = useAddOpportunityMember();
  const [staffId, setStaffId] = useState("");

  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  const members = q.data ?? [];

  const handleAdd = () => {
    const sid = parseInt(staffId, 10);
    if (!sid) return;
    add.mutate(
      { opportunity_id: Number(oppId), staff_id: sid },
      {
        onSuccess: () => {
          setStaffId("");
          Toast.show({ type: "success", text1: "Member added" });
        },
        onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
      }
    );
  };

  return (
    <View className="gap-3">
      <View className="bg-white rounded-xl p-3 flex-row gap-2 items-center">
        <TextInput
          value={staffId}
          onChangeText={setStaffId}
          placeholder="Staff ID"
          keyboardType="number-pad"
          className="flex-1 text-sm text-slate-800"
        />
        <TouchableOpacity onPress={handleAdd} className="px-4 py-2 rounded-lg" style={{ backgroundColor: ACCENT }}>
          <Text className="text-white text-xs font-semibold">Add</Text>
        </TouchableOpacity>
      </View>
      {members.length === 0 ? (
        <EmptyState icon="people-outline" label="No team members" />
      ) : (
        members.map((m) => (
          <View key={m.staff_id} className="bg-white rounded-xl p-4 flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-slate-900">{m.staff_name || `Staff #${m.staff_id}`}</Text>
              {m.email ? <Text className="text-xs text-slate-500">{m.email}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={() =>
                remove.mutate(
                  { oppId: Number(oppId), staffId: m.staff_id },
                  {
                    onSuccess: () => Toast.show({ type: "success", text1: "Removed" }),
                    onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
                  }
                )
              }
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

export function MilestonesTab({ oppId }: { oppId: string }) {
  const q = useOpportunityMilestones(oppId);
  const create = useCreateOpportunityMilestone();
  const del = useDeleteOpportunityMilestone();
  const [title, setTitle] = useState("");

  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  const items = q.data ?? [];

  const handleAdd = () => {
    if (!title.trim()) return;
    create.mutate(
      { opportunity_id: Number(oppId), name: title.trim() },
      {
        onSuccess: () => {
          setTitle("");
          Toast.show({ type: "success", text1: "Milestone added" });
        },
        onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
      }
    );
  };

  return (
    <View className="gap-3">
      <View className="bg-white rounded-xl p-3 flex-row gap-2">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="New milestone"
          className="flex-1 text-sm text-slate-800"
        />
        <TouchableOpacity onPress={handleAdd} className="px-4 py-2 rounded-lg" style={{ backgroundColor: ACCENT }}>
          <Text className="text-white text-xs font-semibold">Add</Text>
        </TouchableOpacity>
      </View>
      {items.length === 0 ? (
        <EmptyState icon="flag-outline" label="No milestones" />
      ) : (
        items.map((m) => (
          <View key={m.id} className="bg-white rounded-xl p-4 flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">{m.name || m.title}</Text>
              {m.due_date ? <Text className="text-xs text-slate-500 mt-1">Due {m.due_date}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={() =>
                del.mutate(
                  { id: m.id, opportunity_id: Number(oppId) },
                  {
                    onSuccess: () => Toast.show({ type: "success", text1: "Deleted" }),
                    onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
                  }
                )
              }
            >
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

export function DiscussionsTab({ oppId }: { oppId: string }) {
  const q = useOpportunityDiscussions(oppId);
  const create = useCreateOpportunityDiscussion();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  const rows = (Array.isArray(q.data) ? q.data : []) as any[];

  const handlePost = () => {
    if (!subject.trim()) return;
    create.mutate(
      { opportunity_id: Number(oppId), subject: subject.trim(), description: body.trim() },
      {
        onSuccess: () => {
          setSubject("");
          setBody("");
          Toast.show({ type: "success", text1: "Discussion started" });
        },
        onError: (e: any) => Toast.show({ type: "error", text1: e?.message || "Failed" }),
      }
    );
  };

  return (
    <View className="gap-3">
      <View className="bg-white rounded-xl p-3 gap-2">
        <TextInput value={subject} onChangeText={setSubject} placeholder="Subject" className="text-sm text-slate-800" />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Message"
          multiline
          className="text-sm text-slate-800 min-h-[60px]"
        />
        <TouchableOpacity onPress={handlePost} className="self-end px-4 py-2 rounded-lg" style={{ backgroundColor: ACCENT }}>
          <Text className="text-white text-xs font-semibold">Post</Text>
        </TouchableOpacity>
      </View>
      {rows.length === 0 ? (
        <EmptyState icon="chatbubbles-outline" label="No discussions" />
      ) : (
        rows.map((d, idx) => (
          <View key={d.id ?? idx} className="bg-white rounded-xl p-4">
            <Text className="text-sm font-semibold text-slate-900">{d.subject || d.title}</Text>
            {d.description ? <Text className="text-xs text-slate-600 mt-2">{d.description}</Text> : null}
          </View>
        ))
      )}
    </View>
  );
}

export function EmailsTab({ oppId }: { oppId: string }) {
  const q = useOpportunityEmails(oppId);
  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  const rows = (Array.isArray(q.data) ? q.data : []) as any[];
  if (rows.length === 0) return <EmptyState icon="mail-outline" label="No linked emails" />;
  return (
    <View className="gap-2">
      {rows.map((e, idx) => (
        <TouchableOpacity
          key={e.id ?? idx}
          className="bg-white rounded-xl p-4"
          onPress={() => {
            if (e.message_id) Linking.openURL(`mailto:?messageId=${e.message_id}`).catch(() => undefined);
          }}
        >
          <Text className="text-sm font-semibold text-slate-900">{e.subject || "Email"}</Text>
          {e.from_email ? <Text className="text-xs text-slate-500 mt-1">{e.from_email}</Text> : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function TenderOpsTab({ oppId }: { oppId: string }) {
  const q = useOpportunityTenderOpsStages(oppId);
  if (q.isLoading) return <ActivityIndicator color={ACCENT} className="py-8" />;
  const rows = (Array.isArray(q.data) ? q.data : []) as any[];
  if (rows.length === 0) return <EmptyState icon="layers-outline" label="No TenderOps stages" />;
  return (
    <View className="gap-2">
      {rows.map((s, idx) => (
        <View key={s.stage_key ?? idx} className="bg-white rounded-xl p-4">
          <Text className="text-sm font-semibold text-slate-900">{s.stage_label || s.stage_key}</Text>
          <Text className="text-xs text-slate-500 mt-1">Status: {s.status || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

export function ThreadsTab({ teamsChannel }: { teamsChannel?: string | null }) {
  if (!teamsChannel) return <EmptyState icon="logo-microsoft" label="No Teams channel linked" />;
  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 flex-row items-center"
      onPress={() => Linking.openURL(teamsChannel).catch(() => undefined)}
    >
      <Ionicons name="logo-microsoft" size={24} color="#6264A7" />
      <Text className="ml-3 text-sm font-medium text-slate-800 flex-1">Open Teams channel</Text>
      <Ionicons name="open-outline" size={18} color="#64748B" />
    </TouchableOpacity>
  );
}

export function TasksTab({ oppId }: { oppId: string }) {
  return <LinkedListTab oppId={oppId} title="Tasks" useHook={useOpportunityTasks} />;
}

export function TimesheetsTab({ oppId }: { oppId: string }) {
  return <LinkedListTab oppId={oppId} title="Timesheets" useHook={useOpportunityTimesheets} />;
}

export function RfqTab({ oppId }: { oppId: string }) {
  return <LinkedListTab oppId={oppId} title="RFQ" useHook={useOpportunityRFQ} />;
}

export function TechnicalInquiriesTab({ oppId }: { oppId: string }) {
  return <LinkedListTab oppId={oppId} title="Technical inquiries" useHook={useOpportunityTechnicalInquiries} />;
}

export function EstimationTab({ oppId }: { oppId: string }) {
  return <LinkedListTab oppId={oppId} title="Estimation" useHook={useOpportunityEstimation} />;
}

export function SuppliersTab({ oppId }: { oppId: string }) {
  return <LinkedListTab oppId={oppId} title="Suppliers" useHook={useOpportunitySuppliers} />;
}
