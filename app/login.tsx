import { View, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { router } from "expo-router";
import { useEffect } from "react";

export default function LoginScreen() {
  const { isAuthenticated, isLoading, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="items-center mb-12">
        <View className="w-20 h-20 bg-primary-50 rounded-2xl items-center justify-center mb-4">
          <Text className="text-primary text-3xl font-bold">P</Text>
        </View>
        <Text className="text-3xl font-bold text-foreground">Prizm CRM</Text>
        <Text className="text-muted mt-2 text-center">
          Manage your leads, clients, and projects on the go
        </Text>
      </View>

      <TouchableOpacity
        onPress={login}
        disabled={isLoading}
        className="w-full bg-primary py-4 rounded-xl items-center"
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-lg">Sign In</Text>
        )}
      </TouchableOpacity>

      <Text className="text-xs text-muted mt-6 text-center">
        Sign in with your Prizm Energy account
      </Text>
    </View>
  );
}
