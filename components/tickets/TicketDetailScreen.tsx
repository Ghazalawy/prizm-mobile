import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  useTicketDetail,
  useTicketReplies,
  useReplyToTicket,
  useChangeTicketStatus,
  useChangeTicketPriority,
} from "@/lib/queries/tickets";
import type { TicketReply } from "@/lib/queries/tickets";
import { rtlTextStyle } from "@/lib/rtl";
import { colors } from "@/lib/theme";
import { FilesTab } from "@/components/crud/FilesTab";
import Toast from "react-native-toast-message";
import {
  normalizePastedFile,
  pickClipboardImage,
  pickImage,
  takePhoto,
  uploadAttachment,
  type PickedFile,
} from "@/lib/files";
import PasteInput, { type PastedFile } from "@mattermost/react-native-paste-input";

type Props = { id: string };

const STATUS_OPTIONS = [
  { label: "Open", value: 1, color: "#DC2626" },
  { label: "In Progress", value: 2, color: "#2563EB" },
  { label: "Answered", value: 3, color: "#16A34A" },
  { label: "On Hold", value: 4, color: "#F59E0B" },
  { label: "Closed", value: 5, color: "#64748B" },
];

const PRIORITY_OPTIONS = [
  { label: "Low", value: 1, color: "#3B82F6" },
  { label: "Medium", value: 2, color: "#F59E0B" },
  { label: "High", value: 3, color: "#EA580C" },
  { label: "Urgent", value: 4, color: "#DC2626" },
];

type TabKey = "thread" | "info" | "files";

