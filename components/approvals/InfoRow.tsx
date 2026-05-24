import { View, Text } from "react-native";
import type { TextStyle } from "react-native";
import { rtlTextStyle } from "@/lib/rtl";

/**
 * Two-column label/value row used inside approval / detail cards. Right
 * column auto-detects Arabic content and flips to RTL alignment.
 */
export function InfoRow({
  label,
  value,
  numberOfLines,
  valueStyle,
}: {
  label: string;
  value: string | number | null | undefined;
  numberOfLines?: number;
  valueStyle?: TextStyle;
}) {
  const display = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <View className="flex-row py-2 border-b border-slate-100 last:border-0">
      <Text className="text-xs text-muted w-[36%] uppercase tracking-wide">{label}</Text>
      <Text
        className="flex-1 text-sm text-foreground"
        numberOfLines={numberOfLines}
        style={[rtlTextStyle(display), valueStyle]}
      >
        {display}
      </Text>
    </View>
  );
}
