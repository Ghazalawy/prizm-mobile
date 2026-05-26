import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { listEntities, normalizeList, type ListParams } from "@/lib/api";
import {
  getModule,
  getModulePermissionFeatures,
  isCrudEnabled,
  moduleId,
  moduleSubtitle,
  moduleTitle,
  ModuleDefinition,
} from "@/lib/module-registry";
import { usePermissions } from "@/lib/permission-context";
import { StatusBadge } from "./StatusBadge";
import { FilterPanel, activeFilterCount, type FilterValues } from "./FilterPanel";
import { SortPicker, type SortState } from "./SortPicker";

type CrudListScreenProps = {
  moduleKey: string;
  basePath?: string;
  titleOverride?: string;
};

const PAGE_SIZE = 25;

export function CrudListScreen({ moduleKey, basePath, titleOverride }: CrudListScreenProps) {
  const module = getModule(moduleKey);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});
  const [sort, setSort] = useState<SortState | undefined>(module?.defaultSort);
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortVisible, setSortVisible] = useState(false);
  const permissions = usePermissions();
  const flatListRef = useRef<FlatList>(null);

  const filterParams = useMemo(() => buildApiFilterParams(filters), [filters]);

  const q = useInfiniteQuery({
    queryKey: ["crud", moduleKey, "list", { search, filters: filterParams, sort }],
    queryFn: ({ pageParam = 0 }) => {
      if (!module) return Promise.resolve({ data: [], total: 0 });
      const params: ListParams = {
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset: pageParam as number,
        ...filterParams,
      };
      if (sort) {
        params.sort = sort.field;
        params.sort_dir = sort.direction;
      }
      return listEntities(module.endpoint, params);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const { items, total } = normalizeList(lastPage);
      const loaded = allPages.reduce(
        (acc, page) => acc + normalizeList(page).items.length,
        0,
      );
      if (items.length < PAGE_SIZE) return undefined;
      if (total > 0 && loaded >= total) return undefined;
      return loaded;
    },
    enabled: !!module,
  });

  const { rows, totalCount, hasServerTotal } = useMemo(() => {
    const allItems: any[] = [];
    let serverTotal = 0;
    let hasTotal = false;

    for (const page of q.data?.pages ?? []) {
      const normalized = normalizeList(page);
      allItems.push(...normalized.items);
      if (normalized.total > 0) {
        serverTotal = normalized.total;
        hasTotal = true;
      }
    }

    const unique = uniqueRowsById(module, allItems);
    const filtered = clientSideFilter(module, unique, search, filterParams);
    const sorted = clientSideSort(module, filtered, sort);

    return {
      rows: sorted,
      totalCount: hasTotal ? serverTotal : sorted.length,
      hasServerTotal: hasTotal,
    };
  }, [module, q.data, search, sort, filterParams]);

  const filterCount = activeFilterCount(filters);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const loadMore = useCallback(() => {
    if (q.hasNextPage && !q.isFetchingNextPage) {
      q.fetchNextPage();
    }
  }, [q]);

  const removeFilter = useCallback(
    (key: string) => {
      setFilters((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  if (!module) {
    return <MissingModule moduleKey={moduleKey} />;
  }

  const path = basePath || `/(tabs)/erp/${module.key}`;
  const isLoading = q.isLoading && !q.data;
  const isEmpty = !isLoading && !q.isError && rows.length === 0;
  const hasActiveFilters = filterCount > 0 || search.trim() !== "";

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
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
              {hasServerTotal ? `${totalCount} total` : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
            </Text>
          </View>
          {isCrudEnabled(module, "create") && canCreateModule(module, permissions) ? (
            <TouchableOpacity
              onPress={() => router.push(`${path}/new` as any)}
              className="w-10 h-10 rounded-xl bg-primary items-center justify-center"
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search + filter/sort bar */}
        <View className="flex-row items-center mt-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
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

          {/* Filter button */}
          <TouchableOpacity
            onPress={() => setFilterVisible(true)}
            className="ml-2 w-10 h-10 rounded-xl bg-gray-100 items-center justify-center"
            activeOpacity={0.75}
          >
            <Ionicons name="funnel-outline" size={18} color={filterCount > 0 ? "#0284C7" : "#64748B"} />
            {filterCount > 0 ? (
              <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{filterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Sort button */}
          <TouchableOpacity
            onPress={() => setSortVisible(true)}
            className="ml-2 w-10 h-10 rounded-xl bg-gray-100 items-center justify-center"
            activeOpacity={0.75}
          >
            <Ionicons
              name={sort ? (sort.direction === "asc" ? "arrow-up" : "arrow-down") : "swap-vertical-outline"}
              size={18}
              color={sort ? "#0284C7" : "#64748B"}
            />
          </TouchableOpacity>
        </View>

        {/* Quick status filter chips */}
        {module.statusField && module.statusOptions && module.statusOptions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8 }}
          >
            <TouchableOpacity
              onPress={() => {
                setFilters((prev) => {
                  const next = { ...prev };
                  delete next[module.statusField!];
                  return next;
                });
              }}
              className="px-3 py-1.5 rounded-full mr-2"
              style={{
                backgroundColor: !filters[module.statusField] ? module.color : "#F1F5F9",
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: !filters[module.statusField] ? "#FFFFFF" : "#64748B" }}
              >
                All
              </Text>
            </TouchableOpacity>
            {module.statusOptions.map((opt) => {
              const active = String(filters[module.statusField!]) === String(opt.value);
              const chipColor = opt.color || module.color;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  onPress={() => {
                    setFilters((prev) => ({
                      ...prev,
                      [module.statusField!]: active ? undefined : String(opt.value),
                    }));
                  }}
                  className="px-3 py-1.5 rounded-full mr-2"
                  style={{ backgroundColor: active ? chipColor : "#F1F5F9" }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: active ? "#FFFFFF" : chipColor }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Active filter chips (non-status) */}
        {filterCount > 0 ? (
          <View className="flex-row flex-wrap mt-2">
            {Object.entries(filters).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              if (key === module.statusField) return null;
              const label = chipLabel(module, key, value);
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => removeFilter(key)}
                  className="flex-row items-center bg-primary/10 rounded-full px-3 py-1 mr-1.5 mb-1.5"
                  activeOpacity={0.7}
                >
                  <Text className="text-primary text-xs font-medium mr-1" numberOfLines={1}>
                    {label}
                  </Text>
                  <Ionicons name="close-circle" size={14} color="#0284C7" />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Content */}
      {isLoading ? (
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
      ) : isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name={hasActiveFilters ? "filter-outline" as any : module.icon as any} size={48} color="#94A3B8" />
          <Text className="text-foreground font-semibold mt-3">
            {hasActiveFilters ? "No results match your filters" : `No ${module.plural.toLowerCase()} yet`}
          </Text>
          {hasActiveFilters ? (
            <TouchableOpacity
              onPress={() => {
                setFilters({});
                setSearch("");
              }}
              className="mt-3 bg-gray-100 px-5 py-2 rounded-lg"
              activeOpacity={0.75}
            >
              <Text className="text-foreground font-medium">Clear filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={rows}
          keyExtractor={(item, index) => moduleId(module, item) || `${module.key}-${index}`}
          renderItem={({ item }) => (
            <ListRow
              module={module}
              item={item}
              path={path}
            />
          )}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={ListSeparator}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={module.color} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={module.color} />
                <Text className="text-muted text-xs mt-1">Loading more…</Text>
              </View>
            ) : null
          }
          initialNumToRender={18}
          windowSize={10}
        />
      )}

      {/* Filter panel modal */}
      <FilterPanel
        module={module}
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onApply={setFilters}
      />

      {/* Sort picker modal */}
      <SortPicker
        module={module}
        visible={sortVisible}
        onClose={() => setSortVisible(false)}
        sort={sort}
        onSort={setSort}
      />
    </View>
  );
}

const ListRow = memo(function ListRow({
  module,
  item,
  path,
}: {
  module: ModuleDefinition;
  item: any;
  path: string;
}) {
  const statusValue = module.statusField ? item[module.statusField] : undefined;

  return (
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
          <View className="flex-row items-center mt-1">
            {statusValue !== undefined && statusValue !== null && String(statusValue) !== "" ? (
              <View className="mr-2">
                <StatusBadge value={statusValue} statusOptions={module.statusOptions} />
              </View>
            ) : null}
            {moduleSubtitle(module, item) ? (
              <Text className="text-xs text-muted flex-1" numberOfLines={1}>
                {moduleSubtitle(module, item)}
              </Text>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
});

const ListSeparator = memo(function ListSeparator() {
  return <View className="h-2" />;
});

// --- Helpers ---

function clientSideFilter(
  module: ModuleDefinition | undefined,
  rows: any[],
  search: string,
  filters?: Record<string, string>,
): any[] {
  if (!module) return [];
  let result = rows;

  // Apply field filters (status, priority, etc.)
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      const values = value.split(",");
      result = result.filter((row) => {
        const rowVal = String(row?.[key] ?? "");
        return values.includes(rowVal);
      });
    }
  }

  // Apply text search
  const needle = search.trim().toLowerCase();
  if (!needle) return result;
  const keys = Array.from(
    new Set([...(module.searchFields || []), ...module.titleFields, ...(module.subtitleFields || [])]),
  );
  return result.filter((row) =>
    keys.some((key) => String(row?.[key] ?? "").toLowerCase().includes(needle)),
  );
}

function clientSideSort(
  module: ModuleDefinition | undefined,
  rows: any[],
  sort: SortState | undefined,
): any[] {
  if (!module || !sort) return rows;
  const { field, direction } = sort;
  const mult = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const va = a?.[field];
    const vb = b?.[field];

    if (va === undefined || va === null) return 1;
    if (vb === undefined || vb === null) return -1;

    const na = Number(va);
    const nb = Number(vb);
    if (!isNaN(na) && !isNaN(nb)) return (na - nb) * mult;

    return String(va).localeCompare(String(vb), undefined, { numeric: true }) * mult;
  });
}

function buildApiFilterParams(filters: FilterValues): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 1) {
        params[key] = value[0];
      } else if (value.length > 1) {
        params[key] = value.join(",");
      }
    } else if (value !== "") {
      params[key] = value;
    }
  }
  return params;
}

function chipLabel(module: ModuleDefinition, key: string, value: string | string[] | undefined): string {
  if (!value) return key;
  const field = module.fields.find((f) => f.key === key);
  const label = field?.label || humanize(key);

  if (Array.isArray(value)) {
    if (module.statusField === key && module.statusOptions?.length) {
      const labels = value
        .map((v) => module.statusOptions!.find((o) => String(o.value) === v)?.label || v)
        .join(", ");
      return `${label}: ${labels}`;
    }
    if (field?.options?.length) {
      const labels = value
        .map((v) => field.options!.find((o) => String(o.value) === v)?.label || v)
        .join(", ");
      return `${label}: ${labels}`;
    }
    return `${label}: ${value.join(", ")}`;
  }

  if (value.includes("..")) {
    const [from, to] = value.split("..").map((s) => s.trim());
    if (from && to) return `${label}: ${from} – ${to}`;
    if (from) return `${label}: ≥ ${from}`;
    if (to) return `${label}: ≤ ${to}`;
  }

  if (key === "billable" || field?.type === "boolean") {
    return `${label}: ${value === "1" ? "Yes" : "No"}`;
  }

  return `${label}: ${value}`;
}

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

function canCreateModule(
  module: ModuleDefinition,
  permissions: ReturnType<typeof usePermissions>,
): boolean {
  const features = getModulePermissionFeatures(module);
  if (features.length === 0) return true;
  return features.some((f) => permissions.canCreate(f));
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
