import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { EventForm } from "@/components/calendar/EventForm";
import { useCalendarEvent } from "@/lib/queries/calendar";
import { colors } from "@/lib/theme";

export default function EditEventRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventQuery = useCalendarEvent(id);

  if (eventQuery.isLoading) {
    return <View className="flex-1 items-center justify-center bg-surface"><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!eventQuery.data || eventQuery.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-8">
        <Ionicons name="alert-circle-outline" size={44} color="#DC2626" />
        <Text className="text-foreground font-semibold mt-3">Couldn’t load this event</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-slate-100 rounded-xl px-5 py-2.5">
          <Text className="text-foreground">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (eventQuery.data._actions?.edit === false) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-8">
        <Ionicons name="lock-closed-outline" size={44} color="#64748B" />
        <Text className="text-foreground font-semibold mt-3 text-center">You can view this event, but you can’t edit it.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-slate-100 rounded-xl px-5 py-2.5">
          <Text className="text-foreground">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <EventForm mode="edit" event={eventQuery.data} />;
}
