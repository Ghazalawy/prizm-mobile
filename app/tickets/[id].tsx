import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useCallback } from "react";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { DetailScreenLayout, DetailField, StatusBadge } from "@/components/DetailScreen";

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetcher = useCallback(() => api.getTicket(Number(id)), [id]);
  const ticket = useApi(fetcher);
  const data = ticket.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.subject || "Ticket Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={ticket.isLoading}
        isError={ticket.isError}
        onRefresh={ticket.refetch}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">{data?.subject}</Text>
          {data?.status_name && <StatusBadge status={data.status_name} />}
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Priority" value={data?.priority_name} />
          <DetailField label="Department" value={data?.department_name} />
          <DetailField label="Service" value={data?.service_name} />
          <DetailField label="Message" value={data?.message} />
          <DetailField label="Created" value={data?.date ? new Date(data.date).toLocaleDateString() : null} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
