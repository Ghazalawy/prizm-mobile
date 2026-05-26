import { useLocalSearchParams } from "expo-router";
import { InvoiceDetailScreen } from "@/components/finance/InvoiceDetailScreen";

export default function InvoiceDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InvoiceDetailScreen id={id} />;
}
