import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useCallback } from "react";
import { useApi } from "@/lib/use-api";
import * as api from "@/lib/api";
import { DetailScreenLayout, DetailField, StatusBadge } from "@/components/DetailScreen";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetcher = useCallback(() => api.getProject(Number(id)), [id]);
  const project = useApi(fetcher);
  const data = project.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.name || "Project Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={project.isLoading}
        isError={project.isError}
        onRefresh={project.refetch}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">{data?.name}</Text>
          {data?.status_name && <StatusBadge status={data.status_name} />}
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Client" value={data?.client_data?.company} />
          <DetailField label="Progress" value={data?.progress != null ? `${data.progress}%` : null} />
          <DetailField label="Start Date" value={data?.start_date ? new Date(data.start_date).toLocaleDateString() : null} />
          <DetailField label="Deadline" value={data?.deadline ? new Date(data.deadline).toLocaleDateString() : null} />
          <DetailField label="Billing Type" value={data?.billing_type_name} />
          <DetailField label="Description" value={data?.description} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
