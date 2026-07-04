import { View, Text } from "react-native";
import type { ReactNode } from "react";
import { rtlTextStyle } from "@/lib/rtl";

export type MetaGridCell = {
  label: string;
  value: ReactNode;
  /** Span full width (both columns) */
  fullWidth?: boolean;
};

type MetaGridProps = {
  cells: MetaGridCell[];
};

/**
 * Two-column metadata grid for detail heroes — fills horizontal space evenly.
 */
export function MetaGrid({ cells }: MetaGridProps) {
  return (
    <View className="flex-row flex-wrap -mx-1 mt-2">
      {cells.map((cell, idx) => (
        <View
          key={`${cell.label}-${idx}`}
          className="px-1 mb-2"
          style={{ width: cell.fullWidth ? "100%" : "50%" }}
        >
          <Text className="text-[10px] uppercase tracking-wide text-muted mb-0.5">
            {cell.label}
          </Text>
          {typeof cell.value === "string" || typeof cell.value === "number" ? (
            <Text
              className="text-sm font-semibold text-foreground"
              numberOfLines={2}
              style={rtlTextStyle(String(cell.value))}
            >
              {cell.value}
            </Text>
          ) : (
            cell.value
          )}
        </View>
      ))}
    </View>
  );
}
