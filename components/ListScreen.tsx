import { View, Text, FlatList, RefreshControl, TouchableOpacity, TextInput } from "react-native";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";

type ListScreenProps<T> = {
  title: string;
  data: T[];
  isLoading: boolean;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  emptyText: string;
  onRefresh: () => Promise<void>;
  onItemPress: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  searchable?: boolean;
  searchFilter?: (item: T, query: string) => boolean;
};

export function ListScreen<T>({
  title,
  data,
  isLoading,
  emptyIcon,
  emptyText,
  onRefresh,
  onItemPress,
  renderItem,
  keyExtractor,
  searchable = false,
  searchFilter,
}: ListScreenProps<T>) {
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  const filteredData =
    searchable && search && searchFilter
      ? data.filter((item) => searchFilter(item, search))
      : data;

  return (
    <View className="flex-1 bg-surface">
      {searchable && (
        <View className="px-4 pt-4">
          <View className="bg-white rounded-xl flex-row items-center px-3 py-2 mb-2">
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChangeText={setSearch}
              className="flex-1 ml-2 text-foreground"
              placeholderTextColor="#94A3B8"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      <FlatList
        data={filteredData}
        keyExtractor={keyExtractor}
        contentContainerClassName="px-4 pb-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0284C7" />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Ionicons name={emptyIcon} size={48} color="#CBD5E1" />
            <Text className="text-muted mt-3 font-medium">
              {isLoading ? "Loading..." : emptyText}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onItemPress(item)}
            className="bg-white rounded-xl p-4 mb-3 shadow-sm"
            activeOpacity={0.7}
          >
            {renderItem(item)}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
