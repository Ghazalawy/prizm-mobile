import { View, Text } from "react-native";
import { router, Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { ListScreen } from "@/components/ListScreen";

export default function ClientsScreen() {
  const clients = trpc.clients.list.useQuery({}, { retry: false });
  const items = (clients.data as any[]) ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Clients" }} />
      <ListScreen
        title="Clients"
        data={items}
        isLoading={clients.isLoading}
        emptyIcon="business-outline"
        emptyText="No clients found"
        onRefresh={async () => { await clients.refetch(); }}
        onItemPress={(item: any) => router.push(`/clients/${item.id}`)}
        keyExtractor={(item: any) => String(item.id)}
        searchable
        searchFilter={(item: any, q) =>
          (item.name || item.company || "").toLowerCase().includes(q.toLowerCase())
        }
        renderItem={(item: any) => (
          <View>
            <Text className="text-foreground font-semibold">{item.name || item.company}</Text>
            {item.email && <Text className="text-muted text-sm mt-1">{item.email}</Text>}
          </View>
        )}
      />
    </>
  );
}
