import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { DetailScreenLayout, DetailField, StatusBadge } from "@/components/DetailScreen";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = trpc.tasks.getById.useQuery({ id: Number(id) }, { retry: false });
  const data = task.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.title || "Task Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={task.isLoading}
        isError={task.isError}
        onRefresh={async () => { await task.refetch(); }}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">{data?.title || data?.name}</Text>
          {data?.status && <StatusBadge status={data.status} />}
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Project" value={data?.project_name} />
          <DetailField label="Priority" value={data?.priority} />
          <DetailField label="Assigned To" value={data?.assigned_to_name} />
          <DetailField label="Due Date" value={data?.due_date ? new Date(data.due_date).toLocaleDateString() : null} />
          <DetailField label="Description" value={data?.description} />
          <DetailField label="Created" value={data?.created_at ? new Date(data.created_at).toLocaleDateString() : null} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
