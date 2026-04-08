import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useCallback } from "react";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { DetailScreenLayout, DetailField, StatusBadge } from "@/components/DetailScreen";

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetcher = useCallback(() => api.getLead(Number(id)), [id]);
  const lead = useApi(fetcher);
  const data = lead.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.name || "Lead Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={lead.isLoading}
        isError={lead.isError}
        onRefresh={lead.refetch}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">
            {data?.name || "Unnamed Lead"}
          </Text>
          {data?.status_name && <StatusBadge status={data.status_name} />}
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Company" value={data?.company} />
          <DetailField label="Email" value={data?.email} />
          <DetailField label="Phone" value={data?.phonenumber} />
          <DetailField label="Source" value={data?.source_name} />
          <DetailField label="Value" value={data?.lead_value} />
          <DetailField label="Assigned To" value={data?.assigned_name} />
          <DetailField label="Created" value={data?.dateadded ? new Date(data.dateadded).toLocaleDateString() : null} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
