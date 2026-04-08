import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { ListScreen } from "@/components/ListScreen";

export default function ExpensesScreen() {
  const expenses = trpc.expenses.list.useQuery({}, { retry: false });
  const items = (expenses.data as any[]) ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Expenses" }} />
      <ListScreen
        title="Expenses"
        data={items}
        isLoading={expenses.isLoading}
        emptyIcon="wallet-outline"
        emptyText="No expenses found"
        onRefresh={async () => { await expenses.refetch(); }}
        onItemPress={() => {}}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={(item: any) => (
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-foreground font-semibold">{item.title || item.category}</Text>
              <Text className="text-muted text-sm mt-1">
                {item.date ? new Date(item.date).toLocaleDateString() : ""}
              </Text>
            </View>
            <Text className="text-foreground font-bold">
              {item.currency || "AED"} {item.amount?.toLocaleString()}
            </Text>
          </View>
        )}
      />
    </>
  );
}
