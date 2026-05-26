import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDevBannerVisible, dismissDevBanner } from "@/lib/environment";

/**
 * Persistent amber banner shown at the top of every authenticated screen
 * when the app is connected to the development database (MS_dev).
 *
 * Dismissible per session (tapping ✕ hides it until the next app launch
 * or environment switch). Rendered in app/(tabs)/_layout.tsx alongside
 * the ImpersonationBanner.
 *
 * When the environment is production, returns null — zero footprint.
 */
export function DevBanner() {
  const visible = useDevBannerVisible();
  if (!visible) return null;

  return (
    <View
      style={{
        backgroundColor: "#FEF3C7",
        borderBottomWidth: 1,
        borderBottomColor: "#FCD34D",
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Ionicons name="flask-outline" size={14} color="#B45309" />
      <Text
        style={{
          flex: 1,
          marginLeft: 8,
          fontSize: 12,
          color: "#92400E",
          fontWeight: "700",
          letterSpacing: 0.3,
        }}
      >
        DEV ENVIRONMENT — MS_dev
      </Text>
      <TouchableOpacity
        onPress={dismissDevBanner}
        activeOpacity={0.7}
        hitSlop={8}
        style={{
          paddingHorizontal: 6,
          paddingVertical: 4,
          borderRadius: 999,
        }}
      >
        <Ionicons name="close" size={14} color="#B45309" />
      </TouchableOpacity>
    </View>
  );
}
