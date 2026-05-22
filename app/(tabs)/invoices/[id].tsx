import { useLocalSearchParams } from "expo-router";
import { CrudDetailScreen } from "@/components/crud/CrudDetailScreen";

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CrudDetailScreen moduleKey="invoices" id={id} basePath="/(tabs)/invoices" />;
}
