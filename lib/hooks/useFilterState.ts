// ─── useFilterState ───────────────────────────────────────────────────────
//
// Manages active filter rules, match type, search text, and quick-filter
// chips for any module that uses Perfix dynamic filters.
//
// Usage:
//   const filter = useFilterState(LEAD_RULES);
//   // Set a simple chip filter:
//   filter.setQuickFilter("status", "3");
//   // Build advanced rules:
//   filter.addRule({ id: "name", operator: "contains", value: "Acme" });
//   // Get API params:
//   const params = filter.toQueryParams();
//   // Render chips:
//   filter.activeChips.map(chip => <FilterChip ... />);

import { useState, useCallback, useEffect, useMemo } from "react";
import type {
  FilterRuleDef,
  FilterRuleInstance,
  FilterOperator,
  MatchType,
} from "../filters";
import { rulesToQueryParams } from "../filters";

export interface ActiveChip {
  key: string;
  label: string;
  value: string;
  color?: string;
  onRemove: () => void;
}

export function useFilterState(ruleDefs: FilterRuleDef[]) {
  const [rules, setRules] = useState<FilterRuleInstance[]>([]);
  const [matchType, setMatchType] = useState<MatchType>("and");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ─── Quick filters (chips) ──────────────────────────────────────────

  type QuickFilters = Record<string, string>;
  const [quickFilters, setQuickFilters] = useState<QuickFilters>({});

  const setQuickFilter = useCallback((field: string, value: string) => {
    setQuickFilters((prev) => {
      if (!value) {
        if (!(field in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[field];
        return next;
      }
      if (prev[field] === value) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: value };
    });
  }, []);

  const clearQuickFilters = useCallback(() => {
    setQuickFilters({});
  }, []);

  // ─── Advanced rules ─────────────────────────────────────────────────

  const addRule = useCallback((rule: FilterRuleInstance) => {
    setRules((prev) => [...prev, rule]);
  }, []);

  const removeRule = useCallback((index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateRule = useCallback(
    (index: number, updates: Partial<FilterRuleInstance>) => {
      setRules((prev) =>
        prev.map((r, i) => (i === index ? { ...r, ...updates } : r))
      );
    },
    []
  );

  const clearRules = useCallback(() => {
    setRules([]);
  }, []);

  const clearAll = useCallback(() => {
    setRules([]);
    setQuickFilters({});
    setSearch("");
  }, []);

  // ─── Active chips (quick + advanced combined) ───────────────────────

  const activeChips: ActiveChip[] = useMemo(() => {
    const chips: ActiveChip[] = [];

    // Quick filter chips
    for (const [field, value] of Object.entries(quickFilters)) {
      const def = ruleDefs.find((d) => d.id === field);
      const label = def?.label ?? field;
      const displayVal =
        def?.options?.find((o) => o.value === value)?.label ?? value;
      chips.push({
        key: `quick:${field}:${value}`,
        label: label,
        value: displayVal,
        onRemove: () => setQuickFilter(field, value),
      });
    }

    // Advanced rule chips
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const def = ruleDefs.find((d) => d.id === rule.id);
      const label = def?.label ?? rule.id;
      const val = Array.isArray(rule.value)
        ? rule.value.join(", ")
        : String(rule.value);
      chips.push({
        key: `rule:${i}`,
        label: `${label}`,
        value: val,
        onRemove: () => removeRule(i),
      });
    }

    return chips;
  }, [quickFilters, rules, ruleDefs, setQuickFilter, removeRule]);

  // ─── API params ─────────────────────────────────────────────────────

  const toQueryParams = useCallback((): Record<string, string | number> => {
    const params: Record<string, string | number> = {};

    // Quick filters
    for (const [field, value] of Object.entries(quickFilters)) {
      params[field] = value;
    }

    // Search
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    // Advanced rules
    const ruleParams = rulesToQueryParams(rules, ruleDefs, matchType);
    Object.assign(params, ruleParams);

    return params;
  }, [quickFilters, debouncedSearch, rules, ruleDefs, matchType]);

  // ─── Counts ─────────────────────────────────────────────────────────

  const activeFilterCount = useMemo(
    () => Object.keys(quickFilters).length + rules.length,
    [quickFilters, rules]
  );

  const hasActiveFilters = activeFilterCount > 0 || search.trim().length > 0;

  return {
    // State
    rules,
    matchType,
    search,
    quickFilters,
    // Active chips for rendering
    activeChips,
    activeFilterCount,
    hasActiveFilters,
    // Actions
    setSearch,
    setQuickFilter,
    clearQuickFilters,
    addRule,
    removeRule,
    updateRule,
    clearRules,
    clearAll,
    setMatchType,
    // Serialization
    toQueryParams,
  };
}
