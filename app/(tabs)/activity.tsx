import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useState, useMemo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useCurrentUser } from "@/lib/auth-context";
import { useMyActivity, isMobileRow, type ActivityRow } from "@/lib/queries/activity";

/**
 * My Activity feed — every row from tblactivity_log where staffid = me.
 * A toggle narrows down to only the [Mobile]-tagged rows so the user can
 * see exclusively the actions they took on the phone.
 *
 * Reachable from the dashboard tile, Settings > My Activity, and the
 * Action Center sheet.
 */

function relativeTime(dateStr: string): string {
  // Perfex stores 'Y-m-d H:i:s' in server time. We treat it as local for
  // display purposes — close enough for an activity feed.
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return dateStr;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function ActivityItem({ row }: { row: ActivityRow }) {
  const isMobile = isMobileRow(row);
  return (
    <View className="flex-row gap-3 px-4 py-3 border-b border-slate-100">
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          isMobile ? "bg-sky-100" : "bg-slate-100"
        }`}
      >
        <Ionicons
          name={isMobile ? "phone-portrait-outline" : "desktop-outline"}
          size={20}
          color={isMobile ? "#0284C7" : "#64748B"}
        />
      </View>
      <View className="flex-1">
        <Text className="text-sm text-foreground leading-snug" numberOfLines={3}>
          {row.description}
        </Text>
        <Text className="text-xs text-muted mt-1">
          {relativeTime(row.date)} · #{row.id}
        </Text>
      </View>
    </View>
  );
}

export default function ActivityScreen() {
  const user = useCurrentUser();
  const [mobileOnly, setMobileOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const q = useMyActivity(user?.staffid, 200);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const rows = useMemo<ActivityRow[]>(() => {
    if (!q.data) return [];
    return mobileOnly ? q.data.filter(isMobileRow) : q.data;
  }, [q.data, mobileOnly]);

  const mobileCount = useMemo(
    () => (q.data ? q.data.filter(isMobileRow).length : 0),
    [q.data]
  );

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "My Activity",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color="#0284C7" />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Filter strip */}
      <View className="flex-row items-center justify-between bg-white px-4 py-3 border-b border-slate-200">
        <Text className="text-xs text-muted">
          {q.data ? `${q.data.length} entries` : "—"}
          {q.data ? ` · ${mobileCount} from mobile` : ""}
        </Text>
        <TouchableOpacity
          onPress={() => setMobileOnly(!mobileOnly)}
          className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
            mobileOnly ? "bg-sky-600" : "bg-slate-200"
          }`}
        >
          <Ionicons
            name="phone-portrait-outline"
            size={14}
            color={mobileOnly ? "#FFFFFF" : "#64748B"}
          />
          <Text
            className={`text-xs font-medium ${
              mobileOnly ? "text-white" : "text-slate-600"
            }`}
          >
            Mobile only
          </Text>
        </TouchableOpacity>
      </View>

      {!user ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-sm text-muted">Sign in to see your activity</Text>
        </View>
      ) : q.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="warning-outline" size={32} color="#EF4444" />
          <Text className="text-sm text-rose-600 mt-2 text-center">
            {(q.error as Error)?.message || "Could not load activity"}
          </Text>
          <TouchableOpacity
            onPress={() => q.refetch()}
            className="mt-4 px-4 py-2 bg-sky-600 rounded-lg"
          >
            <Text className="text-white text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="time-outline" size={32} color="#94A3B8" />
          <Text className="text-sm text-muted mt-2 text-center">
            {mobileOnly
              ? "No mobile actions yet. Try editing a record from the ⋮ menu."
              : "No activity yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => <ActivityItem row={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0284C7"
            />
          }
        />
      )}
    </View>
  );
}
