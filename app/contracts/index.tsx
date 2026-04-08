import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { ListScreen } from "@/components/ListScreen";

export default function ContractsScreen() {
  const contracts = useApi(api.getContracts);
  const items = Array.isArray(contracts.data) ? contracts.data : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Contracts" }} />
      <ListScreen
        title="Contracts"
        data={items}
        isLoading={contracts.isLoading}
        emptyIcon="document-outline"
        emptyText="No contracts found"
        onRefresh={contracts.refetch}
        onItemPress={() => {}}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={(item: any) => (
          <View>
            <Text className="text-foreground font-semibold">{item.subject}</Text>
            <Text className="text-muted text-sm mt-1">{item.client_name || item.company}</Text>
            {item.dateend && (
              <Text className="text-xs text-muted mt-1">
                Expires: {new Date(item.dateend).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}
      />
    </>
  );
}
