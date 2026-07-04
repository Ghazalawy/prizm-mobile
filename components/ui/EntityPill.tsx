import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type EntityPillProps = {
  label: string;
  color?: string;
  bg?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Module type badge — e.g. "Payment Request", "Purchase Order". */
export function EntityPill({
  label,
  color = "#0369A1",
  bg = "#E0F2FE",
  icon,
}: EntityPillProps) {
  return (
    <View
      className="flex-row items-center self-start px-2 py-0.5 rounded-md"
      style={{ backgroundColor: bg }}
    >
      {icon ? <Ionicons name={icon} size={12} color={color} style={{ marginRight: 4 }} /> : null}
      <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
