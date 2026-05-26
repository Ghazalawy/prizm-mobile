import { useLocalSearchParams } from "expo-router";
import { EstimateDetailScreen } from "@/components/finance/EstimateDetailScreen";

export default function EstimateDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EstimateDetailScreen id={id} />;
}
