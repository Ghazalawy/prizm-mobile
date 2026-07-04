import { View, Text, TouchableOpacity } from "react-native";
import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { rtlTextStyle } from "@/lib/rtl";
import { density } from "@/lib/theme";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  /** Minimum 44px touch target for back button */
  showBack?: boolean;
};

/**
 * Dense entity screen header: module type + code/subtitle + optional actions.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  showBack = true,
}: ScreenHeaderProps) {
  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      className="flex-row items-center px-2 bg-surface"
      style={{ minHeight: density.compact.minTouch }}
    >
      {showBack ? (
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={10}
          className="p-2"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
      ) : (
        <View className="w-10" />
      )}
      <View className="flex-1 px-1">
        <Text
          className="text-sm font-bold text-foreground"
          numberOfLines={1}
          style={rtlTextStyle(title)}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-xs text-muted"
            numberOfLines={1}
            style={rtlTextStyle(subtitle)}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAction ?? <View className="w-10" />}
    </View>
  );
}
