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
  multiple?: boolean;
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
export function RelationPicker({ relation, value, onChange, multiple = false, placeholder }: RelationPickerProps) {
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

  const items = useMemo(() => {
    const seen = new Set<string>();
    return normalizeList(q.data).items.filter((item: any) => {
      const id = String(cfg.id(item) ?? "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [q.data, cfg]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item: any) => {
      const label = cfg.label(item);
      return label && label.toLowerCase().includes(needle);
    });
  }, [items, search, cfg]);
  const selectedIds = useMemo(
    () => new Set(value.split(",").map((id) => id.trim()).filter(Boolean)),
    [value],
  );

  // Try to resolve the current value's label from the loaded list. If we
  // haven't opened the picker yet (no data), fall back to "<Kind> #id".
  const currentLabel = useMemo(() => {
    if (!value) return null;
    if (items.length === 0) return null;
    if (multiple) {
      const labels = items
        .filter((it: any) => selectedIds.has(String(cfg.id(it))))
        .map((it: any) => cfg.label(it))
        .filter(Boolean);
      return labels.length ? labels.join(", ") : null;
    }
    const item = items.find((it: any) => String(cfg.id(it)) === String(value));
    return item ? cfg.label(item) : null;
  }, [items, multiple, selectedIds, value, cfg]);

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
          {currentLabel ?? (value ? (multiple ? `${selectedIds.size} selected` : `${cfg.fallbackLabel} #${value}`) : (placeholder || `Select ${cfg.fallbackLabel.toLowerCase()}`))}
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
            {multiple ? (
              <TouchableOpacity
                onPress={() => {
                  setOpen(false);
                  setSearch("");
                }}
                className="bg-primary rounded-lg px-3 py-2"
              >
                <Text className="text-white font-semibold">Done</Text>
              </TouchableOpacity>
            ) : null}
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
                const selected = multiple ? selectedIds.has(id) : id === String(value);
                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (multiple) {
                        const next = new Set(selectedIds);
                        selected ? next.delete(id) : next.add(id);
                        onChange([...next].join(","));
                      } else {
                        onChange(id);
                        setOpen(false);
                        setSearch("");
                      }
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
  endpointParams?: Record<string, string | number | undefined>;
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
  invoice: {
    endpoint: "invoices",
    endpointParams: { limit: 500 },
    queryKey: "invoices",
    title: "Select invoice",
    fallbackLabel: "Invoice",
    id: (r) => r.id,
    label: (r) => firstStr(r.invoice_number, [r.prefix, r.number].filter(Boolean).join(""), r.reference_no),
  },
  task: {
    endpoint: "tasks",
    endpointParams: { limit: 500 },
    queryKey: "tasks",
    title: "Select task",
    fallbackLabel: "Task",
    id: (r) => r.id ?? r.task_id,
    label: (r) => firstStr(r.name, r.subject),
  },
  customer: {
    endpoint: "customers",
    endpointParams: { limit: 500 },
    queryKey: "customers",
    title: "Select customer",
    fallbackLabel: "Customer",
    id: (r) => r.userid ?? r.customer_id ?? r.id,
    label: (r) => firstStr(r.company, r.name, r.email),
  },
  lead: {
    endpoint: "leads",
    endpointParams: { limit: 500 },
    queryKey: "leads",
    title: "Select lead",
    fallbackLabel: "Lead",
    id: (r) => r.id,
    label: (r) => firstStr(r.name, r.company, r.email),
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
  project: {
    endpoint: "projects",
    endpointParams: { limit: 500 },
    queryKey: "projects",
    title: "Select project",
    fallbackLabel: "Project",
    id: (r) => r.id ?? r.project_id,
    label: (r) => firstStr(r.name, r.project_name),
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
  opportunity_status: {
    endpoint: "opportunities_api/statuses",
    queryKey: "opportunity_statuses",
    title: "Select workflow status",
    fallbackLabel: "Workflow Status",
    id: (r) => r.status_id ?? r.id,
    label: (r) => firstStr(
      r.stage_name && r.status_name ? `${r.stage_name} — ${r.status_name}` : "",
      r.status_name,
    ),
  },
  equipment_asset: {
    endpoint: "fixed_equipment_api",
    endpointParams: { limit: 500, sort: "assets_name", sort_dir: "asc" },
    queryKey: "equipment_assets",
    title: "Select target asset",
    fallbackLabel: "Asset",
    id: (r) => r.id,
    label: (r) => firstStr(
      r.series && r.assets_name ? `${r.series} — ${r.assets_name}` : "",
      r.assets_name,
      r.series,
    ),
  },
  equipment_maintenance_asset: {
    endpoint: "fixed_equipment_api/maintenance_assets",
    queryKey: "equipment_maintenance_assets",
    title: "Select maintained asset",
    fallbackLabel: "Asset",
    id: (r) => r.id,
    label: (r) => firstStr(
      r.series && r.assets_name ? `${r.series} — ${r.assets_name}` : "",
      r.assets_name,
      r.series,
    ),
  },
  equipment_requestable_asset: {
    endpoint: "fixed_equipment_api/requestable_assets",
    queryKey: "equipment_requestable_assets",
    title: "Select requestable asset",
    fallbackLabel: "Asset",
    id: (r) => r.id,
    label: (r) => firstStr(
      r.series && r.assets_name ? `${r.series} — ${r.assets_name}` : "",
      r.assets_name,
      r.series,
    ),
  },
  equipment_unsigned_checkout: {
    endpoint: "fixed_equipment_api/unsigned_checkouts",
    queryKey: "equipment_unsigned_checkouts",
    title: "Select custody events",
    fallbackLabel: "Custody Event",
    id: (r) => r.id,
    label: (r) => firstStr(r.label, r.asset_name ? `#${r.id} — ${r.asset_name}` : "", `#${r.id}`),
  },
  equipment_auditable_item: {
    endpoint: "fixed_equipment_api/auditable_items",
    queryKey: "equipment_auditable_items",
    title: "Select equipment",
    fallbackLabel: "Equipment",
    id: (r) => r.id,
    label: (r) => firstStr(r.label, r.series && r.assets_name ? `${r.series} — ${r.assets_name}` : "", r.assets_name),
  },
  equipment_category: {
    endpoint: "fixed_equipment_api/categories",
    endpointParams: { type: "asset" },
    queryKey: "equipment_categories",
    title: "Select equipment category",
    fallbackLabel: "Category",
    id: (r) => r.id,
    label: (r) => firstStr(r.category_name, r.name),
  },
  advance_lead_status: {
    endpoint: "advance_leads_api/statuses",
    queryKey: "advance_lead_statuses",
    title: "Select advance lead statuses",
    fallbackLabel: "Advance Lead Status",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  knowledge_group: {
    endpoint: "knowledge_api/groups",
    queryKey: "knowledge_groups",
    title: "Select knowledge group",
    fallbackLabel: "Knowledge Group",
    id: (r) => r.groupid ?? r.id,
    label: (r) => firstStr(r.name),
  },
  equipment_accessory_category: {
    endpoint: "fixed_equipment_api/categories",
    endpointParams: { type: "accessory" },
    queryKey: "equipment_accessory_categories",
    title: "Select accessory category",
    fallbackLabel: "Accessory Category",
    id: (r) => r.id,
    label: (r) => firstStr(r.category_name, r.name),
  },
  equipment_consumable_category: {
    endpoint: "fixed_equipment_api/categories",
    endpointParams: { type: "consumable" },
    queryKey: "equipment_consumable_categories",
    title: "Select consumable category",
    fallbackLabel: "Consumable Category",
    id: (r) => r.id,
    label: (r) => firstStr(r.category_name, r.name),
  },
  equipment_component_category: {
    endpoint: "fixed_equipment_api/categories",
    endpointParams: { type: "component" },
    queryKey: "equipment_component_categories",
    title: "Select component category",
    fallbackLabel: "Component Category",
    id: (r) => r.id,
    label: (r) => firstStr(r.category_name, r.name),
  },
  equipment_license_category: {
    endpoint: "fixed_equipment_api/categories",
    endpointParams: { type: "license" },
    queryKey: "equipment_license_categories",
    title: "Select license category",
    fallbackLabel: "License Category",
    id: (r) => r.id,
    label: (r) => firstStr(r.category_name, r.name),
  },
  equipment_location: {
    endpoint: "fixed_equipment_api/locations",
    queryKey: "equipment_locations",
    title: "Select equipment location",
    fallbackLabel: "Location",
    id: (r) => r.id ?? r.location_id,
    label: (r) => firstStr(r.location_name, r.name),
  },
  equipment_manufacturer: {
    endpoint: "fixed_equipment_api/manufacturers",
    queryKey: "equipment_manufacturers",
    title: "Select equipment manufacturer",
    fallbackLabel: "Manufacturer",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  equipment_model: {
    endpoint: "fixed_equipment_api/models",
    queryKey: "equipment_models",
    title: "Select equipment model",
    fallbackLabel: "Model",
    id: (r) => r.id,
    label: (r) => firstStr(
      r.model_no ? `${r.model_name || "Model"} — ${r.model_no}` : "",
      r.model_name,
    ),
  },
  equipment_status: {
    endpoint: "fixed_equipment_api/statuses",
    queryKey: "equipment_statuses",
    title: "Select equipment status",
    fallbackLabel: "Status",
    id: (r) => r.id,
    label: (r) => firstStr(r.name, r.status_type),
  },
  equipment_deployable_status: {
    endpoint: "fixed_equipment_api/statuses",
    endpointParams: { status_type: "deployable" },
    queryKey: "equipment_deployable_statuses",
    title: "Select deployable status",
    fallbackLabel: "Deployable Status",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  equipment_depreciation: {
    endpoint: "fixed_equipment_api/depreciations",
    queryKey: "equipment_depreciations",
    title: "Select depreciation",
    fallbackLabel: "Depreciation",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  equipment_supplier: {
    endpoint: "fixed_equipment_api/suppliers",
    queryKey: "equipment_suppliers",
    title: "Select equipment supplier",
    fallbackLabel: "Supplier",
    id: (r) => r.id,
    label: (r) => firstStr(r.supplier_name, r.name),
  },
  otp_source: {
    endpoint: "otpmanager/sources",
    endpointParams: { status: "active", limit: 500 },
    queryKey: "otp_sources",
    title: "Select OTP source",
    fallbackLabel: "OTP Source",
    id: (r) => r.id,
    label: (r) => firstStr(r.source, r.normalized_name),
  },
  material_category: {
    endpoint: "materials_catalog/categories",
    endpointParams: { limit: 500 },
    queryKey: "material_categories",
    title: "Select material categories",
    fallbackLabel: "Material Category",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  budget_expense_category: {
    endpoint: "budget_api/categories",
    endpointParams: { limit: 500 },
    queryKey: "budget_expense_categories",
    title: "Select expense category",
    fallbackLabel: "Expense Category",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  budget_item: {
    endpoint: "budget_api/items",
    endpointParams: { limit: 500 },
    queryKey: "budget_items",
    title: "Select catalog item",
    fallbackLabel: "Catalog Item",
    id: (r) => r.id,
    label: (r) => firstStr(
      r.item_code && r.name ? `${r.item_code} — ${r.name}` : "",
      r.code && r.name ? `${r.code} — ${r.name}` : "",
      r.name,
    ),
  },
  budget_specification: {
    endpoint: "budget_api/specifications",
    queryKey: "budget_specifications",
    title: "Select specification",
    fallbackLabel: "Specification",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  budget_unit: {
    endpoint: "budget_api/units",
    endpointParams: { limit: 500 },
    queryKey: "budget_units",
    title: "Select unit",
    fallbackLabel: "Unit",
    id: (r) => r.id,
    label: (r) => firstStr(r.name, r.symbol),
  },
  hr_training_type: {
    endpoint: "hr_profile_api/training_types",
    endpointParams: { limit: 500 },
    queryKey: "hr_training_types",
    title: "Select training type",
    fallbackLabel: "Training Type",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  hr_training_library: {
    endpoint: "hr_profile_api/training_libraries",
    endpointParams: { limit: 500 },
    queryKey: "hr_training_libraries",
    title: "Select training material",
    fallbackLabel: "Training Material",
    id: (r) => r.training_id ?? r.id,
    label: (r) => firstStr(r.subject, r.name),
  },
  hr_job_position: {
    endpoint: "hr_profile_api/job_positions",
    endpointParams: { limit: 500 },
    queryKey: "hr_job_positions",
    title: "Select job position",
    fallbackLabel: "Job Position",
    id: (r) => r.position_id ?? r.id,
    label: (r) => firstStr(r.position_name, r.name),
  },
  hr_contract_type: {
    endpoint: "hr_profile_api/contract_types",
    endpointParams: { limit: 500 },
    queryKey: "hr_contract_types",
    title: "Select contract type",
    fallbackLabel: "Contract Type",
    id: (r) => r.id_contracttype ?? r.id,
    label: (r) => firstStr(r.name_contracttype, r.name),
  },
  stripe_plan: {
    endpoint: "subscriptions/plans",
    queryKey: "subscription_plans",
    title: "Select billing plan",
    fallbackLabel: "Billing Plan",
    id: (r) => r.id,
    label: (r) => firstStr(r.label, r.name),
  },
  stripe_tax_rate: {
    endpoint: "subscriptions/tax_rates",
    queryKey: "subscription_tax_rates",
    title: "Select Stripe tax rate",
    fallbackLabel: "Stripe Tax Rate",
    id: (r) => r.id,
    label: (r) => firstStr(r.label, r.name),
  },
  estimate_request_status: {
    endpoint: "estimate_requests/statuses",
    queryKey: "estimate_request_statuses",
    title: "Select estimate request status",
    fallbackLabel: "Status",
    id: (r) => r.id,
    label: (r) => firstStr(r.name),
  },
  gatepass_vehicle: {
    endpoint: "gatepass_api/vehicles",
    queryKey: "gatepass_vehicles",
    title: "Select vehicle",
    fallbackLabel: "Vehicle",
    id: (r) => r.id,
    label: (r) => [firstStr(r.plate_code), firstStr(r.register_number), firstStr(r.type)].filter(Boolean).join(" · "),
  },
};
