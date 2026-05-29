// ─── FilterBar ───────────────────────────────────────────────────────────
//
// Top-of-list filter bar with search input + filter count badge.
// Used by every module list screen for consistent UX.
//
// Props:
//   search: current search text
//   onSearchChange: callback for search text changes
//   searchPlaceholder: placeholder for the search input
//   activeFilterCount: number of active filters (shown in badge)
//   onFilterPress: opens the filter sheet/modal
//   onClearAll: clears all filters (rendered when filters are active)

import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type FilterBarProps = {
  search: string;
  onSearchChange: (text: string) => void;
  searchPlaceholder?: string;
  activeFilterCount: number;
  onFilterPress: () => void;
  onClearAll?: () => void;
};

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  activeFilterCount,
  onFilterPress,
  onClearAll,
}: FilterBarProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {/* Search input */}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#F1F5F9",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor="#94A3B8"
          style={{
            flex: 1,
            marginLeft: 8,
            fontSize: 14,
            color: "#1E293B",
          }}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange("")}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter button */}
      <TouchableOpacity
        onPress={onFilterPress}
        activeOpacity={0.7}
        style={{
          backgroundColor: activeFilterCount > 0 ? "#2563EB" : "#F1F5F9",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Ionicons
          name="options"
          size={16}
          color={activeFilterCount > 0 ? "#FFFFFF" : "#64748B"}
        />
        {activeFilterCount > 0 && (
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: "700",
              minWidth: 18,
              textAlign: "center",
            }}
          >
            {activeFilterCount}
          </Text>
        )}
      </TouchableOpacity>

      {/* Clear all */}
      {activeFilterCount > 0 && onClearAll && (
        <TouchableOpacity
          onPress={onClearAll}
          activeOpacity={0.7}
          style={{ padding: 4 }}
        >
          <Ionicons name="close" size={18} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default FilterBar;
