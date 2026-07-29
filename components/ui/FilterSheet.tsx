// ─── FilterSheet ─────────────────────────────────────────────────────────
//
// Bottom-sheet modal for building advanced Perfix-style dynamic filters.
// Mirrors the Web UI's <app-filters> component UX on mobile:
//   - Select a field (rule)
//   - Choose an operator
//   - Enter a value
//   - Add/remove rules
//   - Toggle AND/OR match type
//
// Usage:
//   <FilterSheet
//     visible={showFilter}
//     onClose={() => setShowFilter(false)}
//     ruleDefs={MODULE_RULES}
//     rules={filter.rules}
//     matchType={filter.matchType}
//     onAddRule={filter.addRule}
//     onRemoveRule={filter.removeRule}
//     onUpdateRule={filter.updateRule}
//     onSetMatchType={filter.setMatchType}
//   />

import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  FilterRuleDef,
  FilterRuleInstance,
  FilterRuleType,
  FilterOperator,
  MatchType,
} from "@/lib/filters";
import { OPERATORS_BY_TYPE, OPERATOR_LABELS } from "@/lib/filters";

export type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  ruleDefs: FilterRuleDef[];
  rules: FilterRuleInstance[];
  matchType: MatchType;
  onAddRule: (rule: FilterRuleInstance) => void;
  onRemoveRule: (index: number) => void;
  onUpdateRule: (index: number, updates: Partial<FilterRuleInstance>) => void;
  onSetMatchType: (type: MatchType) => void;
};

