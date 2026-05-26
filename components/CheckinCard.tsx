import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useMemo, useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useMyDashboard, useCheckin, useCheckinToday } from "@/lib/queries/my";

export function CheckinCard({ compact = false }: { compact?: boolean }) {
  const dashboard = useMyDashboard();
  const checkin = useCheckin();
  const todayEvents = useCheckinToday();

  const status = dashboard.data?.checkin;
  const checkedIn = !!status?.checked_in_now;
  const lastAt = status?.last_event?.date;

  const lastTimeLabel = useMemo(() => {
    if (!lastAt) return null;
    const d = new Date(lastAt.replace(" ", "T"));
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [lastAt]);

  const [liveElapsed, setLiveElapsed] = useState("");

  useEffect(() => {
    if (!checkedIn || !lastAt) {
      setLiveElapsed("");
      return;
    }
    const update = () => {
      const d = new Date(lastAt.replace(" ", "T"));
      if (isNaN(d.getTime())) return;
      const diff = Math.max(0, Date.now() - d.getTime());
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setLiveElapsed(`${hrs}h ${mins}m`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [checkedIn, lastAt]);

  const todayTotalHours = useMemo(() => {
    const events = todayEvents.data || [];
    if (events.length === 0) return null;
    let totalMs = 0;
    let lastIn: number | null = null;
    for (const ev of events) {
      const t = new Date(ev.date.replace(" ", "T")).getTime();
      if (isNaN(t)) continue;
      if (ev.type_check === 1) {
        lastIn = t;
      } else if (ev.type_check === 2 && lastIn !== null) {
        totalMs += t - lastIn;
        lastIn = null;
      }
    }
    if (lastIn !== null) totalMs += Date.now() - lastIn;
    if (totalMs <= 0) return null;
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  }, [todayEvents.data]);

  const handlePress = async () => {
    if (checkin.isPending) return;

    const type_check: 1 | 2 = checkedIn ? 2 : 1;

    checkin.mutate(
      { type_check },
      {
        onSuccess: (res) => {
          Toast.show({
            type: "success",
            text1: type_check === 1 ? "Checked in" : "Checked out",
            text2: res?.data?.at ? new Date(res.data.at.replace(" ", "T")).toLocaleTimeString() : undefined,
          });
        },
        onError: (err: any) => {
          Alert.alert("Check-in failed", err?.message || "Please try again.");
        },
      }
    );
  };

  const busy = checkin.isPending;

  if (dashboard.isLoading) {
    return (
      <View
        className="bg-white rounded-2xl px-5 py-6 mx-4 mt-3 shadow-sm items-center justify-center"
        style={{ minHeight: compact ? 80 : 120 }}
      >
        <ActivityIndicator color="#0284C7" />
      </View>
    );
  }

  if (dashboard.isError) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={busy}
      className="mx-4 mt-3 rounded-2xl px-5 py-5 shadow-sm flex-row items-center justify-between"
      style={{
        backgroundColor: checkedIn ? "#16A34A" : "#0284C7",
        opacity: busy ? 0.7 : 1,
      }}
    >
      <View className="flex-1">
        <Text className="text-white/80 text-xs uppercase tracking-wide">
          {checkedIn ? "Working since " + (lastTimeLabel ?? "—") : "You're not clocked in"}
        </Text>
        <Text className="text-white text-2xl font-bold mt-1">
          {checkedIn ? `Check out` : `Check in`}
        </Text>
        {checkedIn && liveElapsed ? (
          <Text className="text-white/80 text-sm mt-1">
            {liveElapsed} this session
            {todayTotalHours ? ` · ${todayTotalHours} total today` : ""}
          </Text>
        ) : (
          <Text className="text-white/80 text-sm mt-1">
            {todayTotalHours
              ? `${todayTotalHours} worked today`
              : status?.today_events
              ? `${status.today_events} event${status.today_events === 1 ? "" : "s"} today`
              : "Tap to start your day"}
          </Text>
        )}
      </View>
      <View
        className="w-14 h-14 rounded-full items-center justify-center"
        style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Ionicons
            name={checkedIn ? "stop-circle-outline" : "play-circle-outline"}
            size={36}
            color="#FFFFFF"
          />
        )}
      </View>
    </TouchableOpacity>
  );
}
