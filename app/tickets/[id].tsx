import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { DetailScreenLayout, DetailField, StatusBadge } from "@/components/DetailScreen";

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticket = trpc.tickets.getById.useQuery({ id: Number(id) }, { retry: false });
  const data = ticket.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.subject || "Ticket Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={ticket.isLoading}
        isError={ticket.isError}
        onRefresh={async () => { await ticket.refetch(); }}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">{data?.subject || data?.title}</Text>
          {data?.status && <StatusBadge status={data.status} />}
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Priority" value={data?.priority} />
          <DetailField label="Client" value={data?.client_name} />
          <DetailField label="Assigned To" value={data?.assigned_to_name} />
          <DetailField label="Description" value={data?.description} />
          <DetailField label="Created" value={data?.created_at ? new Date(data.created_at).toLocaleDateString() : null} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
