import { useLocalSearchParams } from "expo-router";
import { CrudListScreen } from "@/components/crud/CrudListScreen";
import { OpportunityListScreen } from "@/components/opportunities/OpportunityListScreen";

export default function ModuleListRoute() {
  const { module } = useLocalSearchParams<{ module: string }>();
  if (module === "opportunities") {
    return <OpportunityListScreen basePath="/(tabs)/erp/opportunities" />;
  }
  return <CrudListScreen moduleKey={module} />;
}
