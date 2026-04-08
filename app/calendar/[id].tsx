import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { DetailScreenLayout, DetailField } from "@/components/DetailScreen";

export default function CalendarEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = trpc.calendar.getById.useQuery({ id: Number(id) }, { retry: false });
  const data = event.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.title || "Event Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={event.isLoading}
        isError={event.isError}
        onRefresh={async () => { await event.refetch(); }}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground">{data?.title}</Text>
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Date" value={data?.date ? new Date(data.date).toLocaleDateString() : null} />
          <DetailField label="Time" value={data?.start_time ? `${data.start_time} - ${data.end_time}` : null} />
          <DetailField label="Location" value={data?.location} />
          <DetailField label="Description" value={data?.description} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
