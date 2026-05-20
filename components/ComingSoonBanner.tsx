import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Banner shown above the list on modules that aren't yet rebuilt to full
 * native parity (list-only view, no detail tabs, no CRUD). Sets the right
 * expectation so staff use the web for those operations.
 */
export function ComingSoonBanner({ moduleName }: { moduleName: string }) {
  return (
    <View className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex-row items-center">
      <Ionicons name="construct-outline" size={18} color="#B45309" />
      <View className="flex-1 ml-3">
        <Text className="text-amber-900 font-medium text-sm">
          {moduleName} — read-only preview
        </Text>
        <Text className="text-amber-800 text-xs mt-0.5">
          Full {moduleName.toLowerCase()} module with create / edit / delete and
          all tabs is being built natively. For full CRUD, use{" "}
          <Text className="font-semibold">ms.prizm-energy.com</Text> for now.
        </Text>
      </View>
    </View>
  );
}
