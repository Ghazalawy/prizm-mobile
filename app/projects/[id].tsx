import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { DetailScreenLayout, DetailField, StatusBadge } from "@/components/DetailScreen";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = trpc.projects.getById.useQuery({ id: Number(id) }, { retry: false });
  const data = project.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.name || "Project Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={project.isLoading}
        isError={project.isError}
        onRefresh={async () => { await project.refetch(); }}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">{data?.name}</Text>
          {data?.status && <StatusBadge status={data.status} />}
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Client" value={data?.client_name} />
          <DetailField label="Progress" value={data?.progress != null ? `${data.progress}%` : null} />
          <DetailField label="Start Date" value={data?.start_date ? new Date(data.start_date).toLocaleDateString() : null} />
          <DetailField label="End Date" value={data?.end_date ? new Date(data.end_date).toLocaleDateString() : null} />
          <DetailField label="Budget" value={data?.budget} />
          <DetailField label="Description" value={data?.description} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
