import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { WidgetDef } from "@/lib/widget-registry";

export type ListWidgetItem = {
  id: string | number;
  title: string;
  subtitle?: string;
  badge?: { label: string; color: string; bg: string };
};

type ListWidgetProps = {
  widget: WidgetDef;
  items: ListWidgetItem[];
  isLoading: boolean;
  isError: boolean;
  isDragging?: boolean;
  onItemPress?: (item: ListWidgetItem) => void;
};

export function ListWidget({
  widget,
  items,
  isLoading,
  isError,
  isDragging,
  onItemPress,
}: ListWidgetProps) {
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
      ) : items.length === 0 ? (
        <View className="items-center py-3">
          <Ionicons name="checkmark-circle-outline" size={20} color="#94A3B8" />
          <Text className="text-xs text-muted mt-1">Nothing here</Text>
        </View>
      ) : (
        <View>
          {items.slice(0, 5).map((item, i) => (
            <TouchableOpacity
              key={item.id}
              onPress={onItemPress ? () => onItemPress(item) : undefined}
              activeOpacity={0.7}
              className="flex-row items-center py-2"
              style={i < items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" } : undefined}
            >
              <View className="flex-1">
                <Text className="text-sm text-foreground" numberOfLines={1}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              {item.badge ? (
                <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: item.badge.bg }}>
                  <Text style={{ color: item.badge.color, fontSize: 10, fontWeight: "600" }}>
                    {item.badge.label}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
