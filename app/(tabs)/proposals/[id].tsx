import { useLocalSearchParams } from "expo-router";
import { ProposalDetailScreen } from "@/components/finance/ProposalDetailScreen";

export default function ProposalDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProposalDetailScreen id={id} />;
}