export function TicketDetailScreen({ id }: Props) {
  const [tab, setTab] = useState<TabKey>("thread");
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<PickedFile[]>([]);
  const [replyUploading, setReplyUploading] = useState(false);

  const ticketQuery = useTicketDetail(id);
  const repliesQuery = useTicketReplies(id);
  const replyMutation = useReplyToTicket();
  const changeStatus = useChangeTicketStatus();
  const changePriority = useChangeTicketPriority();

  const ticket = ticketQuery.data;
  const replies = repliesQuery.data ?? [];

  const threadMessages = useMemo(() => {
    const msgs: ThreadMessage[] = [];
    if (ticket?.message) {
      msgs.push({
        id: "original",
        content: ticket.message,
        date: ticket.date || "",
        isStaff: false,
        senderName: ticket.name || ticket.email || "Client",
        isInternal: false,
      });
    }
    for (const r of replies) {
      msgs.push({
        id: String(r.id),
        content: r.message,
        date: r.date,
        isStaff: !!r.admin && Number(r.admin) > 0,
        senderName: r.staff_name || r.name || (r.admin ? `Staff #${r.admin}` : "Client"),
        isInternal: false,
      });
    }
    return msgs;
  }, [ticket, replies]);

  const statusOpt = STATUS_OPTIONS.find((o) => o.value === Number(ticket?.status));
  const priorityOpt = PRIORITY_OPTIONS.find((o) => o.value === Number(ticket?.priority));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([ticketQuery.refetch(), repliesQuery.refetch()]);
    setRefreshing(false);
  }, [ticketQuery, repliesQuery]);

  const handlePickImage = useCallback(async () => {
    const file = await pickImage();
    if (file) setReplyAttachments((prev) => [...prev, file]);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const file = await takePhoto();
    if (file) setReplyAttachments((prev) => [...prev, file]);
  }, []);

  const handlePasteImage = useCallback(async () => {
    try {
      const file = await pickClipboardImage();
      if (!file) {
        Alert.alert("No image", "No image found in clipboard. Copy an image first.");
        return;
      }
      setReplyAttachments((prev) => [...prev, file]);
      Toast.show({ type: "success", text1: "Snapshot attached", text2: file.name });
    } catch (e: any) {
      Alert.alert("Paste failed", e?.message || "Could not read image from clipboard.");
    }
  }, []);

  const handleNativePaste = useCallback((error: string | null | undefined, files: PastedFile[]) => {
    if (error) {
      Toast.show({ type: "error", text1: "Paste failed", text2: error.slice(0, 90) });
      return;
    }
    if (!files.length) return;
    const pasted = files.map(normalizePastedFile);
    setReplyAttachments((prev) => [...prev, ...pasted]);
    Toast.show({
      type: "success",
      text1: pasted.length === 1 ? "Snapshot attached" : `${pasted.length} files attached`,
    });
  }, []);

  const removeReplyAttachment = useCallback((idx: number) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSendReply = useCallback(async () => {
    const content = replyText.trim();
    if (!content && replyAttachments.length === 0) return;
    setReplyUploading(true);
    try {
      for (const file of replyAttachments) {
        await uploadAttachment({ relType: "ticket", relId: id, file });
      }
      const imgNames = replyAttachments.map((f) => f.name).join(", ");
      const fullContent = content
        ? (imgNames ? `${content}\n\n📎 ${imgNames}` : content)
        : (imgNames ? `📎 ${imgNames}` : "");
      if (fullContent) {
        await new Promise<void>((resolve, reject) => {
          replyMutation.mutate(
            { ticketId: id, content: fullContent, isInternal },
            {
              onSuccess: () => {
                setReplyText("");
                setReplyAttachments([]);
                Toast.show({ type: "success", text1: isInternal ? "Internal note added" : "Reply sent" });
                resolve();
              },
              onError: (e: any) => {
                Toast.show({ type: "error", text1: "Failed", text2: e?.message });
                reject(e);
              },
            }
          );
        });
      } else {
        setReplyAttachments([]);
      }
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message || "Could not attach files");
    } finally {
      setReplyUploading(false);
    }
  }, [replyText, replyAttachments, id, isInternal, replyMutation]);

  const handleChangeStatus = useCallback(() => {
    const buttons = STATUS_OPTIONS.map((o) => ({
      text: o.label,
      onPress: () => {
        changeStatus.mutate(
          { ticketId: id, status: o.value },
          {
            onSuccess: () => {
              Toast.show({ type: "success", text1: "Status updated" });
              ticketQuery.refetch();
            },
            onError: (e: any) => Toast.show({ type: "error", text1: "Failed", text2: e?.message }),
          }
        );
      },
    }));
    buttons.push({ text: "Cancel", onPress: () => {} });
    Alert.alert("Change Status", "Select new status:", buttons);
  }, [id, changeStatus, ticketQuery]);

  const handleChangePriority = useCallback(() => {
    const buttons = PRIORITY_OPTIONS.map((o) => ({
      text: o.label,
      onPress: () => {
        changePriority.mutate(
          { ticketId: id, priority: o.value },
          {
            onSuccess: () => {
              Toast.show({ type: "success", text1: "Priority updated" });
              ticketQuery.refetch();
            },
            onError: (e: any) => Toast.show({ type: "error", text1: "Failed", text2: e?.message }),
          }
        );
      },
    }));
    buttons.push({ text: "Cancel", onPress: () => {} });
    Alert.alert("Change Priority", "Select new priority:", buttons);
  }, [id, changePriority, ticketQuery]);

  if (ticketQuery.isLoading && !ticket) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (ticketQuery.isError || !ticket) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <Ionicons name="cloud-offline-outline" size={42} color="#EF4444" />
        <Text className="text-foreground font-semibold mt-3">Couldn't load ticket</Text>
        <TouchableOpacity onPress={() => ticketQuery.refetch()} className="mt-4 bg-primary px-5 py-2 rounded-lg">
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-3 pt-2 pb-2">
        <View className="flex-row items-center" style={{ minHeight: 44 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View className="flex-1 ml-2">
            <Text className="text-sm font-bold text-foreground" numberOfLines={1} style={rtlTextStyle(ticket.subject)}>
              {ticket.subject}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Text className="text-[10px] text-slate-400 mr-2">#{ticket.ticketid}</Text>
              {statusOpt ? (
                <View style={{ backgroundColor: statusOpt.color + "15", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, marginRight: 4 }}>
                  <Text style={{ color: statusOpt.color, fontSize: 9, fontWeight: "700" }}>{statusOpt.label}</Text>
                </View>
              ) : null}
              {priorityOpt ? (
                <View style={{ backgroundColor: priorityOpt.color + "15", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 }}>
                  <Text style={{ color: priorityOpt.color, fontSize: 9, fontWeight: "700" }}>{priorityOpt.label}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity onPress={handleChangeStatus} className="w-8 h-8 items-center justify-center" hitSlop={6}>
            <Ionicons name="swap-vertical-outline" size={18} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleChangePriority} className="w-8 h-8 items-center justify-center" hitSlop={6}>
            <Ionicons name="flag-outline" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Tab toggle */}
        <View className="flex-row bg-slate-100 rounded-lg p-0.5 mt-1">
          {(["thread", "info", "files"] as TabKey[]).map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => setTab(k)}
              className={`flex-1 py-1.5 rounded-md items-center ${tab === k ? "bg-white shadow-sm" : ""}`}
            >
              <Text className={`text-xs font-semibold ${tab === k ? "text-primary" : "text-slate-500"}`}>
                {k === "thread" ? "Thread" : k === "info" ? "Info" : "Files"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {tab === "thread" ? (
        <View className="flex-1">
          {/* Message thread */}
          <FlatList
            data={threadMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <View className="items-center py-8">
                <Ionicons name="chatbubbles-outline" size={40} color="#CBD5E1" />
                <Text className="text-slate-400 mt-2 text-sm">No messages yet</Text>
              </View>
            }
          />

          {/* Reply composer */}
          <View className="bg-white border-t border-slate-200 px-3 py-2">
            {/* Internal note toggle */}
            <TouchableOpacity
              onPress={() => setIsInternal(!isInternal)}
              className="flex-row items-center mb-1.5"
            >
              <Ionicons
                name={isInternal ? "checkbox" : "square-outline"}
                size={16}
                color={isInternal ? "#7C3AED" : "#94A3B8"}
              />
              <Text className={`text-xs ml-1.5 ${isInternal ? "text-purple-700 font-semibold" : "text-slate-400"}`}>
                Internal note (staff only)
              </Text>
            </TouchableOpacity>

            {/* Attachment previews */}
            {replyAttachments.length > 0 ? (
              <View className="flex-row flex-wrap gap-2 mb-1.5">
                {replyAttachments.map((f, idx) => (
                  <View key={idx} className="flex-row items-center bg-blue-50 rounded-lg px-2 py-1">
                    <Ionicons name="image-outline" size={14} color="#2563EB" />
                    <Text className="text-xs text-blue-700 ml-1 max-w-[120px]" numberOfLines={1}>{f.name}</Text>
                    <TouchableOpacity onPress={() => removeReplyAttachment(idx)} hitSlop={8} className="ml-1">
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            <View className="flex-row items-end">
              <TouchableOpacity
                onPress={handleTakePhoto}
                className="w-9 h-9 rounded-lg items-center justify-center bg-slate-100 mr-1.5"
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={18} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickImage}
                className="w-9 h-9 rounded-lg items-center justify-center bg-slate-100 mr-1.5"
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={18} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePasteImage}
                className="w-9 h-9 rounded-lg items-center justify-center bg-slate-100 mr-1.5"
                activeOpacity={0.7}
              >
                <Ionicons name="clipboard-outline" size={18} color="#64748B" />
              </TouchableOpacity>
              <PasteInput
                value={replyText}
                onChangeText={setReplyText}
                onPaste={handleNativePaste}
                disableCopyPaste={false}
                placeholder={isInternal ? "Add internal note..." : "Type your reply..."}
                placeholderTextColor="#94A3B8"
                multiline
                blurOnSubmit={false}
                underlineColorAndroid="transparent"
                keyboardType="default"
                disableFullscreenUI
                autoComplete="off"
                textContentType="none"
                style={[
                  {
                    flex: 1,
                    minHeight: 40,
                    maxHeight: 96,
                    borderRadius: 12,
                    backgroundColor: "#F1F5F9",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    color: "#0F172A",
                    fontSize: 14,
                    textAlignVertical: "top",
                  },
                  rtlTextStyle(replyText),
                ]}
              />
              <TouchableOpacity
                onPress={handleSendReply}
                disabled={(!replyText.trim() && replyAttachments.length === 0) || replyMutation.isPending || replyUploading}
                className="ml-2 rounded-full items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: (replyText.trim() || replyAttachments.length > 0) ? (isInternal ? "#7C3AED" : colors.primary) : "#E2E8F0",
                }}
              >
                {replyMutation.isPending || replyUploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="send" size={16} color={(replyText.trim() || replyAttachments.length > 0) ? "#FFF" : "#94A3B8"} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : tab === "info" ? (
        <TicketInfoTab ticket={ticket} />
      ) : (
        <View className="flex-1">
          <FilesTab relType="ticket" relId={id} color={colors.primary} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Thread types & components ───────────────────────────────────────────

type ThreadMessage = {
  id: string;
  content: string;
  date: string;
  isStaff: boolean;
  senderName: string;
  isInternal: boolean;
};

function MessageBubble({ message }: { message: ThreadMessage }) {
  const { isStaff, isInternal, content, senderName, date } = message;
  const cleanContent = cleanHtml(content);

  return (
    <View
      className={`mb-3 ${isStaff ? "items-end" : "items-start"}`}
      style={{ maxWidth: "85%" , alignSelf: isStaff ? "flex-end" : "flex-start" }}
    >
      {/* Sender name */}
      <Text className="text-[10px] text-slate-400 mb-1 px-1">
        {senderName}
      </Text>

      {/* Bubble */}
      <View
        style={{
          backgroundColor: isInternal
            ? "#F5F3FF"
            : isStaff
            ? colors.primary + "12"
            : "#F1F5F9",
          borderRadius: 16,
          borderTopRightRadius: isStaff ? 4 : 16,
          borderTopLeftRadius: isStaff ? 16 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: isInternal ? 1 : 0,
          borderColor: isInternal ? "#DDD6FE" : "transparent",
        }}
      >
        {isInternal ? (
          <View className="flex-row items-center mb-1">
            <Ionicons name="lock-closed-outline" size={10} color="#7C3AED" />
            <Text className="text-[9px] text-purple-600 ml-1 font-semibold">INTERNAL NOTE</Text>
          </View>
        ) : null}
        <Text
          className="text-sm text-foreground leading-5"
          selectable
          style={rtlTextStyle(cleanContent)}
        >
          {cleanContent}
        </Text>
      </View>

      {/* Timestamp */}
      <Text className="text-[9px] text-slate-400 mt-0.5 px-1">
        {formatDateTime(date)}
      </Text>
    </View>
  );
}

// ─── Info Tab ────────────────────────────────────────────────────────────

function TicketInfoTab({ ticket }: { ticket: any }) {
  const statusOpt = STATUS_OPTIONS.find((o) => o.value === Number(ticket.status));
  const priorityOpt = PRIORITY_OPTIONS.find((o) => o.value === Number(ticket.priority));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
      <View className="bg-white rounded-2xl p-4 shadow-sm">
        <Text className="text-xs uppercase text-slate-400 font-semibold mb-3">Ticket Details</Text>
        <InfoRow label="Subject" value={ticket.subject} />
        <InfoRow label="Ticket ID" value={`#${ticket.ticketid}`} />
        <InfoRow label="Status" value={statusOpt?.label || String(ticket.status)} color={statusOpt?.color} />
        <InfoRow label="Priority" value={priorityOpt?.label || String(ticket.priority)} color={priorityOpt?.color} />
        <InfoRow label="Department" value={ticket.department_name || (ticket.department ? `Dept #${ticket.department}` : "—")} />
        <InfoRow label="Service" value={ticket.service ? `Service #${ticket.service}` : "—"} />
        <InfoRow label="Requester" value={ticket.name || ticket.email || "—"} />
        <InfoRow label="Email" value={ticket.email || "—"} />
        <InfoRow label="Assigned" value={ticket.assigned_name || (ticket.assigned ? `Staff #${ticket.assigned}` : "Unassigned")} />
        <InfoRow label="Created" value={formatDateTime(ticket.date)} />
        <InfoRow label="Last Reply" value={formatDateTime(ticket.lastreply)} />
        {ticket.project_id ? <InfoRow label="Project" value={`#${ticket.project_id}`} /> : null}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View className="flex-row items-center py-1.5 border-b border-slate-50">
      <Text className="text-xs text-slate-400 w-20">{label}</Text>
      <Text
        className="flex-1 text-sm font-medium"
        style={{ color: color || "#0F172A" }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function cleanHtml(value: string): string {
  if (!value) return "";
  return value
    .replace(/<\/(p|div|li|br|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function formatDateTime(v: any): string {
  const s = String(v ?? "").trim();
  if (!s || s.startsWith("0000") || s === "null") return "—";
  return s.replace("T", " ").slice(0, 16);
}
