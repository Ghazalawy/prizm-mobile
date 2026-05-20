import {
  View,
  Text,
  FlatList,
  TextInput,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useCallback, useMemo, ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { normalizeList, ListResult } from "@/lib/api";

type EntityListProps<T> = {
  /** Display title at top of screen */
  title: string;
  /** Ionicons name for the empty-state icon */
  icon: keyof typeof Ionicons.glyphMap;
  /** React Query key root (e.g. ["tasks"]) — search is appended */
  queryKey: readonly unknown[];
  /** Fetch function taking optional {search, limit}; returns raw API response */
  fetcher: (params: { search?: string; limit?: number }) => Promise<any>;
  /** Render one row */
  renderItem: (item: T) => ReactNode;
  /** Function returning a unique string key for each item */
  keyExtractor: (item: T) => string;
  /** Tap handler for a row */
  onItemPress?: (item: T) => void;
  /** Placeholder text in the search input */
  searchPlaceholder?: string;
  /** Empty-state message */
  emptyMessage?: string;
};

const DEFAULT_LIMIT = 100;

/**
 * Generic list-of-entities screen: search bar at top, pull-to-refresh,
 * FlatList of cards, empty/error/loading states. Used by Tasks, Projects,
 * Customers, Leads, Invoices, etc.
 */
export function EntityList<T>({
  title,
  icon,
  queryKey,
  fetcher,
  renderItem,
  keyExtractor,
  onItemPress,
  searchPlaceholder = "Search…",
  emptyMessage = "No records found",
}: EntityListProps<T>) {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const q = useQuery({
    queryKey: [...queryKey, "list", { search }],
    queryFn: () => fetcher({ search: search.trim() || undefined, limit: DEFAULT_LIMIT }),
    keepPreviousData: true as any,
  });

  const list: ListResult<T> = useMemo(() => normalizeList(q.data), [q.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="px-4 pt-4 pb-2 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-foreground">{title}</Text>
        {list.total > 0 ? (
          <Text className="text-xs text-muted mt-0.5">
            {list.total} total{search ? ` · matching "${search}"` : ""}
          </Text>
        ) : null}
      </View>

      {/* Search bar */}
      <View className="px-4 pt-3 pb-2 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={searchPlaceholder}
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2 text-foreground"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Body */}
      {q.isLoading && !q.data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load</Text>
          <Text className="text-muted text-sm mt-1 text-center">
            {(q.error as Error)?.message || "Unknown error"}
          </Text>
          <TouchableOpacity
            onPress={() => q.refetch()}
            className="mt-4 bg-primary px-6 py-2 rounded-lg"
            activeOpacity={0.7}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : list.items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name={icon} size={48} color="#94A3B8" />
          <Text className="text-muted mt-3">{emptyMessage}</Text>
        </View>
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={onItemPress ? () => onItemPress(item) : undefined}
              disabled={!onItemPress}
              activeOpacity={onItemPress ? 0.7 : 1}
            >
              {renderItem(item)}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
          }
          ItemSeparatorComponent={() => <View className="h-2" />}
          removeClippedSubviews
          initialNumToRender={20}
          windowSize={10}
        />
      )}
    </View>
  );
}
