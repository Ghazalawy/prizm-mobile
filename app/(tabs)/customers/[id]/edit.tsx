import { useLocalSearchParams } from "expo-router";
import { CrudFormScreen } from "@/components/crud/CrudFormScreen";

export default function CustomerEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CrudFormScreen moduleKey="customers" id={id} basePath="/(tabs)/customers" />;
}
