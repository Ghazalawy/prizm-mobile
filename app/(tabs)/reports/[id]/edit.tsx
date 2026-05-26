import { useLocalSearchParams } from "expo-router";
import { ReportEditScreen } from "@/components/reports/ReportEditScreen";

export default function EditReport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReportEditScreen id={Number(id)} />;
}
