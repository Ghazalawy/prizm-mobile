import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useStopTimer } from "@/lib/queries/tasks";
import { useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { colors } from "@/lib/theme";

type Timer = {
  id: number;
  task_id: number;
  staff_id: number;
  start_time: string;
  end_time: null;
  note: string | null;
  task_name?: string;
  project_name?: string;
};

function formatElapsed(startStr: string): string {
  const start = new Date(startStr.replace(" ", "T")).getTime();
  const diff = Math.max(0, Date.now() - start);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TimerWidget({ timer }: { timer: Timer }) {
  const stopTimer = useStopTimer();
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(formatElapsed(timer.start_time));
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatElapsed(timer.start_time));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.start_time]);

  const handleStop = useCallback(() => {
    if (stopTimer.isPending) return;
    stopTimer.mutate(
      {
        taskId: String(timer.task_id),
        timerId: timer.id,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          Toast.show({ type: "success", text1: "Timer stopped" });
          qc.invalidateQueries({ queryKey: ["timesheets"] });
          qc.invalidateQueries({ queryKey: ["my", "dashboard"] });
          setShowNote(false);
          setNote("");
        },
        onError: (err: any) =>
          Alert.alert("Error", err?.message || "Failed to stop timer"),
      }
    );
  }, [timer, note, stopTimer, qc]);

  return (
    <View className="bg-white rounded-2xl px-4 py-4 mb-2 shadow-sm">
      <View className="flex-row items-center">
        {/* Pulsing dot */}
        <View
          className="w-3 h-3 rounded-full mr-3"
          style={{ backgroundColor: colors.error }}
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {timer.task_name || `Task #${timer.task_id}`}
          </Text>
          {timer.project_name ? (
            <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
              {timer.project_name}
            </Text>
          ) : null}
        </View>
        <Text
          className="text-2xl font-bold tabular-nums mr-3"
          style={{ color: colors.primary }}
        >
          {elapsed}
        </Text>
        <TouchableOpacity
          onPress={() => (showNote ? handleStop() : setShowNote(true))}
          disabled={stopTimer.isPending}
          activeOpacity={0.7}
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.error }}
        >
          {stopTimer.isPending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons name="stop" size={22} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {showNote ? (
        <View className="mt-3 border-t border-slate-100 pt-3">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)..."
            className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-foreground mb-2"
            placeholderTextColor="#94A3B8"
            multiline
          />
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => {
                setShowNote(false);
                setNote("");
              }}
              className="flex-1 rounded-xl py-2.5 items-center bg-slate-100"
            >
              <Text className="text-sm font-medium text-slate-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleStop}
              disabled={stopTimer.isPending}
              className="flex-1 rounded-xl py-2.5 items-center"
              style={{ backgroundColor: colors.error }}
            >
              <Text className="text-sm font-semibold text-white">
                Stop Timer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}
