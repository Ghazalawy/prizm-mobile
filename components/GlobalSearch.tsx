import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useState, useCallback, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { rtlTextStyle } from "@/lib/rtl";
import {
  useGlobalSearch,
  useRecentSearches,
  useSaveRecentSearch,
  useClearRecentSearches,
  type SearchResultGroup,
  type SearchResultItem,
} from "@/lib/queries/search";
import { BASE_URL } from "@/lib/config";
import { Linking } from "react-native";

// ─── Module icon map ─────────────────────────────────────────────────────

const MODULE_ICONS: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  customers: { icon: "business-outline", color: "#8B5CF6" },
  contacts: { icon: "people-outline", color: "#0EA5E9" },
  staff: { icon: "person-outline", color: "#475569" },
  projects: { icon: "folder-outline", color: "#0284C7" },
  tasks: { icon: "checkbox-outline", color: colors.primary },
  invoices: { icon: "document-text-outline", color: "#EF4444" },
  estimates: { icon: "calculator-outline", color: "#16A34A" },
  expenses: { icon: "receipt-outline", color: "#EA580C" },
  leads: { icon: "trending-up-outline", color: "#16A34A" },
  tickets: { icon: "chatbubble-ellipses-outline", color: "#6366F1" },
  contracts: { icon: "document-outline", color: "#7C3AED" },
  proposals: { icon: "newspaper-outline", color: "#0369A1" },
  credit_note: { icon: "card-outline", color: "#DC2626" },
  knowledge_base: { icon: "book-outline", color: "#CA8A04" },
};

function moduleIcon(type: string) {
  return (
    MODULE_ICONS[type] ?? {
      icon: "ellipse-outline" as const,
      color: "#64748B",
    }
  );
}

