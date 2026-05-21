import { Alert, AppState } from "react-native";
import { useCallback, useEffect, useRef } from "react";
import {
  checkForUpdate,
  dismissUpdate,
  downloadAndInstall,
  UpdateInfo,
} from "@/lib/updates";

export function UpdatePrompt() {
  const promptedSha = useRef<string | null>(null);
  const installing = useRef(false);

  const showPrompt = useCallback((info: UpdateInfo) => {
    const sizeMb = info.sizeBytes
      ? (info.sizeBytes / (1024 * 1024)).toFixed(0)
      : "?";

    Alert.alert(
      "Update available",
      `A new Prizm mobile build is ready (${sizeMb} MB). Install it now?`,
      [
        {
          text: "Later",
          style: "cancel",
          onPress: () => {
            dismissUpdate(info.remoteSha).catch(() => undefined);
          },
        },
        {
          text: "Install",
          onPress: async () => {
            installing.current = true;
            try {
              Alert.alert(
                "Downloading update",
                "The Android installer will open when the APK finishes downloading."
              );
              await downloadAndInstall(info);
            } catch (err: any) {
              promptedSha.current = null;
              Alert.alert("Update failed", err?.message || "Could not download the update.");
            } finally {
              installing.current = false;
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, []);

  const runCheck = useCallback(async () => {
    if (installing.current) return;
    const info = await checkForUpdate();
    if (!info) return;
    if (promptedSha.current === info.remoteSha) return;
    promptedSha.current = info.remoteSha;
    showPrompt(info);
  }, [showPrompt]);

  useEffect(() => {
    runCheck();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") runCheck();
    });
    return () => sub.remove();
  }, [runCheck]);

  return null;
}
