import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { listEntities, normalizeList } from "@/lib/api";
import {
  getModule,
  isCrudEnabled,
  moduleId,
  moduleSubtitle,
  moduleTitle,
  ModuleDefinition,
} from "@/lib/module-registry";

type CrudListScreenProps = {
  moduleKey: string;
  basePath?: string;
  titleOverride?: string;
};

const DEFAULT_LIMIT = 100;

export function CrudListScreen({ moduleKey, basePath, titleOverride }: CrudListScreenProps) {
  const module = getModule(moduleKey);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const q = useQuery({
    queryKey: ["crud", moduleKey, "list", { search }],
    queryFn: () =>
      module
        ? listEntities(module.endpoint, { search: search.trim() || undefined, limit: DEFAULT_LIMIT })
        : Promise.resolve([]),
    enabled: !!module,
  });

  const rows = useMemo(() => {
    const list = uniqueRowsById(module, normalizeList(q.data).items);
    return filterRows(module, list, search);
  }, [module, q.data, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  if (!module) {
    return <MissingModule moduleKey={moduleKey} />;
  }

  const path = basePath || `/(tabs)/erp/${module.key}`;

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${module.color}1A` }}
          >
            <Ionicons name={module.icon as any} size={22} color={module.color} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-foreground" numberOfLines={1}>
              {titleOverride || module.plural}
            </Text>
            <Text className="text-xs text-muted mt-0.5">
              {rows.length} record{rows.length === 1 ? "" : "s"}
            </Text>
          </View>
          {isCrudEnabled(module, "create") ? (
            <TouchableOpacity
              onPress={() => router.push(`${path}/new` as any)}
              className="w-10 h-10 rounded-xl bg-primary items-center justify-center"
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mt-3">
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${module.plural.toLowerCase()}`}
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2 text-foreground"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {q.isLoading && !q.data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={module.color} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load records</Text>
          <Text className="text-muted text-sm mt-1 text-center">
            {(q.error as Error)?.message || "Unknown error"}
          </Text>
          <TouchableOpacity
            onPress={() => q.refetch()}
            className="mt-4 bg-primary px-5 py-2 rounded-lg"
            activeOpacity={0.75}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name={module.icon as any} size={48} color="#94A3B8" />
          <Text className="text-muted mt-3">No records found</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => moduleId(module, item) || `${module.key}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`${path}/${encodeURIComponent(moduleId(module, item))}` as any)}
              activeOpacity={0.72}
              className="bg-white rounded-xl p-3 shadow-sm"
            >
              <View className="flex-row">
                <View
                  className="w-9 h-9 rounded-lg items-center justify-center"
                  style={{ backgroundColor: `${module.color}14` }}
                >
                  <Ionicons name={module.icon as any} size={18} color={module.color} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-foreground font-semibold" numberOfLines={2}>
                    {moduleTitle(module, item)}
                  </Text>
                  {moduleSubtitle(module, item) ? (
                    <Text className="text-xs text-muted mt-1" numberOfLines={1}>
                      {moduleSubtitle(module, item)}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={module.color} />
          }
          initialNumToRender={18}
          windowSize={10}
        />
      )}
    </View>
  );
}

function filterRows(module: ModuleDefinition | undefined, rows: any[], search: string): any[] {
  if (!module) return [];
  const needle = search.trim().toLowerCase();
  if (!needle) return rows;
  const keys = Array.from(
    new Set([...(module.searchFields || []), ...module.titleFields, ...(module.subtitleFields || [])])
  );
  return rows.filter((row) =>
    keys.some((key) => String(row?.[key] ?? "").toLowerCase().includes(needle))
  );
}

function uniqueRowsById(module: ModuleDefinition | undefined, rows: any[]): any[] {
  if (!module) return rows;
  const seen = new Set<string>();
  return rows.filter((row, index) => {
    const id = moduleId(module, row) || `${module.key}-${index}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function MissingModule({ moduleKey }: { moduleKey: string }) {
  return (
    <View className="flex-1 bg-surface items-center justify-center px-8">
      <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
      <Text className="text-foreground font-semibold mt-3">Module not found</Text>
      <Text className="text-muted text-sm mt-1 text-center">{moduleKey}</Text>
    </View>
  );
}
