import { View, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { TimesheetDashboard } from "@/components/timesheets/TimesheetDashboard";
import { colors } from "@/lib/theme";

export default function TimesheetsScreen() {
  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Inline header — avoids double-header gap from nested Stack */}
      <View className="bg-white border-b border-slate-100 px-4 pt-4 pb-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="mr-3">
              <Ionicons name="chevron-back" size={28} color={colors.primary} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-foreground">Timesheets</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/timesheets/weekly" as any)}
              hitSlop={8}
              className="w-10 h-10 rounded-xl items-center justify-center bg-slate-100"
            >
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/timesheets/new" as any)}
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TimesheetDashboard />
    </View>
  );
}
