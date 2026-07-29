// ─── Perfix Dynamic Filters — Core Types & Utilities ────────────────────
//
// Mirrors the prizm331 Web UI filter architecture:
//   App_table_filter   → FilterRuleDef, FilterRuleInstance
//   App_table          → FilterTableDef
//   <app-filters> Vue  → FilterSheet, FilterBar, FilterRuleRow (components)
//
// The Web UI sends applied filters as:
//   POST { filters: { match_type: "and", rules: [...] } }
// The REST API accepts query params per field.
// This module supports both: it builds query strings from rules,
// and can also serialize to the Perfix POST payload.

// ─── Rule Types ──────────────────────────────────────────────────────────

export type FilterRuleType =
  | "TextRule"
  | "NumberRule"
  | "DateRule"
  | "SelectRule"
  | "MultiSelectRule"
  | "CheckboxRule"
  | "BooleanRule";

export type FilterOperator =
  // All rule types
  | "equal"
  | "not_equal"
  // MultiSelect / Checkbox
  | "in"
  | "not_in"
  // Number / Date
  | "less"
  | "less_or_equal"
  | "greater"
  | "greater_or_equal"
  | "between"
  | "not_between"
  // Text
  | "begins_with"
  | "not_begins_with"
  | "contains"
  | "not_contains"
  | "ends_with"
  | "not_ends_with"
  // Universal
  | "is_empty"
  | "is_not_empty"
  // Date-specific
  | "dynamic";

// ─── Operator sets per rule type (mirrors App_table_filter::$commonOperators) ──

export const OPERATORS_BY_TYPE: Record<FilterRuleType, FilterOperator[]> = {
  TextRule: [
    "equal",
    "not_equal",
    "begins_with",
    "not_begins_with",
    "contains",
    "not_contains",
    "ends_with",
    "not_ends_with",
  ],
  NumberRule: [
    "equal",
    "not_equal",
    "between",
    "not_between",
    "less",
    "less_or_equal",
    "greater",
    "greater_or_equal",
  ],
  DateRule: [
    "equal",
    "not_equal",
    "between",
    "not_between",
    "less",
    "less_or_equal",
    "greater",
    "greater_or_equal",
    "dynamic",
  ],
  SelectRule: ["equal", "not_equal"],
  MultiSelectRule: ["in", "not_in"],
  CheckboxRule: ["in", "not_in"],
  BooleanRule: ["equal", "not_equal"],
};

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equal: "=",
  not_equal: "≠",
  in: "in",
  not_in: "not in",
  less: "<",
  less_or_equal: "≤",
  greater: ">",
  greater_or_equal: "≥",
  between: "between",
  not_between: "not between",
  begins_with: "starts with",
  not_begins_with: "doesn't start with",
  contains: "contains",
  not_contains: "doesn't contain",
  ends_with: "ends with",
  not_ends_with: "doesn't end with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  dynamic: "dynamic",
};

// ─── Filter Rule Definition (mirrors App_table_filter PHP class) ─────────

export interface FilterRuleDef {
  /** Unique rule id — maps to a DB column or custom field slug */
  id: string;
  /** Rule type determines available operators and value input widget */
  type: FilterRuleType;
  /** Human-readable label */
  label: string;
  /** Available operators (defaults from OPERATORS_BY_TYPE) */
  operators?: FilterOperator[];
  /** For Select/MultiSelect rules — the dropdown options */
  options?: Array<{ value: string; label: string; subtext?: string }>;
  /** Whether this rule has a dynamic date value (e.g. "today", "this month") */
  hasDynamicValue?: boolean;
  /** Whether the rule is visible to the current user (Web UI uses isVisible callback) */
  visible?: boolean;
  /** For rules that need empty-operator handling */
  emptyOperatorValue?: string | null;
  /** Whether to include is_empty / is_not_empty operators */
  withEmptyOperators?: boolean;
}

// ─── Active Filter Rule Instance ──────────────────────────────────────────

export interface FilterRuleInstance {
  /** Must match a FilterRuleDef id */
  id: string;
  /** The value(s) to filter by */
  value: string | string[] | [string, string];
  /** The operator to apply */
  operator: FilterOperator;
  /** Whether this is a dynamic date value */
  hasDynamicValue?: boolean;
}

