import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { DetailScreenLayout, DetailField, StatusBadge } from "@/components/DetailScreen";

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lead = trpc.leads.getById.useQuery({ id: Number(id) }, { retry: false });
  const data = lead.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.name || "Lead Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={lead.isLoading}
        isError={lead.isError}
        onRefresh={async () => { await lead.refetch(); }}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">
            {data?.name || "Unnamed Lead"}
          </Text>
          {data?.status && <StatusBadge status={data.status} />}
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Company" value={data?.company} />
          <DetailField label="Email" value={data?.email} />
          <DetailField label="Phone" value={data?.phone} />
          <DetailField label="Source" value={data?.source} />
          <DetailField label="Value" value={data?.value} />
          <DetailField label="Assigned To" value={data?.assigned_to_name} />
          <DetailField label="Created" value={data?.created_at ? new Date(data.created_at).toLocaleDateString() : null} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
