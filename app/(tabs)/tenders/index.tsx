import { CrudListScreen } from "@/components/crud/CrudListScreen";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TouchableOpacity } from "react-native";
import { usePermissions } from "@/lib/permission-context";

export default function TendersScreen() {
  const permissions = usePermissions();
  return (
    <CrudListScreen
      moduleKey="tenders"
      headerAction={permissions.isAdmin ? (
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
