import { View, Text } from "react-native";
import { router, Stack } from "expo-router";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { ListScreen } from "@/components/ListScreen";

export default function InvoicesScreen() {
  const invoices = useApi(api.getInvoices);
  const items = Array.isArray(invoices.data) ? invoices.data : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Invoices" }} />
      <ListScreen
        title="Invoices"
        data={items}
        isLoading={invoices.isLoading}
        emptyIcon="document-text-outline"
        emptyText="No invoices found"
        onRefresh={invoices.refetch}
        onItemPress={(item: any) => router.push(`/invoices/${item.id}`)}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={(item: any) => (
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-foreground font-semibold">{item.number || `INV-${item.id}`}</Text>
              <Text className="text-muted text-sm mt-1">{item.client_name || item.company}</Text>
            </View>
            <View className="items-end">
              <Text className="text-foreground font-bold">
                {item.currency_name || "AED"} {Number(item.total || 0).toLocaleString()}
              </Text>
              {item.status_text && (
                <View className={`mt-1 px-2 py-0.5 rounded-full ${
                  item.status == 2 ? "bg-green-100" : item.status == 6 ? "bg-red-100" : "bg-yellow-100"
                }`}>
                  <Text className={`text-xs font-medium ${
                    item.status == 2 ? "text-green-700" : item.status == 6 ? "text-red-700" : "text-yellow-700"
                  }`}>{item.status_text}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />
    </>
  );
}
