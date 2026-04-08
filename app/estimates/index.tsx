import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { ListScreen } from "@/components/ListScreen";

export default function EstimatesScreen() {
  const estimates = useApi(api.getEstimates);
  const items = Array.isArray(estimates.data) ? estimates.data : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Estimates" }} />
      <ListScreen
        title="Estimates"
        data={items}
        isLoading={estimates.isLoading}
        emptyIcon="calculator-outline"
        emptyText="No estimates found"
        onRefresh={estimates.refetch}
        onItemPress={() => {}}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={(item: any) => (
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-foreground font-semibold">{item.number || item.id}</Text>
              <Text className="text-muted text-sm mt-1">{item.client_name || item.company}</Text>
            </View>
            <Text className="text-foreground font-bold">
              {item.currency_name || "AED"} {Number(item.total || 0).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </>
  );
}
