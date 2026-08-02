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
import { deleteEntity, getEntity, listAllEntities, listEntities, normalizeList } from "@/lib/api";
import {
  getModule,
  getModuleMutationCapability,
  getModulePermissionFeatures,
  isCrudEnabled,
  moduleId,
  moduleSubtitle,
  moduleTitle,
  ModuleDefinition,
  ModuleField,
  ModuleTab,
  resolveTemplateValue,
} from "@/lib/module-registry";
import {
  useCustomFields,
  decodeCustomFieldValue,
  type CustomFieldRow,
} from "@/lib/queries/custom-fields";
import { usePermissions } from "@/lib/permission-context";
import { FilesTab } from "./FilesTab";
import { SurveyResultsTab } from "@/components/surveys/SurveyResultsTab";
import { ActionRunner } from "./ActionRunner";
import { navigateInAppOrExternalLink } from "@/lib/native-routing";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { taskRelationTypeLabel } from "@/lib/task-display";

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
  const [actionsOpen, setActionsOpen] = useState(false);
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  const q = useQuery({
    queryKey: ["crud", moduleKey, "detail", id],
    queryFn: () => (module ? getEntity(module.endpoint, id, module.detailEndpoint) : Promise.resolve(null)),
    enabled: !!module && !!id && permissions.isLoaded && (!module.adminOnlyAccess || permissions.isAdmin),
  });

  const row = useMemo(() => unwrapRow(q.data, module), [module, q.data]);
  const availableActions = useMemo(
    () => (module && row ? actionsAvailableForRecord(module, row) : []),
    [module, row],
  );
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
  if (module.adminOnlyAccess && permissions.isLoaded && !permissions.isAdmin) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-8">
        <Ionicons name="shield-outline" size={48} color="#64748B" />
        <Text className="text-foreground text-lg font-semibold mt-3">Administrator access required</Text>
        <Text className="text-muted text-center mt-1">{module.plural} is a protected settings area.</Text>
      </View>
    );
  }

  const tabs = [{ key: "summary", title: "Summary" }, ...(module.tabs || [])];

  return (
    <View className="flex-1 bg-surface">
      <ScreenHeader
        eyebrow={module.group}
        title={module.title}
        subtitle={row ? `#${moduleId(module, row)} · ${moduleTitle(module, row)}` : "Loading record…"}
        icon={module.icon as keyof typeof Ionicons.glyphMap}
        color={module.color}
        rightAction={
          <View className="flex-row items-center">
            {row && isCrudEnabled(module, "update") && canEditModule(module, permissions) && recordAllows(row, "edit") ? (
              <TouchableOpacity
                onPress={() => router.push(`${path}/${encodeURIComponent(id)}/edit` as any)}
                className="w-9 h-9 rounded-lg items-center justify-center bg-gray-100 mr-1"
              >
                <Ionicons name="create-outline" size={19} color="#0F172A" />
              </TouchableOpacity>
            ) : null}
            {row && isCrudEnabled(module, "delete") && canDeleteModule(module, permissions) && recordAllows(row, "delete") ? (
              <TouchableOpacity
                onPress={() => confirmDelete(module, deleteMutation.mutate)}
                className="w-9 h-9 rounded-lg items-center justify-center bg-red-50 mr-1"
                disabled={deleteMutation.isPending}
              >
                <Ionicons name="trash-outline" size={19} color="#DC2626" />
              </TouchableOpacity>
            ) : null}
            {row && availableActions.length > 0 ? (
              <TouchableOpacity
                onPress={() => setActionsOpen(true)}
                className="w-9 h-9 rounded-lg items-center justify-center bg-gray-100"
              >
                <Ionicons name="ellipsis-vertical" size={19} color="#0F172A" />
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      {row && availableActions.length > 0 ? (
        <ActionRunner
          module={module}
          recordId={id}
          actions={availableActions}
          open={actionsOpen}
          onClose={() => setActionsOpen(false)}
        />
      ) : null}

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
          ) : (() => {
            const tab = module.tabs?.find((t) => t.key === activeTab);
            if (tab?.kind === "files") {
              const relType = String(tab.fixedFilters?.rel_type ?? module.key);
              return (
                <FilesTab
                  relType={relType}
                  relId={moduleId(module, row)}
                  color={module.color}
                />
              );
            }
            if (tab?.kind === "survey_results") {
              return <SurveyResultsTab surveyId={moduleId(module, row)} color={module.color} />;
            }
            return (
              <RelatedTab
                parentModule={module}
                parentRow={row}
                tab={tab}
              />
            );
          })()}
        </>
      )}
    </View>
  );
}

