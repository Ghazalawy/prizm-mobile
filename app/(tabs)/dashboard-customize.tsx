import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import {
  ALL_CARD_KEYS,
  CARD_LABELS,
  DEFAULT_LAYOUT,
  getLayout,
  resetLayout,
  setLayout,
  type DashboardCardKey,
  type DashboardLayout,
} from "@/lib/dashboard-layout";

/**
 * Settings sub-screen: which dashboard cards to show + in what order.
 *
 * Up/down arrows for reorder, switch for visibility. Persisted via
 * SecureStore on every change so the Dashboard picks it up immediately
 * when the user backs out.
 *
 * We deliberately did NOT pull in a drag library — chose plain
 * arrow buttons here so this ships with zero new native dependencies.
 */
export default function DashboardCustomizeScreen() {
  const [layout, setLayoutState] = useState<DashboardLayout>(DEFAULT_LAYOUT);

  useEffect(() => {
    getLayout().then(setLayoutState);
  }, []);

  const persist = useCallback(async (next: DashboardLayout) => {
    setLayoutState(next);
    await setLayout(next);
  }, []);

  const moveUp = useCallback(
    (key: DashboardCardKey) => {
      const idx = layout.order.indexOf(key);
      if (idx <= 0) return;
      const order = [...layout.order];
      [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
      persist({ ...layout, order });
    },
    [layout, persist],
  );

  const moveDown = useCallback(
    (key: DashboardCardKey) => {
      const idx = layout.order.indexOf(key);
      if (idx === -1 || idx >= layout.order.length - 1) return;
      const order = [...layout.order];
      [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
      persist({ ...layout, order });
    },
    [layout, persist],
  );

  const toggleVisibility = useCallback(
    (key: DashboardCardKey, visible: boolean) => {
      const hidden = new Set(layout.hidden);
      if (visible) {
        hidden.delete(key);
      } else {
        hidden.add(key);
      }
      persist({ ...layout, hidden: Array.from(hidden) });
    },
    [layout, persist],
  );

  // Ensure every known card key shows up in the row list, even if missing
  // from the persisted layout (e.g. a card added in a newer build).
  const orderedKeys: DashboardCardKey[] = (() => {
    const seen = new Set<DashboardCardKey>();
    const out: DashboardCardKey[] = [];
    for (const k of layout.order) {
      if (!seen.has(k) && ALL_CARD_KEYS.includes(k)) {
        out.push(k);
        seen.add(k);
      }
    }
    for (const k of ALL_CARD_KEYS) {
      if (!seen.has(k)) out.push(k);
    }
    return out;
  })();

  const handleReset = useCallback(() => {
    Alert.alert(
      "Reset dashboard?",
      "This restores the default order and shows every card. Your custom layout is discarded.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetLayout();
            const fresh = await getLayout();
            setLayoutState(fresh);
          },
        },
      ],
    );
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Customize Dashboard",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
        <Text className="text-sm text-muted mb-3">
          Choose which tiles appear on your dashboard and the order they show in.
          Changes are saved as you make them.
        </Text>

        <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {orderedKeys.map((key, idx) => {
            const visible = !layout.hidden.includes(key);
            const isFirst = idx === 0;
            const isLast = idx === orderedKeys.length - 1;
            return (
              <View
                key={key}
                className="flex-row items-center px-4 py-3 border-b border-slate-100 last:border-0"
              >
                {/* Up/down arrow stack — disabled at extremes */}
                <View className="flex-col mr-3">
                  <TouchableOpacity
                    onPress={() => moveUp(key)}
                    disabled={isFirst}
                    hitSlop={6}
                    style={{ opacity: isFirst ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-up" size={20} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(key)}
                    disabled={isLast}
                    hitSlop={6}
                    style={{ opacity: isLast ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={20} color="#475569" />
                  </TouchableOpacity>
                </View>
                <Text className="flex-1 text-foreground font-medium">
                  {CARD_LABELS[key]}
                </Text>
                <Switch
                  value={visible}
                  onValueChange={(v) => toggleVisibility(key, v)}
                />
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleReset}
          activeOpacity={0.7}
          className="mt-6 py-3 items-center bg-white rounded-xl"
        >
          <Text className="text-rose-600 font-medium">Reset to default</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="mt-3 py-3 items-center"
        >
          <Text className="text-primary font-medium">Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
