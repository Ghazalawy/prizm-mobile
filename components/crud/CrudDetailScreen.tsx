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

type RelationKind = NonNullable<ModuleField["relation"]>;

type LookupMaps = Record<RelationKind, Map<string, string>>;

const LOOKUP_LIMIT = 500;
const LOOKUP_STALE_MS = 5 * 60 * 1000;

const EMPTY_SERIALIZED_VALUES = new Set([
  "a:0:{}",
  "[]",
  "{}",
  "null",
  "undefined",
  "n;",
  's:0:"";',
]);

const AUTO_FIELD_SKIP_KEYS = new Set([
  "id",
  "hash",
  "password",
  "password_hash",
  "token",
  "csrf_token",
  "authtoken",
  "new_pass_key",
  "new_pass_key_requested",
  "last_ip",
  "ip",
  "customfields",
  "attachments",
  "items",
  "client",
  "payments",
]);

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
  const needsStaffLookup = useMemo(
    () => fields.some((field) => resolveRelationKind(field) === "staff"),
    [fields]
  );
  const needsCustomerLookup = useMemo(
    () => fields.some((field) => resolveRelationKind(field) === "customer"),
    [fields]
  );

  const staffLookup = useQuery({
    queryKey: ["crud", "lookup", "staff"],
    queryFn: () => listEntities("staffs", { limit: LOOKUP_LIMIT }),
    enabled: needsStaffLookup,
    staleTime: LOOKUP_STALE_MS,
  });

  const customerLookup = useQuery({
    queryKey: ["crud", "lookup", "customers"],
    queryFn: () => listEntities("customers", { limit: LOOKUP_LIMIT }),
    enabled: needsCustomerLookup,
    staleTime: LOOKUP_STALE_MS,
  });

  const lookups = useMemo<LookupMaps>(
    () => ({
      staff: buildLookupMap(normalizeList(staffLookup.data).items, "staff"),
      customer: buildLookupMap(normalizeList(customerLookup.data).items, "customer"),
    }),
    [customerLookup.data, staffLookup.data]
  );

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
                <View className="mt-1">{renderValue(row[field.key], field, row, lookups)}</View>
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
    return uniqueRowsById(child, items);
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

