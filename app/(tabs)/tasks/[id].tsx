import { useLocalSearchParams } from "expo-router";
import { CrudDetailScreen } from "@/components/crud/CrudDetailScreen";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CrudDetailScreen moduleKey="tasks" id={id} basePath="/(tabs)/tasks" />;
}
