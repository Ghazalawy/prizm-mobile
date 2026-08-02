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
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEntity, getEntity, updateEntity } from "@/lib/api";
import {
  getModule,
  getModuleMutationCapability,
  getModulePermissionFeatures,
  ModuleDefinition,
  ModuleField,
  moduleTitle,
} from "@/lib/module-registry";
import { usePermissions } from "@/lib/permission-context";
import { FieldInput } from "./FieldInput";
import { DateInput } from "./DateInput";
import { DepartmentImapTools } from "./DepartmentImapTools";
import { RolePermissionsEditor } from "./RolePermissionsEditor";
import { CustomFieldDefinitionEditor } from "./CustomFieldDefinitionEditor";
import { EmailTemplateEditor } from "./EmailTemplateEditor";
import {
  useCustomFields,
  decodeCustomFieldValue,
  parseCustomFieldOptions,
  type CustomFieldRow,
} from "@/lib/queries/custom-fields";

type CrudFormScreenProps = {
  moduleKey: string;
  id?: string;
  basePath?: string;
};

const EMPTY_CUSTOM_FIELDS: CustomFieldRow[] = [];

export function CrudFormScreen({ moduleKey, id, basePath }: CrudFormScreenProps) {
  const module = getModule(moduleKey);
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const useRouteRecord = isEdit && firstParam(params._use_route_record) === "1";
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const initializedFormKeyRef = useRef<string | null>(null);
  const permissions = usePermissions();

  // Permission gate: block access if user lacks create/edit permission
  const features = module ? getModulePermissionFeatures(module) : [];
  const formCapability = module
    ? getModuleMutationCapability(module, isEdit ? "edit" : "create")
    : (isEdit ? "edit" : "create");
  const hasFormPermission =
    (!module?.adminOnlyMutations || permissions.isAdmin) &&
    (features.length === 0 ||
      features.some((f) =>
        permissions.hasPermission(f, formCapability),
      ));

  const detail = useQuery({
    queryKey: ["crud", moduleKey, "detail", id],
    queryFn: () => (module && id ? getEntity(module.endpoint, id, module.detailEndpoint) : Promise.resolve(null)),
    enabled: !!module && !!id && !useRouteRecord,
  });

  const row = useMemo(() => unwrapRow(detail.data, module), [detail.data, module]);
  const fields = useMemo(() => (module ? editableFields(module, isEdit) : []), [module, isEdit]);
  const sections = useMemo(() => groupFields(fields.filter((field) => !field.hidden && !field.customEditor)), [fields]);

  // Custom fields: fetched for create (no id, blank values) or edit (id given,
  // values populated). Tracked in their own values map keyed by custom_field_id.
  const customFieldsQuery = useCustomFields(module?.customFieldsType, isEdit ? id : undefined);
  const customFields = customFieldsQuery.data ?? EMPTY_CUSTOM_FIELDS;
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!customFields.length) {
      setCustomValues((current) =>
        Object.keys(current).length > 0 ? {} : current,
      );
      return;
    }
    const next: Record<string, string> = {};
    customFields.forEach((cf) => {
      next[cf.custom_field_id] = decodeCustomFieldValue(cf);
    });
    setCustomValues(next);
  }, [customFields]);

  useEffect(() => {
    if (!module) return;
    if (isEdit && !row && !useRouteRecord) return;
    const routeFieldValues = fields.map((field) => [
      field.key,
      firstParam(params[field.key]) ?? null,
    ]);
    const initializationKey = JSON.stringify([
      module.key,
      id ?? "new",
      useRouteRecord,
      routeFieldValues,
    ]);
    if (initializedFormKeyRef.current === initializationKey) return;

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
    initializedFormKeyRef.current = initializationKey;
    setValues(next);
    setTouched(false);
  }, [fields, isEdit, module, params, row, useRouteRecord]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!module) throw new Error("Module not found");
      const payload = buildPayload(fields, values, isEdit);
      // Attach custom field values in Perfex's expected shape:
      //   custom_fields: { <belongsTo>: { <field_id>: value } }
      // The PHP layer reads $_POST['custom_fields'][belongsTo][field_id]
      // when creating/updating any record that supports custom fields.
      if (module.customFieldsType && customFields.length) {
        const bag: Record<string, string> = {};
        customFields.forEach((cf) => {
          const raw = customValues[cf.custom_field_id];
          if (raw !== undefined) bag[cf.custom_field_id] = raw;
        });
        if (Object.keys(bag).length > 0) {
          payload.custom_fields = { [module.customFieldsType]: bag };
        }
      }
      if (isEdit && id) {
        return updateEntity(module.endpoint, id, payload);
      }
      return createEntity(firstParam(params._mutation_endpoint) || module.endpoint, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crud", moduleKey] });
      const invalidateModule = firstParam(params._invalidate_module);
      const invalidateId = firstParam(params._invalidate_id);
      if (invalidateModule) {
        await queryClient.invalidateQueries({
          queryKey: invalidateId
            ? ["crud", invalidateModule, "detail", invalidateId]
            : ["crud", invalidateModule],
        });
        if (invalidateId) {
          await queryClient.invalidateQueries({
            queryKey: ["crud", invalidateModule, invalidateId, "tab"],
          });
        }
      }
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

  if (module && !hasFormPermission) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-8">
        <Ionicons name="lock-closed-outline" size={48} color="#94A3B8" />
        <Text className="text-foreground font-semibold mt-3">Access Denied</Text>
        <Text className="text-muted text-sm mt-1 text-center">
          You don&apos;t have permission to {isEdit ? "edit" : "create"} {module.plural.toLowerCase()}.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 bg-primary px-5 py-2 rounded-lg"
          activeOpacity={0.75}
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!module) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-8">
        <Text className="text-foreground font-semibold">Module not found</Text>
        <Text className="text-muted mt-1">{moduleKey}</Text>
      </View>
    );
  }

  if (isEdit && !useRouteRecord && detail.isLoading && !row) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color={module.color} />
      </View>
    );
  }

  const title = isEdit
    ? moduleTitle(module, row || routeRecord(module, params))
    : `New ${module.title}`;

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
            const error = validateRequired(fields, values, isEdit);
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
                      {isFieldRequired(field, values, isEdit) ? " *" : ""}
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

          {customFields.length > 0 ? (
            <View className="mb-3">
              <Text className="text-xs text-muted uppercase tracking-wide px-2 mb-1.5">
                Custom Fields
              </Text>
              <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {customFields.map((cf, index) => (
                  <View
                    key={String(cf.custom_field_id)}
                    className={`px-4 py-3 ${index > 0 ? "border-t border-gray-100" : ""}`}
                  >
                    <Text className="text-xs text-muted mb-1">
                      {cf.label}
                      {String(cf.required) === "1" ? " *" : ""}
                    </Text>
                    <CustomFieldInput
                      cf={cf}
                      value={customValues[cf.custom_field_id] ?? ""}
                      onChange={(value) => {
                        setCustomValues((current) => ({
                          ...current,
                          [cf.custom_field_id]: value,
                        }));
                        setTouched(true);
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {module.key === "setup_departments" ? (
            <DepartmentImapTools
              id={id}
              values={values}
              onChange={(field, value) => {
                setValues((current) => ({ ...current, [field]: value }));
                setTouched(true);
              }}
            />
          ) : null}

          {module.key === "setup_roles" ? (
            <RolePermissionsEditor
              id={id}
              values={values}
              onChange={(field, value) => {
                setValues((current) => ({ ...current, [field]: value }));
                setTouched(true);
              }}
            />
          ) : null}

          {module.key === "setup_custom_fields" ? (
            <CustomFieldDefinitionEditor
              values={values}
              onChange={(field, value) => {
                setValues((current) => ({ ...current, [field]: value }));
                setTouched(true);
              }}
            />
          ) : null}

          {module.key === "setup_email_templates" ? (
            <EmailTemplateEditor
              row={row}
              values={values}
              onChange={(field, value) => {
                setValues((current) => ({ ...current, [field]: value }));
                setTouched(true);
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Renders the right input for each Perfex custom-field type.
 * input/number/textarea → TextInput; select/radio with options → chip picker;
 * multiselect with options → multi-chip; checkbox → boolean toggle;
 * date_picker/date_picker_time → text for now (native picker comes next batch).
 */
function CustomFieldInput({
  cf,
  value,
  onChange,
}: {
  cf: CustomFieldRow;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = parseCustomFieldOptions(cf);

  // Native date / datetime picker
  if (cf.type === "date_picker" || cf.type === "date_picker_time") {
    return (
      <DateInput
        value={value}
        onChange={onChange}
        mode={cf.type === "date_picker_time" ? "datetime" : "date"}
        placeholder={cf.label}
      />
    );
  }

  if (cf.type === "checkbox" && options.length === 0) {
    const active = ["1", "on", "true", "yes"].includes(String(value).toLowerCase());
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

  // Multi-select checkboxes (Perfex multiselect + select w/options w/value JSON array)
  if (cf.type === "multiselect" && options.length) {
    const selectedSet = new Set(
      value.split(",").map((s) => s.trim()).filter(Boolean)
    );
    return (
      <View className="flex-row flex-wrap">
        {options.map((opt) => {
          const sel = selectedSet.has(opt);
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => {
                const next = new Set(selectedSet);
                if (sel) next.delete(opt); else next.add(opt);
                onChange(Array.from(next).join(", "));
              }}
              className={`rounded-full px-3 py-1.5 mr-2 mb-2 ${sel ? "bg-primary" : "bg-gray-100"}`}
            >
              <Text className={`font-medium ${sel ? "text-white" : "text-foreground"}`}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Single-select / radio: chip picker
  if ((cf.type === "select" || cf.type === "radio") && options.length) {
    return (
      <View className="flex-row flex-wrap">
        {options.map((opt) => {
          const sel = String(opt) === String(value);
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              className={`rounded-full px-3 py-1.5 mr-2 mb-2 ${sel ? "bg-primary" : "bg-gray-100"}`}
            >
              <Text className={`font-medium ${sel ? "text-white" : "text-foreground"}`}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  const multiline = cf.type === "textarea";
  const keyboard =
    cf.type === "number" ? "numeric" :
    cf.type === "link" ? "url" :
    "default";

  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      keyboardType={keyboard as any}
      autoCapitalize={cf.type === "link" ? "none" : "sentences"}
      autoCorrect={cf.type !== "link"}
      placeholder={
        cf.type === "date_picker" ? "YYYY-MM-DD" :
        cf.type === "date_picker_time" ? "YYYY-MM-DD HH:MM:SS" :
        cf.type === "colorpicker" ? "#RRGGBB" :
        cf.label
      }
      placeholderTextColor="#94A3B8"
      className={`text-foreground bg-gray-50 rounded-xl px-3 ${
        multiline ? "min-h-[104px] py-3" : "h-11"
      }`}
    />
  );
}

function editableFields(module: ModuleDefinition, isEdit: boolean): ModuleField[] {
  return module.fields.filter((field) => {
    if (field.readOnly) return false;
    if (isEdit && field.createOnly) return false;
    if (isEdit && field.key === "password" && !field.editableSecret) return false;
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

function isFieldRequired(field: ModuleField, values: Record<string, string>, isEdit: boolean): boolean {
  if (field.required) return true;
  if (!isEdit && field.requiredOnCreateUnless) {
    const alternative = String(values[field.requiredOnCreateUnless] ?? "").toLowerCase();
    return !["1", "on", "true", "yes"].includes(alternative);
  }
  return false;
}

function validateRequired(fields: ModuleField[], values: Record<string, string>, isEdit: boolean): string | null {
  const missing = fields.find((field) => isFieldRequired(field, values, isEdit) && !String(values[field.key] ?? "").trim());
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
    if (isEdit && field.editableSecret && value === "") return;
    if (!isEdit && !field.required && value === "") return;

    if (field.submitAsArray) {
      payload[field.key] = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      return;
    }

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

function unwrapRow(data: any, module?: ModuleDefinition): any {
  if (!data) return data;
  const value = data.status === true && data.data
    ? (Array.isArray(data.data) ? data.data[0] : data.data)
    : (Array.isArray(data) ? data[0] : data);
  if (module?.detailRootKey && value?.[module.detailRootKey] && typeof value[module.detailRootKey] === "object") {
    return { ...value[module.detailRootKey], ...value };
  }
  return value;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function routeRecord(
  module: ModuleDefinition,
  params: Record<string, string | string[]>,
): Record<string, string> {
  const row: Record<string, string> = {};
  [...module.titleFields, ...module.fields.map((field) => field.key)].forEach((key) => {
    const value = firstParam(params[key]);
    if (value !== undefined) row[key] = value;
  });
  return row;
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
