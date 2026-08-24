import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Switch, Image, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { staffAvatarUrl } from "@/lib/config";
import { applyEnvironment } from "@/lib/config";
import { BUILD_VERSION, BUILD_TIME } from "@/lib/build-info";
import {
  useEnvironment,
  setEnvironment,
  ENVIRONMENTS,
  resetDevBannerDismiss,
  type EnvironmentKey,
} from "@/lib/environment";
import { colors } from "@/lib/theme";
import * as IntentLauncher from "expo-intent-launcher";

/** Convert the ISO build timestamp from CI into something human-friendly:
 *  "May 25, 2026" rather than "2026-05-24T22:56:24Z". Defensive — if
 *  the value isn't a valid ISO string, return it as-is. */
function formatBuildTime(iso: string): string {
  if (!iso || iso === "dev") return iso;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

import { checkForUpdate, downloadAndInstall } from "@/lib/updates";
import {
  resolveBiometricGate,
  setBiometricEnabled,
} from "@/lib/biometric";
import { CheckinCard } from "@/components/CheckinCard";
import { useMyProfile } from "@/lib/queries/my";
import { useEffectiveUser } from "@/lib/effective-user";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL } from "@/lib/config";
import { buildAuthHeaders, parseApiResponse } from "@/lib/api";
import { getSessionGeneration } from "@/lib/auth-events";
import { clearSession } from "@/lib/auth";

/**
 * Big profile hero pinned at the top of Settings. Mirrors the web admin's
 * Profile page header: large round avatar, name, email, role + department,
 * and "Joined Prizm Energy on …" pulled from tblstaff.datecreated.
 *
 * Renders instantly from the SecureStore-cached user (firstname/email),
 * then progressively enriches with role / dept / datecreated from
 * /api/my/profile once that hook resolves.
 */
