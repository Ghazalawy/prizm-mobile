import { View, Text } from "react-native";
import { router, Stack } from "expo-router";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { ListScreen } from "@/components/ListScreen";

export default function ClientsScreen() {
  const clients = useApi(api.getClients);
  const items = Array.isArray(clients.data) ? clients.data : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Clients" }} />
      <ListScreen
        title="Clients"
        data={items}
        isLoading={clients.isLoading}
        emptyIcon="business-outline"
        emptyText="No clients found"
        onRefresh={clients.refetch}
        onItemPress={(item: any) => router.push(`/clients/${item.id || item.userid}`)}
        keyExtractor={(item: any) => String(item.id || item.userid)}
        searchable
        searchFilter={(item: any, q) =>
          (item.company || "").toLowerCase().includes(q.toLowerCase())
        }
        renderItem={(item: any) => (
          <View>
            <Text className="text-foreground font-semibold">{item.company}</Text>
            {item.phonenumber && <Text className="text-muted text-sm mt-1">{item.phonenumber}</Text>}
          </View>
        )}
      />
    </>
  );
}
