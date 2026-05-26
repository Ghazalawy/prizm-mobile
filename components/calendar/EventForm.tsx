import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { colors } from "@/lib/theme";
import { useCurrentUser } from "@/lib/auth-context";
import {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  type CalendarEvent,
  type CreateEventPayload,
} from "@/lib/queries/calendar";

const COLOR_OPTIONS = [
  "#E65100", "#03A9F4", "#4CAF50", "#FF9800", "#9C27B0",
  "#F44336", "#2196F3", "#009688", "#795548", "#607D8B",
];

const REMINDER_TYPES = [
  { label: "Minutes", value: "minutes" },
  { label: "Hours", value: "hours" },
  { label: "Days", value: "days" },
];

type Props = {
  event?: CalendarEvent;
  mode: "create" | "edit";
};

export function EventForm({ event, mode }: Props) {
  const user = useCurrentUser();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startDate, setStartDate] = useState(
    event?.start?.replace(" ", "T").slice(0, 16) ??
      new Date().toISOString().slice(0, 16),
  );
  const [endDate, setEndDate] = useState(
    event?.end?.replace(" ", "T").slice(0, 16) ?? "",
  );
  const [isPublic, setIsPublic] = useState(
    Number(event?.public ?? 1) === 1,
  );
  const [reminderBefore, setReminderBefore] = useState(
    String(event?.reminder_before ?? "30"),
  );
  const [reminderType, setReminderType] = useState(
    event?.reminder_before_type ?? "minutes",
  );
  const [selectedColor, setSelectedColor] = useState(
    event?.color ?? COLOR_OPTIONS[0],
  );

  const saving =
    createMutation.isPending || updateMutation.isPending;

  const handleSave = async () => {
    if (!title.trim()) {
      Toast.show({ type: "error", text1: "Title is required" });
      return;
    }

    const payload: CreateEventPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      start: startDate.replace("T", " "),
      end: endDate ? endDate.replace("T", " ") : undefined,
      reminder_before: parseInt(reminderBefore, 10) || 30,
      reminder_before_type: reminderType,
      color: selectedColor,
      userid: Number(user?.staffid ?? 1),
      public: isPublic ? 1 : 0,
      isstartnotified: 0,
    };

    try {
      if (mode === "edit" && event) {
        await updateMutation.mutateAsync({
          id: Number(event.eventid),
          ...payload,
        });
        Toast.show({ type: "success", text1: "Event updated" });
      } else {
        await createMutation.mutateAsync(payload);
        Toast.show({ type: "success", text1: "Event created" });
      }
      router.back();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Save failed",
        text2: err?.message?.slice(0, 80),
      });
    }
  };

  const handleDelete = () => {
    if (!event) return;
    Alert.alert("Delete Event", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(Number(event.eventid));
            Toast.show({ type: "success", text1: "Event deleted" });
            router.back();
          } catch (err: any) {
            Toast.show({
              type: "error",
              text1: "Delete failed",
              text2: err?.message?.slice(0, 80),
            });
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color="#475569" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-foreground">
          {mode === "edit" ? "Edit Event" : "New Event"}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          hitSlop={8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text
              className="text-sm font-bold"
              style={{ color: colors.primary }}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text className="text-xs font-semibold text-muted uppercase mb-1">
          Title
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Event title"
          className="bg-white rounded-xl px-4 py-3 text-sm text-foreground mb-4 border border-slate-200"
          placeholderTextColor="#94A3B8"
        />

        {/* Description */}
        <Text className="text-xs font-semibold text-muted uppercase mb-1">
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          multiline
          numberOfLines={3}
          className="bg-white rounded-xl px-4 py-3 text-sm text-foreground mb-4 border border-slate-200"
          style={{ minHeight: 80, textAlignVertical: "top" }}
          placeholderTextColor="#94A3B8"
        />

        {/* Start / End */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-xs font-semibold text-muted uppercase mb-1">
              Start
            </Text>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DDTHH:mm"
              className="bg-white rounded-xl px-4 py-3 text-sm text-foreground border border-slate-200"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-muted uppercase mb-1">
              End
            </Text>
            <TextInput
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DDTHH:mm"
              className="bg-white rounded-xl px-4 py-3 text-sm text-foreground border border-slate-200"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Public toggle */}
        <View className="flex-row items-center justify-between bg-white rounded-xl px-4 py-3 mb-4 border border-slate-200">
          <Text className="text-sm text-foreground">Public event</Text>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: "#CBD5E1", true: colors.primaryBg }}
            thumbColor={isPublic ? colors.primary : "#F1F5F9"}
          />
        </View>

        {/* Reminder */}
        <Text className="text-xs font-semibold text-muted uppercase mb-1">
          Reminder
        </Text>
        <View className="flex-row gap-3 mb-4">
          <TextInput
            value={reminderBefore}
            onChangeText={setReminderBefore}
            keyboardType="numeric"
            className="bg-white rounded-xl px-4 py-3 text-sm text-foreground border border-slate-200 w-20"
            placeholderTextColor="#94A3B8"
          />
          <View className="flex-row gap-1 flex-1 items-center">
            {REMINDER_TYPES.map((rt) => (
              <TouchableOpacity
                key={rt.value}
                onPress={() => setReminderType(rt.value)}
                className="px-3 py-2 rounded-lg"
                style={{
                  backgroundColor:
                    reminderType === rt.value
                      ? colors.primaryBg
                      : "#F1F5F9",
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{
                    color:
                      reminderType === rt.value
                        ? colors.primary
                        : "#64748B",
                  }}
                >
                  {rt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color */}
        <Text className="text-xs font-semibold text-muted uppercase mb-2">
          Color
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {COLOR_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setSelectedColor(c)}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{
                backgroundColor: c,
                borderWidth: selectedColor === c ? 3 : 0,
                borderColor: "#FFFFFF",
              }}
            >
              {selectedColor === c && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete */}
        {mode === "edit" && (
          <TouchableOpacity
            onPress={handleDelete}
            className="flex-row items-center justify-center py-3 rounded-xl bg-rose-50 mt-2"
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text className="text-sm font-medium text-rose-600 ml-2">
              Delete Event
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