// ─── Match Type ───────────────────────────────────────────────────────────

export type MatchType = "and" | "or";

// ─── Perfix POST Payload (for advanced filter endpoints) ──────────────────

export interface PerfixFilterPayload {
  filters: {
    match_type: MatchType;
    rules: Array<{
      id: string;
      type: FilterRuleType;
      value: string | string[];
      operator: string;
      has_dynamic_value?: boolean;
    }>;
  };
}

// ─── Saved Filter (from Web UI or local) ───────────────────────────────────

export interface SavedFilter {
  id?: number | string;
  name: string;
  table_id: string;
  view: string;
  builder: {
    match_type: MatchType;
    rules: FilterRuleInstance[];
  };
  is_shared?: boolean;
}

// ─── Module Filter Definition (complete per-module config) ─────────────────

export interface ModuleFilterConfig {
  /** Table id matching the Web UI App_table id */
  tableId: string;
  /** The view name (defaults to tableId) */
  view?: string;
  /** Available filter rules */
  rules: FilterRuleDef[];
}

// ─── Helper: serialize rules to query string params ────────────────────────
//
// Maps filter rules to API-compatible query parameters.
// Simple rules (equal/not_equal on a single value) become:  ?field=value
// For complex rules (between, contains, etc.), the API may vary.
// This mimics what the Web UI REST endpoints accept.

export function rulesToQueryParams(
  rules: FilterRuleInstance[],
  ruleDefs: FilterRuleDef[],
  matchType: MatchType = "and",
): Record<string, string | number> {
  return serializePerfexFilterGroup({ match_type: matchType, rules }, ruleDefs);
}

type SerializableFilterRule = {
  id: string;
  type?: FilterRuleType;
  operator: FilterOperator;
  value: string | string[];
  hasDynamicValue?: boolean;
};

/** Serialize without losing negative operators, ranges, or AND/OR grouping. */
export function serializePerfexFilterGroup(
  group: { match_type: MatchType; rules: SerializableFilterRule[] },
  ruleDefs: FilterRuleDef[] = [],
): Record<string, string> {
  const rules = group.rules.flatMap((rule) => {
    const definition = ruleDefs.find((candidate) => candidate.id === rule.id);
    const type = rule.type ?? definition?.type;
    if (!type) return [];

    const needsNoValue = rule.operator === "is_empty" || rule.operator === "is_not_empty";
    const rawValue = Array.isArray(rule.value)
      ? rule.value.map(String)
      : (rule.operator === "between" || rule.operator === "not_between")
        ? String(rule.value).split("..").map((value) => value.trim())
        : String(rule.value ?? "");
    const hasValue = Array.isArray(rawValue)
      ? rawValue.length > 0 && rawValue.every((value) => value !== "")
      : rawValue !== "";
    if (!needsNoValue && !hasValue) return [];

    return [{
      id: rule.id,
      type,
      operator: rule.operator,
      value: needsNoValue ? "" : rawValue,
      has_dynamic_value: Boolean(rule.hasDynamicValue || rule.operator === "dynamic"),
    }];
  });

  if (rules.length === 0) return {};
  return {
    filters: JSON.stringify({
      match_type: group.match_type === "or" ? "or" : "and",
      rules,
    }),
  };
}

// ─── Helper: build human-readable filter summary ──────────────────────────

export function describeRule(
  rule: FilterRuleInstance,
  ruleDefs: FilterRuleDef[]
): string {
  const def = ruleDefs.find((d) => d.id === rule.id);
  const label = def?.label ?? rule.id;
  const opLabel = OPERATOR_LABELS[rule.operator] ?? rule.operator;
  const val =
    rule.operator === "dynamic"
      ? rule.value
      : Array.isArray(rule.value)
        ? rule.value.join(" – ")
        : rule.value;
  return `${label} ${opLabel} ${val || "—"}`;
}

// ─── Default rule for text search ─────────────────────────────────────────

export const SEARCH_RULE_DEF: FilterRuleDef = {
  id: "search",
  type: "TextRule",
  label: "Search",
  operators: ["contains"],
};
