import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listEntities, normalizeList } from "@/lib/api";
import { RelationKind } from "@/lib/module-registry";

type RelationPickerProps = {
  relation: RelationKind;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/**
 * Search-and-select picker bound to one of the reference / lookup tables.
 * Used by CrudFormScreen for relation-typed fields so the user picks a
 * country / currency / customer / staff member by name instead of typing
 * a numeric ID.
 *
 * Backed by the same /api/<table> endpoints as CrudDetailScreen's resolver,
 * so labels stay consistent between view and edit modes.
 */
export function RelationPicker({ relation, value, onChange, placeholder }: RelationPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const cfg = RELATION_CONFIG[relation];

  const q = useQuery({
    queryKey: ["crud", "lookup", cfg.queryKey],
    queryFn: () => listEntities(cfg.endpoint, cfg.endpointParams),
    enabled: open, // only fetch when picker is opened — avoid touching the
                   // network when the user is just viewing the form
    staleTime: 60 * 60 * 1000,
  });

  const items = useMemo(() => normalizeList(q.data).items, [q.data]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item: any) => {
      const label = cfg.label(item);
      return label && label.toLowerCase().includes(needle);
    });
  }, [items, search, cfg]);

  // Try to resolve the current value's label from the loaded list. If we
  // haven't opened the picker yet (no data), fall back to "<Kind> #id".
  const currentLabel = useMemo(() => {
    if (!value) return null;
    if (items.length === 0) return null;
    const item = items.find((it: any) => String(cfg.id(it)) === String(value));
    return item ? cfg.label(item) : null;
  }, [items, value, cfg]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        className="flex-row items-center bg-gray-50 rounded-xl px-3 h-11"
      >
        <Text
          className={`flex-1 ${currentLabel || value ? "text-foreground" : "text-muted"}`}
          numberOfLines={1}
        >
          {currentLabel ?? (value ? `${cfg.fallbackLabel} #${value}` : (placeholder || `Select ${cfg.fallbackLabel.toLowerCase()}`))}
        </Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange("")} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
        <Ionicons name="chevron-down" size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-surface">
          <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text className="ml-3 text-lg font-semibold flex-1">{cfg.title}</Text>
          </View>

          <View className="px-4 py-3 bg-white border-b border-gray-100">
            <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
              <Ionicons name="search-outline" size={18} color="#64748B" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${cfg.fallbackLabel.toLowerCase()}…`}
                placeholderTextColor="#94A3B8"
                className="flex-1 ml-2 text-foreground"
                autoCorrect={false}
                autoCapitalize="none"
                autoFocus
              />
            </View>
          </View>

          {q.isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#0284C7" />
            </View>
          ) : q.isError ? (
            <View className="flex-1 items-center justify-center px-8">
              <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
              <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load</Text>
              <TouchableOpacity onPress={() => q.refetch()} className="mt-4 bg-primary px-5 py-2 rounded-lg">
                <Text className="text-white font-medium">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, index) => String(cfg.id(item) ?? index)}
              renderItem={({ item }) => {
                const id = String(cfg.id(item) ?? "");
                const label = cfg.label(item) || `#${id}`;
                const selected = id === String(value);
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`px-4 py-3 border-b border-gray-50 flex-row items-center ${
                      selected ? "bg-primary/5" : "bg-white"
                    }`}
                    activeOpacity={0.6}
                  >
                    <Text className="flex-1 text-foreground" numberOfLines={1}>{label}</Text>
                    {selected ? <Ionicons name="checkmark" size={20} color="#0284C7" /> : null}
                  </TouchableOpacity>
                );
              }}
              initialNumToRender={30}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </Modal>
    </>
  );
}

// ─── Per-relation config: which endpoint, which fields are id/label ─────────

type RelationCfg = {
  endpoint: string;
  endpointParams?: { limit?: number };
  queryKey: string;
  title: string;
  fallbackLabel: string;
  id: (row: any) => string | number | undefined;
  label: (row: any) => string;
};

const firstStr = (...xs: any[]): string => {
  for (const x of xs) {
    if (x !== null && x !== undefined && String(x).trim() !== "") return String(x);
  }
  return "";
};

const RELATION_CONFIG: Record<RelationKind, RelationCfg> = {
  customer: {
    endpoint: "customers",
    endpointParams: { limit: 500 },
    queryKey: "customers",
    title: "Select customer",
    fallbackLabel: "Customer",
    id: (r) => r.userid ?? r.customer_id ?? r.id,
    label: (r) => firstStr(r.company, r.name, r.email),
  },
  staff: {
    endpoint: "staffs",
    endpointParams: { limit: 500 },
    queryKey: "staff",
    title: "Select staff member",
    fallbackLabel: "Staff",
    id: (r) => r.staffid ?? r.id,
    label: (r) =>
      firstStr(
        [r.firstname, r.lastname].filter(Boolean).join(" ").trim(),
        r.email
      ),
  },
  country: {
    endpoint: "countries",
    queryKey: "countries",
    title: "Select country",
    fallbackLabel: "Country",
    id: (r) => r.country_id ?? r.id,
    label: (r) => firstStr(r.short_name, r.long_name, r.iso2),
  },
  currency: {
    endpoint: "currencies",
    queryKey: "currencies",
    title: "Select currency",
    fallbackLabel: "Currency",
    id: (r) => r.id,
    label: (r) => firstStr(r.name, r.symbol),
  },
  customer_group: {
    endpoint: "customer_groups",
    queryKey: "customer_groups",
    title: "Select group",
    fallbackLabel: "Customer Group",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  payment_mode: {
    endpoint: "payment_modes",
    queryKey: "payment_modes",
    title: "Select payment mode",
    fallbackLabel: "Payment Mode",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  tax_rate: {
    endpoint: "tax_rates",
    queryKey: "tax_rates",
    title: "Select tax rate",
    fallbackLabel: "Tax Rate",
    id: (r) => r.id,
    label: (r) =>
      firstStr(
        r.name ? `${r.name}${r.taxrate ? ` (${r.taxrate}%)` : ""}` : "",
        r.name
      ),
  },
  lead_source: {
    endpoint: "lead_sources",
    queryKey: "lead_sources",
    title: "Select source",
    fallbackLabel: "Source",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  lead_status: {
    endpoint: "lead_statuses",
    queryKey: "lead_statuses",
    title: "Select status",
    fallbackLabel: "Status",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  ticket_priority: {
    endpoint: "ticket_priorities",
    queryKey: "ticket_priorities",
    title: "Select priority",
    fallbackLabel: "Priority",
    id: (r) => r.priorityid ?? r.id,
    label: (r) => firstStr(r.name),
  },
  ticket_status: {
    endpoint: "ticket_statuses",
    queryKey: "ticket_statuses",
    title: "Select status",
    fallbackLabel: "Status",
    id: (r) => r.ticketstatusid ?? r.id,
    label: (r) => firstStr(r.name),
  },
};
