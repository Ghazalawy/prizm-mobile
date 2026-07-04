import { View, type ViewProps } from "react-native";
import { density, shadows } from "@/lib/theme";

type DenseCardProps = ViewProps & {
  children: React.ReactNode;
  /** Use compact padding (12px) by default */
  compact?: boolean;
};

/** White surface card with compact padding for dense layouts. */
export function DenseCard({ children, compact = true, style, className, ...rest }: DenseCardProps) {
  const pad = compact ? density.compact.cardPadding : density.comfortable.cardPadding;
  return (
    <View
      className={`bg-white rounded-2xl shadow-sm mb-3 ${className ?? ""}`}
      style={[{ padding: pad }, shadows.sm, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
