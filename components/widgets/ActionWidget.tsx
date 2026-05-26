import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { WidgetDef } from "@/lib/widget-registry";

type ActionWidgetProps = {
  widget: WidgetDef;
  /** Primary status label (e.g. "Clocked In", "Not clocked in") */
  statusLabel: string;
  /** Status color — green if active, muted otherwise */
  statusColor: string;
  /** Optional secondary info line */
  detail?: string;
  isLoading: boolean;
  isError: boolean;
  isDragging?: boolean;
  onAction?: () => void;
};

export function ActionWidget({
  widget,
  statusLabel,
  statusColor,
  detail,
  isLoading,
  isError,
  isDragging,
  onAction,
}: ActionWidgetProps) {
  const handlePress = () => {
    if (isDragging) return;
    if (onAction) {
      onAction();
    } else {
      router.push(widget.route as any);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
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
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
      {isLoading ? (
        <ActivityIndicator color={widget.color} />
      ) : isError ? (
        <View>
          <Text className="text-sm font-medium text-foreground">—</Text>
          <Text className="text-xs text-muted mt-0.5">Error</Text>
        </View>
      ) : (
        <View>
          <View className="flex-row items-center">
            <View
              style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }}
              className="mr-1.5"
            />
            <Text className="text-sm font-semibold" style={{ color: statusColor }}>
              {statusLabel}
            </Text>
          </View>
          {detail ? (
            <Text className="text-xs text-muted mt-1" numberOfLines={1}>
              {detail}
            </Text>
          ) : (
            <Text className="text-xs text-muted mt-1 uppercase tracking-wide">
              {widget.title}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
