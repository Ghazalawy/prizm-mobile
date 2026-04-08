import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useCallback } from "react";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { DetailScreenLayout, DetailField } from "@/components/DetailScreen";

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetcher = useCallback(() => api.getClient(Number(id)), [id]);
  const client = useApi(fetcher);
  const data = client.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.company || "Client Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={client.isLoading}
        isError={client.isError}
        onRefresh={client.refetch}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground">{data?.company}</Text>
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Phone" value={data?.phonenumber} />
          <DetailField label="Website" value={data?.website} />
          <DetailField label="Address" value={data?.address} />
          <DetailField label="City" value={data?.city} />
          <DetailField label="Country" value={data?.country_name} />
          <DetailField label="VAT Number" value={data?.vat} />
          <DetailField label="Created" value={data?.datecreated ? new Date(data.datecreated).toLocaleDateString() : null} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
