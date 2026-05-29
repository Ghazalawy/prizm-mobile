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
import type {
  ModuleDefinition,
  ModuleField,
  FilterRule,
  FilterGroup,
  FilterOperator,
  FilterRuleType,
} from "@/lib/module-registry";
import {
  getFilterFields,
  getFieldFilterRuleType,
  getFieldFilterOperators,
  FILTER_OPERATOR_LABELS,
  FILTER_TYPE_OPERATORS,
} from "@/lib/module-registry";

// ── Types ─────────────────────────────────────────────────────────────────

export type { FilterGroup, FilterRule, FilterOperator, FilterRuleType };

type FilterPanelProps = {
  module: ModuleDefinition;
  visible: boolean;
  onClose: () => void;
  filterGroup: FilterGroup;
  onApply: (group: FilterGroup) => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────

export function activeFilterCount(group: FilterGroup): number {
  return group.rules.filter((r) => {
    const v = r.value;
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (r.operator === "is_empty" || r.operator === "is_not_empty") return true;
    return String(v) !== "";
  }).length;
}

function ruleLabel(module: ModuleDefinition, rule: FilterRule): string {
  const field = module.fields.find((f) => f.key === rule.id);
  const fieldLabel = field?.label || rule.id;
  const opLabel = FILTER_OPERATOR_LABELS[rule.operator] || rule.operator;

  if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
    return `${fieldLabel} ${opLabel}`;
  }

  const v = Array.isArray(rule.value)
    ? rule.value
        .map((val) => {
          if (field?.options?.length) {
            const opt = field.options.find((o) => String(o.value) === val);
            return opt?.label || val;
          }
          if (
            rule.id === module.statusField &&
            module.statusOptions?.length
          ) {
            const opt = module.statusOptions.find(
              (o) => String(o.value) === val,
            );
            return opt?.label || val;
          }
          return val;
        })
        .join(", ")
    : String(rule.value ?? "");

  return `${fieldLabel} ${opLabel} ${v}`;
}

// ── Presets ────────────────────────────────────────────────────────────────

const PRESETS_KEY_PREFIX = "perfix_filter_presets_";

type PresetEntry = { name: string; group: FilterGroup };

function fieldDefaultOperator(
  module: ModuleDefinition,
  field: ModuleField,
): FilterOperator {
  const ops = getFieldFilterOperators(module, field);
  return ops[0] ?? "equal";
}

function fieldDefaultRuleType(
  module: ModuleDefinition,
  field: ModuleField,
): FilterRuleType {
  return getFieldFilterRuleType(module, field);
}

// ── Component ─────────────────────────────────────────────────────────────

