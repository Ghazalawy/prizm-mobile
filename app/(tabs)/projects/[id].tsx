import { useLocalSearchParams } from "expo-router";
import { ProjectDetailScreen } from "@/components/projects/ProjectDetailScreen";

/**
 * Project detail route — uses the enhanced bespoke layout with progress bar,
 * team, key metrics, and tabbed content (Overview | Tasks | Milestones | Files | Expenses).
 */
export default function ProjectDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <ProjectDetailScreen id={id} />;
}
