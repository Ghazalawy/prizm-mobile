import { useLocalSearchParams } from "expo-router";
import { CrudFormScreen } from "@/components/crud/CrudFormScreen";

export default function EditOpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <CrudFormScreen
      moduleKey="opportunities"
      id={typeof id === "string" ? id : undefined}
      basePath="/(tabs)/opportunities"
    />
  );
}
