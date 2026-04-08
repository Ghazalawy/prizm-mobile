import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { DetailScreenLayout, DetailField } from "@/components/DetailScreen";

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = trpc.clients.getById.useQuery({ id: Number(id) }, { retry: false });
  const data = client.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.name || "Client Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={client.isLoading}
        isError={client.isError}
        onRefresh={async () => { await client.refetch(); }}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground">{data?.name || data?.company}</Text>
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Company" value={data?.company} />
          <DetailField label="Email" value={data?.email} />
          <DetailField label="Phone" value={data?.phone} />
          <DetailField label="Address" value={data?.address} />
          <DetailField label="Group" value={data?.group_name} />
          <DetailField label="Created" value={data?.created_at ? new Date(data.created_at).toLocaleDateString() : null} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
