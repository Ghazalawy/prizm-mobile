import { View, Text } from "react-native";
import { router, Stack } from "expo-router";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { ListScreen } from "@/components/ListScreen";

export default function TicketsScreen() {
  const tickets = useApi(api.getTickets);
  const items = Array.isArray(tickets.data) ? tickets.data : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Tickets" }} />
      <ListScreen
        title="Tickets"
        data={items}
        isLoading={tickets.isLoading}
        emptyIcon="ticket-outline"
        emptyText="No tickets found"
        onRefresh={tickets.refetch}
        onItemPress={(item: any) => router.push(`/tickets/${item.ticketid || item.id}`)}
        keyExtractor={(item: any) => String(item.ticketid || item.id)}
        renderItem={(item: any) => (
          <View>
            <Text className="text-foreground font-semibold">{item.subject}</Text>
            {item.department_name && (
              <Text className="text-muted text-sm mt-1">{item.department_name}</Text>
            )}
            <View className="flex-row items-center mt-2">
              {item.priority_name && (
                <View className={`px-2 py-0.5 rounded-full mr-2 ${
                  item.priority == 1 ? "bg-red-100" : "bg-gray-100"
                }`}>
                  <Text className={`text-xs font-medium ${
                    item.priority == 1 ? "text-red-700" : "text-gray-600"
                  }`}>{item.priority_name}</Text>
                </View>
              )}
              {item.status_name && (
                <View className="px-2 py-0.5 rounded-full bg-blue-100">
                  <Text className="text-xs text-blue-700 font-medium">{item.status_name}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />
    </>
  );
}
