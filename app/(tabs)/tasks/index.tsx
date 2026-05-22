import { CrudListScreen } from "@/components/crud/CrudListScreen";

export default function TasksScreen() {
  return <CrudListScreen moduleKey="tasks" basePath="/(tabs)/tasks" />;
}
