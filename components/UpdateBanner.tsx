import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  checkForUpdate,
  dismissUpdate,
  downloadAndInstall,
  UpdateInfo,
} from "@/lib/updates";

/**
 * Non-blocking banner that polls GitHub releases on mount. Renders nothing
 * unless an update is available AND the user hasn't dismissed this specific
 * release. Once the user taps Install we download with a progress bar then
 * hand off to the Android package installer.
 */
export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    (async () => {
      const u = await checkForUpdate();
      if (u) setInfo(u);
    })();
  }, []);

  if (!info) return null;

  const handleInstall = async () => {
    setDownloading(true);
    setProgress(0);
    try {
      await downloadAndInstall(info, setProgress);
      // Don't reset state — Android takes over with its install dialog.
      // If user cancels there, banner stays visible so they can retry.
    } catch (err: any) {
      Alert.alert("Update failed", err?.message || "Could not download the update.");
      setDownloading(false);
    }
  };

  const handleDismiss = async () => {
    await dismissUpdate(info.remoteSha);
    setInfo(null);
  };

  const sizeMb = info.sizeBytes
    ? (info.sizeBytes / (1024 * 1024)).toFixed(0)
    : "?";

  return (
    <View className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <View className="flex-row items-center">
        <Ionicons name="cloud-download-outline" size={20} color="#B45309" />
        <View className="flex-1 ml-3">
          <Text className="text-amber-900 font-medium">
            Update available
          </Text>
          <Text className="text-amber-800 text-xs mt-0.5">
            {downloading
              ? `Downloading ${Math.round(progress * 100)}% · ${sizeMb} MB`
              : `Tap Install to update (${sizeMb} MB)`}
          </Text>
        </View>
        {downloading ? (
          <ActivityIndicator color="#B45309" />
        ) : (
          <>
            <TouchableOpacity
              onPress={handleDismiss}
              className="px-3 py-1.5 mr-1"
              activeOpacity={0.6}
            >
              <Text className="text-amber-900 text-sm">Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleInstall}
              className="bg-amber-600 px-3 py-1.5 rounded-md"
              activeOpacity={0.7}
            >
              <Text className="text-white text-sm font-semibold">Install</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
