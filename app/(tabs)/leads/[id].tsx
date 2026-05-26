import { useLocalSearchParams } from "expo-router";
import { LeadDetailScreen } from "@/components/leads/LeadDetailScreen";

export default function LeadDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LeadDetailScreen id={id!} />;
}