function moduleName(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function navigateToResult(item: SearchResultItem) {
  const link = item.link;
  if (!link) return;

  // Try to map Perfex admin links to mobile routes
  const mobileRoute = mapToMobileRoute(link, item.type);
  if (mobileRoute) {
    router.push(mobileRoute as any);
    return;
  }

  // Fallback: open in browser
  const url = link.startsWith("http")
    ? link
    : `${BASE_URL}/MS/admin/${link.replace(/^\/+/, "")}`;
  Linking.openURL(url).catch(() => undefined);
}

function mapToMobileRoute(link: string, type: string): string | null {
  const idMatch = link.match(/\/(\d+)$/);
  const id = idMatch ? idMatch[1] : null;

  if (!id) return null;

  switch (type) {
    case "customers":
      return `/(tabs)/customers/${id}`;
    case "projects":
      return `/(tabs)/projects/${id}`;
    case "tasks":
      return `/(tabs)/tasks/${id}`;
    case "invoices":
      return `/(tabs)/erp/invoices/${id}`;
    case "leads":
      return `/(tabs)/erp/leads/${id}`;
    case "tickets":
      return `/(tabs)/erp/tickets/${id}`;
    case "contracts":
      return `/(tabs)/erp/contracts/${id}`;
    case "expenses":
      return `/(tabs)/erp/expenses/${id}`;
    case "knowledge_base":
      return `/(tabs)/knowledge/${id}`;
    default:
      return null;
  }
}

// ─── Main Component ──────────────────────────────────────────────────────

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchResults = useGlobalSearch(debouncedQuery);
  const recentSearches = useRecentSearches();
  const saveRecent = useSaveRecentSearch();
  const clearRecent = useClearRecentSearches();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onChangeText = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
    }, 300);
  }, []);

  const submitSearch = useCallback(
    (term: string) => {
      if (term.trim().length >= 2) {
        saveRecent.mutate(term.trim());
      }
    },
    [saveRecent],
  );

  const useRecent = useCallback(
    (term: string) => {
      setQuery(term);
      setDebouncedQuery(term);
      Keyboard.dismiss();
    },
    [],
  );

  const groups = searchResults.data ?? [];
  const showRecent =
    debouncedQuery.length < 2 &&
    (recentSearches.data?.length ?? 0) > 0;
  const showResults = debouncedQuery.length >= 2;
  const noResults =
    showResults && !searchResults.isLoading && groups.length === 0;

  return (
    <View className="flex-1 bg-surface">
      {/* Search header */}
      <View className="bg-white border-b border-slate-200 px-4 pt-2 pb-3">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#475569" />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5">
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={onChangeText}
              onSubmitEditing={() => submitSearch(query)}
              placeholder="Search everything..."
              className="flex-1 text-sm text-foreground ml-2"
              placeholderTextColor="#94A3B8"
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setDebouncedQuery("");
                  inputRef.current?.focus();
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Loading */}
        {searchResults.isLoading && showResults && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginTop: 24 }}
          />
        )}

        {/* Recent searches */}
        {showRecent && (
          <View className="px-4 pt-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-bold text-foreground">
                Recent Searches
              </Text>
              <TouchableOpacity
                onPress={() => clearRecent.mutate()}
                hitSlop={8}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: colors.primary }}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
            {(recentSearches.data ?? []).map((term, i) => (
              <TouchableOpacity
                key={`${term}-${i}`}
                onPress={() => useRecent(term)}
                className="flex-row items-center py-2.5 border-b border-slate-100"
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color="#94A3B8"
                />
                <Text className="text-sm text-foreground ml-3 flex-1">
                  {term}
                </Text>
                <Ionicons
                  name="arrow-forward-outline"
                  size={14}
                  color="#CBD5E1"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No results */}
        {noResults && (
          <View className="items-center py-16">
            <Ionicons name="search-outline" size={48} color="#CBD5E1" />
            <Text className="text-sm text-muted mt-3">
              No results for "{debouncedQuery}"
            </Text>
          </View>
        )}

        {/* Search results grouped by module */}
        {showResults &&
          groups.map((group) => {
            if (!group.result || group.result.length === 0) return null;
            const meta = moduleIcon(group.type);
            const displayResults = group.result.slice(0, 3);
            const hasMore = group.result.length > 3;

            return (
              <View key={group.type} className="px-4 mt-4">
                {/* Group header */}
                <View className="flex-row items-center mb-2">
                  <View
                    className="w-7 h-7 rounded-lg items-center justify-center"
                    style={{ backgroundColor: `${meta.color}1A` }}
                  >
                    <Ionicons
                      name={meta.icon}
                      size={14}
                      color={meta.color}
                    />
                  </View>
                  <Text className="text-sm font-bold text-foreground ml-2">
                    {moduleName(group.type)}
                  </Text>
                  <View className="px-1.5 py-0.5 rounded ml-2 bg-slate-100">
                    <Text className="text-[10px] font-semibold text-muted">
                      {group.result.length}
                    </Text>
                  </View>
                </View>

                {/* Results */}
                {displayResults.map((item, i) => (
                  <TouchableOpacity
                    key={`${group.type}-${i}`}
                    onPress={() => {
                      submitSearch(query);
                      navigateToResult(item);
                    }}
                    activeOpacity={0.7}
                    className="flex-row items-center bg-white rounded-xl px-3 py-3 mb-1.5"
                  >
                    <Ionicons
                      name={meta.icon}
                      size={16}
                      color={meta.color}
                    />
                    <Text
                      className="text-sm text-foreground ml-3 flex-1"
                      numberOfLines={1}
                      style={rtlTextStyle(item.title)}
                    >
                      {item.title}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#CBD5E1"
                    />
                  </TouchableOpacity>
                ))}

                {hasMore && (
                  <TouchableOpacity
                    onPress={() => {
                      // Could navigate to a filtered module list in the future
                    }}
                    className="py-2 items-center"
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: colors.primary }}
                    >
                      View all {group.result.length} results
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}
