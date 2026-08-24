import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import {
  markBiometricAsked,
  saveBiometricCredentials,
  setBiometricEnabled,
} from "@/lib/biometric";
import { useEnvironment } from "@/lib/environment";
import { safePostAuthRoute } from "@/lib/post-auth-route";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const {
    isAuthenticated,
    isLoading,
    login,
    biometricPending,
    retryBiometric,
    refreshBiometricState,
  } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const env = useEnvironment();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(safePostAuthRoute(returnTo) as any);
    }
  }, [isAuthenticated, returnTo]);

  // Whether a fingerprint can sign this device in is stored in SecureStore, so
  // read it every time the screen is shown. Relying on the flag some other code
  // path happened to set is what left the button missing after a surprise
  // sign-out — reaching /login is itself the reason to ask the question.
  useFocusEffect(
    useCallback(() => {
      void refreshBiometricState();
    }, [refreshBiometricState]),
  );

  const handleBiometric = async () => {
    if (biometricBusy) return;
    setBiometricBusy(true);
    try {
      const result = await retryBiometric();
      if (result.ok) return;
      // Say which of the failures happened. "Try again" is useless advice when
      // the stored credential is gone and no retry can ever succeed.
      if (result.reason === "unusable") {
        Alert.alert(
          "Set fingerprint up again",
          "This device's saved fingerprint credential is no longer valid — that " +
            "happens after a fingerprint or screen-lock change. Sign in with your " +
            "password once and we'll offer to re-enable it.",
        );
      } else if (result.reason === "rejected") {
        Alert.alert(
          "Password changed",
          "Your saved password no longer works. Sign in with your current " +
            "password and we'll offer to re-enable fingerprint sign-in.",
        );
      } else if (result.reason === "offline") {
        Alert.alert(
          "No connection",
          "Your fingerprint was accepted but the server could not be reached. " +
            "Check your connection and try again.",
        );
      } else if (result.reason === "unavailable") {
        Alert.alert(
          "Fingerprint unavailable",
          "No fingerprint is enrolled on this device, or fingerprint login is " +
            "switched off in Settings.",
        );
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

    if (result.shouldOfferBiometric) {
      const isReenroll = result.biometricOfferReason === "reenroll";
      await markBiometricAsked();
      Alert.alert(
        isReenroll ? "Set fingerprint up again?" : "Enable fingerprint login?",
        isReenroll
          ? "Fingerprint login is on for this device but its saved credential is " +
              "missing, so we couldn't offer it on the sign-in screen. Restore it now?"
          : "Use your fingerprint to sign in next time instead of typing your password.",
        [
          {
            text: "Not now",
            style: "cancel",
            // Declining a restore means "stop asking". Leaving the opt-in on
            // would re-raise this alert on every single sign-in.
            onPress: isReenroll
              ? () => {
                  void setBiometricEnabled(false);
                }
              : undefined,
          },
          {
            text: isReenroll ? "Restore" : "Enable",
            onPress: async () => {
              try {
                await saveBiometricCredentials(email.trim(), password);
                await refreshBiometricState();
              } catch {
                Alert.alert(
                  "Fingerprint not enabled",
                  "The protected credential could not be saved. You can try again from Settings.",
                );
              }
            },
          },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      style={{ backgroundColor: colors.white }}
    >
      <View className="flex-1 items-center justify-center px-6">
        {/* Brand identity */}
        <View className="items-center mb-10">
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              backgroundColor: colors.primaryBg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.primary + "20",
            }}
          >
            <Image
              source={require("@/assets/images/prizm_logo.png")}
              style={{ width: 56, height: 56 }}
              resizeMode="contain"
            />
          </View>
          <Text style={{ fontSize: 26, fontWeight: "800", color: colors.black, letterSpacing: 0.5 }}>
            PRIZM ENERGY
          </Text>
          <Text style={{ color: colors.slate500, marginTop: 6, textAlign: "center", fontSize: 14 }}>
            Sign in to manage your business
          </Text>
        </View>

        {/* Dev environment indicator */}
        {env.key === "development" ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FEF3C7",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#FCD34D",
            }}
          >
            <Ionicons name="flask-outline" size={14} color="#B45309" />
            <Text style={{ fontSize: 12, color: "#92400E", fontWeight: "600", marginLeft: 6 }}>
              Development Environment (MS_dev)
            </Text>
          </View>
        ) : null}

        {/* Email field */}
        <View className="w-full mb-4">
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.slate700, marginBottom: 6, marginLeft: 2 }}>
            Email
          </Text>
          <TextInput
            placeholder="you@prizm-energy.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              width: "100%",
              backgroundColor: colors.slate50,
              borderWidth: 1,
              borderColor: colors.slate200,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 15,
              color: colors.black,
            }}
            placeholderTextColor={colors.slate400}
          />
        </View>

        {/* Password field */}
        <View className="w-full mb-6">
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.slate700, marginBottom: 6, marginLeft: 2 }}>
            Password
          </Text>
          <TextInput
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{
              width: "100%",
              backgroundColor: colors.slate50,
              borderWidth: 1,
              borderColor: colors.slate200,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 15,
              color: colors.black,
            }}
            placeholderTextColor={colors.slate400}
            onSubmitEditing={handleLogin}
          />
        </View>

        {/* Sign In button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={submitting || isLoading}
          style={{
            width: "100%",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: submitting ? colors.primaryLight : colors.primary,
          }}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={{ color: colors.white, fontWeight: "700", fontSize: 16 }}>
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        {/* Biometric retry */}
        {biometricPending ? (
          <View className="w-full mt-4 items-center">
            <View className="flex-row items-center w-full mb-3">
              <View className="flex-1 h-px" style={{ backgroundColor: colors.slate200 }} />
              <Text style={{ color: colors.slate400, fontSize: 11, marginHorizontal: 12 }}>OR</Text>
              <View className="flex-1 h-px" style={{ backgroundColor: colors.slate200 }} />
            </View>
            <TouchableOpacity
              onPress={handleBiometric}
              disabled={biometricBusy}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.primary + "40",
                backgroundColor: colors.primaryBg,
              }}
              activeOpacity={0.7}
            >
              {biometricBusy ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="finger-print" size={22} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "600", marginLeft: 8 }}>
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
