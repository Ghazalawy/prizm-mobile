import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ModuleDefinition, ModuleField, StatusOption } from "@/lib/module-registry";

export type FilterValues = Record<string, string | string[] | undefined>;

type FilterPanelProps = {
  module: ModuleDefinition;
  visible: boolean;
  onClose: () => void;
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
};

const PRESETS_KEY_PREFIX = "filter_presets_";

export function activeFilterCount(filters: FilterValues): number {
  return Object.values(filters).filter((v) => {
    if (v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    return v !== "";
  }).length;
}

export const FilterPanel = memo(function FilterPanel({
  module,
  visible,
  onClose,
  filters,
  onApply,
}: FilterPanelProps) {
  const [draft, setDraft] = useState<FilterValues>({});
  const [presets, setPresets] = useState<Array<{ name: string; filters: FilterValues }>>([]);
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [presetName, setPresetName] = useState("");

  const storageKey = `${PRESETS_KEY_PREFIX}${module.key}`;

  useEffect(() => {
    if (visible) {
      setDraft({ ...filters });
      loadPresets();
    }
  }, [visible]);

  const loadPresets = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) setPresets(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  const savePreset = useCallback(async () => {
    if (!presetName.trim()) return;
    const next = [...presets, { name: presetName.trim(), filters: { ...draft } }];
    setPresets(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    setPresetName("");
    setShowPresetInput(false);
  }, [presetName, draft, presets, storageKey]);

  const deletePreset = useCallback(
    async (index: number) => {
      const next = presets.filter((_, i) => i !== index);
      setPresets(next);
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    },
    [presets, storageKey],
  );

  const filterFields = useMemo(() => {
    if (!module.filterableFields?.length) return module.fields.slice(0, 8);
    return module.filterableFields
      .map((key) => module.fields.find((f) => f.key === key))
      .filter((f): f is ModuleField => !!f);
  }, [module]);

  const setField = useCallback((key: string, value: string | string[] | undefined) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearAll = useCallback(() => setDraft({}), []);

  const handleApply = useCallback(() => {
    const cleaned: FilterValues = {};
    for (const [k, v] of Object.entries(draft)) {
      if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
      cleaned[k] = v;
    }
    onApply(cleaned);
    onClose();
  }, [draft, onApply, onClose]);

  const draftCount = activeFilterCount(draft);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-surface">
        <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-semibold flex-1">Filters</Text>
          {draftCount > 0 ? (
            <TouchableOpacity onPress={clearAll} hitSlop={8}>
              <Text className="text-primary font-medium text-sm">Clear all</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {module.statusField && module.statusOptions?.length ? (
            <StatusFilterSection
              label={fieldLabel(module, module.statusField)}
              options={module.statusOptions}
              selected={toArray(draft[module.statusField])}
              onSelect={(values) => setField(module.statusField!, values.length ? values : undefined)}
            />
          ) : null}

          {filterFields.map((field) => {
            if (field.key === module.statusField && module.statusOptions?.length) return null;
            return (
              <FilterFieldControl
                key={field.key}
                field={field}
                value={draft[field.key]}
                onChange={(v) => setField(field.key, v)}
              />
            );
          })}

          {presets.length > 0 ? (
            <View className="mt-4">
              <Text className="text-xs text-muted uppercase tracking-wide mb-2">
                Saved presets
              </Text>
              {presets.map((preset, i) => (
                <View key={i} className="flex-row items-center mb-2">
                  <TouchableOpacity
                    onPress={() => setDraft({ ...preset.filters })}
                    className="flex-1 bg-white rounded-xl px-4 py-3 flex-row items-center"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="bookmark-outline" size={16} color="#64748B" />
                    <Text className="text-foreground ml-2 flex-1">{preset.name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deletePreset(i)}
                    hitSlop={10}
                    className="ml-2 p-2"
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {showPresetInput ? (
            <View className="mt-4 flex-row items-center">
              <TextInput
                value={presetName}
                onChangeText={setPresetName}
                placeholder="Preset name…"
                placeholderTextColor="#94A3B8"
                className="flex-1 bg-white rounded-xl px-4 py-3 text-foreground"
                autoFocus
                onSubmitEditing={savePreset}
              />
              <TouchableOpacity
                onPress={savePreset}
                className="ml-2 bg-primary rounded-xl px-4 py-3"
                activeOpacity={0.75}
              >
                <Text className="text-white font-medium">Save</Text>
              </TouchableOpacity>
            </View>
          ) : draftCount > 0 ? (
            <TouchableOpacity
              onPress={() => setShowPresetInput(true)}
              className="mt-4 flex-row items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="bookmark-outline" size={16} color="#0284C7" />
              <Text className="text-primary font-medium ml-1">Save as preset</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        <View className="bg-white border-t border-gray-100 px-4 py-4 pb-8">
          <TouchableOpacity
            onPress={handleApply}
            className="bg-primary rounded-xl py-3.5 items-center"
            activeOpacity={0.75}
          >
            <Text className="text-white font-semibold text-base">
              Apply filters{draftCount > 0 ? ` (${draftCount})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

function StatusFilterSection({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: StatusOption[];
  selected: string[];
  onSelect: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onSelect(selected.filter((v) => v !== value));
    } else {
      onSelect([...selected, value]);
    }
  };

  return (
    <View className="mb-5">
      <Text className="text-xs text-muted uppercase tracking-wide mb-2">{label}</Text>
      <View className="flex-row flex-wrap">
        {options.map((opt) => {
          const active = selected.includes(String(opt.value));
          const color = opt.color || "#64748B";
          return (
            <TouchableOpacity
              key={String(opt.value)}
              onPress={() => toggle(String(opt.value))}
              className={`rounded-full mr-2 mb-2 px-4 py-2 border ${active ? "border-transparent" : "border-gray-200 bg-white"}`}
              style={active ? { backgroundColor: `${color}1A`, borderColor: color } : undefined}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-medium ${active ? "" : "text-foreground"}`}
                style={active ? { color } : undefined}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function FilterFieldControl({
  field,
  value,
  onChange,
}: {
  field: ModuleField;
  value: string | string[] | undefined;
  onChange: (v: string | string[] | undefined) => void;
}) {
  const type = field.type;

  if (field.options?.length || type === "select") {
    return (
      <StatusFilterSection
        label={field.label}
        options={(field.options || []).map((o) => ({
          label: o.label,
          value: o.value,
          color: undefined,
        }))}
        selected={toArray(value)}
        onSelect={(values) => onChange(values.length ? values : undefined)}
      />
    );
  }

  if (type === "boolean") {
    const current = typeof value === "string" ? value : undefined;
    return (
      <View className="mb-5">
        <Text className="text-xs text-muted uppercase tracking-wide mb-2">{field.label}</Text>
        <View className="flex-row">
          {[
            { label: "All", val: undefined },
            { label: "Yes", val: "1" },
            { label: "No", val: "0" },
          ].map((opt) => {
            const active = current === opt.val;
            return (
              <TouchableOpacity
                key={opt.label}
                onPress={() => onChange(opt.val)}
                className={`rounded-full mr-2 px-4 py-2 ${active ? "bg-primary" : "bg-white border border-gray-200"}`}
                activeOpacity={0.7}
              >
                <Text className={`text-sm font-medium ${active ? "text-white" : "text-foreground"}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (type === "number" || type === "money") {
    const rangeVal = typeof value === "string" ? value : "";
    const [min, max] = rangeVal.split("..").map((s) => s.trim());
    return (
      <View className="mb-5">
        <Text className="text-xs text-muted uppercase tracking-wide mb-2">{field.label} range</Text>
        <View className="flex-row">
          <TextInput
            value={min || ""}
            onChangeText={(v) => {
              const next = `${v}..${max || ""}`;
              onChange(next === ".." ? undefined : next);
            }}
            placeholder="Min"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            className="flex-1 bg-white rounded-xl px-4 py-3 text-foreground mr-2"
          />
          <TextInput
            value={max || ""}
            onChangeText={(v) => {
              const next = `${min || ""}..${v}`;
              onChange(next === ".." ? undefined : next);
            }}
            placeholder="Max"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            className="flex-1 bg-white rounded-xl px-4 py-3 text-foreground"
          />
        </View>
      </View>
    );
  }

  if (type === "date" || type === "datetime") {
    const rangeVal = typeof value === "string" ? value : "";
    const [from, to] = rangeVal.split("..").map((s) => s.trim());
    return (
      <View className="mb-5">
        <Text className="text-xs text-muted uppercase tracking-wide mb-2">{field.label} range</Text>
        <View className="flex-row">
          <TextInput
            value={from || ""}
            onChangeText={(v) => {
              const next = `${v}..${to || ""}`;
              onChange(next === ".." ? undefined : next);
            }}
            placeholder="From (YYYY-MM-DD)"
            placeholderTextColor="#94A3B8"
            className="flex-1 bg-white rounded-xl px-4 py-3 text-foreground mr-2 text-xs"
          />
          <TextInput
            value={to || ""}
            onChangeText={(v) => {
              const next = `${from || ""}..${v}`;
              onChange(next === ".." ? undefined : next);
            }}
            placeholder="To (YYYY-MM-DD)"
            placeholderTextColor="#94A3B8"
            className="flex-1 bg-white rounded-xl px-4 py-3 text-foreground text-xs"
          />
        </View>
      </View>
    );
  }

  return (
    <View className="mb-5">
      <Text className="text-xs text-muted uppercase tracking-wide mb-2">{field.label}</Text>
      <TextInput
        value={typeof value === "string" ? value : ""}
        onChangeText={(v) => onChange(v || undefined)}
        placeholder={`Filter by ${field.label.toLowerCase()}…`}
        placeholderTextColor="#94A3B8"
        className="bg-white rounded-xl px-4 py-3 text-foreground"
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}

function fieldLabel(module: ModuleDefinition, key: string): string {
  const field = module.fields.find((f) => f.key === key);
  return field?.label || humanize(key);
}

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}
