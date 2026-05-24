import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rtlTextStyle } from "@/lib/rtl";

type Tone = "pending" | "your-turn" | "approved" | "rejected" | "neutral";

const TONE_STYLES: Record<Tone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  "pending":   { bg: "#FEF3C7", fg: "#B45309", icon: "time-outline" },
  "your-turn": { bg: "#DBEAFE", fg: "#1D4ED8", icon: "person-circle-outline" },
  "approved":  { bg: "#DCFCE7", fg: "#15803D", icon: "checkmark-circle" },
  "rejected":  { bg: "#FEE2E2", fg: "#B91C1C", icon: "close-circle" },
  "neutral":   { bg: "#F1F5F9", fg: "#475569", icon: "ellipse-outline" },
};

/**
 * Top section of an approval screen: title + status pill explaining
 * what state the record is in.
 */
export function ApprovalHeader({
  title,
  subtitle,
  statusLabel,
  tone,
}: {
  title: string;
  subtitle?: string;
  statusLabel: string;
  tone: Tone;
}) {
  const t = TONE_STYLES[tone];
  return (
    <View className="bg-white rounded-2xl px-4 py-4 mb-3 shadow-sm">
      <Text
        className="text-base font-bold text-foreground"
        numberOfLines={2}
        style={rtlTextStyle(title)}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-xs text-muted mt-0.5" numberOfLines={1} style={rtlTextStyle(subtitle)}>
          {subtitle}
        </Text>
      ) : null}
      <View
        className="flex-row items-center self-start px-3 py-1 rounded-full mt-3"
        style={{ backgroundColor: t.bg }}
      >
        <Ionicons name={t.icon} size={14} color={t.fg} />
        <Text className="text-xs font-medium ml-1.5" style={{ color: t.fg }}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}
