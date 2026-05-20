import { useLocalSearchParams } from "expo-router";
import { CrudDetailScreen } from "@/components/crud/CrudDetailScreen";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CrudDetailScreen moduleKey="customers" id={id} basePath="/(tabs)/customers" />;
}
