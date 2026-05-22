import { CrudFormScreen } from "@/components/crud/CrudFormScreen";

export default function TaskNewScreen() {
  return <CrudFormScreen moduleKey="tasks" basePath="/(tabs)/tasks" />;
}
