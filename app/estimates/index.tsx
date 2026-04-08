import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { ListScreen } from "@/components/ListScreen";

export default function EstimatesScreen() {
  const estimates = trpc.estimates.list.useQuery({}, { retry: false });
  const items = (estimates.data as any[]) ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Estimates" }} />
      <ListScreen
        title="Estimates"
        data={items}
        isLoading={estimates.isLoading}
        emptyIcon="calculator-outline"
        emptyText="No estimates found"
        onRefresh={async () => { await estimates.refetch(); }}
        onItemPress={() => {}}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={(item: any) => (
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-foreground font-semibold">{item.number || item.title}</Text>
              <Text className="text-muted text-sm mt-1">{item.client_name}</Text>
            </View>
            <Text className="text-foreground font-bold">
              {item.currency || "AED"} {item.total?.toLocaleString()}
            </Text>
          </View>
        )}
      />
    </>
  );
}
