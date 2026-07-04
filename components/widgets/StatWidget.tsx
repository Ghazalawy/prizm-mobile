import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { WidgetDef } from "@/lib/widget-registry";
import { density } from "@/lib/theme";

export type SecondaryMetric = {
  label: string;
  value: number | string;
  color?: string;
};

type StatWidgetProps = {
  widget: WidgetDef;
  value: number | undefined;
  isLoading: boolean;
  isError: boolean;
  footnote?: string;
  isDragging?: boolean;
  variant?: "default" | "compact" | "rich";
  secondaryMetrics?: SecondaryMetric[];
};

export function StatWidget({
  widget,
  value,
  isLoading,
  isError,
  footnote,
  isDragging,
  variant = "default",
  secondaryMetrics,
}: StatWidgetProps) {
  const isCompact = variant === "compact";
  const isRich = variant === "rich" || (secondaryMetrics && secondaryMetrics.length > 0);
  const pad = isCompact ? density.compact.cardPadding : 16;
  const valueSize = isCompact ? "text-2xl" : isRich ? "text-2xl" : "text-3xl";
  const iconSize = isCompact ? 18 : 22;
  const iconBox = isCompact ? "w-8 h-8" : "w-10 h-10";

  return (
    <TouchableOpacity
      onPress={isDragging ? undefined : () => router.push(widget.route as any)}
      activeOpacity={isDragging ? 1 : 0.6}
      className="bg-white rounded-2xl flex-1 shadow-sm"
      style={[
        { padding: pad, minHeight: isCompact ? density.compact.statTileHeight : undefined },
        isDragging ? { opacity: 0.95 } : undefined,
      ]}
    >
      <View className={`flex-row items-center justify-between ${isCompact ? "mb-1.5" : "mb-3"}`}>
        <View
          className={`${iconBox} rounded-xl items-center justify-center`}
          style={{ backgroundColor: `${widget.color}1A` }}
        >
          <Ionicons name={widget.icon as any} size={iconSize} color={widget.color} />
        </View>
        <Ionicons
          name={isError ? "warning-outline" : "chevron-forward"}
          size={16}
          color={isError ? "#EF4444" : "#94A3B8"}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator color={widget.color} />
      ) : (
        <Text className={`${valueSize} font-bold text-foreground`}>
          {isError ? "—" : (value ?? 0).toLocaleString()}
        </Text>
      )}
      {isRich && secondaryMetrics && secondaryMetrics.length > 0 ? (
        <View className="flex-row flex-wrap mt-1.5 gap-1">
          {secondaryMetrics.map((m) => (
            <View
              key={m.label}
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: m.color ? `${m.color}18` : "#F1F5F9" }}
            >
              <Text
                className="text-[9px] font-semibold uppercase"
                style={{ color: m.color ?? "#64748B" }}
              >
                {m.value} {m.label}
              </Text>
            </View>
          ))}
        </View>
      ) : footnote ? (
        <Text className="text-[10px] text-muted mt-1" numberOfLines={isRich ? 2 : 1}>
          {footnote}
        </Text>
      ) : (
        <Text className="text-xs text-muted mt-1 uppercase tracking-wide">
          {widget.title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
