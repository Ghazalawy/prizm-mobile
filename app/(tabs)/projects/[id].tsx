import { useLocalSearchParams } from "expo-router";
import { CrudDetailScreen } from "@/components/crud/CrudDetailScreen";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CrudDetailScreen moduleKey="projects" id={id} basePath="/(tabs)/projects" />;
}
