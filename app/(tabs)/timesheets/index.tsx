import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { TimesheetDashboard } from "@/components/timesheets/TimesheetDashboard";
import { colors } from "@/lib/theme";

export default function TimesheetsScreen() {
  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "Timesheets",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() =>
                router.push("/(tabs)/timesheets/weekly" as any)
              }
              className="px-2"
            >
              <Ionicons
                name="calendar-outline"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <TimesheetDashboard />
    </View>
  );
}
