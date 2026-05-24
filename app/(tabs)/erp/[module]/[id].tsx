import { useLocalSearchParams } from "expo-router";
import { CrudDetailScreen } from "@/components/crud/CrudDetailScreen";
import { TaskDetailScreen } from "@/components/tasks/TaskDetailScreen";

/**
 * Generic CRUD-module detail route — covers every entity in the ERP tab
 * (customers, leads, projects, invoices, …). Tasks get a bespoke layout
 * via TaskDetailScreen; everything else uses the generic field-list view.
 *
 * Without the tasks short-circuit here, any task drill-in that comes
 * through the related-tab navigator (customer → tasks, project → tasks,
 * notification deeplink, etc.) lands on the old field-per-row layout
 * regardless of what /(tabs)/tasks/[id].tsx renders.
 */
export default function ModuleDetailRoute() {
  const { module, id } = useLocalSearchParams<{ module: string; id: string }>();
  if (module === "tasks") {
    return <TaskDetailScreen id={id} />;
  }
  return <CrudDetailScreen moduleKey={module} id={id} />;
}
