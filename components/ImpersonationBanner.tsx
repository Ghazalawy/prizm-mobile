import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  stopImpersonation,
  useImpersonation,
} from "@/lib/impersonation";
import { apiRequest } from "@/lib/api";
import Toast from "react-native-toast-message";

/** Best-effort audit log when the admin stops impersonating. We POST
 *  BEFORE clearing the impersonation header so the request still
 *  carries X-Impersonate-Staff-Id, but auth comes from the real admin
 *  token — the backend logs both. */
async function auditStop(staffid: number): Promise<void> {
  try {
    await apiRequest("admin/impersonate/stop", {
      method: "POST",
      body: JSON.stringify({ staffid }),
    });
  } catch {
    // Audit failures are intentional non-blockers — local state still
    // clears so the user reverts to themselves regardless.
  }
}

/**
 * Persistent amber banner that appears at the top of every screen while
 * the admin is in a View-As session. Shows who you're viewing as and a
 * "Stop" button to revert.
 *
 * Rendered globally in app/(tabs)/_layout.tsx just below ActionCenter.
 * When no impersonation is active, returns null — zero footprint.
 *
 * The colour is deliberately bright amber/orange. Two reasons:
 *  1. Visual safety — every screen the admin sees while impersonating
 *     shows someone else's data; we want it impossible to forget you
 *     are not yourself.
 *  2. Discoverability — the user explicitly requested a clear "Stop"
 *     button rather than a hidden setting.
 *
 * Tapping Stop:
 *  - Clears impersonation in lib/impersonation.ts (which broadcasts to
 *    every useImpersonation subscriber so the banner unmounts)
 *  - Calls qc.clear() so every cached query refetches as the real user
 *  - Fires the audit-only POST /api/admin/impersonate/stop best-effort
 */
export function ImpersonationBanner() {
  const target = useImpersonation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  if (!target) return null;

  const handleStop = async () => {
    setBusy(true);
    try {
      // Audit BEFORE clearing local state so the request still carries
      // the impersonation header — the backend's audit row then records
      // both the admin and the impersonated user.
      await auditStop(target.staffid);
      await stopImpersonation();
      // Wipe every cached query so the next render fetches as the real
      // user. Inbox, dashboard, profile, everything — without this they
      // would briefly show the impersonated data.
      qc.clear();
      Toast.show({
        type: "success",
        text1: "Back to your account",
        text2: `Stopped viewing as ${target.name}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: "#FEF3C7",
        borderBottomWidth: 1,
        borderBottomColor: "#FCD34D",
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Ionicons name="eye-outline" size={16} color="#B45309" />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={{ fontSize: 12, color: "#92400E", fontWeight: "700" }}>
          Viewing as {target.name}
        </Text>
        {target.email ? (
          <Text style={{ fontSize: 10, color: "#B45309" }} numberOfLines={1}>
            {target.email}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={handleStop}
        disabled={busy}
        activeOpacity={0.7}
        hitSlop={8}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: "#B45309",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="close" size={12} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700", marginLeft: 2 }}>
              Stop
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
