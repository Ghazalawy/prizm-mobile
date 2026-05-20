import { useLocalSearchParams } from "expo-router";
import { EntityDetail } from "@/components/EntityDetail";
import { getLead } from "@/lib/api";

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  return (
    <EntityDetail
      title="Lead"
      queryKey={["leads", "detail", leadId]}
      fetcher={() => getLead(leadId)}
      titleKey="name"
      subtitleKey="company"
    />
  );
}
