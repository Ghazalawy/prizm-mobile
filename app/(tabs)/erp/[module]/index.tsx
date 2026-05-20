import { useLocalSearchParams } from "expo-router";
import { CrudListScreen } from "@/components/crud/CrudListScreen";

export default function ModuleListRoute() {
  const { module } = useLocalSearchParams<{ module: string }>();
  return <CrudListScreen moduleKey={module} />;
}
