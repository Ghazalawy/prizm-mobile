import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useTimesheetSummary,
  useActiveTimers,
  useTimesheetEntries,
  formatDuration,
  type ActiveTimer,
  type TimesheetEntry,
} from "@/lib/queries/timesheets";
import { useMyDashboard } from "@/lib/queries/my";
import { TimerWidget } from "./TimerWidget";
import { colors } from "@/lib/theme";

function fmtTime(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getWeekDayDates(): { label: string; date: string; isToday: boolean }[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = now.toISOString().slice(0, 10);

  return days.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    return { label, date, isToday: date === today };
  });
}

function entryDuration(e: TimesheetEntry): number {
  const start = new Date(e.start_time.replace(" ", "T")).getTime();
  const end = e.end_time
    ? new Date(e.end_time.replace(" ", "T")).getTime()
    : Date.now();
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function TimesheetDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const todaySummary = useTimesheetSummary(today);
  const activeTimers = useActiveTimers();
  const entries = useTimesheetEntries({ limit: 200 });
  const dashboard = useMyDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const checkin = dashboard.data?.checkin;
  const checkedIn = !!checkin?.checked_in_now;

  const weekDays = useMemo(() => getWeekDayDates(), []);
  const allEntries = entries.data ?? [];

  const weekHours = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of allEntries) {
      const date = e.start_time?.slice(0, 10);
      if (date) {
        map[date] = (map[date] || 0) + entryDuration(e);
      }
    }
    return map;
  }, [allEntries, tick]);

  const weekTotal = useMemo(() => {
    const dateSet = new Set(weekDays.map((d) => d.date));
    return Object.entries(weekHours)
      .filter(([d]) => dateSet.has(d))
      .reduce((sum, [, secs]) => sum + secs, 0);
  }, [weekHours, weekDays]);

  const recentEntries = useMemo(() => {
    return allEntries
      .filter((e) => !!e.end_time && e.end_time !== "0000-00-00 00:00:00")
      .slice(0, 10);
  }, [allEntries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      todaySummary.refetch(),
      activeTimers.refetch(),
      entries.refetch(),
      dashboard.refetch(),
    ]);
    setRefreshing(false);
  }, [todaySummary, activeTimers, entries, dashboard]);

  const isLoading =
    todaySummary.isLoading || activeTimers.isLoading || entries.isLoading;

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Today's summary */}
      <View
        className="mx-4 mt-3 rounded-2xl px-5 py-5 shadow-sm"
        style={{ backgroundColor: checkedIn ? "#16A34A" : colors.primary }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white/80 text-xs uppercase tracking-wide">
              Today
            </Text>
            <Text className="text-white text-3xl font-bold mt-1">
              {isLoading
                ? "..."
                : formatDuration(todaySummary.data?.totalSeconds ?? 0)}
            </Text>
            <Text className="text-white/70 text-sm mt-0.5">
              {checkedIn ? "Currently clocked in" : "Not clocked in"}
            </Text>
          </View>
          <View
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
          >
            <Ionicons name="time-outline" size={32} color="#FFFFFF" />
          </View>
        </View>
      </View>

      {/* Active timers */}
      {(activeTimers.data ?? []).length > 0 ? (
        <View className="px-4 mt-4">
          <Text className="text-xs text-muted uppercase tracking-wide mb-2 px-1">
            Active Timers
          </Text>
          {activeTimers.data!.map((timer) => (
            <TimerWidget key={timer.id} timer={timer} />
          ))}
        </View>
      ) : null}

      {/* This week view */}
      <View className="px-4 mt-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-bold text-foreground">This Week</Text>
          <TouchableOpacity
            onPress={() =>
              router.push("/(tabs)/timesheets/weekly" as any)
            }
            activeOpacity={0.7}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: colors.primary }}
            >
              Full View →
            </Text>
          </TouchableOpacity>
        </View>
        <View className="bg-white rounded-2xl px-3 py-3 shadow-sm">
          <View className="flex-row justify-between mb-3">
            {weekDays.map((day) => {
              const secs = weekHours[day.date] || 0;
              const hrs = secs / 3600;
              const maxH = 10;
              const barH = Math.max(4, Math.min(60, (hrs / maxH) * 60));
              return (
                <View key={day.date} className="items-center flex-1">
                  <Text
                    className="text-[10px] font-medium mb-1"
                    style={{
                      color: day.isToday ? colors.primary : colors.slate400,
                    }}
                  >
                    {day.label}
                  </Text>
                  <View
                    className="w-5 rounded-full mb-1"
                    style={{
                      height: barH,
                      backgroundColor: day.isToday
                        ? colors.primary
                        : secs > 0
                        ? colors.primaryLight
                        : colors.slate100,
                    }}
                  />
                  <Text
                    className="text-[10px] tabular-nums"
                    style={{
                      color: secs > 0 ? colors.slate700 : colors.slate300,
                    }}
                  >
                    {secs > 0 ? (hrs).toFixed(1) : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
          <View className="border-t border-slate-100 pt-2 flex-row justify-between items-center">
            <Text className="text-xs text-muted">Week Total</Text>
            <Text className="text-sm font-bold text-foreground">
              {formatDuration(weekTotal)}
            </Text>
          </View>
        </View>
      </View>

      {/* Recent entries */}
      {recentEntries.length > 0 ? (
        <View className="px-4 mt-4">
          <Text className="text-base font-bold text-foreground mb-2">
            Recent Entries
          </Text>
          <View className="bg-white rounded-2xl shadow-sm">
            {recentEntries.map((entry, idx) => (
              <View
                key={entry.id}
                className="px-4 py-3 flex-row items-center"
                style={
                  idx < recentEntries.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }
                    : undefined
                }
              >
                <View
                  className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                  style={{ backgroundColor: `${colors.primary}1A` }}
                >
                  <Ionicons
                    name="timer-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm font-medium text-foreground"
                    numberOfLines={1}
                  >
                    Task #{entry.task_id}
                    {entry.task_name ? ` · ${entry.task_name}` : ""}
                  </Text>
                  <Text className="text-xs text-muted mt-0.5">
                    {fmtDate(entry.start_time)} · {fmtTime(entry.start_time)}
                    {entry.end_time
                      ? ` – ${fmtTime(entry.end_time)}`
                      : ""}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-foreground tabular-nums">
                  {formatDuration(entryDuration(entry))}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
