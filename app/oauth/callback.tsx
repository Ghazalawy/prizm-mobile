import { View, Text, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { setSessionCookie } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{ session?: string }>();
  const { refreshAuth } = useAuth();

  useEffect(() => {
    async function handleCallback() {
      if (params.session) {
        await setSessionCookie(params.session);
        await refreshAuth();
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    }
    handleCallback();
  }, [params.session]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#0284C7" />
      <Text className="text-muted mt-4">Completing authentication...</Text>
    </View>
  );
}
