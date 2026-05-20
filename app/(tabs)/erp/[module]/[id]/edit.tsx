import { useLocalSearchParams } from "expo-router";
import { CrudFormScreen } from "@/components/crud/CrudFormScreen";

export default function ModuleEditRoute() {
  const { module, id } = useLocalSearchParams<{ module: string; id: string }>();
  return <CrudFormScreen moduleKey={module} id={id} />;
}
