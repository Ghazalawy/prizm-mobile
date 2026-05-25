import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, Image } from "react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { BASE_URL, staffAvatarUrl } from "@/lib/config";
import { BUILD_VERSION, BUILD_TIME } from "@/lib/build-info";

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
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  promptBiometric,
} from "@/lib/biometric";
import { CheckinCard } from "@/components/CheckinCard";
import { useMyProfile } from "@/lib/queries/my";
import { useEffectiveUser } from "@/lib/effective-user";
import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/lib/config";
import { buildAuthHeaders, parseApiResponse } from "@/lib/api";

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
    // Perfex sometimes stores 0000-00-00 00:00:00 — surface nothing.
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
            backgroundColor: "#E2E8F0",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            marginRight: 14,
          }}
        >
          {avatarUrl && !avatarBroken ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 72, height: 72 }}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <Text style={{ color: "#0F172A", fontWeight: "700", fontSize: 28 }}>
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
          <Ionicons name="ribbon-outline" size={14} color="#64748B" />
          <Text className="text-xs text-muted ml-2">
            Member since {joinedSince}
          </Text>
        </View>
      ) : staffid ? (
        <View className="flex-row items-center mt-4 pt-4 border-t border-slate-100">
          <Ionicons name="person-outline" size={14} color="#64748B" />
          <Text className="text-xs text-muted ml-2">Staff #{staffid}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function SettingsScreen() {
  const { logout } = useAuth();
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
      {/* Profile hero — name, avatar, "joined since". Mirrors web admin chrome. */}
      <ProfileHero />

      {/* Daily-use check-in widget */}
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
            onPress={() => router.push("/(tabs)/payslips" as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={22} color="#0284C7" />
            <Text className="text-foreground font-medium ml-3">My Payslips</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/expenses-mine" as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={22} color="#0284C7" />
            <Text className="text-foreground font-medium ml-3">My Expenses</Text>
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

        {/* Admin tools — only renders if the backend says the user can
            impersonate. /api/admin/me/can_impersonate is cheap (one DB
            row lookup) and the response is cached for the session, so
            non-admins pay one extra request per app launch at most. */}
        <AdminSection />


        <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">About</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          {/* Version + released date — no SHA visible. The internal
              BUILD_SHA is still used by WhatsNewModal to know whether
              to show the popup once per build, but it's an
              implementation detail, not user-facing version info. */}
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
            <Ionicons name="document-text-outline" size={22} color="#0284C7" />
            <Text className="text-foreground font-medium ml-3">Changelog</Text>
            <View className="ml-auto">
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
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

/**
 * "Admin tools" section — only renders if the backend confirms the
 * current user has admin role. The check hits GET /api/admin/me/can_impersonate
 * which is a single-row tblstaff lookup; cheap enough to fire every
 * Settings mount without caching gymnastics.
 *
 * On non-admin accounts: returns null. On error / unauthenticated:
 * returns null. So the entry only appears when we're confident the
 * user can actually use it.
 */
function AdminSection() {
  const q = useQuery({
    queryKey: ["admin", "can_impersonate"],
    queryFn: async () => {
      const headers = await buildAuthHeaders();
      const res = await fetch(`${API_URL}/admin/me/can_impersonate`, { headers });
      const { body } = await parseApiResponse(res, !!headers["authtoken"]);
      if (!res.ok || body?.status !== true) return { can_impersonate: false };
      return body.data as { can_impersonate: boolean };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!q.data?.can_impersonate) return null;

  return (
    <>
      <Text className="text-sm text-muted font-medium mb-2 ml-1 uppercase">
        Admin Tools
      </Text>
      <View className="bg-white rounded-xl overflow-hidden mb-6">
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/view-as" as any)}
          className="flex-row items-center px-4 py-4"
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={22} color="#B45309" />
          <View className="ml-3 flex-1">
            <Text className="text-foreground font-medium">View As</Text>
            <Text className="text-muted text-xs mt-0.5">
              See the app from another staff member's perspective.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </>
  );
}
