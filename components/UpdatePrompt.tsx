import {
  View,
  Text,
  TouchableOpacity,
  AppState,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  checkForUpdate,
  dismissUpdate,
  downloadAndInstall,
  recordForegroundTimestamp,
  shouldAutoInstall,
  UpdateInfo,
} from "@/lib/updates";

/**
 * Persistent top banner for in-app updates. Shows when a new APK is available
 * on GitHub Releases. Tap "Install" to download — the banner morphs into a
 * progress bar, and when the download completes Android's installer opens.
 *
 * Mounted globally from app/_layout.tsx so it floats over every screen
 * (login + tabs). Uses `pointerEvents` so the rest of the UI stays usable
 * while the banner is visible.
 */
export function UpdatePrompt() {
  const insets = useSafeAreaInsets();

  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [phase, setPhase] = useState<"idle" | "available" | "downloading">("idle");
  const [progress, setProgress] = useState(0);

  // Track which SHA we've already shown so an AppState focus doesn't re-pop
  // the banner after a manual dismiss.
  const dismissedSha = useRef<string | null>(null);
  // Slide-down animation for the banner reveal.
  const slideY = useRef(new Animated.Value(-120)).current;

  const showBanner = useCallback(
    (next: UpdateInfo) => {
      setInfo(next);
      setPhase("available");
      setProgress(0);
      Animated.timing(slideY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [slideY]
  );

  const hideBanner = useCallback(() => {
    Animated.timing(slideY, {
      toValue: -160,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setPhase("idle");
      setInfo(null);
      setProgress(0);
    });
  }, [slideY]);

  const runCheck = useCallback(async () => {
    if (phase === "downloading") return;
    const next = await checkForUpdate();
    if (!next) return;

    // Quiet-hours auto-install: if it's 02:00–05:00 local AND the app has been
    // idle (no recorded foreground touch) for ≥15 min, kick off the install
    // without prompting. The user is presumably asleep — install completes
    // by morning. Heuristic-only (foreground-driven, no background task —
    // that needs expo-task-manager + SCHEDULE_EXACT_ALARM).
    if (await shouldAutoInstall()) {
      setInfo(next);
      setPhase("downloading");
      try {
        await downloadAndInstall(next, (frac) =>
          setProgress(Math.min(1, Math.max(0, frac))),
        );
        setProgress(1);
        return;
      } catch {
        // Fall through to the normal banner — the user will see the offer
        // when they wake up.
        setPhase("idle");
      }
    }

    if (dismissedSha.current === next.remoteSha) return;
    if (info && info.remoteSha === next.remoteSha && phase === "available") return;
    showBanner(next);
  }, [info, phase, showBanner]);

  useEffect(() => {
    // Initial foreground = "user is here right now"
    recordForegroundTimestamp().catch(() => undefined);
    runCheck();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // Re-check on foreground BEFORE updating the timestamp, so the
        // shouldAutoInstall heuristic sees how long the app was backgrounded.
        runCheck().finally(() => {
          recordForegroundTimestamp().catch(() => undefined);
        });
      } else if (state === "background" || state === "inactive") {
        // Stamp the moment the user left so shouldAutoInstall can compute
        // idle-since-then accurately on next foreground.
        recordForegroundTimestamp().catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [runCheck]);

  const handleDismiss = useCallback(() => {
    if (!info) return;
    dismissedSha.current = info.remoteSha;
    dismissUpdate(info.remoteSha).catch(() => undefined);
    hideBanner();
  }, [info, hideBanner]);

  const handleInstall = useCallback(async () => {
    if (!info) return;
    setPhase("downloading");
    setProgress(0);
    try {
      await downloadAndInstall(info, (frac) => {
        // Clamp + round so the bar moves in visible steps, not every byte.
        setProgress(Math.min(1, Math.max(0, frac)));
      });
      // The intent launcher fires Android's package installer overlay. Leave
      // the banner at 100% — when the install completes the app restarts.
      setProgress(1);
    } catch (err: any) {
      setPhase("available");
      setProgress(0);
      Toast.show({
        type: "error",
        text1: "Update failed",
        text2: err?.message?.slice(0, 80) || "Could not download the update.",
      });
    }
  }, [info]);

  if (phase === "idle" || !info) return null;

  const sizeMb = info.sizeBytes ? (info.sizeBytes / (1024 * 1024)).toFixed(0) : "?";
  const isDownloading = phase === "downloading";
  const pct = Math.round(progress * 100);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        transform: [{ translateY: slideY }],
        zIndex: 9999,
        elevation: 12,
      }}
    >
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingHorizontal: 12,
          paddingBottom: 10,
          backgroundColor: "#F59E0B",
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons
              name={isDownloading ? "cloud-download-outline" : "sparkles-outline"}
              size={18}
              color="#FFFFFF"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 13 }}>
              {isDownloading ? `Downloading… ${pct}%` : "Update available"}
            </Text>
            <Text
              style={{ color: "rgba(255,255,255,0.85)", fontSize: 11 }}
              numberOfLines={1}
            >
              {isDownloading
                ? "Android installer will open when ready"
                : `New build ready (${sizeMb} MB)`}
            </Text>
          </View>

          {isDownloading ? null : (
            <>
              <TouchableOpacity
                onPress={handleInstall}
                activeOpacity={0.8}
                style={{
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  marginRight: 6,
                }}
              >
                <Text style={{ color: "#F59E0B", fontWeight: "700", fontSize: 12 }}>
                  Install
                </Text>
              </TouchableOpacity>
              <Pressable
                onPress={handleDismiss}
                hitSlop={10}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </>
          )}
        </View>

        {/* Progress bar — full width, only visible while downloading. */}
        {isDownloading ? (
          <View
            style={{
              marginTop: 8,
              height: 4,
              backgroundColor: "rgba(255,255,255,0.25)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${pct}%`,
                height: "100%",
                backgroundColor: "#FFFFFF",
              }}
            />
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
