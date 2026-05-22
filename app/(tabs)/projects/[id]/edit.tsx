import { useLocalSearchParams } from "expo-router";
import { CrudFormScreen } from "@/components/crud/CrudFormScreen";

export default function ProjectEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CrudFormScreen moduleKey="projects" id={id} basePath="/(tabs)/projects" />;
}
