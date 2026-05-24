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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { setBiometricEnabled, markBiometricAsked } from "@/lib/biometric";

export default function LoginScreen() {
  const { isAuthenticated, isLoading, login, biometricPending, retryBiometric } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  const handleBiometric = async () => {
    if (biometricBusy) return;
    setBiometricBusy(true);
    try {
      const ok = await retryBiometric();
      if (ok) {
        // Effect above will redirect once isAuthenticated flips. Don't push
        // here — that'd race with the effect and could route twice.
      } else {
        Alert.alert(
          "Fingerprint cancelled",
          "Try again, or sign in with your password.",
        );
      }
    } finally {
      setBiometricBusy(false);
    }
  };

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
      return;
    }

    // One-time offer to enable fingerprint login on supported devices.
    // auth-context only sets this flag on the FIRST successful login.
    if (result.shouldOfferBiometric) {
      await markBiometricAsked();
      Alert.alert(
        "Enable fingerprint login?",
        "Use your fingerprint to sign in next time instead of typing your password.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Enable",
            onPress: async () => {
              await setBiometricEnabled(true);
            },
          },
        ]
      );
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

        {/* Biometric retry — only shown when there's still a stored token
            and the user just cancelled the boot-time prompt. Lets them
            re-trigger the fingerprint scanner without having to retype
            their password. */}
        {biometricPending ? (
          <View className="w-full mt-4 items-center">
            <View className="flex-row items-center w-full mb-3">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="text-muted text-xs mx-3">OR</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>
            <TouchableOpacity
              onPress={handleBiometric}
              disabled={biometricBusy}
              className="flex-row items-center px-4 py-3 rounded-xl border border-gray-200"
              activeOpacity={0.7}
            >
              {biometricBusy ? (
                <ActivityIndicator color="#0284C7" />
              ) : (
                <>
                  <Ionicons name="finger-print" size={22} color="#0284C7" />
                  <Text className="text-primary font-medium ml-2">
                    Use fingerprint
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
