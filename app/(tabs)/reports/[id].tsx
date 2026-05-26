import { useLocalSearchParams } from "expo-router";
import { ReportDetailScreen } from "@/components/reports/ReportDetailScreen";

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReportDetailScreen id={Number(id)} />;
}
