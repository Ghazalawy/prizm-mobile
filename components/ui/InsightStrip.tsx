import { View, Text, TouchableOpacity, ScrollView } from "react-native";

export type InsightSegment = {
  label: string;
  value: string | number;
  color?: string;
  onPress?: () => void;
};

type InsightStripProps = {
  segments: InsightSegment[];
};

/** Single-line horizontal insight bar replacing bulky "At a Glance" chips. */
export function InsightStrip({ segments }: InsightStripProps) {
  if (segments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="px-4 py-1"
    >
      <View className="flex-row items-center bg-white rounded-xl px-3 py-2 shadow-sm">
        {segments.map((seg, idx) => {
          const inner = (
            <View className="flex-row items-center">
              <Text
                className="text-sm font-bold"
                style={{ color: seg.color ?? "#0F172A" }}
              >
                {seg.value}
              </Text>
              <Text className="text-xs text-muted ml-1">{seg.label}</Text>
              {idx < segments.length - 1 ? (
                <Text className="text-muted mx-2">·</Text>
              ) : null}
            </View>
          );
          if (seg.onPress) {
            return (
              <TouchableOpacity key={seg.label} onPress={seg.onPress} activeOpacity={0.7}>
                {inner}
              </TouchableOpacity>
            );
          }
          return <View key={seg.label}>{inner}</View>;
        })}
      </View>
    </ScrollView>
  );
}
