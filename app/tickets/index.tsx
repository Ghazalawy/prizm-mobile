import { View, Text } from "react-native";
import { router, Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { ListScreen } from "@/components/ListScreen";

export default function TicketsScreen() {
  const tickets = trpc.tickets.list.useQuery({}, { retry: false });
  const items = (tickets.data as any[]) ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Tickets" }} />
      <ListScreen
        title="Tickets"
        data={items}
        isLoading={tickets.isLoading}
        emptyIcon="ticket-outline"
        emptyText="No tickets found"
        onRefresh={async () => { await tickets.refetch(); }}
        onItemPress={(item: any) => router.push(`/tickets/${item.id}`)}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={(item: any) => (
          <View>
            <Text className="text-foreground font-semibold">{item.subject || item.title}</Text>
            {item.client_name && (
              <Text className="text-muted text-sm mt-1">{item.client_name}</Text>
            )}
            <View className="flex-row items-center mt-2">
              {item.priority && (
                <View className={`px-2 py-0.5 rounded-full mr-2 ${
                  item.priority === "high" || item.priority === "urgent" ? "bg-red-100" : "bg-gray-100"
                }`}>
                  <Text className={`text-xs font-medium ${
                    item.priority === "high" || item.priority === "urgent" ? "text-red-700" : "text-gray-600"
                  }`}>{item.priority}</Text>
                </View>
              )}
              {item.status && (
                <View className="px-2 py-0.5 rounded-full bg-blue-100">
                  <Text className="text-xs text-blue-700 font-medium">{item.status}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />
    </>
  );
}
