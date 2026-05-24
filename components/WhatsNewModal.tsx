import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { BUILD_SHA, BUILD_VERSION, RELEASE_NOTES } from "@/lib/build-info";

/**
 * "What's new" modal shown once after each app update.
 *
 * Wiring:
 *  - On mount, read SecureStore["prizm_whats_new_seen_sha"].
 *  - If it differs from BUILD_SHA (and we're not in dev mode and RELEASE_NOTES
 *    has actual content), open the modal.
 *  - User taps "Got it" → store BUILD_SHA so the modal never fires for the
 *    same build again.
 *  - User updates to a newer build → SHA changes → modal fires once more with
 *    the new release's notes.
 *
 * Rendered globally in app/_layout.tsx so it overlays Login + Tabs + every
 * screen, but only on the very first launch after install.
 */

const SEEN_KEY = "prizm_whats_new_seen_sha";

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      // Skip on dev builds or empty release notes — nothing to show.
      if (!BUILD_SHA || BUILD_SHA === "dev") return;
      if (!RELEASE_NOTES.title && RELEASE_NOTES.highlights.length === 0) return;

      const seen = await SecureStore.getItemAsync(SEEN_KEY);
      if (seen !== BUILD_SHA) setOpen(true);
    })();
  }, []);

  const dismiss = async () => {
    await SecureStore.setItemAsync(SEEN_KEY, BUILD_SHA);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent
      onRequestClose={dismiss}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-3xl w-full max-w-sm overflow-hidden">
          {/* Header */}
          <View className="bg-primary px-5 pt-5 pb-4">
            <View className="flex-row items-center mb-2">
              <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center">
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              </View>
              <Text className="text-white/80 text-xs uppercase tracking-wide ml-2">
                What&apos;s new in v{BUILD_VERSION}
              </Text>
            </View>
            <Text className="text-white text-xl font-bold" numberOfLines={3}>
              {RELEASE_NOTES.title || "App updated"}
            </Text>
          </View>

          {/* Body */}
          <ScrollView className="px-5 py-4 max-h-96">
            {RELEASE_NOTES.highlights.map((line, i) => (
              <View key={i} className="flex-row mb-3">
                <View className="w-1.5 h-1.5 rounded-full bg-primary mt-2 mr-3" />
                <Text className="text-foreground flex-1 leading-relaxed" selectable>
                  {line}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View className="px-5 pb-5 pt-1">
            <TouchableOpacity
              onPress={dismiss}
              className="bg-primary rounded-xl py-3 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
