import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { API_URL, staffAvatarUrl } from "@/lib/config";
import { apiRequest, buildAuthHeaders, parseApiResponse } from "@/lib/api";
import { getSessionGeneration } from "@/lib/auth-events";
import {
  startImpersonation,
  useImpersonation,
} from "@/lib/impersonation";
import Toast from "react-native-toast-message";

/**
 * "View As" picker. Admin only — gated upstream by the Settings page
 * which only renders the entry link if /api/admin/me/can_impersonate
 * returned true.
 *
 * Lists every active staff (except the admin themselves) with their
 * name, role, email. Tap a row to start viewing the app as that user.
 * On confirm we:
 *   1. Persist the target in SecureStore (lib/impersonation.ts)
 *   2. queryClient.clear() so every cached query refetches with the
 *      X-Impersonate-Staff-Id header set
 *   3. Audit-log the start via POST /api/admin/impersonate/start
 *   4. Route back to the Dashboard so the admin sees the impersonated
 *      user's home immediately
 */
type StaffRow = {
  staffid: number;
  name: string;
  email: string;
  role_name: string | null;
  is_admin: boolean;
  active: boolean;
  profile_image: string | null;
};

async function fetchStaff(search: string): Promise<StaffRow[]> {
  const gen = getSessionGeneration();
  const headers = await buildAuthHeaders();
  const qs = search ? `?q=${encodeURIComponent(search)}` : "";
  const res = await fetch(`${API_URL}/admin/staff${qs}`, { headers });
  const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"], gen);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) {
    const msg = (typeof body === "object" && body?.message) || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return Array.isArray(body?.data) ? body.data : [];
}

async function auditStart(staffid: number): Promise<void> {
  // best-effort — failure doesn't block the local impersonation
  apiRequest("admin/impersonate/start", {
    method: "POST",
    body: JSON.stringify({ staffid }),
  }).catch(() => undefined);
}

export default function ViewAsScreen() {
  const qc = useQueryClient();
  const current = useImpersonation();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [busyStaffId, setBusyStaffId] = useState<number | null>(null);

  // 350ms debounce so we don't fire a request per keystroke. The
  // backend caps at 200 rows so even unfiltered the list is cheap.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const q = useQuery({
    queryKey: ["admin", "staff", debouncedSearch],
    queryFn: () => fetchStaff(debouncedSearch),
    staleTime: 60 * 1000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const handlePick = useCallback(
    async (s: StaffRow) => {
      if (busyStaffId !== null) return;
      setBusyStaffId(s.staffid);
      try {
        await startImpersonation({
          staffid: s.staffid,
          name: s.name,
          email: s.email,
        });
        // Best-effort audit log — fire-and-forget.
        void auditStart(s.staffid);
        // Wipe every cached query so the next render fetches via the
        // impersonation header.
        qc.clear();
        Toast.show({
          type: "success",
          text1: `Viewing as ${s.name}`,
          text2: "Tap Stop in the banner to revert.",
        });
        router.replace("/(tabs)/" as any);
      } catch (err: any) {
        Toast.show({
          type: "error",
          text1: "Failed to start View As",
          text2: err?.message?.slice(0, 140),
        });
      } finally {
        setBusyStaffId(null);
      }
    },
    [busyStaffId, qc],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "View As",
          headerShown: true,
          headerBackTitle: "Settings",
        }}
      />
      <View className="flex-1 bg-surface">
        {/* Search header */}
        <View
          style={{
            padding: 12,
            backgroundColor: "white",
            borderBottomWidth: 1,
            borderBottomColor: "#E2E8F0",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#F1F5F9",
              borderRadius: 10,
              paddingHorizontal: 10,
            }}
          >
            <Ionicons name="search" size={16} color="#64748B" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or email…"
              placeholderTextColor="#94A3B8"
              style={{
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 8,
                fontSize: 14,
                color: "#0F172A",
              }}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={6}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text className="text-xs text-muted mt-2">
            Pick a staff member to view the app from their perspective. Useful for
            testing permissions and filters.
          </Text>
        </View>

        {q.isLoading && !q.data ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0284C7" />
          </View>
        ) : q.isError ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="lock-closed-outline" size={42} color="#EF4444" />
            <Text className="text-foreground font-semibold mt-3">
              Couldn't load staff list
            </Text>
            <Text className="text-muted text-sm mt-1 text-center">
              {(q.error as Error)?.message ||
                "You may not have admin permission to use View As."}
            </Text>
            <TouchableOpacity
              onPress={() => q.refetch()}
              className="mt-4 bg-primary px-5 py-2 rounded-lg"
            >
              <Text className="text-white font-medium">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={q.data || []}
            keyExtractor={(s) => String(s.staffid)}
            contentContainerStyle={{ padding: 12 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#0284C7"
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Ionicons name="people-outline" size={42} color="#94A3B8" />
                <Text className="text-muted mt-3">No staff found.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <StaffRowCard
                row={item}
                busy={busyStaffId === item.staffid}
                isCurrent={current?.staffid === item.staffid}
                onPick={() => handlePick(item)}
              />
            )}
          />
        )}
      </View>
    </>
  );
}

function StaffRowCard({
  row,
  busy,
  isCurrent,
  onPick,
}: {
  row: StaffRow;
  busy: boolean;
  isCurrent: boolean;
  onPick: () => void;
}) {
  const [avatarBroken, setAvatarBroken] = useState(false);
  const initial = (row.name?.[0] || row.email?.[0] || "?").toUpperCase();
  const avatarUrl = staffAvatarUrl(row.staffid, row.profile_image, "thumb");
  return (
    <TouchableOpacity
      onPress={onPick}
      disabled={busy}
      activeOpacity={0.75}
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#0F172A",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
        borderWidth: isCurrent ? 2 : 0,
        borderColor: isCurrent ? "#0284C7" : "transparent",
        opacity: busy ? 0.6 : 1,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#E2E8F0",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginRight: 12,
        }}
      >
        {avatarUrl && !avatarBroken ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 40, height: 40 }}
            onError={() => setAvatarBroken(true)}
          />
        ) : (
          <Text style={{ color: "#0F172A", fontWeight: "700", fontSize: 16 }}>
            {initial}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}
            numberOfLines={1}
          >
            {row.name || row.email || `Staff #${row.staffid}`}
          </Text>
          {row.is_admin ? (
            <View
              style={{
                marginLeft: 6,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 4,
                backgroundColor: "#FEF3C7",
              }}
            >
              <Text style={{ fontSize: 9, color: "#B45309", fontWeight: "700" }}>
                ADMIN
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}
          numberOfLines={1}
        >
          {[row.role_name, row.email].filter(Boolean).join(" · ")}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color="#0284C7" />
      ) : isCurrent ? (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: "#FEF3C7",
          }}
        >
          <Text style={{ fontSize: 11, color: "#B45309", fontWeight: "700" }}>
            CURRENT
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      )}
    </TouchableOpacity>
  );
}
