import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteEntity, getEntity, listEntities, normalizeList } from "@/lib/api";
import {
  getModule,
  isCrudEnabled,
  moduleId,
  moduleSubtitle,
  moduleTitle,
  ModuleDefinition,
  ModuleField,
  ModuleTab,
  resolveTemplateValue,
} from "@/lib/module-registry";

type CrudDetailScreenProps = {
  moduleKey: string;
  id: string;
  basePath?: string;
};

export function CrudDetailScreen({ moduleKey, id, basePath }: CrudDetailScreenProps) {
  const module = getModule(moduleKey);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ["crud", moduleKey, "detail", id],
    queryFn: () => (module ? getEntity(module.endpoint, id, module.detailEndpoint) : Promise.resolve(null)),
    enabled: !!module && !!id,
  });

  const row = useMemo(() => unwrapRow(q.data), [q.data]);
  const path = basePath || `/(tabs)/erp/${module?.key || moduleKey}`;

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!module) throw new Error("Module not found");
      return deleteEntity(module.endpoint, id, module.deleteEndpoint);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crud", moduleKey] });
      router.back();
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  if (!module) {
    return <MissingModule moduleKey={moduleKey} />;
  }

  const tabs = [{ key: "summary", title: "Summary" }, ...(module.tabs || [])];

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-3 text-lg font-semibold text-foreground flex-1" numberOfLines={1}>
          {row ? moduleTitle(module, row) : module.title}
        </Text>
        {row && isCrudEnabled(module, "update") ? (
          <TouchableOpacity
            onPress={() => router.push(`${path}/${encodeURIComponent(id)}/edit` as any)}
            className="w-9 h-9 rounded-lg items-center justify-center bg-gray-100 mr-2"
          >
            <Ionicons name="create-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        ) : null}
        {row && isCrudEnabled(module, "delete") ? (
          <TouchableOpacity
            onPress={() => confirmDelete(module, deleteMutation.mutate)}
            className="w-9 h-9 rounded-lg items-center justify-center bg-red-50"
            disabled={deleteMutation.isPending}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        ) : null}
      </View>

      {q.isLoading && !row ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={module.color} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load record</Text>
          <Text className="text-muted text-sm mt-1 text-center">
            {(q.error as Error)?.message || "Unknown error"}
          </Text>
          <TouchableOpacity
            onPress={() => q.refetch()}
            className="mt-4 bg-primary px-5 py-2 rounded-lg"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !row ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-muted">Record not found</Text>
        </View>
      ) : (
        <>
          <View className="bg-white border-b border-gray-100">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10 }}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    activeTab === tab.key ? "bg-primary" : "bg-gray-100"
                  }`}
                  activeOpacity={0.75}
                >
                  <Text
                    className={`text-sm font-medium ${
                      activeTab === tab.key ? "text-white" : "text-foreground"
                    }`}
                  >
                    {tab.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {activeTab === "summary" ? (
            <ScrollView
              className="flex-1"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={module.color} />
              }
            >
              <RecordSummary module={module} row={row} />
            </ScrollView>
          ) : (
            <RelatedTab
              parentModule={module}
              parentRow={row}
              tab={module.tabs?.find((tab) => tab.key === activeTab)}
            />
          )}
        </>
      )}
    </View>
  );
}

function RecordSummary({ module, row }: { module: ModuleDefinition; row: any }) {
  const fields = useMemo(() => buildVisibleFields(module, row), [module, row]);
  const sections = useMemo(() => groupFields(fields), [fields]);
  const subtitle = moduleSubtitle(module, row);

  return (
    <View className="p-3">
      <View className="bg-white rounded-2xl p-5 mb-3 shadow-sm">
        <View className="flex-row">
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: `${module.color}1A` }}
          >
            <Ionicons name={module.icon as any} size={24} color={module.color} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-foreground" selectable>
              {moduleTitle(module, row)}
            </Text>
            {subtitle ? (
              <Text className="text-muted mt-1" selectable>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {sections.map(([section, sectionFields]) => (
        <View key={section} className="mb-3">
          <Text className="text-xs text-muted uppercase tracking-wide px-2 mb-1.5">
            {section}
          </Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {sectionFields.map((field, index) => (
              <View
                key={field.key}
                className={`px-4 py-3 ${index > 0 ? "border-t border-gray-100" : ""}`}
              >
                <Text className="text-xs text-muted">{field.label}</Text>
                <View className="mt-1">{renderValue(row[field.key], field.type)}</View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function RelatedTab({
  parentModule,
  parentRow,
  tab,
}: {
  parentModule: ModuleDefinition;
  parentRow: any;
  tab?: ModuleTab;
}) {
  if (!tab) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-muted">Tab not found</Text>
      </View>
    );
  }

  const child = getModule(tab.moduleKey);
  if (!child) return <MissingModule moduleKey={tab.moduleKey} />;

  const parentId = moduleId(parentModule, parentRow);
  const endpoint =
    tab.endpointTemplate?.replace(/\{id\}/g, encodeURIComponent(parentId)) || child.endpoint;

  const q = useQuery({
    queryKey: ["crud", parentModule.key, parentId, "tab", tab.key, endpoint],
    queryFn: () => listEntities(endpoint, { limit: 100 }),
  });

  const rows = useMemo(() => {
    let items = normalizeList(q.data).items;
    const parentField = tab.parentField || parentModule.idKey;
    const parentValue = String(parentRow?.[parentField] ?? parentId);
    if (tab.childField && !tab.endpointTemplate) {
      items = items.filter((row) => String(row?.[tab.childField || ""]) === parentValue);
    }
    if (tab.fixedFilters) {
      items = items.filter((row) =>
        Object.entries(tab.fixedFilters || {}).every(([key, value]) => String(row?.[key]) === String(value))
      );
    }
    return items;
  }, [q.data, parentModule.idKey, parentId, parentRow, tab]);

  const createParams = useMemo(() => {
    const values: Record<string, string> = {};
    Object.entries(tab.createDefaults || {}).forEach(([key, value]) => {
      values[key] = String(resolveTemplateValue(value, parentRow, parentId));
    });
    return values;
  }, [parentId, parentRow, tab.createDefaults]);

  return (
    <View className="flex-1">
      <View className="px-4 py-3 flex-row items-center justify-between bg-surface">
        <Text className="text-sm font-semibold text-foreground">
          {rows.length} {tab.title.toLowerCase()}
        </Text>
        {isCrudEnabled(child, "create") ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: `/(tabs)/erp/${child.key}/new` as any,
                params: createParams,
              })
            }
            className="flex-row items-center bg-primary rounded-lg px-3 py-2"
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={17} color="#FFFFFF" />
            <Text className="text-white font-medium ml-1">Add</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {q.isLoading && !q.data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={child.color} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-muted text-center">
            {(q.error as Error)?.message || "Could not load related records"}
          </Text>
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name={child.icon as any} size={44} color="#94A3B8" />
          <Text className="text-muted mt-3">No records found</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => moduleId(child, item) || `${child.key}-${index}`}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push(`/(tabs)/erp/${child.key}/${encodeURIComponent(moduleId(child, item))}` as any)
              }
              activeOpacity={0.72}
              className="bg-white rounded-xl p-3 shadow-sm"
            >
              <Text className="text-foreground font-semibold" numberOfLines={2}>
                {moduleTitle(child, item)}
              </Text>
              {moduleSubtitle(child, item) ? (
                <Text className="text-xs text-muted mt-1" numberOfLines={1}>
                  {moduleSubtitle(child, item)}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function confirmDelete(module: ModuleDefinition, onConfirm: () => void) {
  Alert.alert(
    `Delete ${module.title}`,
    "This action cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ],
    { cancelable: true }
  );
}

function unwrapRow(data: any): any {
  if (!data) return data;
  if (data.status === true && data.data) return Array.isArray(data.data) ? data.data[0] : data.data;
  if (Array.isArray(data)) return data[0];
  return data;
}

function buildVisibleFields(module: ModuleDefinition, row: any): ModuleField[] {
  const configured = module.fields.filter((field) => !isEmpty(row?.[field.key]));
  const known = new Set(module.fields.map((field) => field.key));
  const autoFields = Object.keys(row || {})
    .filter((key) => !known.has(key))
    .filter((key) => !["customfields", "attachments", "items", "client", "payments"].includes(key))
    .filter((key) => !isEmpty(row?.[key]) && typeof row?.[key] !== "object")
    .slice(0, 40)
    .map((key) => ({ key, label: humanize(key), section: "More" }));
  return [...configured, ...autoFields];
}

function groupFields(fields: ModuleField[]): Array<[string, ModuleField[]]> {
  const sections = new Map<string, ModuleField[]>();
  fields.forEach((field) => {
    const section = field.section || "Details";
    sections.set(section, [...(sections.get(section) || []), field]);
  });
  return Array.from(sections.entries());
}

function isEmpty(value: any): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "0000-00-00" ||
    value === "0000-00-00 00:00:00"
  );
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bId\b/g, "ID");
}

function renderValue(value: any, type?: string): ReactNode {
  if (isEmpty(value)) return <Text className="text-muted italic">-</Text>;
  const text = String(value);

  if (type === "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(`mailto:${text}`)}>
        <Text className="text-primary underline">{text}</Text>
      </TouchableOpacity>
    );
  }

  if (type === "phone") {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(`tel:${text.replace(/[^+\d]/g, "")}`)}>
        <Text className="text-primary underline">{text}</Text>
      </TouchableOpacity>
    );
  }

  if (type === "url" || /^https?:\/\//i.test(text)) {
    const url = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    return (
      <TouchableOpacity onPress={() => Linking.openURL(url)}>
        <Text className="text-primary underline" numberOfLines={2}>
          {text}
        </Text>
      </TouchableOpacity>
    );
  }

  if (type === "boolean") {
    const active = ["1", "on", "true", "yes"].includes(text.toLowerCase());
    return <Text className="text-foreground">{active ? "Yes" : "No"}</Text>;
  }

  return (
    <Text className="text-foreground" selectable>
      {text}
    </Text>
  );
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
