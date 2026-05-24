import { useLocalSearchParams } from "expo-router";
import { TaskDetailScreen } from "@/components/tasks/TaskDetailScreen";

/**
 * Task detail route.
 *
 * Tasks get a bespoke layout (TaskDetailScreen) instead of the generic
 * CrudDetailScreen used by other modules — see TaskDetailScreen.tsx for
 * the rationale. Every other module's [id].tsx still routes through the
 * generic screen.
 */
export default function TaskDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <TaskDetailScreen id={id} />;
}
