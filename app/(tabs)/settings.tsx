import { View, Text, TouchableOpacity, ScrollView, Alert, Switch } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth, useCurrentUser } from "@/lib/auth-context";
import { BASE_URL } from "@/lib/config";
import { BUILD_VERSION, BUILD_TIME, BUILD_SHA } from "@/lib/build-info";
import { checkForUpdate, downloadAndInstall } from "@/lib/updates";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  promptBiometric,
} from "@/lib/biometric";
import { CheckinCard } from "@/components/CheckinCard";

export default function SettingsScreen() {
  const { logout } = useAuth();
  const currentUser = useCurrentUser();
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    (async () => {
      const [available, enabled] = await Promise.all([
        isBiometricAvailable(),
        isBiometricEnabled(),
      ]);
      setBioAvailable(available);
      setBioOn(enabled);
      setBioReady(true);
    })();
  }, []);

  const toggleBiometric = useCallback(
    async (next: boolean) => {
      if (!bioAvailable) return;
      if (next) {
        // Confirm with a one-shot biometric prompt before enabling, so the user
        // can't accidentally turn it on without their print enrolled.
        const ok = await promptBiometric("Confirm to enable fingerprint login");
        if (!ok) return;
      }
      await setBiometricEnabled(next);
      setBioOn(next);
    },
    [bioAvailable]
  );

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const info = await checkForUpdate({ ignoreDismissed: true });
      if (!info) {
        Alert.alert("No update found", "This device is already on the latest available build.");
        return;
      }

      const sizeMb = info.sizeBytes
        ? (info.sizeBytes / (1024 * 1024)).toFixed(0)
        : "?";

      Alert.alert(
        "Update available",
        `A new build is ready (${sizeMb} MB). Install it now?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Install",
            onPress: async () => {
              try {
                Alert.alert(
                  "Downloading update",
                  "The Android installer will open when the APK finishes downloading."
                );
                await downloadAndInstall(info);
              } catch (err: any) {
                Alert.alert("Update failed", err?.message || "Could not download the update.");
              }
            },
          },
        ]
      );
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-surface">
      {/* Daily-use check-in widget — primary CTA at the top */}
      <CheckinCard />

      <View className="mx-4 mt-4">
        <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">Security</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center flex-1">
              <Ionicons name="finger-print" size={22} color="#0284C7" />
              <View className="ml-3 flex-1">
                <Text className="text-foreground font-medium">Fingerprint login</Text>
                {!bioReady ? (
                  <Text className="text-muted text-xs mt-1">Checking…</Text>
                ) : !bioAvailable ? (
                  <Text className="text-muted text-xs mt-1">
                    Not available on this device
                  </Text>
                ) : (
                  <Text className="text-muted text-xs mt-1">
                    Use your fingerprint to unlock the app
                  </Text>
                )}
              </View>
            </View>
            <Switch
              value={bioOn}
              onValueChange={toggleBiometric}
              disabled={!bioReady || !bioAvailable}
            />
          </View>
        </View>

        <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">Account</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          {currentUser ? (
            <View className="px-4 py-4 border-b border-gray-100">
              <Text className="text-foreground font-medium">
                {currentUser.firstname} {currentUser.lastname}
              </Text>
              <Text className="text-muted text-sm mt-1">{currentUser.email}</Text>
              <Text className="text-muted text-xs mt-0.5">Staff #{currentUser.staffid}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/leave" as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={22} color="#0284C7" />
            <Text className="text-foreground font-medium ml-3">My Leave</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/activity" as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={22} color="#0284C7" />
            <Text className="text-foreground font-medium ml-3">My Activity</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center px-4 py-4"
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            <Text className="text-red-500 font-medium ml-3">Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">About</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          <View className="px-4 py-4 border-b border-gray-100">
            <Text className="text-foreground font-medium">Version</Text>
            <Text className="text-muted text-sm mt-1">{BUILD_VERSION}</Text>
            {BUILD_TIME !== "dev" ? (
              <Text className="text-muted text-xs mt-0.5">Built {BUILD_TIME}</Text>
            ) : null}
            {BUILD_SHA !== "dev" ? (
              <Text className="text-muted text-xs mt-0.5">Build {BUILD_SHA}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-download-outline" size={22} color="#0284C7" />
            <Text className="text-foreground font-medium ml-3">
              {checkingUpdate ? "Checking..." : "Check for updates"}
            </Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
          <View className="px-4 py-4">
            <Text className="text-foreground font-medium">API Server</Text>
            <Text className="text-muted text-sm mt-1">{BASE_URL}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