export function FilterSheet({
  visible,
  onClose,
  ruleDefs,
  rules,
  matchType,
  onAddRule,
  onRemoveRule,
  onUpdateRule,
  onSetMatchType,
}: FilterSheetProps) {
  const insets = useSafeAreaInsets();

  // ─── New rule builder state ─────────────────────────────────────────
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedOperator, setSelectedOperator] =
    useState<FilterOperator>("equal");
  const [inputValue, setInputValue] = useState("");
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [showOperatorPicker, setShowOperatorPicker] = useState(false);

  const selectedDef = ruleDefs.find((d) => d.id === selectedField);
  const availableOps = selectedDef
    ? [
        ...(selectedDef.operators ?? OPERATORS_BY_TYPE[selectedDef.type]),
        ...(selectedDef.withEmptyOperators ? (["is_empty", "is_not_empty"] as FilterOperator[]) : []),
      ]
    : [];

  const noValueOperator = selectedOperator === "is_empty" || selectedOperator === "is_not_empty";
  const rangeOperator = selectedOperator === "between" || selectedOperator === "not_between";
  const rangeValues = inputValue.split("..").map((value) => value.trim());
  const canAdd = selectedField !== "" && (
    noValueOperator
    || (rangeOperator ? rangeValues.length === 2 && rangeValues.every(Boolean) : inputValue.trim() !== "")
  );

  const handleAdd = () => {
    if (!canAdd || !selectedDef) return;

    const multiValue = selectedDef.type === "MultiSelectRule" || selectedDef.type === "CheckboxRule";
    const rule: FilterRuleInstance = {
      id: selectedField,
      operator: selectedOperator,
      value: noValueOperator
        ? ""
        : (multiValue || rangeOperator)
          ? (rangeOperator ? rangeValues : inputValue.split(",").map((value) => value.trim()).filter(Boolean))
          : inputValue.trim(),
      hasDynamicValue: selectedOperator === "dynamic",
    };
    onAddRule(rule);

    // Reset
    setSelectedField("");
    setSelectedOperator("equal");
    setInputValue("");
  };

  const handleRemove = (index: number) => {
    onRemoveRule(index);
  };

  const getOperatorLabel = (op: FilterOperator) => OPERATOR_LABELS[op] ?? op;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          paddingTop: insets.top,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#E2E8F0",
          }}
        >
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
          <Text
            style={{ fontSize: 17, fontWeight: "600", color: "#1E293B" }}
          >
            Filters
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 16 }}
        >
          {/* ─── Active rules ─────────────────────────────────────────── */}
          {rules.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Active Rules ({rules.length})
              </Text>
              {rules.map((rule, i) => {
                const def = ruleDefs.find((d) => d.id === rule.id);
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#F8FAFC",
                      borderRadius: 10,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: "#1E293B",
                        }}
                      >
                        {def?.label ?? rule.id}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#64748B",
                          marginTop: 2,
                        }}
                      >
                        {getOperatorLabel(rule.operator)} —{" "}
                        {Array.isArray(rule.value)
                          ? rule.value.join(", ")
                          : String(rule.value)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemove(i)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#EF4444"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* ─── Match type toggle ────────────────────────────────────── */}
          {rules.length > 1 && (
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#F1F5F9",
                borderRadius: 10,
                padding: 2,
              }}
            >
              {(["and", "or"] as MatchType[]).map((mt) => (
                <TouchableOpacity
                  key={mt}
                  onPress={() => onSetMatchType(mt)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor:
                      matchType === mt ? "#FFFFFF" : "transparent",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: matchType === mt ? "#2563EB" : "#64748B",
                      textTransform: "uppercase",
                    }}
                  >
                    {mt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ─── Add new rule ─────────────────────────────────────────── */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Add Rule
            </Text>

            {/* Field picker */}
            <TouchableOpacity
              onPress={() => setShowFieldPicker(!showFieldPicker)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#F1F5F9",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: selectedDef ? "#1E293B" : "#94A3B8",
                }}
              >
                {selectedDef?.label ?? "Select field..."}
              </Text>
              <Ionicons
                name={showFieldPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color="#94A3B8"
              />
            </TouchableOpacity>

            {showFieldPicker && (
              <ScrollView
                style={{ maxHeight: 200 }}
                contentContainerStyle={{ gap: 4 }}
                nestedScrollEnabled
              >
                {ruleDefs
                  .filter((d) => d.visible !== false)
                  .map((def) => (
                    <TouchableOpacity
                      key={def.id}
                      onPress={() => {
                        setSelectedField(def.id);
                        setSelectedOperator(
                          def.operators?.[0] ??
                            OPERATORS_BY_TYPE[def.type][0]
                        );
                        setShowFieldPicker(false);
                      }}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor:
                          selectedField === def.id
                            ? "#EFF6FF"
                            : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight:
                            selectedField === def.id ? "600" : "400",
                          color:
                            selectedField === def.id
                              ? "#2563EB"
                              : "#1E293B",
                        }}
                      >
                        {def.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#94A3B8",
                          marginTop: 1,
                        }}
                      >
                        {def.type}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}

            {/* Operator picker */}
            {selectedDef && (
              <TouchableOpacity
                onPress={() =>
                  setShowOperatorPicker(!showOperatorPicker)
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#F1F5F9",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <Text style={{ fontSize: 14, color: "#1E293B" }}>
                  {getOperatorLabel(selectedOperator)}
                </Text>
                <Ionicons
                  name={showOperatorPicker ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            )}

            {showOperatorPicker && (
              <View style={{ gap: 4 }}>
                {availableOps.map((op) => (
                  <TouchableOpacity
                    key={op}
                    onPress={() => {
                      setSelectedOperator(op);
                      setShowOperatorPicker(false);
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor:
                        selectedOperator === op
                          ? "#EFF6FF"
                          : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight:
                          selectedOperator === op ? "600" : "400",
                        color:
                          selectedOperator === op
                            ? "#2563EB"
                            : "#1E293B",
                      }}
                    >
                      {getOperatorLabel(op)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Value input */}
            {selectedDef && selectedOperator !== "is_empty" && selectedOperator !== "is_not_empty" && (
              <>
                {selectedDef.options ? (
                  // Select/MultiSelect — show option list
                  <ScrollView
                    style={{ maxHeight: 200 }}
                    contentContainerStyle={{ gap: 4 }}
                    nestedScrollEnabled
                  >
                    {selectedDef.options.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => {
                          const multi = selectedDef.type === "MultiSelectRule"
                            || selectedDef.type === "CheckboxRule"
                            || selectedOperator === "in"
                            || selectedOperator === "not_in";
                          if (!multi) {
                            setInputValue(opt.value);
                            return;
                          }
                          const selected = inputValue.split(",").map((value) => value.trim()).filter(Boolean);
                          setInputValue(
                            selected.includes(opt.value)
                              ? selected.filter((value) => value !== opt.value).join(",")
                              : [...selected, opt.value].join(","),
                          );
                        }}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          backgroundColor:
                            inputValue.split(",").includes(opt.value)
                              ? "#EFF6FF"
                              : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight:
                              inputValue.split(",").includes(opt.value) ? "600" : "400",
                            color:
                              inputValue.split(",").includes(opt.value)
                                ? "#2563EB"
                                : "#1E293B",
                          }}
                        >
                          {opt.label}
                        </Text>
                        {opt.subtext && (
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#94A3B8",
                              marginTop: 1,
                            }}
                          >
                            {opt.subtext}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : selectedDef.type === "DateRule" ? (
                  <TextInput
                    value={inputValue}
                    onChangeText={setInputValue}
                    placeholder={
                      selectedOperator === "between"
                        ? "YYYY-MM-DD..YYYY-MM-DD"
                        : selectedOperator === "dynamic"
                          ? "today / this_week / this_month / ..."
                          : "YYYY-MM-DD"
                    }
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: "#F1F5F9",
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 14,
                      color: "#1E293B",
                    }}
                  />
                ) : (
                  <TextInput
                    value={inputValue}
                    onChangeText={setInputValue}
                    placeholder="Enter value..."
                    placeholderTextColor="#94A3B8"
                    style={{
                      backgroundColor: "#F1F5F9",
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 14,
                      color: "#1E293B",
                    }}
                  />
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* Bottom bar */}
        <View
          style={{
            padding: 16,
            paddingBottom: insets.bottom + 16,
            borderTopWidth: 1,
            borderTopColor: "#E2E8F0",
          }}
        >
          <TouchableOpacity
            onPress={handleAdd}
            disabled={!canAdd}
            activeOpacity={0.7}
            style={{
              backgroundColor: canAdd ? "#2563EB" : "#CBD5E1",
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              Add Filter
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default FilterSheet;
