import { View, Text } from "react-native";
import { router, Stack } from "expo-router";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { ListScreen } from "@/components/ListScreen";

export default function LeadsScreen() {
  const leads = useApi(api.getLeads);
  const items = Array.isArray(leads.data) ? leads.data : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Leads" }} />
      <ListScreen
        title="Leads"
        data={items}
        isLoading={leads.isLoading}
        emptyIcon="people-outline"
        emptyText="No leads found"
        onRefresh={leads.refetch}
        onItemPress={(item: any) => router.push(`/leads/${item.id}`)}
        keyExtractor={(item: any) => String(item.id)}
        searchable
        searchFilter={(item: any, q) =>
          (item.name || item.company || "").toLowerCase().includes(q.toLowerCase())
        }
        renderItem={(item: any) => (
          <View>
            <Text className="text-foreground font-semibold">{item.name || "Unnamed Lead"}</Text>
            {item.company && <Text className="text-muted text-sm mt-1">{item.company}</Text>}
            {item.status_name && (
              <View className="mt-2 self-start px-2 py-1 rounded-full bg-blue-100">
                <Text className="text-xs text-blue-700 font-medium">{item.status_name}</Text>
              </View>
            )}
          </View>
        )}
      />
    </>
  );
}
