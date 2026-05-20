import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { UpdateBanner } from "@/components/UpdateBanner";

/**
 * Bottom bar: Home / Customers / Settings only.
 *
 * Tasks / Projects / Leads / Invoices are still reachable from dashboard tiles
 * (deep-link into the (tabs)/<module>/index.tsx route), but their tabs are
 * hidden from the bar via href:null because those modules are not yet native
 * to web parity — they show a "Coming in Phase 2 — use web for full CRUD"
 * banner above the existing list. Once each module reaches full parity
 * (Customer is first), its tab flips back on.
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
          tabBarLabelStyle: { fontSize: 11 },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="customers"
          options={{
            title: "Customers",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={size} color={color} />
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

        {/* Reachable via dashboard tile / router.push, hidden from bottom bar */}
        <Tabs.Screen name="tasks"    options={{ href: null }} />
        <Tabs.Screen name="projects" options={{ href: null }} />
        <Tabs.Screen name="leads"    options={{ href: null }} />
        <Tabs.Screen name="invoices" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}
