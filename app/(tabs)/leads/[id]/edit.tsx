import { useLocalSearchParams } from "expo-router";
import { CrudFormScreen } from "@/components/crud/CrudFormScreen";

export default function LeadEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CrudFormScreen moduleKey="leads" id={id} basePath="/(tabs)/leads" />;
}
