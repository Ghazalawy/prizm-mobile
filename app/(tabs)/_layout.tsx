import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ActionCenter } from "@/components/ActionCenter";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { DevBanner } from "@/components/DevBanner";

/**
 * Bottom bar: Home / Tasks / ERP / Settings.
 *
 * - Home: dashboard summary tiles (counts)
 * - Tasks: my open tasks — primary daily-use surface
 * - ERP: hub tab listing all 49 registered modules (Customers + everything else lives here)
 * - Settings: profile + biometric + about
 *
 * Other modules (Projects / Leads / Invoices / Customers) are reachable from
 * dashboard tiles + the ERP hub but hidden from the bottom bar via href:null.
 * They use the same CrudListScreen/CrudDetailScreen via the module-registry —
 * no separate per-module code path.
 *
 * The update banner is rendered globally by <UpdatePrompt /> in the root
 * _layout.tsx, so it covers Login + Tabs + every screen.
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
      {/* Persistent Action Center strip on every authenticated screen.
          Categories: Approvals / To Do / Mentions / Notifications / Compliance. Tap a chip
          opens a bottom sheet with the items in that category, each with
          inline quick actions (approve/reject/mark done). Data via
          GET /api/inbox (Inbox_api) — degrades to "All caught up" while
          the endpoint is being deployed. */}
      <ActionCenter />
      {/* Amber banner that appears at the top of every authenticated
          screen while an admin is in a View-As session. Null when not
          impersonating, so zero footprint for the common case. */}
      <ImpersonationBanner />
      <DevBanner />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#E65100",
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
          name="reports"
          options={{
            title: "Reports",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="erp"
          options={{
            title: "ERP",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="apps-outline" size={size} color={color} />
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

        {/* Reachable via ERP hub / router.push, hidden from bottom bar */}
        <Tabs.Screen name="tasks" options={{ href: null }} />
        <Tabs.Screen name="customers" options={{ href: null }} />
        <Tabs.Screen name="dashboard-customize" options={{ href: null }} />
        <Tabs.Screen name="approvals" options={{ href: null }} />
        <Tabs.Screen name="projects" options={{ href: null }} />
        <Tabs.Screen name="leads"    options={{ href: null }} />
        <Tabs.Screen name="invoices" options={{ href: null }} />
        <Tabs.Screen name="activity"        options={{ href: null }} />
        <Tabs.Screen name="leave"           options={{ href: null }} />
        <Tabs.Screen name="leave-new"       options={{ href: null }} />
        <Tabs.Screen name="payslips"        options={{ href: null }} />
        <Tabs.Screen name="payslip-detail"  options={{ href: null }} />
        <Tabs.Screen name="expenses-mine"   options={{ href: null }} />
        <Tabs.Screen name="quick-expense"   options={{ href: null }} />
        <Tabs.Screen name="timesheets"      options={{ href: null }} />
        <Tabs.Screen name="view-as"         options={{ href: null }} />
        <Tabs.Screen name="changelog"       options={{ href: null }} />
        <Tabs.Screen name="calendar"        options={{ href: null }} />
        <Tabs.Screen name="knowledge"       options={{ href: null }} />
        <Tabs.Screen name="search"          options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}
