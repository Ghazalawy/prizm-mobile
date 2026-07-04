import { View, Text, TouchableOpacity } from "react-native";
import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { rtlTextStyle } from "@/lib/rtl";
import { density } from "@/lib/theme";

export type DenseListRowProps = {
  title: string;
  subtitle?: string;
  leftAccent?: ReactNode;
  rightMeta?: ReactNode;
  badges?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
};

/** Compact list row with left content + right metadata column. */
export function DenseListRow({
  title,
  subtitle,
  leftAccent,
  rightMeta,
  badges,
  onPress,
  showChevron = !!onPress,
}: DenseListRowProps) {
  const content = (
    <View
      className="flex-row items-center border-b border-slate-100"
      style={{ minHeight: density.compact.rowHeight, paddingVertical: 8 }}
    >
      {leftAccent}
      <View className="flex-1 min-w-0">
        <Text
          className="text-sm font-medium text-foreground"
          numberOfLines={1}
          style={rtlTextStyle(title)}
        >
          {title}
        </Text>
        {badges ? <View className="flex-row items-center flex-wrap mt-1 gap-1">{badges}</View> : null}
        {subtitle ? (
          <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightMeta ? (
        <View className="items-end ml-2 shrink-0">{rightMeta}</View>
      ) : null}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginLeft: 4 }} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}