function RecordSummary({ module, row }: { module: ModuleDefinition; row: any }) {
  const fields = useMemo(() => buildVisibleFields(module, row), [module, row]);
  const sections = useMemo(() => groupFields(fields), [fields]);
  const subtitle = moduleSubtitle(module, row);
  // Detect which relation kinds this record actually uses, then only fetch
  // those lookup tables. Empty maps for the rest.
  const needs = useMemo(() => {
    const out: Partial<Record<RelationKind, boolean>> = {};
    for (const field of fields) {
      const kind = resolveRelationKind(field);
      if (kind) out[kind] = true;
    }
    return out;
  }, [fields]);

  const staffLookup = useQuery({
    queryKey: ["crud", "lookup", "staff"],
    queryFn: () => listEntities("staffs", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.staff,
    staleTime: LOOKUP_STALE_MS,
  });

  const taskLookup = useQuery({
    queryKey: ["crud", "lookup", "tasks"],
    queryFn: () => listEntities("tasks", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.task,
    staleTime: LOOKUP_STALE_MS,
  });

  const customerLookup = useQuery({
    queryKey: ["crud", "lookup", "customers"],
    queryFn: () => listEntities("customers", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.customer,
    staleTime: LOOKUP_STALE_MS,
  });

  // Reference-data lookups — small tables, cached for 1 hour. Each endpoint
  // was added to the CRM in ERP v2.4.5 (mcp changelog).
  const countryLookup = useQuery({
    queryKey: ["crud", "lookup", "countries"],
    queryFn: () => listEntities("countries"),
    enabled: !!needs.country,
    staleTime: 60 * 60 * 1000,
  });

  const currencyLookup = useQuery({
    queryKey: ["crud", "lookup", "currencies"],
    queryFn: () => listEntities("currencies"),
    enabled: !!needs.currency,
    staleTime: 60 * 60 * 1000,
  });

  const customerGroupLookup = useQuery({
    queryKey: ["crud", "lookup", "customer_groups"],
    queryFn: () => listEntities("customer_groups"),
    enabled: !!needs.customer_group,
    staleTime: 60 * 60 * 1000,
  });

  const paymentModeLookup = useQuery({
    queryKey: ["crud", "lookup", "payment_modes"],
    queryFn: () => listEntities("payment_modes"),
    enabled: !!needs.payment_mode,
    staleTime: 60 * 60 * 1000,
  });

  const taxRateLookup = useQuery({
    queryKey: ["crud", "lookup", "tax_rates"],
    queryFn: () => listEntities("tax_rates"),
    enabled: !!needs.tax_rate,
    staleTime: 60 * 60 * 1000,
  });

  // Lead/ticket enum tables (added in ERP v2.4.6)
  const leadSourceLookup = useQuery({
    queryKey: ["crud", "lookup", "lead_sources"],
    queryFn: () => listEntities("lead_sources"),
    enabled: !!needs.lead_source,
    staleTime: 60 * 60 * 1000,
  });

  const leadStatusLookup = useQuery({
    queryKey: ["crud", "lookup", "lead_statuses"],
    queryFn: () => listEntities("lead_statuses"),
    enabled: !!needs.lead_status,
    staleTime: 60 * 60 * 1000,
  });

  const ticketPriorityLookup = useQuery({
    queryKey: ["crud", "lookup", "ticket_priorities"],
    queryFn: () => listEntities("ticket_priorities"),
    enabled: !!needs.ticket_priority,
    staleTime: 60 * 60 * 1000,
  });

  const ticketStatusLookup = useQuery({
    queryKey: ["crud", "lookup", "ticket_statuses"],
    queryFn: () => listEntities("ticket_statuses"),
    enabled: !!needs.ticket_status,
    staleTime: 60 * 60 * 1000,
  });

  const advanceLeadStatusLookup = useQuery({
    queryKey: ["crud", "lookup", "advance_lead_statuses"],
    queryFn: () => listEntities("advance_leads_api/statuses"),
    enabled: !!needs.advance_lead_status,
    staleTime: 60 * 60 * 1000,
  });

  const knowledgeGroupLookup = useQuery({
    queryKey: ["crud", "lookup", "knowledge_groups"],
    queryFn: () => listEntities("knowledge_api/groups"),
    enabled: !!needs.knowledge_group,
    staleTime: 60 * 60 * 1000,
  });

  const leadLookup = useQuery({
    queryKey: ["crud", "lookup", "leads"],
    queryFn: () => listEntities("leads", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.lead,
    staleTime: LOOKUP_STALE_MS,
  });

  const projectLookup = useQuery({
    queryKey: ["crud", "lookup", "projects"],
    queryFn: () => listEntities("projects", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.project,
    staleTime: LOOKUP_STALE_MS,
  });

  const invoiceLookup = useQuery({
    queryKey: ["crud", "lookup", "invoices"],
    queryFn: () => listEntities("invoices", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.invoice,
    staleTime: LOOKUP_STALE_MS,
  });

  const opportunityStatusLookup = useQuery({
    queryKey: ["crud", "lookup", "opportunity_statuses"],
    queryFn: () => listEntities("opportunities_api/statuses"),
    enabled: !!needs.opportunity_status,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentLocationLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_locations"],
    queryFn: () => listEntities("fixed_equipment_api/locations"),
    enabled: !!needs.equipment_location,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentCategoryLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_categories"],
    queryFn: () => listEntities("fixed_equipment_api/categories", { type: "asset" }),
    enabled: !!needs.equipment_category,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentAccessoryCategoryLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_accessory_categories"],
    queryFn: () => listEntities("fixed_equipment_api/categories", { type: "accessory" }),
    enabled: !!needs.equipment_accessory_category,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentConsumableCategoryLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_consumable_categories"],
    queryFn: () => listEntities("fixed_equipment_api/categories", { type: "consumable" }),
    enabled: !!needs.equipment_consumable_category,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentComponentCategoryLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_component_categories"],
    queryFn: () => listEntities("fixed_equipment_api/categories", { type: "component" }),
    enabled: !!needs.equipment_component_category,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentLicenseCategoryLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_license_categories"],
    queryFn: () => listEntities("fixed_equipment_api/categories", { type: "license" }),
    enabled: !!needs.equipment_license_category,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentManufacturerLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_manufacturers"],
    queryFn: () => listEntities("fixed_equipment_api/manufacturers"),
    enabled: !!needs.equipment_manufacturer,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentModelLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_models"],
    queryFn: () => listEntities("fixed_equipment_api/models"),
    enabled: !!needs.equipment_model,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentStatusLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_statuses"],
    queryFn: () => listEntities("fixed_equipment_api/statuses"),
    enabled: !!needs.equipment_status,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentDepreciationLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_depreciations"],
    queryFn: () => listEntities("fixed_equipment_api/depreciations"),
    enabled: !!needs.equipment_depreciation,
    staleTime: 60 * 60 * 1000,
  });

  const equipmentSupplierLookup = useQuery({
    queryKey: ["crud", "lookup", "equipment_suppliers"],
    queryFn: () => listEntities("fixed_equipment_api/suppliers"),
    enabled: !!needs.equipment_supplier,
    staleTime: 60 * 60 * 1000,
  });

  const hrTrainingTypeLookup = useQuery({
    queryKey: ["crud", "lookup", "hr_training_types"],
    queryFn: () => listEntities("hr_profile_api/training_types", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.hr_training_type,
    staleTime: 60 * 60 * 1000,
  });

  const hrTrainingLibraryLookup = useQuery({
    queryKey: ["crud", "lookup", "hr_training_libraries"],
    queryFn: () => listEntities("hr_profile_api/training_libraries", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.hr_training_library,
    staleTime: 60 * 60 * 1000,
  });

  const hrJobPositionLookup = useQuery({
    queryKey: ["crud", "lookup", "hr_job_positions"],
    queryFn: () => listEntities("hr_profile_api/job_positions", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.hr_job_position,
    staleTime: 60 * 60 * 1000,
  });

  const hrContractTypeLookup = useQuery({
    queryKey: ["crud", "lookup", "hr_contract_types"],
    queryFn: () => listEntities("hr_profile_api/contract_types", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.hr_contract_type,
    staleTime: 60 * 60 * 1000,
  });

  const stripePlanLookup = useQuery({
    queryKey: ["crud", "lookup", "subscription_plans"],
    queryFn: () => listEntities("subscriptions/plans"),
    enabled: !!needs.stripe_plan,
    staleTime: 15 * 60 * 1000,
  });

  const stripeTaxRateLookup = useQuery({
    queryKey: ["crud", "lookup", "subscription_tax_rates"],
    queryFn: () => listEntities("subscriptions/tax_rates"),
    enabled: !!needs.stripe_tax_rate,
    staleTime: 15 * 60 * 1000,
  });

  const estimateRequestStatusLookup = useQuery({
    queryKey: ["crud", "lookup", "estimate_request_statuses"],
    queryFn: () => listEntities("estimate_requests/statuses"),
    enabled: !!needs.estimate_request_status,
    staleTime: 60 * 60 * 1000,
  });

  const gatepassVehicleLookup = useQuery({
    queryKey: ["crud", "lookup", "gatepass_vehicles"],
    queryFn: () => listEntities("gatepass_api/vehicles", { limit: LOOKUP_LIMIT }),
    enabled: !!needs.gatepass_vehicle,
    staleTime: 15 * 60 * 1000,
  });

  const otpSourceLookup = useQuery({
    queryKey: ["crud", "lookup", "otp_sources"],
    queryFn: () => listEntities("otpmanager/sources", { status: "active", limit: LOOKUP_LIMIT }),
    enabled: !!needs.otp_source,
    staleTime: 15 * 60 * 1000,
  });

  const lookups = useMemo<LookupMaps>(
    () => ({
      task:            buildLookupMap(normalizeList(taskLookup.data).items,           "task"),
      staff:           buildLookupMap(normalizeList(staffLookup.data).items,          "staff"),
      customer:        buildLookupMap(normalizeList(customerLookup.data).items,       "customer"),
      lead:            buildLookupMap(normalizeList(leadLookup.data).items,           "lead"),
      invoice:         buildLookupMap(normalizeList(invoiceLookup.data).items,        "invoice"),
      country:         buildLookupMap(normalizeList(countryLookup.data).items,        "country"),
      currency:        buildLookupMap(normalizeList(currencyLookup.data).items,       "currency"),
      project:         buildLookupMap(normalizeList(projectLookup.data).items,        "project"),
      customer_group:  buildLookupMap(normalizeList(customerGroupLookup.data).items,  "customer_group"),
      payment_mode:    buildLookupMap(normalizeList(paymentModeLookup.data).items,    "payment_mode"),
      tax_rate:        buildLookupMap(normalizeList(taxRateLookup.data).items,        "tax_rate"),
      lead_source:     buildLookupMap(normalizeList(leadSourceLookup.data).items,     "lead_source"),
      lead_status:     buildLookupMap(normalizeList(leadStatusLookup.data).items,     "lead_status"),
      advance_lead_status: buildLookupMap(normalizeList(advanceLeadStatusLookup.data).items, "advance_lead_status"),
      knowledge_group: buildLookupMap(normalizeList(knowledgeGroupLookup.data).items, "knowledge_group"),
      ticket_priority: buildLookupMap(normalizeList(ticketPriorityLookup.data).items, "ticket_priority"),
      ticket_status:   buildLookupMap(normalizeList(ticketStatusLookup.data).items,   "ticket_status"),
      opportunity_status: buildLookupMap(normalizeList(opportunityStatusLookup.data).items, "opportunity_status"),
      equipment_asset: new Map(),
      equipment_accessory_category: buildLookupMap(normalizeList(equipmentAccessoryCategoryLookup.data).items, "equipment_accessory_category"),
      equipment_category: buildLookupMap(normalizeList(equipmentCategoryLookup.data).items, "equipment_category"),
      equipment_component_category: buildLookupMap(normalizeList(equipmentComponentCategoryLookup.data).items, "equipment_component_category"),
      equipment_consumable_category: buildLookupMap(normalizeList(equipmentConsumableCategoryLookup.data).items, "equipment_consumable_category"),
      equipment_location: buildLookupMap(normalizeList(equipmentLocationLookup.data).items, "equipment_location"),
      equipment_manufacturer: buildLookupMap(normalizeList(equipmentManufacturerLookup.data).items, "equipment_manufacturer"),
      equipment_model: buildLookupMap(normalizeList(equipmentModelLookup.data).items, "equipment_model"),
      equipment_status: buildLookupMap(normalizeList(equipmentStatusLookup.data).items, "equipment_status"),
      equipment_deployable_status: new Map(),
      equipment_depreciation: buildLookupMap(normalizeList(equipmentDepreciationLookup.data).items, "equipment_depreciation"),
      equipment_license_category: buildLookupMap(normalizeList(equipmentLicenseCategoryLookup.data).items, "equipment_license_category"),
      equipment_maintenance_asset: new Map(),
      equipment_requestable_asset: new Map(),
      equipment_unsigned_checkout: new Map(),
      equipment_auditable_item: new Map(),
      equipment_supplier: buildLookupMap(normalizeList(equipmentSupplierLookup.data).items, "equipment_supplier"),
      hr_training_type: buildLookupMap(normalizeList(hrTrainingTypeLookup.data).items, "hr_training_type"),
      hr_training_library: buildLookupMap(normalizeList(hrTrainingLibraryLookup.data).items, "hr_training_library"),
      hr_job_position: buildLookupMap(normalizeList(hrJobPositionLookup.data).items, "hr_job_position"),
      hr_contract_type: buildLookupMap(normalizeList(hrContractTypeLookup.data).items, "hr_contract_type"),
      stripe_plan: buildLookupMap(normalizeList(stripePlanLookup.data).items, "stripe_plan"),
      stripe_tax_rate: buildLookupMap(normalizeList(stripeTaxRateLookup.data).items, "stripe_tax_rate"),
      estimate_request_status: buildLookupMap(normalizeList(estimateRequestStatusLookup.data).items, "estimate_request_status"),
      gatepass_vehicle: buildLookupMap(normalizeList(gatepassVehicleLookup.data).items, "gatepass_vehicle"),
      otp_source: buildLookupMap(normalizeList(otpSourceLookup.data).items, "otp_source"),
      material_category: new Map(),
      budget_expense_category: new Map(),
      budget_item: new Map(),
      budget_specification: new Map(),
      budget_unit: new Map(),
    }),
    [
      taskLookup.data,
      staffLookup.data,
      customerLookup.data,
      leadLookup.data,
      invoiceLookup.data,
      countryLookup.data,
      currencyLookup.data,
      projectLookup.data,
      customerGroupLookup.data,
      paymentModeLookup.data,
      taxRateLookup.data,
      leadSourceLookup.data,
      leadStatusLookup.data,
      advanceLeadStatusLookup.data,
      knowledgeGroupLookup.data,
      ticketPriorityLookup.data,
      ticketStatusLookup.data,
      opportunityStatusLookup.data,
      equipmentAccessoryCategoryLookup.data,
      equipmentCategoryLookup.data,
      equipmentComponentCategoryLookup.data,
      equipmentConsumableCategoryLookup.data,
      equipmentDepreciationLookup.data,
      equipmentLicenseCategoryLookup.data,
      equipmentLocationLookup.data,
      equipmentManufacturerLookup.data,
      equipmentModelLookup.data,
      equipmentStatusLookup.data,
      equipmentSupplierLookup.data,
      hrTrainingTypeLookup.data,
      hrTrainingLibraryLookup.data,
      hrJobPositionLookup.data,
      hrContractTypeLookup.data,
      stripePlanLookup.data,
      stripeTaxRateLookup.data,
      estimateRequestStatusLookup.data,
      gatepassVehicleLookup.data,
      otpSourceLookup.data,
    ]
  );

  return (
    <View className="p-3">
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-start">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${module.color}1A` }}
          >
            <Ionicons name={module.icon as any} size={21} color={module.color} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-xl font-bold text-foreground leading-6" selectable>
              {moduleTitle(module, row)}
            </Text>
            {subtitle ? (
              <Text className="text-xs text-muted mt-1" selectable numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View className="ml-2 px-2 py-1 rounded-lg" style={{ backgroundColor: `${module.color}12` }}>
            <Text className="text-[10px] font-bold" style={{ color: module.color }}>
              #{moduleId(module, row)}
            </Text>
          </View>
        </View>
      </View>

      {sections.map(([section, sectionFields]) => (
        <View key={section} className="mb-3">
          <Text className="text-xs text-muted uppercase tracking-wide px-2 mb-1.5">
            {section}
          </Text>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {packFieldRows(sectionFields, row).map((fieldRow, rowIndex) => (
              <View
                key={`${section}-${rowIndex}`}
                className={`flex-row ${rowIndex > 0 ? "border-t border-gray-100" : ""}`}
              >
                {fieldRow.map((field, cellIndex) => (
                  <View
                    key={field.key}
                    className={`flex-1 px-3 py-2.5 ${cellIndex > 0 ? "border-l border-gray-100" : ""}`}
                  >
                    <Text className="text-[10px] uppercase tracking-wide text-muted" numberOfLines={1}>
                      {field.label}
                    </Text>
                    <View className="mt-0.5">{renderValue(row[field.key], field, row, lookups)}</View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      ))}

      <CustomFieldsSection module={module} row={row} />
    </View>
  );
}

/**
 * Renders the per-entity "Custom Fields" section. Hits
 * /api/custom_fields/<perfexType>/<id> only if the module declares
 * customFieldsType. Empty values are silently hidden so the section only
 * appears when there's actually something to show.
 */
function CustomFieldsSection({
  module,
  row,
}: {
  module: ModuleDefinition;
  row: any;
}) {
  const id = moduleId(module, row);
  const q = useCustomFields(module.customFieldsType, id);

  if (!module.customFieldsType) return null;

  const populated = (q.data || []).filter(
    (cf) => decodeCustomFieldValue(cf).trim().length > 0
  );
  if (populated.length === 0) return null;

  return (
    <View className="mb-3">
      <Text className="text-xs text-muted uppercase tracking-wide px-2 mb-1.5">
        Custom Fields
      </Text>
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {packCustomFieldRows(populated).map((fieldRow, rowIndex) => (
          <View
            key={`custom-${rowIndex}`}
            className={`flex-row ${rowIndex > 0 ? "border-t border-gray-100" : ""}`}
          >
            {fieldRow.map((cf, cellIndex) => (
              <View
                key={String(cf.custom_field_id)}
                className={`flex-1 px-3 py-2.5 ${cellIndex > 0 ? "border-l border-gray-100" : ""}`}
              >
                <Text className="text-[10px] uppercase tracking-wide text-muted" numberOfLines={1}>
                  {cf.label}
                </Text>
                <View className="mt-0.5">{renderCustomFieldValue(cf)}</View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function renderCustomFieldValue(cf: CustomFieldRow): ReactNode {
  const text = decodeCustomFieldValue(cf);
  if (!text) return null;

  // Date / datetime: render in the user's locale
  if ((cf.type === "date_picker" || cf.type === "date_picker_time") &&
      /^\d{4}-\d{2}-\d{2}/.test(text)) {
    try {
      const d = new Date(text.replace(" ", "T"));
      if (!isNaN(d.getTime())) {
        return (
          <Text className="text-foreground">
            {d.toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: cf.type === "date_picker_time" ? "2-digit" : undefined,
              minute: cf.type === "date_picker_time" ? "2-digit" : undefined,
            })}
          </Text>
        );
      }
    } catch {}
  }

  // Colorpicker: show a colored chip alongside the hex
  if (cf.type === "colorpicker" && /^#[0-9a-fA-F]{3,8}$/.test(text)) {
    return (
      <View className="flex-row items-center">
        <View
          className="w-5 h-5 rounded-full mr-2 border border-gray-200"
          style={{ backgroundColor: text }}
        />
        <Text className="text-foreground" selectable>{text}</Text>
      </View>
    );
  }

  // Link: stripped HTML; the raw value can be a full anchor tag — extract href
  if (cf.type === "link") {
    const m = text.match(/href=["']([^"']+)["']/);
    const url = m ? m[1] : (text.match(/https?:\/\/\S+/)?.[0] || text);
    const label = text.replace(/<[^>]+>/g, "").trim() || url;
    return (
      <Text
        className="text-primary underline"
        selectable
        onPress={() => void navigateInAppOrExternalLink(url)}
      >
        {label}
      </Text>
    );
  }

  // Default: just selectable text. Multiselect/select arrays are already
  // comma-joined by decodeCustomFieldValue.
  return <Text className="text-foreground" selectable>{text}</Text>;
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
  const child = tab ? getModule(tab.moduleKey) : undefined;
  const permissions = usePermissions();
  const queryClient = useQueryClient();

  const parentId = moduleId(parentModule, parentRow);
  const endpoint =
    (tab?.endpointTemplate
      ? String(resolveTemplateValue(tab.endpointTemplate, parentRow, encodeURIComponent(parentId)))
      : child?.endpoint) || "";

  const q = useQuery({
    queryKey: ["crud", parentModule.key, parentId, "tab", tab?.key, endpoint],
    queryFn: () => tab?.unpaginated ? listEntities(endpoint) : listAllEntities(endpoint),
    enabled: Boolean(tab && child && endpoint && !tab.embeddedField),
  });

  const deleteChildMutation = useMutation({
    mutationFn: (childId: string) => {
      if (!child) throw new Error("Related module not found");
      return deleteEntity(child.endpoint, childId, child.deleteEndpoint);
    },
    onSuccess: async () => {
      if (tab?.embeddedField) {
        await queryClient.invalidateQueries({ queryKey: ["crud", parentModule.key, "detail", parentId] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["crud", parentModule.key, parentId, "tab"] });
        await q.refetch();
      }
    },
    onError: (error: any) => {
      Alert.alert("Delete failed", error?.message || "Could not delete this record.");
    },
  });

  const rows = useMemo(() => {
    if (!tab || !child) return [];
    let items: any[] = tab.embeddedField
      ? (Array.isArray(parentRow?.[tab.embeddedField]) ? parentRow[tab.embeddedField] : [])
      : normalizeList(q.data).items;
    const parentField = tab.parentField || parentModule.idKey;
    const parentValue = String(parentRow?.[parentField] ?? parentId);
    if (tab.childField) {
      items = items.filter((row) => String(row?.[tab.childField || ""]) === parentValue);
    }
    if (tab.fixedFilters) {
      items = items.filter((row) =>
        Object.entries(tab.fixedFilters || {}).every(([key, value]) => String(row?.[key]) === String(value))
      );
    }
    return uniqueRowsById(child, items);
  }, [child, q.data, parentModule.idKey, parentId, parentRow, tab]);

  const createParams = useMemo(() => {
    const values: Record<string, string> = {
      _invalidate_module: parentModule.key,
      _invalidate_id: parentId,
    };
    Object.entries(tab?.createDefaults || {}).forEach(([key, value]) => {
      values[key] = String(resolveTemplateValue(value, parentRow, parentId));
    });
    if (tab?.createEndpointTemplate) {
      values._mutation_endpoint = String(
        resolveTemplateValue(tab.createEndpointTemplate, parentRow, parentId),
      );
    }
    return values;
  }, [parentId, parentModule.key, parentRow, tab?.createDefaults, tab?.createEndpointTemplate]);

  if (!tab) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-muted">Tab not found</Text>
      </View>
    );
  }

  if (!child) return <MissingModule moduleKey={tab.moduleKey} />;

  return (
    <View className="flex-1">
      <View className="px-4 py-3 flex-row items-center justify-between bg-surface">
        <Text className="text-sm font-semibold text-foreground">
          {rows.length} {tab.title.toLowerCase()}
        </Text>
        {tab.canCreate !== false && isCrudEnabled(child, "create") && canCreateModule(child, permissions) ? (
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
          renderItem={({ item }) => {
            const childId = moduleId(child, item);
            const canInlineEdit =
              child.canOpenDetail === false &&
              isCrudEnabled(child, "update") &&
              canEditModule(child, permissions) &&
              recordAllows(item, "edit");
            const canInlineDelete =
              child.canOpenDetail === false &&
              isCrudEnabled(child, "delete") &&
              canDeleteModule(child, permissions) &&
              recordAllows(item, "delete");

            return (
              <View className="bg-white rounded-xl p-3 shadow-sm">
                <TouchableOpacity
                  onPress={
                    child.canOpenDetail === false
                      ? undefined
                      : () =>
                          router.push(
                            `/(tabs)/erp/${child.key}/${encodeURIComponent(childId)}` as any
                          )
                  }
                  activeOpacity={0.72}
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
                {canInlineEdit || canInlineDelete ? (
                  <View className="flex-row justify-end mt-3 pt-2 border-t border-gray-100">
                    {canInlineEdit ? (
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: `/(tabs)/erp/${child.key}/${encodeURIComponent(childId)}/edit` as any,
                            params: relatedEditParams(child, item, parentModule.key, parentId),
                          })
                        }
                        className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mr-2"
                      >
                        <Ionicons name="create-outline" size={16} color="#0F172A" />
                        <Text className="text-foreground text-sm font-medium ml-1">Edit</Text>
                      </TouchableOpacity>
                    ) : null}
                    {canInlineDelete ? (
                      <TouchableOpacity
                        onPress={() =>
                          confirmDelete(child, () => deleteChildMutation.mutate(childId))
                        }
                        disabled={deleteChildMutation.isPending}
                        className="flex-row items-center bg-red-50 rounded-lg px-3 py-2"
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        <Text className="text-red-600 text-sm font-medium ml-1">Delete</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function relatedEditParams(
  module: ModuleDefinition,
  row: any,
  parentModuleKey: string,
  parentId: string,
): Record<string, string> {
  const params: Record<string, string> = {
    _use_route_record: "1",
    _invalidate_module: parentModuleKey,
    _invalidate_id: parentId,
  };
  module.fields.forEach((field) => {
    const value = row?.[field.key];
    if (value === undefined || value === null || typeof value === "object") return;
    params[field.key] = String(value);
  });
  return params;
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
  const configured = module.fields.filter((field) => !field.hidden && !isEmpty(row?.[field.key], field));
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

/**
 * Pack short metadata into two columns while preserving reading width for
 * descriptions, URLs, JSON and other narrative values.
 */
function packFieldRows(fields: ModuleField[], row: any): ModuleField[][] {
  const rows: ModuleField[][] = [];
  let pending: ModuleField | null = null;

  for (const field of fields) {
    if (fieldNeedsFullWidth(field, row?.[field.key])) {
      if (pending) rows.push([pending]);
      pending = null;
      rows.push([field]);
    } else if (pending) {
      rows.push([pending, field]);
      pending = null;
    } else {
      pending = field;
    }
  }
  if (pending) rows.push([pending]);
  return rows;
}

function fieldNeedsFullWidth(field: ModuleField, value: any): boolean {
  if (["multiline", "json", "signature"].includes(field.type || "")) return true;
  if (/(description|notes?|address|content|terms|scope|specification|reason|remarks?)/i.test(field.key)) return true;
  const text = cleanDisplayText(value);
  if ((field.type === "url" || field.type === "email") && text.length > 30) return true;
  return text.length > 52;
}

function packCustomFieldRows(fields: CustomFieldRow[]): CustomFieldRow[][] {
  const rows: CustomFieldRow[][] = [];
  let pending: CustomFieldRow | null = null;
  for (const field of fields) {
    const value = decodeCustomFieldValue(field);
    const full = ["textarea", "hyperlink"].includes(field.type) || value.length > 52;
    if (full) {
      if (pending) rows.push([pending]);
      pending = null;
      rows.push([field]);
    } else if (pending) {
      rows.push([pending, field]);
      pending = null;
    } else {
      pending = field;
    }
  }
  if (pending) rows.push([pending]);
  return rows;
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

  if (field.key === "rel_type") {
    return <Text className="text-foreground">{taskRelationTypeLabel(value)}</Text>;
  }

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
      <TouchableOpacity onPress={() => void navigateInAppOrExternalLink(url)}>
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

  // country, billing_country, shipping_country, country_id, ...
  if (normalized === "country" || normalized.endsWith("_country") || normalized === "country_id") {
    return "country";
  }

  // currency, default_currency, currency_id
  if (normalized === "currency" || normalized === "default_currency" || normalized === "currency_id") {
    return "currency";
  }

  if (normalized === "customer_group" || normalized === "group_id") {
    return "customer_group";
  }

  if (
    normalized === "payment_mode" ||
    normalized === "paymentmode" ||
    normalized === "paymentmodeid" ||
    normalized === "payment_mode_id"
  ) {
    return "payment_mode";
  }

  if (normalized === "tax" || normalized === "tax_id" || normalized === "taxid") {
    return "tax_rate";
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

  if (field.multiple) {
    const ids = id.split(",").map((part) => part.trim()).filter(Boolean);
    const labels = ids.map((itemId) => lookups[relation].get(itemId) || `${relationLabel(relation)} #${itemId}`);
    if (labels.length) return labels.join(", ");
  }

  const lookup = lookups[relation].get(id);
  if (lookup) return lookup;

  // Lookup hasn't loaded (or row's id isn't in it). Show typed placeholder.
  const labels: Record<RelationKind, string> = {
    task: "Task",
    staff: "Staff",
    customer: "Customer",
    lead: "Lead",
    invoice: "Invoice",
    country: "Country",
    currency: "Currency",
    project: "Project",
    customer_group: "Customer Group",
    payment_mode: "Payment Mode",
    tax_rate: "Tax Rate",
    lead_source: "Source",
    lead_status: "Status",
    advance_lead_status: "Advance Lead Status",
    knowledge_group: "Knowledge Group",
    ticket_priority: "Priority",
    ticket_status: "Status",
    opportunity_status: "Workflow Status",
    equipment_asset: "Asset",
    equipment_accessory_category: "Accessory Category",
    equipment_category: "Category",
    equipment_component_category: "Component Category",
    equipment_consumable_category: "Consumable Category",
    equipment_depreciation: "Depreciation",
    equipment_license_category: "License Category",
    equipment_maintenance_asset: "Asset",
    equipment_requestable_asset: "Asset",
    equipment_unsigned_checkout: "Custody Event",
    equipment_auditable_item: "Equipment",
    equipment_location: "Location",
    equipment_manufacturer: "Manufacturer",
    equipment_model: "Model",
    equipment_status: "Status",
    equipment_deployable_status: "Deployable Status",
    equipment_supplier: "Supplier",
    hr_training_type: "Training Type",
    hr_training_library: "Training Material",
    hr_job_position: "Job Position",
    hr_contract_type: "Contract Type",
    stripe_plan: "Billing Plan",
    stripe_tax_rate: "Stripe Tax Rate",
    estimate_request_status: "Status",
    gatepass_vehicle: "Vehicle",
    otp_source: "OTP Source",
    material_category: "Material Category",
    budget_expense_category: "Expense Category",
    budget_item: "Catalog Item",
    budget_specification: "Specification",
    budget_unit: "Unit",
  };
  return `${labels[relation]} #${id}`;
}

function relationLabel(relation: RelationKind): string {
  const labels: Partial<Record<RelationKind, string>> = {
    task: "Task", staff: "Staff", customer: "Customer", lead: "Lead", invoice: "Invoice", country: "Country",
    currency: "Currency", customer_group: "Customer Group", payment_mode: "Payment Mode",
    project: "Project",
    tax_rate: "Tax Rate", lead_source: "Source", lead_status: "Status", advance_lead_status: "Advance Lead Status", knowledge_group: "Knowledge Group",
    ticket_priority: "Priority", ticket_status: "Status", opportunity_status: "Workflow Status",
    equipment_asset: "Asset", equipment_category: "Category", equipment_location: "Location",
    equipment_accessory_category: "Accessory Category", equipment_component_category: "Component Category",
    equipment_consumable_category: "Consumable Category",
    equipment_depreciation: "Depreciation", equipment_license_category: "License Category",
    equipment_maintenance_asset: "Asset", equipment_requestable_asset: "Asset", equipment_unsigned_checkout: "Custody Event", equipment_auditable_item: "Equipment",
    equipment_manufacturer: "Manufacturer", equipment_model: "Model", equipment_status: "Status",
    equipment_deployable_status: "Deployable Status", equipment_supplier: "Supplier",
    hr_training_type: "Training Type",
    hr_training_library: "Training Material", hr_job_position: "Job Position",
    hr_contract_type: "Contract Type",
    stripe_plan: "Billing Plan", stripe_tax_rate: "Stripe Tax Rate",
    estimate_request_status: "Status",
    gatepass_vehicle: "Vehicle",
    otp_source: "OTP Source",
    material_category: "Material Category",
    budget_expense_category: "Expense Category",
    budget_item: "Catalog Item",
    budget_specification: "Specification",
    budget_unit: "Unit",
  };
  return labels[relation] || "Record";
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

  if (relation === "task") {
    return firstCleanText(row.task_name, row.name);
  }

  if (relation === "otp_source") {
    return firstCleanText(row.source_name, row.source);
  }

  if (relation === "material_category") {
    return firstCleanText(row.category, row.category_name, row.parent_name);
  }

  if (relation === "budget_item") {
    return firstCleanText(row.item_name, row.name);
  }

  if (relation === "budget_specification") {
    return firstCleanText(row.spec_name, row.ItemSpecificationName);
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
    if (!item) return;
    let id: any;
    let label: string | null = null;

    switch (relation) {
      case "task":
        id = item.id ?? item.task_id;
        label = firstCleanText(item.name, item.subject);
        break;
      case "staff":
        id = item.staffid ?? item.id;
        label = firstCleanText(joinName(item.firstname, item.lastname), item.email);
        break;
      case "customer":
        id = item.userid ?? item.customer_id ?? item.id;
        label = firstCleanText(item.company, item.name, item.customer_name, item.email);
        break;
      case "lead":
        id = item.id;
        label = firstCleanText(item.name, item.company, item.email);
        break;
      case "invoice":
        id = item.id;
        label = firstCleanText(item.invoice_number, [item.prefix, item.number].filter(Boolean).join(""), item.reference_no);
        break;
      case "country":
        id = item.country_id ?? item.id;
        label = firstCleanText(item.short_name, item.long_name, item.iso2);
        break;
      case "currency":
        id = item.id;
        label = firstCleanText(item.name, item.symbol);
        break;
      case "customer_group":
        id = item.id;
        label = firstCleanText(item.name);
        break;
      case "payment_mode":
        id = item.id;
        label = firstCleanText(item.name);
        break;
      case "tax_rate":
        id = item.id;
        label = firstCleanText(item.name);
        break;
      case "lead_source":
        id = item.id;
        label = firstCleanText(item.name);
        break;
      case "lead_status":
      case "advance_lead_status":
        id = item.id;
        label = firstCleanText(item.name);
        break;
      case "knowledge_group":
        id = item.groupid ?? item.id;
        label = firstCleanText(item.name);
        break;
      case "ticket_priority":
        // tbltickets_priorities uses priorityid as primary key
        id = item.priorityid ?? item.id;
        label = firstCleanText(item.name);
        break;
      case "ticket_status":
        // tbltickets_status uses ticketstatusid as primary key
        id = item.ticketstatusid ?? item.id;
        label = firstCleanText(item.name);
        break;
      case "project":
        id = item.id ?? item.project_id;
        label = firstCleanText(item.name, item.project_name);
        break;
      case "opportunity_status":
        id = item.status_id ?? item.id;
        label = firstCleanText(
          item.stage_name && item.status_name ? `${item.stage_name} — ${item.status_name}` : "",
          item.status_name,
        );
        break;
      case "equipment_asset":
      case "equipment_maintenance_asset":
      case "equipment_requestable_asset":
        id = item.id;
        label = firstCleanText(
          item.series && item.assets_name ? `${item.series} — ${item.assets_name}` : "",
          item.assets_name,
          item.series,
        );
        break;
      case "equipment_unsigned_checkout":
        id = item.id;
        label = firstCleanText(item.label, item.asset_name ? `#${item.id} — ${item.asset_name}` : "");
        break;
      case "equipment_auditable_item":
        id = item.id;
        label = firstCleanText(item.label, item.series && item.assets_name ? `${item.series} — ${item.assets_name}` : "", item.assets_name);
        break;
      case "equipment_category":
      case "equipment_accessory_category":
      case "equipment_consumable_category":
      case "equipment_component_category":
      case "equipment_license_category":
        id = item.id;
        label = firstCleanText(item.category_name, item.name);
        break;
      case "equipment_depreciation":
        id = item.id;
        label = firstCleanText(item.name);
        break;
      case "equipment_location":
        id = item.id ?? item.location_id;
        label = firstCleanText(item.location_name, item.name);
        break;
      case "equipment_manufacturer":
        id = item.id;
        label = firstCleanText(item.name);
        break;
      case "equipment_model":
        id = item.id;
        label = firstCleanText(
          item.model_no ? `${item.model_name || "Model"} — ${item.model_no}` : "",
          item.model_name,
        );
        break;
      case "equipment_status":
      case "equipment_deployable_status":
        id = item.id;
        label = firstCleanText(item.name, item.status_type);
        break;
      case "equipment_supplier":
        id = item.id;
        label = firstCleanText(item.supplier_name, item.name);
        break;
      case "hr_training_type":
        id = item.id;
        label = firstCleanText(item.name);
        break;
      case "hr_training_library":
        id = item.training_id ?? item.id;
        label = firstCleanText(item.subject, item.name);
        break;
      case "hr_job_position":
        id = item.position_id ?? item.id;
        label = firstCleanText(item.position_name, item.name);
        break;
      case "hr_contract_type":
        id = item.id_contracttype ?? item.id;
        label = firstCleanText(item.name_contracttype, item.name);
        break;
      case "stripe_plan":
        id = item.id;
        label = firstCleanText(item.label, item.name);
        break;
      case "stripe_tax_rate":
        id = item.id;
        label = firstCleanText(item.label, item.name);
        break;
      case "estimate_request_status":
        id = item.id;
        label = firstCleanText(item.name);
        break;
      case "gatepass_vehicle":
        id = item.id;
        label = [firstCleanText(item.plate_code), firstCleanText(item.register_number), firstCleanText(item.type)].filter(Boolean).join(" · ");
        break;
      case "otp_source":
        id = item.id;
        label = firstCleanText(item.source, item.normalized_name);
        break;
      case "budget_item":
        id = item.id;
        label = firstCleanText(
          item.item_code && item.name ? `${item.item_code} — ${item.name}` : "",
          item.code && item.name ? `${item.code} — ${item.name}` : "",
          item.name,
        );
        break;
      case "budget_specification":
        id = item.id;
        label = firstCleanText(item.name, item.spec_name);
        break;
    }

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

function canEditModule(
  module: ModuleDefinition,
  perms: ReturnType<typeof usePermissions>,
): boolean {
  if (module.adminOnlyMutations && !perms.isAdmin) return false;
  const features = getModulePermissionFeatures(module);
  if (features.length === 0) return true;
  const capability = getModuleMutationCapability(module, "edit");
  return features.some((f) => perms.hasPermission(f, capability));
}

function canDeleteModule(
  module: ModuleDefinition,
  perms: ReturnType<typeof usePermissions>,
): boolean {
  if (module.adminOnlyMutations && !perms.isAdmin) return false;
  const features = getModulePermissionFeatures(module);
  if (features.length === 0) return true;
  const capability = getModuleMutationCapability(module, "delete");
  return features.some((f) => perms.hasPermission(f, capability));
}

function canCreateModule(
  module: ModuleDefinition,
  perms: ReturnType<typeof usePermissions>,
): boolean {
  if (module.adminOnlyMutations && !perms.isAdmin) return false;
  const features = getModulePermissionFeatures(module);
  if (features.length === 0) return true;
  const capability = getModuleMutationCapability(module, "create");
  return features.some((f) => perms.hasPermission(f, capability));
}

function recordAllows(row: any, key: string): boolean {
  const availability = row?._actions;
  if (Array.isArray(availability)) return availability.includes(key);
  if (availability && typeof availability === "object" && key in availability) {
    return Boolean(availability[key]);
  }
  return true;
}

function actionsAvailableForRecord(module: ModuleDefinition, row: any) {
  return (module.actions || []).filter((action) =>
    recordAllows(row, action.availabilityKey || action.key),
  );
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
