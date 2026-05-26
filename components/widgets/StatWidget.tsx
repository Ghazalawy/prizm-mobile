import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { WidgetDef } from "@/lib/widget-registry";

type StatWidgetProps = {
  widget: WidgetDef;
  value: number | undefined;
  isLoading: boolean;
  isError: boolean;
  footnote?: string;
  isDragging?: boolean;
};

export function StatWidget({
  widget,
  value,
  isLoading,
  isError,
  footnote,
  isDragging,
}: StatWidgetProps) {
  return (
    <TouchableOpacity
      onPress={isDragging ? undefined : () => router.push(widget.route as any)}
      activeOpacity={isDragging ? 1 : 0.6}
      className="bg-white rounded-2xl p-5 flex-1 shadow-sm"
      style={isDragging ? { opacity: 0.95 } : undefined}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${widget.color}1A` }}
        >
          <Ionicons name={widget.icon as any} size={22} color={widget.color} />
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
        <Text className="text-3xl font-bold text-foreground">
          {isError ? "—" : (value ?? 0).toLocaleString()}
        </Text>
      )}
      {footnote ? (
        <Text className="text-[10px] text-muted mt-1" numberOfLines={1}>
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
