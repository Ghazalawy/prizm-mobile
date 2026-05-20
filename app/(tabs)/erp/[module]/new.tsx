import { useLocalSearchParams } from "expo-router";
import { CrudFormScreen } from "@/components/crud/CrudFormScreen";

export default function ModuleNewRoute() {
  const { module } = useLocalSearchParams<{ module: string }>();
  return <CrudFormScreen moduleKey={module} basePath={`/(tabs)/erp/${module}`} />;
}
