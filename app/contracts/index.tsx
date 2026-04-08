import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { ListScreen } from "@/components/ListScreen";

export default function ContractsScreen() {
  const contracts = trpc.contracts.list.useQuery({}, { retry: false });
  const items = (contracts.data as any[]) ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Contracts" }} />
      <ListScreen
        title="Contracts"
        data={items}
        isLoading={contracts.isLoading}
        emptyIcon="document-outline"
        emptyText="No contracts found"
        onRefresh={async () => { await contracts.refetch(); }}
        onItemPress={() => {}}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={(item: any) => (
          <View>
            <Text className="text-foreground font-semibold">{item.title || item.name}</Text>
            <Text className="text-muted text-sm mt-1">{item.client_name}</Text>
            {item.end_date && (
              <Text className="text-xs text-muted mt-1">
                Expires: {new Date(item.end_date).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}
      />
    </>
  );
}
