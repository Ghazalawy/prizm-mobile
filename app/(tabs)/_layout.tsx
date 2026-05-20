import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { UpdateBanner } from "@/components/UpdateBanner";

/**
 * Bottom tab bar. During the phased native rebuild, only modules whose native
 * screens are FINISHED appear here. Each phase commit re-adds its Tabs.Screen
 * entry alongside the new screen file. No stub tabs visible.
 *
 * Current visible tabs: Dashboard, Settings.
 * Phase 1a will add Tasks; Phase 1b will add Projects; etc.
 */
export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      <UpdateBanner />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#0284C7",
          tabBarInactiveTintColor: "#64748B",
          tabBarStyle: {
            backgroundColor: "#FFFFFF",
            borderTopColor: "#E2E8F0",
          },
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTitleStyle: { color: "#0F172A", fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
