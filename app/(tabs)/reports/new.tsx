import { useLocalSearchParams } from "expo-router";
import { ReportCreateScreen } from "@/components/reports/ReportCreateScreen";

export default function NewReport() {
  const { project_id } = useLocalSearchParams<{ project_id?: string }>();
  return <ReportCreateScreen preselectedProjectId={project_id ? Number(project_id) : undefined} />;
}
