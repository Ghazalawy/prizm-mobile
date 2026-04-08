import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useCallback } from "react";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { DetailScreenLayout, DetailField, StatusBadge } from "@/components/DetailScreen";

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetcher = useCallback(() => api.getInvoice(Number(id)), [id]);
  const invoice = useApi(fetcher);
  const data = invoice.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.number || "Invoice Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={invoice.isLoading}
        isError={invoice.isError}
        onRefresh={invoice.refetch}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">{data?.number || `INV-${id}`}</Text>
          {data?.status_text && <StatusBadge status={data.status_text} />}
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Client" value={data?.client_name || data?.company} />
          <DetailField label="Total" value={data?.total ? `${data.currency_name || "AED"} ${Number(data.total).toLocaleString()}` : null} />
          <DetailField label="Due Date" value={data?.duedate ? new Date(data.duedate).toLocaleDateString() : null} />
          <DetailField label="Date" value={data?.date ? new Date(data.date).toLocaleDateString() : null} />
          <DetailField label="Notes" value={data?.adminnote} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
