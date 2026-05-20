import { useLocalSearchParams } from "expo-router";
import { CrudDetailScreen } from "@/components/crud/CrudDetailScreen";

export default function ModuleDetailRoute() {
  const { module, id } = useLocalSearchParams<{ module: string; id: string }>();
  return <CrudDetailScreen moduleKey={module} id={id} />;
}
