import { useLocalSearchParams } from "expo-router";
import { CrudFormScreen } from "@/components/crud/CrudFormScreen";

export default function TaskEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CrudFormScreen moduleKey="tasks" id={id} basePath="/(tabs)/tasks" />;
}
