import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { PINNABLE_MODULES } from "@/lib/pinnable-modules";
import { usePinnedTabs, togglePin } from "@/lib/pinned-tabs";
import { useState, useCallback } from "react";

export default function TabPickerScreen() {
  const pinned = usePinnedTabs();
  const [, forceUpdate] = useState(0);

  const handleToggle = useCallback(async (key: string) => {
    await togglePin(key);
    forceUpdate((n) => n + 1);
  }, []);

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-foreground">Customize Bottom Bar</Text>
            <Text className="text-sm text-muted mt-1">
              Tap to pin/unpin modules from the bottom navigation bar.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={8}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <Ionicons name="close" size={20} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Currently pinned */}
        {pinned.length > 0 && (
          <View className="mb-6">
            <Text className="text-xs text-muted uppercase tracking-wide mb-3 px-1">
              Pinned to Bottom Bar
            </Text>
            {pinned.map((key) => {
              const mod = PINNABLE_MODULES.find((m) => m.key === key);
              if (!mod) return null;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleToggle(key)}
                  activeOpacity={0.7}
                  className="flex-row items-center bg-white rounded-xl p-3 mb-2 shadow-sm"
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: "#E65100" + "1A" }}
                  >
                    <Ionicons name={mod.icon as any} size={20} color="#E65100" />
                  </View>
                  <Text className="flex-1 ml-3 text-foreground font-medium">{mod.title}</Text>
                  <Ionicons name="star" size={20} color="#F59E0B" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Available to pin */}
        <Text className="text-xs text-muted uppercase tracking-wide mb-3 px-1">
          Available Modules
        </Text>
        {PINNABLE_MODULES.filter((m) => !pinned.includes(m.key)).map((mod) => (
          <TouchableOpacity
            key={mod.key}
            onPress={() => handleToggle(mod.key)}
            activeOpacity={0.7}
            className="flex-row items-center bg-white rounded-xl p-3 mb-2 shadow-sm"
          >
            <View
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: "#64748B1A" }}
            >
              <Ionicons name={mod.icon as any} size={20} color="#64748B" />
            </View>
            <Text className="flex-1 ml-3 text-foreground font-medium">{mod.title}</Text>
            <Ionicons name="star-outline" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
