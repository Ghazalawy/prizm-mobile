import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEntity, getEntity, updateEntity } from "@/lib/api";
import {
  getModule,
  ModuleDefinition,
  ModuleField,
  moduleTitle,
} from "@/lib/module-registry";
import { RelationPicker } from "./RelationPicker";

type CrudFormScreenProps = {
  moduleKey: string;
  id?: string;
  basePath?: string;
};

export function CrudFormScreen({ moduleKey, id, basePath }: CrudFormScreenProps) {
  const module = getModule(moduleKey);
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);

  const detail = useQuery({
    queryKey: ["crud", moduleKey, "detail", id],
    queryFn: () => (module && id ? getEntity(module.endpoint, id, module.detailEndpoint) : Promise.resolve(null)),
    enabled: !!module && !!id,
  });

  const row = useMemo(() => unwrapRow(detail.data), [detail.data]);
  const fields = useMemo(() => (module ? editableFields(module, isEdit) : []), [module, isEdit]);
  const sections = useMemo(() => groupFields(fields), [fields]);

  useEffect(() => {
    if (!module) return;
    if (isEdit && !row) return;
    const next: Record<string, string> = {};
    fields.forEach((field) => {
      const paramValue = firstParam(params[field.key]);
      const rowValue = row?.[field.key];
      const fallback = field.defaultValue;
      const value = paramValue ?? rowValue ?? fallback ?? "";
      if (field.type === "json" && value && typeof value !== "string") {
        next[field.key] = JSON.stringify(value, null, 2);
      } else {
        next[field.key] = String(value ?? "");
      }
    });
    setValues(next);
    setTouched(false);
  }, [fields, isEdit, module, params, row]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!module) throw new Error("Module not found");
      const payload = buildPayload(fields, values, isEdit);
      if (isEdit && id) {
        return updateEntity(module.endpoint, id, payload);
      }
      return createEntity(module.endpoint, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crud", moduleKey] });
      if (basePath && !isEdit) {
        router.replace(basePath as any);
      } else {
        router.back();
      }
    },
    onError: (err: any) => {
      Alert.alert("Save failed", err?.message || "Could not save record.");
    },
  });

  if (!module) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-8">
        <Text className="text-foreground font-semibold">Module not found</Text>
        <Text className="text-muted mt-1">{moduleKey}</Text>
      </View>
    );
  }

  if (isEdit && detail.isLoading && !row) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color={module.color} />
      </View>
    );
  }

  const title = isEdit && row ? moduleTitle(module, row) : `New ${module.title}`;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => confirmLeave(touched, () => router.back())} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-3 text-lg font-semibold text-foreground flex-1" numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={() => {
            const error = validateRequired(fields, values);
            if (error) {
              Alert.alert("Missing field", error);
              return;
            }
            saveMutation.mutate();
          }}
          disabled={saveMutation.isPending}
          className="bg-primary rounded-lg px-4 py-2"
          activeOpacity={0.75}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-3">
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
                    <Text className="text-xs text-muted mb-1">
                      {field.label}
                      {field.required ? " *" : ""}
                    </Text>
                    <FieldInput
                      field={field}
                      value={values[field.key] ?? ""}
                      onChange={(value) => {
                        setValues((current) => ({ ...current, [field.key]: value }));
                        setTouched(true);
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ModuleField;
  value: string;
  onChange: (value: string) => void;
}) {
  // Relation-typed fields get a searchable modal picker instead of a raw
  // numeric TextInput. Hooks into the same /api/<table> endpoints the
  // CrudDetailScreen uses for FK resolution, so view ↔ edit stays consistent.
  if (field.relation) {
    return <RelationPicker relation={field.relation} value={value} onChange={onChange} placeholder={field.placeholder || field.label} />;
  }

  if (field.type === "boolean") {
    const active = ["1", "on", "true", "yes"].includes(value.toLowerCase());
    return (
      <TouchableOpacity
        onPress={() => onChange(active ? "" : "on")}
        className={`self-start rounded-full px-3 py-1.5 ${active ? "bg-primary" : "bg-gray-100"}`}
      >
        <Text className={`font-medium ${active ? "text-white" : "text-foreground"}`}>
          {active ? "Yes" : "No"}
        </Text>
      </TouchableOpacity>
    );
  }

  if (field.type === "select" && field.options?.length) {
    return (
      <View className="flex-row flex-wrap">
        {field.options.map((option) => {
          const selected = String(option.value) === String(value);
          return (
            <TouchableOpacity
              key={String(option.value)}
              onPress={() => onChange(String(option.value))}
              className={`rounded-full px-3 py-1.5 mr-2 mb-2 ${
                selected ? "bg-primary" : "bg-gray-100"
              }`}
            >
              <Text className={`font-medium ${selected ? "text-white" : "text-foreground"}`}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  const multiline = field.type === "multiline" || field.type === "json";

  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={field.placeholder || field.label}
      placeholderTextColor="#94A3B8"
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      autoCapitalize={field.type === "email" || field.type === "url" ? "none" : "sentences"}
      autoCorrect={field.type !== "email" && field.type !== "url"}
      keyboardType={keyboardType(field)}
      className={`text-foreground bg-gray-50 rounded-xl px-3 ${
        multiline ? "min-h-[104px] py-3" : "h-11"
      }`}
    />
  );
}

function keyboardType(field: ModuleField) {
  switch (field.type) {
    case "email":
      return "email-address";
    case "phone":
      return "phone-pad";
    case "url":
      return "url";
    case "number":
      return "numeric";
    case "money":
      return "decimal-pad";
    default:
      return "default";
  }
}

function editableFields(module: ModuleDefinition, isEdit: boolean): ModuleField[] {
  return module.fields.filter((field) => {
    if (field.readOnly) return false;
    if (isEdit && field.key === "password") return false;
    return true;
  });
}

function groupFields(fields: ModuleField[]): Array<[string, ModuleField[]]> {
  const sections = new Map<string, ModuleField[]>();
  fields.forEach((field) => {
    const section = field.section || "Details";
    sections.set(section, [...(sections.get(section) || []), field]);
  });
  return Array.from(sections.entries());
}

function validateRequired(fields: ModuleField[], values: Record<string, string>): string | null {
  const missing = fields.find((field) => field.required && !String(values[field.key] ?? "").trim());
  return missing ? `${missing.label} is required.` : null;
}

function buildPayload(
  fields: ModuleField[],
  values: Record<string, string>,
  isEdit: boolean
): Record<string, any> {
  const payload: Record<string, any> = {};
  fields.forEach((field) => {
    const raw = values[field.key] ?? "";
    const value = raw.trim();
    if (!isEdit && !field.required && value === "") return;

    if (field.type === "boolean") {
      payload[field.key] = ["1", "on", "true", "yes"].includes(value.toLowerCase()) ? "on" : "";
      return;
    }

    if (field.type === "json") {
      payload[field.key] = parseJsonish(value);
      return;
    }

    payload[field.key] = raw;
  });

  if (isEdit && payload.newitems && !payload.items) {
    payload.items = payload.newitems;
  }

  return payload;
}

function parseJsonish(value: string): any {
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
}

function unwrapRow(data: any): any {
  if (!data) return data;
  if (data.status === true && data.data) return Array.isArray(data.data) ? data.data[0] : data.data;
  if (Array.isArray(data)) return data[0];
  return data;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function confirmLeave(touched: boolean, onLeave: () => void) {
  if (!touched) {
    onLeave();
    return;
  }
  Alert.alert(
    "Discard changes?",
    "Unsaved changes will be lost.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onLeave },
    ],
    { cancelable: true }
  );
}
