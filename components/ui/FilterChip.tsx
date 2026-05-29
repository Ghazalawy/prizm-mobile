// ─── FilterChip ──────────────────────────────────────────────────────────
//
// Reusable filter chip pill used across all module list screens.
// Previously duplicated in LeadListScreen and ExpenseListScreen.
// Extracted here as the canonical implementation.

import { TouchableOpacity, Text } from "react-native";

export type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  /** Optional color for active state (defaults to theme primary) */
  color?: string;
  /** Show an X on the right when active (for removable chips) */
  removable?: boolean;
};

export function FilterChip({
  label,
  active,
  onPress,
  color = "#2563EB",
  removable = false,
}: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: active ? color + "18" : "#F1F5F9",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: active ? 1 : 0,
        borderColor: active ? color : "transparent",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Text
        style={{
          color: active ? color : "#64748B",
          fontSize: 12,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      {active && removable && (
        <Text style={{ color: color, fontSize: 12, fontWeight: "700" }}>
          ×
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default FilterChip;
