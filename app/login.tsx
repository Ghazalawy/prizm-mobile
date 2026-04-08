import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (!result.success) {
      Alert.alert("Login Failed", result.message || "Invalid credentials");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-primary-50 rounded-2xl items-center justify-center mb-4">
            <Text className="text-primary text-3xl font-bold">P</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground">Prizm CRM</Text>
          <Text className="text-muted mt-2 text-center">
            Sign in to manage your business
          </Text>
        </View>

        <View className="w-full mb-4">
          <Text className="text-sm font-medium text-foreground mb-1 ml-1">Email</Text>
          <TextInput
            placeholder="you@prizm-energy.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-foreground"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View className="w-full mb-6">
          <Text className="text-sm font-medium text-foreground mb-1 ml-1">Password</Text>
          <TextInput
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="w-full bg-surface border border-gray-200 rounded-xl px-4 py-3 text-foreground"
            placeholderTextColor="#94A3B8"
            onSubmitEditing={handleLogin}
          />
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={submitting || isLoading}
          className={`w-full py-4 rounded-xl items-center ${
            submitting ? "bg-primary/70" : "bg-primary"
          }`}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
