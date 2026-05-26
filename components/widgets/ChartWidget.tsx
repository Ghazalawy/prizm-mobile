import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { WidgetDef } from "@/lib/widget-registry";

export type ChartSegment = {
  label: string;
  value: number;
  color: string;
};

type ChartWidgetProps = {
  widget: WidgetDef;
  segments: ChartSegment[];
  isLoading: boolean;
  isError: boolean;
  isDragging?: boolean;
};

function MiniDonut({ segments, size = 64 }: { segments: ChartSegment[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return (
      <View
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#F1F5F9" }}
        className="items-center justify-center"
      >
        <Text className="text-xs text-muted">0</Text>
      </View>
    );
  }

  let cumulative = 0;
  const bars = segments.filter((s) => s.value > 0);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      {/* Simple bar-based donut approximation using stacked views */}
      <View className="flex-row flex-wrap" style={{ width: size, height: 8, borderRadius: 4, overflow: "hidden" }}>
        {bars.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          return (
            <View
              key={i}
              style={{ width: `${pct}%` as any, height: 8, backgroundColor: seg.color }}
            />
          );
        })}
      </View>
      <Text className="text-lg font-bold text-foreground mt-2">{total}</Text>
      <Text className="text-[10px] text-muted">total</Text>
    </View>
  );
}

export function ChartWidget({
  widget,
  segments,
  isLoading,
  isError,
  isDragging,
}: ChartWidgetProps) {
  return (
    <TouchableOpacity
      onPress={isDragging ? undefined : () => router.push(widget.route as any)}
      activeOpacity={isDragging ? 1 : 0.6}
      className="bg-white rounded-2xl p-4 flex-1 shadow-sm"
      style={isDragging ? { opacity: 0.95 } : undefined}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View
            className="w-8 h-8 rounded-lg items-center justify-center"
            style={{ backgroundColor: `${widget.color}1A` }}
          >
            <Ionicons name={widget.icon as any} size={16} color={widget.color} />
          </View>
          <Text className="text-sm font-semibold text-foreground ml-2">{widget.title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>

      {isLoading ? (
        <View className="items-center py-4">
          <ActivityIndicator color={widget.color} />
        </View>
      ) : isError ? (
        <View className="items-center py-4">
          <Ionicons name="warning-outline" size={24} color="#EF4444" />
          <Text className="text-xs text-muted mt-1">Failed to load</Text>
        </View>
      ) : (
        <View className="flex-row items-center">
          <MiniDonut segments={segments} />
          <View className="flex-1 ml-3">
            {segments.slice(0, 4).map((seg, i) => (
              <View key={i} className="flex-row items-center mb-1">
                <View
                  style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color }}
                />
                <Text className="text-xs text-muted ml-1.5 flex-1" numberOfLines={1}>
                  {seg.label}
                </Text>
                <Text className="text-xs font-medium text-foreground">{seg.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
