import { View, Text, TouchableOpacity } from "react-native";
import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { rtlTextStyle } from "@/lib/rtl";
import { density } from "@/lib/theme";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
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
  eyebrow,
  icon,
  color = "#0284C7",
  onBack,
  rightAction,
  showBack = true,
}: ScreenHeaderProps) {
  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      className="flex-row items-center px-2 bg-white border-b border-slate-200"
      style={{ minHeight: Math.max(56, density.compact.minTouch) }}
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
      {icon ? (
        <View
          className="w-9 h-9 rounded-xl items-center justify-center mr-2"
          style={{ backgroundColor: `${color}16` }}
        >
          <Ionicons name={icon} size={19} color={color} />
        </View>
      ) : null}
      <View className="flex-1 px-1 py-1.5">
        {eyebrow ? (
          <Text
            className="text-[9px] font-bold uppercase tracking-[1.2px] mb-0.5"
            style={{ color }}
            numberOfLines={1}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          className="text-base font-bold text-foreground"
          numberOfLines={1}
          style={rtlTextStyle(title)}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-[11px] text-muted"
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
