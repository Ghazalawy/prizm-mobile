import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { ListScreen } from "@/components/ListScreen";

export default function ExpensesScreen() {
  const expenses = useApi(api.getExpenses);
  const items = Array.isArray(expenses.data) ? expenses.data : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Expenses" }} />
      <ListScreen
        title="Expenses"
        data={items}
        isLoading={expenses.isLoading}
        emptyIcon="wallet-outline"
        emptyText="No expenses found"
        onRefresh={expenses.refetch}
        onItemPress={() => {}}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={(item: any) => (
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-foreground font-semibold">{item.category_name || item.expense_name}</Text>
              <Text className="text-muted text-sm mt-1">
                {item.date ? new Date(item.date).toLocaleDateString() : ""}
              </Text>
            </View>
            <Text className="text-foreground font-bold">
              {item.currency_name || "AED"} {Number(item.amount || 0).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </>
  );
}
