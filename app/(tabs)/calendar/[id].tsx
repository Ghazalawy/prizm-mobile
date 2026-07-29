import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { rtlTextStyle } from "@/lib/rtl";
import { useCalendarEvent } from "@/lib/queries/calendar";

export default function EventDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventQuery = useCalendarEvent(id);
  const event = eventQuery.data;

  if (eventQuery.isLoading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text className="text-sm text-muted mt-3">Event not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-4 py-2 rounded-lg bg-slate-100"
        >
          <Text className="text-sm font-medium text-foreground">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPublic = Number(event.public) === 1;

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>
        <Text className="text-sm font-medium text-muted flex-1 text-center mx-4" numberOfLines={1}>
          Event
        </Text>
        {event._actions?.edit !== false ? (
          <TouchableOpacity
            onPress={() =>
              router.push(`/(tabs)/calendar/edit?id=${event.eventid}` as any)
            }
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : <View className="w-6" />}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-10"
      >
        {/* Color bar */}
        <View
          className="h-2 rounded-full mb-4"
          style={{ backgroundColor: event.color || colors.primary }}
        />

        {/* Title */}
        <Text
          className="text-2xl font-bold text-foreground mb-3"
          style={rtlTextStyle(event.title)}
        >
          {event.title}
        </Text>

        {/* Meta */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <DetailRow
            icon="time-outline"
            label="Start"
            value={formatDateTime(event.start)}
          />
          {event.end && (
            <DetailRow
              icon="time-outline"
              label="End"
              value={formatDateTime(event.end)}
            />
          )}
          <DetailRow
            icon="notifications-outline"
            label="Reminder"
            value={`${event.reminder_before} ${event.reminder_before_type} before`}
          />
          <DetailRow
            icon={isPublic ? "globe-outline" : "lock-closed-outline"}
            label="Visibility"
            value={isPublic ? "Public" : "Private"}
          />
        </View>

        {/* Description */}
        {event.description ? (
          <View className="bg-white rounded-2xl p-4">
            <Text className="text-xs font-semibold text-muted uppercase mb-2">
              Description
            </Text>
            <Text
              className="text-sm text-foreground leading-relaxed"
              style={rtlTextStyle(event.description)}
            >
              {event.description}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center py-2.5 border-b border-slate-100 last:border-b-0">
      <Ionicons name={icon} size={18} color="#64748B" />
      <Text className="text-xs text-muted ml-3 w-20">{label}</Text>
      <Text className="text-sm text-foreground flex-1">{value}</Text>
    </View>
  );
}

function formatDateTime(str: string): string {
  const d = new Date(str.replace(" ", "T"));
  if (isNaN(d.getTime())) return str;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
