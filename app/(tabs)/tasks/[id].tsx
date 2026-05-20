import { useLocalSearchParams } from "expo-router";
import { EntityDetail } from "@/components/EntityDetail";
import { getTask } from "@/lib/api";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Number(id);
  return (
    <EntityDetail
      title="Task"
      queryKey={["tasks", "detail", taskId]}
      fetcher={() => getTask(taskId)}
      titleKey="name"
      subtitleKey="description"
    />
  );
}
