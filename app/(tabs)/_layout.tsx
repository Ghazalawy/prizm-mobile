import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { View, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ActionCenter } from "@/components/ActionCenter";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { DevBanner } from "@/components/DevBanner";
import { usePinnedTabs } from "@/lib/pinned-tabs";
import { getPinnableModule } from "@/lib/pinnable-modules";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useCallback, useMemo } from "react";

const CORE_TABS = ["index", "reports", "erp", "settings"] as const;
const CORE_TAB_META: Record<string, { title: string; icon: string }> = {
  index:    { title: "Home",     icon: "grid-outline" },
  reports:  { title: "Reports",  icon: "document-text-outline" },
  erp:      { title: "ERP",      icon: "apps-outline" },
  settings: { title: "Settings", icon: "settings-outline" },
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const pinnedKeys = usePinnedTabs();
  const insets = useSafeAreaInsets();

  const tabs = useMemo(() => {
    const result: Array<{
      routeName: string;
      routeKey: string;
      title: string;
      icon: string;
      isPicker?: boolean;
    }> = [];

    for (const tab of CORE_TABS) {
      if (tab === "settings") {
        // Insert pinned modules before Settings
        for (const pk of pinnedKeys) {
          const mod = getPinnableModule(pk);
          if (!mod) continue;
          const routeIdx = state.routes.findIndex((r) => r.name === mod.tabName);
          if (routeIdx < 0) continue;
          result.push({
            routeName: mod.tabName,
            routeKey: state.routes[routeIdx]?.key ?? mod.tabName,
            title: mod.title,
            icon: mod.icon,
          });
        }
        // "+" button
        const pickerIdx = state.routes.findIndex((r) => r.name === "tab-picker");
        if (pickerIdx >= 0) {
          result.push({
            routeName: "tab-picker",
            routeKey: state.routes[pickerIdx]?.key ?? "tab-picker",
            title: "More",
            icon: "add-circle-outline",
            isPicker: true,
          });
        }
      }

      const routeIdx = state.routes.findIndex((r) => r.name === tab);
      if (routeIdx < 0) continue;
      const meta = CORE_TAB_META[tab];
      result.push({
        routeName: tab,
        routeKey: state.routes[routeIdx]?.key ?? tab,
        title: meta.title,
        icon: meta.icon,
      });
    }
    return result;
  }, [pinnedKeys, state.routes]);

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
        paddingBottom: insets.bottom,
      }}
    >
      {tabs.map((tab) => {
        const routeIndex = state.routes.findIndex((r) => r.name === tab.routeName);
        const isFocused = state.index === routeIndex;
        const color = isFocused ? "#E65100" : "#64748B";

        return (
          <TouchableOpacity
            key={tab.routeKey}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: tab.routeKey,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(tab.routeName);
              }
            }}
            onLongPress={() => {
              navigation.emit({ type: "tabLongPress", target: tab.routeKey });
            }}
            activeOpacity={0.7}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 6,
            }}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={tab.title}
          >
            <Ionicons name={tab.icon as any} size={22} color={color} />
            <Text
              style={{
                fontSize: 10,
                color,
                marginTop: 2,
                fontWeight: isFocused ? "600" : "400",
              }}
              numberOfLines={1}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const pinnedKeys = usePinnedTabs();

  const renderTabBar = useCallback(
    (props: BottomTabBarProps) => <CustomTabBar {...props} />,
    [],
  );

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
      <ActionCenter />
      <ImpersonationBanner />
      <DevBanner />
      <Tabs
        tabBar={renderTabBar}
        screenOptions={{ headerShown: false }}
      >
        {/* Core tabs — always in the bar */}
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="reports" options={{ title: "Reports" }} />
        <Tabs.Screen name="erp" options={{ title: "ERP" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />

        {/* Tab picker — shown as "+" in the bar */}
        <Tabs.Screen name="tab-picker" options={{ title: "More" }} />

        {/* Hidden screens — only reachable via navigation */}
        <Tabs.Screen name="tasks" options={{ href: null }} />
        <Tabs.Screen name="customers" options={{ href: null }} />
        <Tabs.Screen name="dashboard-customize" options={{ href: null }} />
        <Tabs.Screen name="approvals" options={{ href: null }} />
        <Tabs.Screen name="projects" options={{ href: null }} />
        <Tabs.Screen name="leads" options={{ href: null }} />
        <Tabs.Screen name="invoices" options={{ href: null }} />
        <Tabs.Screen name="activity" options={{ href: null }} />
        <Tabs.Screen name="leave" options={{ href: null }} />
        <Tabs.Screen name="leave-new" options={{ href: null }} />
        <Tabs.Screen name="payslips" options={{ href: null }} />
        <Tabs.Screen name="payslip-detail" options={{ href: null }} />
        <Tabs.Screen name="expenses-mine" options={{ href: null }} />
        <Tabs.Screen name="quick-expense" options={{ href: null }} />
        <Tabs.Screen name="timesheets" options={{ href: null }} />
        <Tabs.Screen name="view-as" options={{ href: null }} />
        <Tabs.Screen name="changelog" options={{ href: null }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="knowledge" options={{ href: null }} />
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="estimates" options={{ href: null }} />
        <Tabs.Screen name="proposals" options={{ href: null }} />
        <Tabs.Screen name="tickets" options={{ href: null }} />
        <Tabs.Screen name="contracts" options={{ href: null }} />
        <Tabs.Screen name="tenders" options={{ href: null }} />
        <Tabs.Screen name="opportunities" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}