function ProfileHero() {
  const user = useEffectiveUser();
  const profile = useMyProfile();
  const [avatarBroken, setAvatarBroken] = useState(false);

  const firstname = user?.firstname || profile.data?.firstname || "";
  const lastname  = user?.lastname  || profile.data?.lastname  || "";
  const email     = user?.email     || profile.data?.email     || "";
  const staffid   = user?.staffid   ?? profile.data?.staffid   ?? null;
  const profileImage = user?.profile_image || profile.data?.profile_image || null;
  const avatarUrl    = staffAvatarUrl(staffid, profileImage, "small");
  const role         = profile.data?.role_name || null;
  const primaryDept  = profile.data?.departments?.[0]?.name || null;

  useEffect(() => {
    setAvatarBroken(false);
  }, [avatarUrl]);

  const joinedSince = useMemo(() => {
    const raw = profile.data?.datecreated;
    if (!raw) return null;
    if (raw.startsWith("0000")) return null;
    const d = new Date(raw.replace(" ", "T"));
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [profile.data?.datecreated]);

  const initial = (firstname[0] || email[0] || "?").toUpperCase();

  return (
    <View className="mx-4 mt-3 bg-white rounded-2xl shadow-sm p-5">
      <View className="flex-row items-center">
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.primaryBg,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            marginRight: 14,
            borderWidth: 2,
            borderColor: colors.primary + "30",
          }}
        >
          {avatarUrl && !avatarBroken ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 72, height: 72 }}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 28 }}>
              {initial}
            </Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
            {firstname ? `${firstname} ${lastname}`.trim() : email || "—"}
          </Text>
          {email ? (
            <Text className="text-sm text-muted mt-0.5" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
          {role || primaryDept ? (
            <Text className="text-xs text-muted mt-1" numberOfLines={1}>
              {[role, primaryDept].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
      </View>
      {joinedSince ? (
        <View className="flex-row items-center mt-4 pt-4 border-t border-slate-100">
          <Ionicons name="ribbon-outline" size={14} color={colors.primary} />
          <Text className="text-xs text-muted ml-2">
            Member since {joinedSince}
          </Text>
        </View>
      ) : staffid ? (
        <View className="flex-row items-center mt-4 pt-4 border-t border-slate-100">
          <Ionicons name="person-outline" size={14} color={colors.slate500} />
          <Text className="text-xs text-muted ml-2">Staff #{staffid}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function SettingsScreen() {
  const { logout, enableBiometric } = useAuth();
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  // Opted in, but the protected credential is missing — the switch has to read
  // OFF because fingerprint sign-in genuinely won't work, so say why.
  const [bioNeedsSetup, setBioNeedsSetup] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState("");
  const [biometricSaving, setBiometricSaving] = useState(false);
  const env = useEnvironment();

  useEffect(() => {
    (async () => {
      const gate = await resolveBiometricGate();
      setBioAvailable(gate.available);
      setBioOn(gate.canSignIn);
      setBioNeedsSetup(gate.needsReenrollment);
      setBioReady(true);
    })();
  }, []);

  const toggleBiometric = useCallback(
    async (next: boolean) => {
      if (!bioAvailable) return;
      if (next) {
        setBiometricPassword("");
        setBiometricModalVisible(true);
        return;
      }
      await setBiometricEnabled(next);
      setBioOn(next);
      setBioNeedsSetup(false);
    },
    [bioAvailable]
  );

  const confirmBiometric = useCallback(async () => {
    if (!biometricPassword || biometricSaving) return;
    setBiometricSaving(true);
    const result = await enableBiometric(biometricPassword);
    setBiometricSaving(false);
    if (!result.success) {
      Alert.alert("Fingerprint not enabled", result.message || "Password verification failed.");
      return;
    }
    setBioOn(true);
    setBioNeedsSetup(false);
    setBiometricPassword("");
    setBiometricModalVisible(false);
  }, [biometricPassword, biometricSaving, enableBiometric]);

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

  const openSupportedLinksSettings = async () => {
    if (Platform.OS !== "android") return;
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.APP_OPEN_BY_DEFAULT_SETTINGS,
        { data: "package:com.prizmenergy.mobile" },
      );
    } catch {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
        { data: "package:com.prizmenergy.mobile" },
      );
    }
  };

  return (
    <>
    <ScrollView className="flex-1 bg-surface">
      <ProfileHero />
      <CheckinCard />

      <View className="mx-4 mt-4">
        <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">Security</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center flex-1">
              <Ionicons name="finger-print" size={22} color={colors.primary} />
              <View className="ml-3 flex-1">
                <Text className="text-foreground font-medium">Fingerprint login</Text>
                {!bioReady ? (
                  <Text className="text-muted text-xs mt-1">Checking…</Text>
                ) : !bioAvailable ? (
                  <Text className="text-muted text-xs mt-1">
                    Not available on this device
                  </Text>
                ) : bioNeedsSetup ? (
                  <Text className="text-xs mt-1" style={{ color: colors.warning }}>
                    Needs setting up again — confirm your password to restore it
                  </Text>
                ) : (
                  <Text className="text-muted text-xs mt-1">
                    Sign in again securely after logout or session expiry
                  </Text>
                )}
              </View>
            </View>
            <Switch
              value={bioOn}
              onValueChange={toggleBiometric}
              disabled={!bioReady || !bioAvailable}
              trackColor={{ true: colors.primary, false: undefined }}
              thumbColor={bioOn ? colors.white : undefined}
            />
          </View>
        </View>

        <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">HR Self-Service</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/leave" as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={22} color="#0284C7" />
            <Text className="text-foreground font-medium ml-3">My Leave</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/payslips" as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={22} color="#7C3AED" />
            <Text className="text-foreground font-medium ml-3">My Payslips</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/expenses-mine" as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={22} color="#059669" />
            <Text className="text-foreground font-medium ml-3">My Expenses</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/activity" as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={22} color="#D97706" />
            <Text className="text-foreground font-medium ml-3">My Activity</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/tasks" as any)}
            className="flex-row items-center px-4 py-4"
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color="#0891B2" />
            <Text className="text-foreground font-medium ml-3">My Tasks</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
            </View>
          </TouchableOpacity>
        </View>

        <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">Business Development</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/tenders" as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="briefcase-outline" size={22} color="#B45309" />
            <Text className="text-foreground font-medium ml-3">Tenders</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/opportunities" as any)}
            className="flex-row items-center px-4 py-4"
            activeOpacity={0.7}
          >
            <Ionicons name="trending-up-outline" size={22} color={colors.primary} />
            <Text className="text-foreground font-medium ml-3">Opportunities</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
            </View>
          </TouchableOpacity>
        </View>

        <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">Account</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center px-4 py-4"
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={{ color: colors.error }} className="font-medium ml-3">Sign Out</Text>
          </TouchableOpacity>
        </View>

        <AdminSection />

        {__DEV__ ? <DevToolsSection /> : null}

        <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">About</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          {Platform.OS === "android" ? (
            <TouchableOpacity
              onPress={openSupportedLinksSettings}
              className="flex-row items-center px-4 py-4 border-b border-gray-100"
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={22} color={colors.primary} />
              <View className="ml-3 flex-1">
                <Text className="text-foreground font-medium">Open ERP links in Prizm CRM</Text>
                <Text className="text-muted text-xs mt-0.5">Enable “Open supported links” if your phone keeps using the browser.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
            </TouchableOpacity>
          ) : null}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text className="text-foreground font-medium">Version</Text>
            <Text className="text-muted text-sm mt-1">v{BUILD_VERSION}</Text>
            {BUILD_TIME !== "dev" ? (
              <Text className="text-muted text-xs mt-0.5">
                Released {formatBuildTime(BUILD_TIME)}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/changelog" as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            <Text className="text-foreground font-medium ml-3">Changelog</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-download-outline" size={22} color={colors.primary} />
            <Text className="text-foreground font-medium ml-3">
              {checkingUpdate ? "Checking..." : "Check for updates"}
            </Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
            </View>
          </TouchableOpacity>
          <View className="px-4 py-4 flex-row items-center">
            <View className="flex-1">
              <Text className="text-foreground font-medium">Environment</Text>
              <Text className="text-muted text-sm mt-1">{env.label}</Text>
            </View>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: env.color,
              }}
            />
          </View>
        </View>
      </View>
    </ScrollView>
    <Modal
      visible={biometricModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setBiometricModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center bg-black/40 px-5"
      >
        <View className="bg-white rounded-2xl p-5">
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-xl bg-primary/10 items-center justify-center">
              <Ionicons name="finger-print" size={24} color={colors.primary} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-lg font-bold text-foreground">Enable fingerprint sign-in</Text>
              <Text className="text-xs text-muted mt-1">
                Confirm your password once. It will be stored in the device-protected biometric vault.
              </Text>
            </View>
          </View>
          <TextInput
            value={biometricPassword}
            onChangeText={setBiometricPassword}
            secureTextEntry
            autoFocus
            placeholder="Current password"
            placeholderTextColor={colors.slate400}
            className="mt-5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-foreground"
            onSubmitEditing={confirmBiometric}
          />
          <View className="flex-row justify-end mt-5">
            <TouchableOpacity
              onPress={() => setBiometricModalVisible(false)}
              className="px-4 py-3"
              disabled={biometricSaving}
            >
              <Text className="font-semibold text-muted">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmBiometric}
              className="bg-primary rounded-xl px-5 py-3 ml-2 min-w-24 items-center"
              disabled={!biometricPassword || biometricSaving}
              style={{ opacity: !biometricPassword || biometricSaving ? 0.6 : 1 }}
            >
              {biometricSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-semibold text-white">Enable</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

/**
 * "Admin tools" section — only renders if the backend confirms the
 * current user has admin role.
 */
function AdminSection() {
  const { logout } = useAuth();
  const qc = useQueryClient();
  const env = useEnvironment();

  const q = useQuery({
    queryKey: ["admin", "can_impersonate"],
    queryFn: async () => {
      const gen = getSessionGeneration();
      const headers = await buildAuthHeaders();
      const res = await fetch(`${API_URL}/admin/me/can_impersonate`, { headers });
      const { body } = await parseApiResponse(res, !!headers["authtoken"], gen);
      if (!res.ok || body?.status !== true) return { can_impersonate: false };
      return body.data as { can_impersonate: boolean };
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleEnvSwitch = useCallback(
    (key: EnvironmentKey) => {
      if (key === env.key) return;
      const target = ENVIRONMENTS[key];
      Alert.alert(
        `Switch to ${target.label}?`,
        "This will sign you out, clear all cached data, and redirect to the login screen.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Switch",
            style: "destructive",
            onPress: async () => {
              await setEnvironment(key);
              applyEnvironment();
              resetDevBannerDismiss();
              await clearSession();
              qc.clear();
              logout();
            },
          },
        ],
      );
    },
    [env.key, qc, logout],
  );

  if (!q.data?.can_impersonate) return null;

  const otherKey: EnvironmentKey = env.key === "production" ? "development" : "production";
  const otherEnv = ENVIRONMENTS[otherKey];

  return (
    <>
      <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">
        Admin Tools
      </Text>
      <View className="bg-white rounded-xl overflow-hidden mb-6">
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/view-as" as any)}
          className="flex-row items-center px-4 py-4 border-b border-gray-100"
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={22} color={colors.warning} />
          <View className="ml-3 flex-1">
            <Text className="text-foreground font-medium">View As</Text>
            <Text className="text-muted text-xs mt-0.5">
              See the app from another staff member's perspective.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleEnvSwitch(otherKey)}
          className="flex-row items-center px-4 py-4"
          activeOpacity={0.7}
        >
          <Ionicons name="swap-horizontal-outline" size={22} color={env.color} />
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text className="text-foreground font-medium">Environment</Text>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: env.color,
                  marginLeft: 8,
                }}
              />
            </View>
            <Text className="text-muted text-xs mt-0.5">
              Currently: {env.label} · Tap to switch to {otherEnv.label}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
        </TouchableOpacity>
      </View>
    </>
  );
}

function DevToolsSection() {
  return (
    <>
      <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">Developer</Text>
      <View className="bg-white rounded-xl overflow-hidden mb-6">
        <TouchableOpacity
          onPress={() => router.push("/dev/ui-gallery" as any)}
          className="flex-row items-center px-4 py-4"
          activeOpacity={0.7}
        >
          <Ionicons name="color-palette-outline" size={22} color={colors.primary} />
          <Text className="text-foreground font-medium ml-3">UI component gallery</Text>
          <View className="ml-auto">
            <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
}
