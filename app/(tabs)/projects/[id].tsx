import { useLocalSearchParams } from "expo-router";
import { EntityDetail } from "@/components/EntityDetail";
import { getProject } from "@/lib/api";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = Number(id);
  return (
    <EntityDetail
      title="Project"
      queryKey={["projects", "detail", projectId]}
      fetcher={() => getProject(projectId)}
      titleKey="name"
      subtitleKey="description"
    />
  );
}
