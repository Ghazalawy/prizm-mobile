import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { QuickExpenseScreen } from "@/components/expenses/QuickExpenseScreen";
import { colors } from "@/lib/theme";

export default function QuickExpenseRoute() {
  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "Quick Expense",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <QuickExpenseScreen />
    </View>
  );
}
