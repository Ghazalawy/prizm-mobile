import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { useState, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { rtlTextStyle } from "@/lib/rtl";
import {
  useCalendarEvents,
  useCalendarOverlays,
  type CalendarEvent,
  type CalendarOverlayItem,
} from "@/lib/queries/calendar";

// ─── Helpers ─────────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 1).getDay();
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateKey(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  return toDateKey(d);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type MergedItem = {
  id: string;
  title: string;
  time?: string;
  color: string;
  type: "event" | "task" | "project" | "contract" | "tender";
  route?: string;
};

// ─── Month Grid ──────────────────────────────────────────────────────────

function MonthGrid({
  month,
  year,
  selectedDay,
  onSelectDay,
  dotMap,
}: {
  month: number;
  year: number;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  dotMap: Map<number, string[]>;
}) {
  const totalDays = daysInMonth(month, year);
  const startDay = firstDayOfMonth(month, year);
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === month && today.getFullYear() === year;
  const todayDate = today.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      <View className="flex-row mb-1">
        {WEEKDAYS.map((wd) => (
          <View key={wd} className="flex-1 items-center py-1">
            <Text className="text-[11px] font-semibold text-muted uppercase">
              {wd}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row">
          {row.map((day, ci) => {
            if (day === null) {
              return <View key={`e-${ci}`} className="flex-1 h-11" />;
            }
            const isToday = isCurrentMonth && day === todayDate;
            const isSelected = day === selectedDay;
            const dots = dotMap.get(day) ?? [];
            return (
              <TouchableOpacity
                key={day}
                onPress={() => onSelectDay(day)}
                activeOpacity={0.6}
                className="flex-1 h-11 items-center justify-center"
              >
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={[
                    isSelected && {
                      backgroundColor: colors.primary,
                    },
                    isToday &&
                      !isSelected && {
                        borderWidth: 2,
                        borderColor: colors.primary,
                      },
                  ]}
                >
                  <Text
                    className="text-sm"
                    style={{
                      color: isSelected
                        ? "#FFFFFF"
                        : isToday
                          ? colors.primary
                          : "#0F172A",
                      fontWeight: isToday || isSelected ? "700" : "400",
                    }}
                  >
                    {day}
                  </Text>
                </View>
                {dots.length > 0 && (
                  <View className="flex-row gap-0.5 mt-0.5">
                    {dots.slice(0, 3).map((c, i) => (
                      <View
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Agenda List ─────────────────────────────────────────────────────────

function AgendaView({
  events,
  overlays,
}: {
  events: CalendarEvent[];
  overlays: CalendarOverlayItem[];
}) {
  const grouped = useMemo(() => {
    const all: (MergedItem & { dateKey: string })[] = [];

    for (const e of events) {
      const dk = parseDateKey(e.start);
      const startTime = e.start.includes(" ")
        ? e.start.split(" ")[1]?.slice(0, 5)
        : undefined;
      const endTime =
        e.end && e.end.includes(" ")
          ? e.end.split(" ")[1]?.slice(0, 5)
          : undefined;
      all.push({
        id: `event-${e.eventid}`,
        title: e.title,
        time:
          startTime && endTime
            ? `${startTime} – ${endTime}`
            : startTime ?? undefined,
        color: e.color || colors.primary,
        type: "event",
        dateKey: dk,
      });
    }

    for (const o of overlays) {
      all.push({
        id: String(o.id),
        title: o.title,
        color: o.color,
        type: o.type,
        route: o.route,
        dateKey: o.date.slice(0, 10),
      });
    }

    all.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    const map = new Map<string, (MergedItem & { dateKey: string })[]>();
    for (const item of all) {
      const group = map.get(item.dateKey) ?? [];
      group.push(item);
      map.set(item.dateKey, group);
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [events, overlays]);

  if (grouped.length === 0) {
    return (
      <View className="items-center py-10">
        <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
        <Text className="text-sm text-muted mt-2">No events this month</Text>
      </View>
    );
  }

  return (
    <View>
      {grouped.map(({ date, items }) => (
        <View key={date} className="mb-4">
          <Text className="text-xs font-bold text-muted uppercase mb-2 px-1">
            {formatDateLabel(date)}
          </Text>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                if (item.route) router.push(item.route as any);
              }}
              activeOpacity={0.7}
              className="flex-row items-center bg-white rounded-xl px-3 py-3 mb-1.5"
              style={{ borderLeftWidth: 3, borderLeftColor: item.color }}
            >
              <View className="flex-1">
                <Text
                  className="text-sm font-medium text-foreground"
                  numberOfLines={1}
                  style={rtlTextStyle(item.title)}
                >
                  {item.title}
                </Text>
                <View className="flex-row items-center mt-1 gap-2">
                  {item.time && (
                    <Text className="text-xs text-muted">{item.time}</Text>
                  )}
                  <View
                    className="px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${item.color}1A` }}
                  >
                    <Text
                      className="text-[10px] font-semibold capitalize"
                      style={{ color: item.color }}
                    >
                      {item.type}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (d.getTime() - today.getTime()) / 86400000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ─── Main Screen ─────────────────────────────────────────────────────────

export function CalendarScreen() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(
    today.getDate(),
  );
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [refreshing, setRefreshing] = useState(false);

  const events = useCalendarEvents(month, year);
  const overlays = useCalendarOverlays(month, year);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([events.refetch(), overlays.refetch()]);
    setRefreshing(false);
  }, [events, overlays]);

  const goToday = () => {
    const t = new Date();
    setMonth(t.getMonth());
    setYear(t.getFullYear());
    setSelectedDay(t.getDate());
  };

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDay(null);
  };

  const dotMap = useMemo(() => {
    const map = new Map<number, string[]>();
    const allEvents = events.data ?? [];
    const allOverlays = overlays.data ?? [];

    for (const e of allEvents) {
      const d = new Date(e.start.replace(" ", "T"));
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        const arr = map.get(day) ?? [];
        arr.push(e.color || colors.primary);
        map.set(day, arr);
      }
    }

    for (const o of allOverlays) {
      const d = new Date(o.date.slice(0, 10) + "T00:00:00");
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        const arr = map.get(day) ?? [];
        arr.push(o.color);
        map.set(day, arr);
      }
    }

    return map;
  }, [events.data, overlays.data, month, year]);

  const selectedDayItems = useMemo(() => {
    if (selectedDay === null) return [];
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;

    const items: MergedItem[] = [];
    for (const e of events.data ?? []) {
      if (parseDateKey(e.start) === key) {
        const startTime = e.start.includes(" ")
          ? e.start.split(" ")[1]?.slice(0, 5)
          : undefined;
        const endTime =
          e.end && e.end.includes(" ")
            ? e.end.split(" ")[1]?.slice(0, 5)
            : undefined;
        items.push({
          id: `event-${e.eventid}`,
          title: e.title,
          time:
            startTime && endTime
              ? `${startTime} – ${endTime}`
              : startTime ?? undefined,
          color: e.color || colors.primary,
          type: "event",
          route: `/(tabs)/calendar/${e.eventid}`,
        });
      }
    }
    for (const o of overlays.data ?? []) {
      if (o.date.slice(0, 10) === key) {
        items.push({
          id: String(o.id),
          title: o.title,
          color: o.color,
          type: o.type,
          route: o.route,
        });
      }
    }
    return items;
  }, [selectedDay, events.data, overlays.data, month, year]);

  const isLoading = events.isLoading || overlays.isLoading;

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={prevMonth} hitSlop={8}>
            <Ionicons
              name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
              size={22}
              color="#475569"
            />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-foreground min-w-[150px] text-center">
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={8}>
            <Ionicons
              name={I18nManager.isRTL ? "chevron-back" : "chevron-forward"}
              size={22}
              color="#475569"
            />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={goToday}
            className="px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: colors.primaryBg }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: colors.primary }}
            >
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              setViewMode(viewMode === "month" ? "agenda" : "month")
            }
            hitSlop={8}
          >
            <Ionicons
              name={viewMode === "month" ? "list-outline" : "grid-outline"}
              size={22}
              color="#475569"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginTop: 24 }}
          />
        )}

        {viewMode === "month" ? (
          <View className="px-3 pt-2">
            <MonthGrid
              month={month}
              year={year}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              dotMap={dotMap}
            />

            {/* Selected day items */}
            <View className="mt-4">
              {selectedDay !== null && (
                <Text className="text-sm font-bold text-foreground mb-2 px-1">
                  {formatDateLabel(
                    `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`,
                  )}
                </Text>
              )}
              {selectedDayItems.length === 0 ? (
                <View className="items-center py-6">
                  <Text className="text-xs text-muted">
                    {selectedDay !== null
                      ? "No events on this day"
                      : "Select a day"}
                  </Text>
                </View>
              ) : (
                selectedDayItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (item.route) router.push(item.route as any);
                    }}
                    activeOpacity={0.7}
                    className="flex-row items-center bg-white rounded-xl px-3 py-3 mb-1.5"
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: item.color,
                    }}
                  >
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium text-foreground"
                        numberOfLines={1}
                        style={rtlTextStyle(item.title)}
                      >
                        {item.title}
                      </Text>
                      <View className="flex-row items-center mt-1 gap-2">
                        {item.time && (
                          <Text className="text-xs text-muted">
                            {item.time}
                          </Text>
                        )}
                        <View
                          className="px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${item.color}1A` }}
                        >
                          <Text
                            className="text-[10px] font-semibold capitalize"
                            style={{ color: item.color }}
                          >
                            {item.type}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        ) : (
          <View className="px-4 pt-3">
            <AgendaView
              events={events.data ?? []}
              overlays={overlays.data ?? []}
            />
          </View>
        )}
      </ScrollView>

      {/* FAB — create new event */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/calendar/new" as any)}
        activeOpacity={0.8}
        className="absolute bottom-20 right-5 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{ backgroundColor: colors.primary, elevation: 8 }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
