import { useLocalSearchParams } from "expo-router";
import { CrudFormScreen } from "@/components/crud/CrudFormScreen";

export default function InvoiceEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CrudFormScreen moduleKey="invoices" id={id} basePath="/(tabs)/invoices" />;
}