export const FilterPanel = memo(function FilterPanel({
  module,
  visible,
  onClose,
  filterGroup,
  onApply,
}: FilterPanelProps) {
  const [draft, setDraft] = useState<FilterGroup>({ match_type: "and", rules: [] });
  const [presets, setPresets] = useState<PresetEntry[]>([]);
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [matchTypeDropdown, setMatchTypeDropdown] = useState(false);

  const storageKey = `${PRESETS_KEY_PREFIX}${module.key}`;

  useEffect(() => {
    if (visible) {
      setDraft({ ...filterGroup, rules: [...filterGroup.rules] });
      loadPresets();
      setShowRuleBuilder(false);
      setEditingRuleIndex(null);
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
    const next = [...presets, { name: presetName.trim(), group: { ...draft } }];
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

  const addRule = useCallback(
    (rule: FilterRule) => {
      if (editingRuleIndex !== null) {
        setDraft((prev) => {
          const rules = [...prev.rules];
          rules[editingRuleIndex] = rule;
          return { ...prev, rules };
        });
        setEditingRuleIndex(null);
      } else {
        setDraft((prev) => ({
          ...prev,
          rules: [...prev.rules, rule],
        }));
      }
      setShowRuleBuilder(false);
    },
    [editingRuleIndex],
  );

  const removeRule = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  }, []);

  const editRule = useCallback((index: number) => {
    setEditingRuleIndex(index);
    setShowRuleBuilder(true);
  }, []);

  const toggleMatchType = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      match_type: prev.match_type === "and" ? "or" : "and",
    }));
  }, []);

  const clearAll = useCallback(() => {
    setDraft({ match_type: "and", rules: [] });
  }, []);

  const handleApply = useCallback(() => {
    // Deep-clean: remove rules with empty values
    const cleaned: FilterGroup = {
      match_type: draft.match_type,
      rules: draft.rules.filter((r) => {
        if (r.operator === "is_empty" || r.operator === "is_not_empty") return true;
        const v = r.value;
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0))
          return false;
        if (typeof v === "string" && v.trim() === "") return false;
        return true;
      }),
    };
    onApply(cleaned);
    onClose();
  }, [draft, onApply, onClose]);

  const draftCount = activeFilterCount(draft);
  const filterFields = useMemo(() => getFilterFields(module), [module]);

  // ── Status chips ──────────────────────────────────────────────────────
  const statusChips = useMemo(() => {
    if (!module.statusField || !module.statusOptions?.length) return null;
    const statusRule = draft.rules.find((r) => r.id === module.statusField);
    const selected = Array.isArray(statusRule?.value)
      ? statusRule.value
      : statusRule?.value
        ? [statusRule.value]
        : [];

    const handleToggle = (value: string) => {
      if (selected.includes(value)) {
        const next = selected.filter((v) => v !== value);
        setDraft((prev) => {
          const rules = prev.rules.filter((r) => r.id !== module.statusField);
          if (next.length > 0) {
            rules.unshift({
              id: module.statusField!,
              type: "MultiSelectRule",
              operator: "in",
              value: next,
            });
          }
          return { ...prev, rules };
        });
      } else {
        const next = [...selected, value];
        setDraft((prev) => {
          const rules = prev.rules.filter((r) => r.id !== module.statusField);
          rules.unshift({
            id: module.statusField!,
            type: "MultiSelectRule",
            operator: "in",
            value: next,
          });
          return { ...prev, rules };
        });
      }
    };

    return (
      <View className="mb-5">
        <Text className="text-xs text-muted uppercase tracking-wide mb-2">Status</Text>
        <View className="flex-row flex-wrap">
          {module.statusOptions!.map((opt) => {
            const active = selected.includes(String(opt.value));
            const color = opt.color || "#64748B";
            return (
              <TouchableOpacity
                key={String(opt.value)}
                onPress={() => handleToggle(String(opt.value))}
                className={`rounded-full mr-2 mb-2 px-4 py-2 border ${
                  active ? "border-transparent" : "border-gray-200 bg-white"
                }`}
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
  }, [module, draft.rules]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-semibold flex-1">Perfix Filters</Text>
          {draftCount > 0 ? (
            <TouchableOpacity onPress={clearAll} hitSlop={8}>
              <Text className="text-primary font-medium text-sm">Clear all</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status quick-filter chips */}
          {statusChips}

          {/* Rule list */}
          {draft.rules.length > 0 ? (
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs text-muted uppercase tracking-wide">Filter rules</Text>
                {/* AND/OR toggle */}
                {draft.rules.length > 1 ? (
                  <TouchableOpacity
                    onPress={toggleMatchType}
                    className="flex-row items-center bg-white rounded-full px-3 py-1 border border-gray-200"
                    activeOpacity={0.7}
                  >
                    <Text className="text-xs font-medium text-foreground mr-1">
                      Match: {draft.match_type.toUpperCase()}
                    </Text>
                    <Ionicons name="swap-horizontal-outline" size={14} color="#64748B" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {draft.rules.map((rule, i) => {
                // Skip status rules — they're shown as chips
                if (rule.id === module.statusField) return null;

                return (
                  <View
                    key={`${rule.id}-${i}`}
                    className="bg-white rounded-xl px-4 py-3 mb-2 flex-row items-center"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                        {ruleLabel(module, rule)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => editRule(i)}
                      hitSlop={8}
                      className="mr-2 p-1"
                    >
                      <Ionicons name="pencil-outline" size={16} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeRule(i)} hitSlop={8} className="p-1">
                      <Ionicons name="close-circle" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Add rule / Edit rule button */}
          {!showRuleBuilder ? (
            <TouchableOpacity
              onPress={() => {
                setEditingRuleIndex(null);
                setShowRuleBuilder(true);
              }}
              className="flex-row items-center justify-center bg-white rounded-xl border border-dashed border-gray-300 py-4 mb-5"
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color="#0284C7" />
              <Text className="text-primary font-medium ml-2">
                {draft.rules.length === 0 ? "Add filter rule" : "Add another rule"}
              </Text>
            </TouchableOpacity>
          ) : (
            <RuleBuilder
              module={module}
              fields={filterFields}
              editingRule={
                editingRuleIndex !== null ? draft.rules[editingRuleIndex] : undefined
              }
              onAdd={addRule}
              onCancel={() => {
                setShowRuleBuilder(false);
                setEditingRuleIndex(null);
              }}
            />
          )}

          {/* Presets */}
          {presets.length > 0 ? (
            <View className="mt-2">
              <Text className="text-xs text-muted uppercase tracking-wide mb-2">
                Saved presets
              </Text>
              {presets.map((preset, i) => (
                <View key={i} className="flex-row items-center mb-2">
                  <TouchableOpacity
                    onPress={() =>
                      setDraft({
                        ...preset.group,
                        rules: [...preset.group.rules],
                      })
                    }
                    className="flex-1 bg-white rounded-xl px-4 py-3 flex-row items-center"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="bookmark-outline" size={16} color="#64748B" />
                    <Text className="text-foreground ml-2 flex-1">{preset.name}</Text>
                    <Text className="text-xs text-muted">
                      {activeFilterCount(preset.group)} rule
                      {activeFilterCount(preset.group) !== 1 ? "s" : ""}
                    </Text>
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

          {/* Save preset */}
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

        {/* Apply button */}
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

// ── Rule Builder ──────────────────────────────────────────────────────────

type RuleBuilderProps = {
  module: ModuleDefinition;
  fields: ModuleField[];
  editingRule?: FilterRule;
  onAdd: (rule: FilterRule) => void;
  onCancel: () => void;
};

function RuleBuilder({ module, fields, editingRule, onAdd, onCancel }: RuleBuilderProps) {
  const [selectedField, setSelectedField] = useState<string | null>(
    editingRule?.id ?? null,
  );
  const [selectedOperator, setSelectedOperator] = useState<FilterOperator | null>(
    editingRule?.operator ?? null,
  );
  const [value, setValue] = useState<string>(
    editingRule ? (Array.isArray(editingRule.value) ? editingRule.value.join(", ") : String(editingRule.value ?? "")) : "",
  );
  const [fieldDropdown, setFieldDropdown] = useState(false);
  const [operatorDropdown, setOperatorDropdown] = useState(false);

  const fieldDef = useMemo(
    () => fields.find((f) => f.key === selectedField),
    [fields, selectedField],
  );

  const availableOps = useMemo(() => {
    if (!fieldDef) return [] as FilterOperator[];
    return getFieldFilterOperators(module, fieldDef);
  }, [module, fieldDef]);

  // Reset operator when field changes
  const handleFieldSelect = useCallback(
    (key: string) => {
      setSelectedField(key);
      const fd = fields.find((f) => f.key === key);
      if (fd) {
        const ops = getFieldFilterOperators(module, fd);
        // Keep current operator if valid for the new field, else pick first
        if (selectedOperator && ops.includes(selectedOperator)) {
          // keep
        } else {
          setSelectedOperator(ops[0] ?? "equal");
        }
      }
      setFieldDropdown(false);
    },
    [fields, module, selectedOperator],
  );

  const handleAdd = useCallback(() => {
    if (!selectedField || !selectedOperator) return;
    const fd = fieldDef || fields.find((f) => f.key === selectedField);
    if (!fd) return;
    const ruleType = fieldDefaultRuleType(module, fd);

    let finalValue: string | string[] = value;

    // Parse value based on operator type
    if (selectedOperator === "in" || selectedOperator === "not_in") {
      finalValue = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (selectedOperator === "is_empty" || selectedOperator === "is_not_empty") {
      finalValue = "";
    }

    onAdd({
      id: selectedField,
      type: ruleType,
      operator: selectedOperator,
      value: finalValue,
    });
  }, [selectedField, selectedOperator, value, fieldDef, fields, module, onAdd]);

  const canAdd = selectedField && selectedOperator;

  // Determine value input type based on operator
  const needsValue = !(
    selectedOperator === "is_empty" || selectedOperator === "is_not_empty"
  );
  const isMulti = selectedOperator === "in" || selectedOperator === "not_in";
  const isRange = selectedOperator === "between" || selectedOperator === "not_between";
  const isSelectField = fieldDef?.options?.length || fieldDef?.type === "select";

  return (
    <View className="bg-white rounded-xl p-4 mb-5 border border-primary/20">
      <Text className="text-sm font-semibold text-foreground mb-3">
        {editingRule ? "Edit rule" : "New rule"}
      </Text>

      {/* Field picker */}
      <View className="mb-3">
        <Text className="text-xs text-muted mb-1">Field</Text>
        <TouchableOpacity
          onPress={() => setFieldDropdown(!fieldDropdown)}
          className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center"
          activeOpacity={0.7}
        >
          <Text className={`flex-1 ${selectedField ? "text-foreground" : "text-muted"}`}>
            {fieldDef?.label || "Select field…"}
          </Text>
          <Ionicons
            name={fieldDropdown ? "chevron-up" : "chevron-down"}
            size={16}
            color="#64748B"
          />
        </TouchableOpacity>

        {fieldDropdown ? (
          <View className="bg-white rounded-xl mt-1 border border-gray-200 max-h-48 overflow-hidden">
            <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
              {fields.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => handleFieldSelect(f.key)}
                  className={`px-4 py-3 border-b border-gray-50 ${
                    selectedField === f.key ? "bg-primary/10" : ""
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm ${
                      selectedField === f.key
                        ? "text-primary font-medium"
                        : "text-foreground"
                    }`}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {/* Operator picker */}
      {selectedField ? (
        <View className="mb-3">
          <Text className="text-xs text-muted mb-1">Operator</Text>
          <TouchableOpacity
            onPress={() => setOperatorDropdown(!operatorDropdown)}
            className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center"
            activeOpacity={0.7}
          >
            <Text className={`flex-1 ${selectedOperator ? "text-foreground" : "text-muted"}`}>
              {selectedOperator ? FILTER_OPERATOR_LABELS[selectedOperator] : "Select operator…"}
            </Text>
            <Ionicons
              name={operatorDropdown ? "chevron-up" : "chevron-down"}
              size={16}
              color="#64748B"
            />
          </TouchableOpacity>

          {operatorDropdown ? (
            <View className="bg-white rounded-xl mt-1 border border-gray-200 max-h-48 overflow-hidden">
              <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                {availableOps.map((op) => (
                  <TouchableOpacity
                    key={op}
                    onPress={() => {
                      setSelectedOperator(op);
                      setOperatorDropdown(false);
                    }}
                    className={`px-4 py-3 border-b border-gray-50 ${
                      selectedOperator === op ? "bg-primary/10" : ""
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-sm ${
                        selectedOperator === op
                          ? "text-primary font-medium"
                          : "text-foreground"
                      }`}
                    >
                      {FILTER_OPERATOR_LABELS[op]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Value input */}
      {selectedOperator && needsValue ? (
        <View className="mb-4">
          <Text className="text-xs text-muted mb-1">Value</Text>

          {isSelectField && (selectedOperator === "equal" || selectedOperator === "not_equal") ? (
            // Select field with equal/not_equal: render options as chips
            <View className="flex-row flex-wrap">
              {(fieldDef?.options || []).map((opt) => {
                const active = String(value) === String(opt.value);
                return (
                  <TouchableOpacity
                    key={String(opt.value)}
                    onPress={() => setValue(String(opt.value))}
                    className={`rounded-full mr-2 mb-2 px-4 py-2 border ${
                      active ? "border-transparent bg-primary" : "border-gray-200 bg-white"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        active ? "text-white" : "text-foreground"
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : isMulti ? (
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="value1, value2, value3…"
              placeholderTextColor="#94A3B8"
              className="bg-gray-100 rounded-xl px-4 py-3 text-foreground"
              autoCorrect={false}
              autoCapitalize="none"
            />
          ) : isRange ? (
            <View className="flex-row">
              <TextInput
                value={value.split("..")[0]?.trim() || ""}
                onChangeText={(v) => {
                  const [, to] = value.split("..");
                  setValue(`${v}..${to?.trim() || ""}`);
                }}
                placeholder="From"
                placeholderTextColor="#94A3B8"
                className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-foreground mr-2"
              />
              <TextInput
                value={value.split("..")[1]?.trim() || ""}
                onChangeText={(v) => {
                  const [from] = value.split("..");
                  setValue(`${from?.trim() || ""}..${v}`);
                }}
                placeholder="To"
                placeholderTextColor="#94A3B8"
                className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-foreground"
              />
            </View>
          ) : (
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="Enter value…"
              placeholderTextColor="#94A3B8"
              className="bg-gray-100 rounded-xl px-4 py-3 text-foreground"
              autoCorrect={false}
              autoCapitalize="none"
            />
          )}
        </View>
      ) : null}

      {/* Actions */}
      <View className="flex-row">
        <TouchableOpacity
          onPress={onCancel}
          className="flex-1 mr-2 bg-gray-100 rounded-xl py-3 items-center"
          activeOpacity={0.7}
        >
          <Text className="text-foreground font-medium">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAdd}
          disabled={!canAdd}
          className={`flex-1 ml-2 rounded-xl py-3 items-center ${
            canAdd ? "bg-primary" : "bg-gray-300"
          }`}
          activeOpacity={0.75}
        >
          <Text className={`font-medium ${canAdd ? "text-white" : "text-gray-500"}`}>
            {editingRule ? "Update" : "Add"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Re-export for backward compat ─────────────────────────────────────────

/** @deprecated Use FilterGroup instead. Kept for migration period. */
export type FilterValues = Record<string, string | string[] | undefined>;

/** @deprecated Use activeFilterCount(FilterGroup) instead. */
export function activeFilterCountLegacy(filters: FilterValues): number {
  return Object.values(filters).filter((v) => {
    if (v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    return v !== "";
  }).length;
}
