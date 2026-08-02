import { router, useLocalSearchParams } from "expo-router";
import { CrudListScreen } from "@/components/crud/CrudListScreen";
import { OpportunityListScreen } from "@/components/opportunities/OpportunityListScreen";
import { usePermissions } from "@/lib/permission-context";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

export default function ModuleListRoute() {
  const { module } = useLocalSearchParams<{ module: string }>();
  const permissions = usePermissions();
  if (module === "opportunities") {
    return <OpportunityListScreen basePath="/(tabs)/erp/opportunities" />;
  }
  return (
    <CrudListScreen
      moduleKey={module}
      headerAction={module === "tenders" && permissions.isAdmin ? (
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/tenders/triage" as any)}
          className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center"
          accessibilityLabel="Open Tender Triage"
        >
          <Ionicons name="git-network-outline" size={21} color="#0F5CC0" />
        </TouchableOpacity>
      ) : null}
    />
  );
}
