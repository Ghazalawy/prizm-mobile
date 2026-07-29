import { useMemo, useState } from "react";
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
import { router, Stack } from "expo-router";
import Toast from "react-native-toast-message";
import { DateInput } from "@/components/crud/DateInput";
import { RelationPicker } from "@/components/crud/RelationPicker";
import { useLogTimeEntry } from "@/lib/queries/timesheets";
import { colors } from "@/lib/theme";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toPerfexDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export default function NewTimesheetScreen() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [taskId, setTaskId] = useState("");
  const [startTime, setStartTime] = useState(() => toPerfexDateTime(oneHourAgo));
  const [endTime, setEndTime] = useState(() => toPerfexDateTime(now));
  const [note, setNote] = useState("");
  const save = useLogTimeEntry();

  const canSave = useMemo(
    () => Number(taskId) > 0 && !!startTime && !!endTime && endTime > startTime && !save.isPending,
    [taskId, startTime, endTime, save.isPending]
  );

  const submit = () => {
    if (Number(taskId) <= 0) {
      Alert.alert("Choose a task", "Select the task this time belongs to.");
      return;
    }
    if (!startTime || !endTime || endTime <= startTime) {
      Alert.alert("Check the time", "End time must be later than start time.");
      return;
    }
    save.mutate(
      {
        task_id: Number(taskId),
        start_time: startTime,
        end_time: endTime,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          Toast.show({ type: "success", text1: "Time entry saved" });
          router.back();
        },
        onError: (error: any) =>
          Alert.alert("Couldn’t save time", error?.message || "Please try again."),
      }
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Log Time",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-xs uppercase tracking-wide text-muted mb-2">Task</Text>
          <RelationPicker
            relation="task"
            value={taskId}
            onChange={setTaskId}
            placeholder="Choose a task"
          />
        </View>

        <View className="bg-white rounded-2xl p-4 shadow-sm mt-4">
          <Text className="text-xs uppercase tracking-wide text-muted mb-3">Time worked</Text>
          <Text className="text-xs text-muted mb-1">Started</Text>
          <DateInput value={startTime} onChange={setStartTime} mode="datetime" />
          <Text className="text-xs text-muted mb-1 mt-4">Finished</Text>
          <DateInput value={endTime} onChange={setEndTime} mode="datetime" />
        </View>

        <View className="bg-white rounded-2xl p-4 shadow-sm mt-4">
          <Text className="text-xs uppercase tracking-wide text-muted mb-2">Work note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What did you work on? (optional)"
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            className="bg-gray-50 rounded-xl px-3 py-3 min-h-[104px] text-foreground"
          />
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={!canSave}
          activeOpacity={0.8}
          className="rounded-2xl py-4 items-center mt-6"
          style={{ backgroundColor: canSave ? colors.primary : colors.slate400 }}
        >
          {save.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold text-base">Save time entry</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
