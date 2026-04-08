import { View, Text } from "react-native";
import { router, Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { ListScreen } from "@/components/ListScreen";

export default function InvoicesScreen() {
  const invoices = trpc.invoices.list.useQuery({}, { retry: false });
  const items = (invoices.data as any[]) ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Invoices" }} />
      <ListScreen
        title="Invoices"
        data={items}
        isLoading={invoices.isLoading}
        emptyIcon="document-text-outline"
        emptyText="No invoices found"
        onRefresh={async () => { await invoices.refetch(); }}
        onItemPress={(item: any) => router.push(`/invoices/${item.id}`)}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={(item: any) => (
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-foreground font-semibold">{item.number || `INV-${item.id}`}</Text>
              <Text className="text-muted text-sm mt-1">{item.client_name}</Text>
            </View>
            <View className="items-end">
              <Text className="text-foreground font-bold">
                {item.currency || "AED"} {item.total?.toLocaleString()}
              </Text>
              {item.status && (
                <View className={`mt-1 px-2 py-0.5 rounded-full ${
                  item.status === "paid" ? "bg-green-100" : item.status === "overdue" ? "bg-red-100" : "bg-yellow-100"
                }`}>
                  <Text className={`text-xs font-medium ${
                    item.status === "paid" ? "text-green-700" : item.status === "overdue" ? "text-red-700" : "text-yellow-700"
                  }`}>{item.status}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />
    </>
  );
}
