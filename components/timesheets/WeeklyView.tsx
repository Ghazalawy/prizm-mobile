import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  useWeeklyTimesheet,
  formatDuration,
  type TimesheetDaySummary,
  type TimesheetEntry,
} from "@/lib/queries/timesheets";
import { colors } from "@/lib/theme";

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function shiftWeek(weekStart: string, delta: number): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

function fmtWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function fmtTime(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function entryDuration(e: TimesheetEntry): number {
  const start = new Date(e.start_time.replace(" ", "T")).getTime();
  const end = e.end_time
    ? new Date(e.end_time.replace(" ", "T")).getTime()
    : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000));
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function DayRow({
  day,
  index,
  isToday,
  expanded,
  onToggle,
}: {
  day: TimesheetDaySummary;
  index: number;
  isToday: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hrs = (day.totalSeconds / 3600).toFixed(1);
  const hasEntries = day.entries.length > 0;

  return (
    <View>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        className="flex-row items-center py-3.5 px-4"
        style={
          index < 6
            ? { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }
            : undefined
        }
      >
        <View
          className="w-8 h-8 rounded-lg items-center justify-center mr-3"
          style={{
            backgroundColor: isToday ? colors.primary : colors.slate100,
          }}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: isToday ? colors.white : colors.slate500 }}
          >
            {DAY_NAMES[index].slice(0, 2)}
          </Text>
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-medium"
            style={{
              color: isToday ? colors.primary : colors.slate700,
            }}
          >
            {DAY_NAMES[index]}
          </Text>
          <Text className="text-xs text-muted mt-0.5">
            {day.date} · {day.entries.length} entr{day.entries.length === 1 ? "y" : "ies"}
          </Text>
        </View>
        <Text
          className="text-base font-bold tabular-nums mr-2"
          style={{
            color: day.totalSeconds > 0 ? colors.slate800 : colors.slate300,
          }}
        >
          {day.totalSeconds > 0 ? `${hrs}h` : "—"}
        </Text>
        {hasEntries ? (
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.slate400}
          />
        ) : (
          <View style={{ width: 18 }} />
        )}
      </TouchableOpacity>

      {expanded && hasEntries ? (
        <View className="bg-slate-50 px-4 py-2">
          {day.entries.map((entry) => (
            <View
              key={entry.id}
              className="flex-row items-center py-2 border-b border-slate-100"
            >
              <Ionicons
                name="timer-outline"
                size={14}
                color={colors.slate400}
              />
              <Text className="text-xs text-muted ml-2 flex-1" numberOfLines={1}>
                Task #{entry.task_id}
                {entry.task_name ? ` · ${entry.task_name}` : ""}
              </Text>
              <Text className="text-xs text-muted mr-2">
                {fmtTime(entry.start_time)}
                {entry.end_time ? ` – ${fmtTime(entry.end_time)}` : " →"}
              </Text>
              <Text className="text-xs font-semibold text-foreground tabular-nums">
                {formatDuration(entryDuration(entry))}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function WeeklyView() {
  const today = new Date().toISOString().slice(0, 10);
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(today));
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const q = useWeeklyTimesheet(weekStart);
  const days = q.data?.days ?? [];
  const weekTotal = q.data?.weekTotal ?? 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const goBack = useCallback(() => {
    setWeekStart((ws) => shiftWeek(ws, -1));
    setExpandedDay(null);
  }, []);

  const goForward = useCallback(() => {
    setWeekStart((ws) => shiftWeek(ws, 1));
    setExpandedDay(null);
  }, []);

  const goToday = useCallback(() => {
    setWeekStart(getMondayOfWeek(today));
    setExpandedDay(null);
  }, [today]);

  const isCurrentWeek = weekStart === getMondayOfWeek(today);

  return (
    <View className="flex-1 bg-surface">
      {/* Week navigation */}
      <View className="bg-white px-4 py-3 flex-row items-center justify-between shadow-sm">
        <TouchableOpacity
          onPress={goBack}
          activeOpacity={0.7}
          className="w-10 h-10 rounded-xl items-center justify-center bg-slate-100"
        >
          <Ionicons name="chevron-back" size={20} color={colors.slate600} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToday} activeOpacity={0.7}>
          <Text className="text-base font-bold text-foreground">
            {fmtWeekLabel(weekStart)}
          </Text>
          {!isCurrentWeek ? (
            <Text
              className="text-xs text-center mt-0.5"
              style={{ color: colors.primary }}
            >
              Tap for this week
            </Text>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={goForward}
          activeOpacity={0.7}
          className="w-10 h-10 rounded-xl items-center justify-center bg-slate-100"
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.slate600}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {q.isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Day rows */}
            <View className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden">
              {days.map((day, idx) => (
                <DayRow
                  key={day.date}
                  day={day}
                  index={idx}
                  isToday={day.date === today}
                  expanded={expandedDay === idx}
                  onToggle={() =>
                    setExpandedDay((prev) => (prev === idx ? null : idx))
                  }
                />
              ))}
            </View>

            {/* Week total footer */}
            <View className="mx-4 mt-3 bg-white rounded-2xl px-5 py-4 shadow-sm flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons
                  name="stats-chart-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text className="text-sm font-medium text-foreground ml-2">
                  Weekly Total
                </Text>
              </View>
              <Text className="text-xl font-bold text-foreground tabular-nums">
                {formatDuration(weekTotal)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
