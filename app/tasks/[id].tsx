import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useCallback } from "react";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { DetailScreenLayout, DetailField, StatusBadge } from "@/components/DetailScreen";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetcher = useCallback(() => api.getTask(Number(id)), [id]);
  const task = useApi(fetcher);
  const data = task.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.name || "Task Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={task.isLoading}
        isError={task.isError}
        onRefresh={task.refetch}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">{data?.name}</Text>
          {data?.status_name && <StatusBadge status={data.status_name} />}
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Project" value={data?.project_name} />
          <DetailField label="Priority" value={data?.priority_name} />
          <DetailField label="Start Date" value={data?.startdate ? new Date(data.startdate).toLocaleDateString() : null} />
          <DetailField label="Due Date" value={data?.duedate ? new Date(data.duedate).toLocaleDateString() : null} />
          <DetailField label="Description" value={data?.description} />
          <DetailField label="Created" value={data?.dateadded ? new Date(data.dateadded).toLocaleDateString() : null} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
