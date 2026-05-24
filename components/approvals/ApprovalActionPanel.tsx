import { View, Text, TouchableOpacity, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "@/lib/config";

/**
 * Bottom action panel for an approval screen.
 *
 * v1 ships READ-ONLY: the actual approve/reject mutation requires the
 * web-side multi-stage advancement logic (which is too intertwined to
 * reimplement in one batch). For now we surface a clear "Approve in web"
 * fallback link plus a one-line note so users know native action is
 * coming. When the mutation endpoints land, swap this for two real
 * buttons + a note modal.
 */
export function ApprovalActionPanel({
  isCurrentApprover,
  webFallbackPath,
}: {
  isCurrentApprover: boolean;
  /** Perfex web URL fragment for the "Open in web" link, relative to /MS/admin/. */
  webFallbackPath: string;
}) {
  const openInWeb = async () => {
    const url = `${BASE_URL}/MS/admin/${webFallbackPath.replace(/^\/+/, "")}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open web", "Browser couldn't open the link.");
    }
  };

  if (!isCurrentApprover) {
    return (
      <View className="bg-white rounded-2xl px-4 py-3 mb-3 shadow-sm flex-row items-center">
        <Ionicons name="eye-outline" size={18} color="#64748B" />
        <Text className="text-sm text-muted ml-2 flex-1">
          You're not the current approver — view only.
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-2xl px-4 py-4 mb-3 shadow-sm">
      <Text className="text-xs uppercase tracking-wide text-muted mb-2">
        Your action
      </Text>
      <Text className="text-sm text-foreground leading-relaxed mb-3">
        Native approve / reject is coming in the next update. For now, open
        this request in the web app to act on it.
      </Text>
      <TouchableOpacity
        onPress={openInWeb}
        activeOpacity={0.85}
        className="flex-row items-center justify-center bg-primary rounded-xl py-3"
      >
        <Ionicons name="open-outline" size={18} color="#FFFFFF" />
        <Text className="text-white font-semibold ml-2">Approve in web</Text>
      </TouchableOpacity>
    </View>
  );
}
