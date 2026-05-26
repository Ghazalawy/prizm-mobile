import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { WeeklyView } from "@/components/timesheets/WeeklyView";
import { colors } from "@/lib/theme";

export default function WeeklyTimesheetScreen() {
  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "Weekly Timesheet",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <WeeklyView />
    </View>
  );
}
