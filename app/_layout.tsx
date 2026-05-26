import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider, useAuth } from "@/lib/auth-context";
import { PermissionProvider } from "@/lib/permission-context";
import { queryClient, wireAppStateFocus } from "@/lib/query-client";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { initEnvironment } from "@/lib/environment";
import { applyEnvironment } from "@/lib/config";

SplashScreen.preventAutoHideAsync();

function AppWithPermissions({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return (
    <PermissionProvider isAuthenticated={isAuthenticated}>
      {children}
    </PermissionProvider>
  );
}

export default function RootLayout() {
  const [envReady, setEnvReady] = useState(false);

  useEffect(() => {
    initEnvironment()
      .then(() => {
        applyEnvironment();
        setEnvReady(true);
      })
      .finally(() => SplashScreen.hideAsync());
    const unsubscribe = wireAppStateFocus();
    return unsubscribe;
  }, []);

  if (!envReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppWithPermissions>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "#F8FAFC" },
                }}
              >
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
              <UpdatePrompt />
              <WhatsNewModal />
              <StatusBar style="auto" />
              <Toast />
            </AppWithPermissions>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