function uniqueRowsById(module: ModuleDefinition, rows: any[]): any[] {
  const seen = new Set<string>();
  return rows.filter((row, index) => {
    const id = moduleId(module, row) || `${module.key}-${index}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function buildVisibleFields(module: ModuleDefinition, row: any): ModuleField[] {
  const configured = module.fields.filter((field) => !isEmpty(row?.[field.key], field));
  const known = new Set([
    module.idKey,
    ...module.fields.map((field) => field.key),
  ]);
  const autoFields = Object.keys(row || {})
    .filter((key) => !known.has(key))
    .filter((key) => shouldShowAutoField(module, key, row?.[key]))
    .slice(0, 24)
    .map((key) => ({
      key,
      label: humanize(key),
      section: "Additional",
      type: inferFieldType(key, row?.[key]),
      relation: inferRelationKind(key),
    }));
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

function isEmpty(value: any, field?: ModuleField): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;

  const raw = String(value).trim();
  if (!raw) return true;

  const normalized = raw.toLowerCase();
  if (
    normalized === "0000-00-00" ||
    normalized === "0000-00-00 00:00:00" ||
    EMPTY_SERIALIZED_VALUES.has(normalized)
  ) {
    return true;
  }

  if ((field?.hideIfZero || resolveRelationKind(field) || field?.type === "json") && isZeroish(raw)) {
    return true;
  }

  const cleaned = cleanDisplayText(raw);
  return cleaned.length === 0 || EMPTY_SERIALIZED_VALUES.has(cleaned.toLowerCase());
}

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bId\b/g, "ID");
}

function renderValue(value: any, field: ModuleField, row: any, lookups: LookupMaps): ReactNode {
  if (isEmpty(value, field)) return <Text className="text-muted italic">-</Text>;

  const relationText = resolveRelationValue(value, field, row, lookups);
  if (relationText) {
    return <Text className="text-foreground">{relationText}</Text>;
  }

  const text = cleanDisplayText(value);
  const type = field.type;

  if (type === "select" && field.options?.length) {
    const option = field.options.find((item) => String(item.value) === String(value));
    return <Text className="text-foreground">{option?.label || text}</Text>;
  }

  if (type === "boolean") {
    const active = ["1", "on", "true", "yes"].includes(text.toLowerCase());
    return <Text className="text-foreground">{active ? "Yes" : "No"}</Text>;
  }

  if (type === "date" || type === "datetime") {
    return <Text className="text-foreground">{formatDateText(text, type)}</Text>;
  }

  if (type === "money") {
    return <Text className="text-foreground">{formatMoney(text)}</Text>;
  }

  if (type === "json") {
    const jsonText = formatJsonish(value);
    return jsonText ? (
      <Text className="text-foreground" selectable>
        {jsonText}
      </Text>
    ) : (
      <Text className="text-muted italic">-</Text>
    );
  }

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

  return (
    <Text className="text-foreground" selectable>
      {text}
    </Text>
  );
}

function shouldShowAutoField(module: ModuleDefinition, key: string, value: any): boolean {
  const normalizedKey = key.toLowerCase();
  if (AUTO_FIELD_SKIP_KEYS.has(normalizedKey)) return false;
  if (normalizedKey === module.idKey.toLowerCase()) return false;
  if (normalizedKey.startsWith("_")) return false;
  if (typeof value === "object") return false;
  if (isEmpty(value)) return false;

  const raw = String(value).trim();
  if (isZeroish(raw)) return false;
  if (looksSerialized(raw)) return false;
  if (raw.length > 900) return false;
  if (/password|secret|token|hash|key$/i.test(key)) return false;

  return true;
}

function inferFieldType(key: string, value: any): ModuleField["type"] {
  const text = String(value ?? "").trim();
  if (isLikelyBooleanKey(key) && isBooleanish(text)) return "boolean";
  if (/^https?:\/\//i.test(text)) return "url";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "email";
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text)) return "datetime";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return "date";
  if (/amount|cost|rate|price|total|balance|payment/i.test(key)) return "money";
  return undefined;
}

function resolveRelationKind(field?: ModuleField): RelationKind | undefined {
  if (!field) return undefined;
  return field.relation || inferRelationKind(field.key);
}

function inferRelationKind(key: string): RelationKind | undefined {
  const normalized = key.toLowerCase();
  if (
    normalized === "assigned" ||
    normalized === "addedfrom" ||
    normalized === "staffid" ||
    normalized === "staff_id" ||
    normalized === "projectmanager" ||
    normalized === "projectseniormanager" ||
    normalized === "projectsenior_manager" ||
    normalized === "projectseniorManager".toLowerCase()
  ) {
    return "staff";
  }

  if (
    normalized === "clientid" ||
    normalized === "client_id" ||
    normalized === "customer_id" ||
    normalized === "userid" ||
    normalized === "client"
  ) {
    return "customer";
  }

  return undefined;
}

function resolveRelationValue(
  value: any,
  field: ModuleField,
  row: any,
  lookups: LookupMaps
): string | null {
  const relation = resolveRelationKind(field);
  if (!relation) return null;

  const id = String(value ?? "").trim();
  if (!id || isZeroish(id)) return null;

  const direct = directRelationLabel(field.key, relation, row);
  if (direct) return direct;

  const lookup = lookups[relation].get(id);
  if (lookup) return lookup;

  return relation === "staff" ? `Staff #${id}` : `Customer #${id}`;
}

function directRelationLabel(key: string, relation: RelationKind, row: any): string | null {
  if (!row) return null;

  if (relation === "customer") {
    const client = row.client && typeof row.client === "object" ? row.client : null;
    return firstCleanText(
      row.company,
      row.customer_name,
      row.client_name,
      row.client_company,
      client?.company,
      client?.name
    );
  }

  const snakeKey = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  const fullName = firstCleanText(
    row[`${key}_name`],
    row[`${key}_full_name`],
    row[`${snakeKey}_name`],
    row[`${snakeKey}_full_name`]
  );
  if (fullName) return fullName;

  return firstCleanText(
    joinName(row[`${key}_firstname`], row[`${key}_lastname`]),
    joinName(row[`${snakeKey}_firstname`], row[`${snakeKey}_lastname`]),
    joinName(row.firstname, row.lastname)
  );
}

function buildLookupMap(items: any[], relation: RelationKind): Map<string, string> {
  const map = new Map<string, string>();
  items.forEach((item) => {
    const id =
      relation === "staff"
        ? item?.staffid ?? item?.id
        : item?.userid ?? item?.customer_id ?? item?.id;
    const label =
      relation === "staff"
        ? firstCleanText(joinName(item?.firstname, item?.lastname), item?.email)
        : firstCleanText(item?.company, item?.name, item?.customer_name, item?.email);
    if (id !== undefined && id !== null && label) {
      map.set(String(id), label);
    }
  });
  return map;
}

function firstCleanText(...values: any[]): string | null {
  for (const value of values) {
    const text = cleanDisplayText(value);
    if (text) return text;
  }
  return null;
}

function joinName(first: any, last: any): string {
  return [first, last].map((part) => cleanDisplayText(part)).filter(Boolean).join(" ");
}

function cleanDisplayText(value: any): string {
  if (value === undefined || value === null) return "";
  const raw = String(value);
  const withoutHtml = raw
    .replace(/<\/(p|div|li|br|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withoutHtml)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[String(name).toLowerCase()] ?? match);
}

function formatDateText(value: string, type: "date" | "datetime"): string {
  if (type === "date") return value.slice(0, 10);
  return value.replace("T", " ").slice(0, 16);
}

function formatMoney(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatJsonish(value: any): string {
  if (isEmpty(value)) return "";
  if (Array.isArray(value)) return value.map((item) => cleanDisplayText(item)).filter(Boolean).join(", ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);

  const text = cleanDisplayText(value);
  if (EMPTY_SERIALIZED_VALUES.has(text.toLowerCase())) return "";
  const phpArray = text.match(/^a:(\d+):/i);
  if (phpArray) {
    const count = Number(phpArray[1]);
    return count > 0 ? `${count} item${count === 1 ? "" : "s"}` : "";
  }
  const phpString = text.match(/^s:\d+:"([\s\S]*)";$/i);
  if (phpString) return cleanDisplayText(phpString[1]);
  if (looksSerialized(text)) return "Configured";
  return text;
}

function looksSerialized(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    EMPTY_SERIALIZED_VALUES.has(normalized) ||
    /^[aobisnd]:\d*:/.test(normalized) ||
    /^[aobisnd]:/.test(normalized)
  );
}

function isBooleanish(value: string): boolean {
  return ["0", "1", "on", "off", "true", "false", "yes", "no"].includes(value.toLowerCase());
}

function isLikelyBooleanKey(key: string): boolean {
  return /(^is_|^has_|^allow_|^show_|_enabled$|_active$|active$|public$|billable$|notification|notify|progress_from_tasks|confirmed)/i.test(
    key
  );
}

function isZeroish(value: string): boolean {
  return value.trim() === "0" || value.trim() === "0.00";
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
