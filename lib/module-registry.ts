export type FieldType =
  | "text"
  | "multiline"
  | "number"
  | "money"
  | "date"
  | "datetime"
  | "email"
  | "password"
  | "phone"
  | "url"
  | "boolean"
  | "select"
  | "json"
  | "signature";

// ── Perfix Dynamic Filter System ────────────────────────────────────────
// Mirrors the Web UI app-filters / App_table rule-based filter builder.
//
// Each filter rule has a type (which determines available operators) and a
// value. Multiple rules are combined with AND/OR match_type inside a group.

/** Rule type — maps to the Web UI's App_table_filter::$type taxonomy. */
export type FilterRuleType =
  | "TextRule"
  | "NumberRule"
  | "SelectRule"
  | "MultiSelectRule"
  | "CheckboxRule"
  | "DateRule";

/** Operators available per rule type (subset of Web UI's operator_sql map). */
export type FilterOperator =
  | "equal"
  | "not_equal"
  | "contains"
  | "not_contains"
  | "begins_with"
  | "not_begins_with"
  | "ends_with"
  | "not_ends_with"
  | "in"
  | "not_in"
  | "between"
  | "not_between"
  | "less"
  | "less_or_equal"
  | "greater"
  | "greater_or_equal"
  | "is_empty"
  | "is_not_empty"
  | "dynamic";

/** A single filter rule — field + operator + value. */
export type FilterRule = {
  /** Field key (column name). */
  id: string;
  /** Rule type; determines operator palette and value coercion. */
  type: FilterRuleType;
  /** Operator for this rule (defaults to first in the operator list). */
  operator: FilterOperator;
  /** Raw value(s). String for scalar, string[] for "in"/"not_in", "from..to" string for "between". */
  value: string | string[];
  /** Whether the value uses a dynamic date expression (e.g. "today", "this_week"). */
  hasDynamicValue?: boolean;
};

/** A group of filter rules with AND/OR join. */
export type FilterGroup = {
  match_type: "and" | "or";
  rules: FilterRule[];
};

/** Default operators for each rule type (matching Web UI's commonOperators). */
export const FILTER_TYPE_OPERATORS: Record<FilterRuleType, FilterOperator[]> = {
  TextRule: [
    "equal", "not_equal",
    "contains", "not_contains",
    "begins_with", "not_begins_with",
    "ends_with", "not_ends_with",
  ],
  NumberRule: [
    "equal", "not_equal",
    "between", "not_between",
    "less", "less_or_equal",
    "greater", "greater_or_equal",
  ],
  SelectRule: [
    "equal", "not_equal",
  ],
  MultiSelectRule: [
    "in", "not_in",
  ],
  CheckboxRule: [
    "in", "not_in",
  ],
  DateRule: [
    "equal", "not_equal",
    "between", "not_between",
    "less", "less_or_equal",
    "greater", "greater_or_equal",
    "dynamic",
  ],
};

/** Human-readable operator labels. */
export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
  equal: "equals",
  not_equal: "not equals",
  contains: "contains",
  not_contains: "does not contain",
  begins_with: "begins with",
  not_begins_with: "does not begin with",
  ends_with: "ends with",
  not_ends_with: "does not end with",
  in: "is any of",
  not_in: "is none of",
  between: "between",
  not_between: "not between",
  less: "less than",
  less_or_equal: "less or equal",
  greater: "greater than",
  greater_or_equal: "greater or equal",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  dynamic: "is",
};

/**
 * Infer the best FilterRuleType for a ModuleField based on its FieldType.
 * This is the default used when a field doesn't explicitly declare filterRuleType.
 */
export function inferFilterRuleType(fieldType: FieldType | undefined): FilterRuleType {
  switch (fieldType) {
    case "number":
    case "money":
      return "NumberRule";
    case "date":
    case "datetime":
      return "DateRule";
    case "boolean":
      // Perfex's BooleanRule uses scalar equal/not_equal semantics. The
      // mobile taxonomy reuses SelectRule for the same payload shape.
      return "SelectRule";
    case "select":
      return "SelectRule";
    default:
      return "TextRule";
  }
}

export type RelationKind =
  | "customer"
  | "lead"
  | "invoice"
  | "task"
  | "staff"
  | "country"
  | "currency"
  | "project"
  | "customer_group"
  | "payment_mode"
  | "tax_rate"
  | "lead_source"
  | "lead_status"
  | "advance_lead_status"
  | "knowledge_group"
  | "ticket_priority"
  | "ticket_status"
  | "opportunity_status"
  | "equipment_asset"
  | "equipment_accessory_category"
  | "equipment_category"
  | "equipment_component_category"
  | "equipment_consumable_category"
  | "equipment_location"
  | "equipment_manufacturer"
  | "equipment_model"
  | "equipment_status"
  | "equipment_deployable_status"
  | "equipment_depreciation"
  | "equipment_license_category"
  | "equipment_maintenance_asset"
  | "equipment_requestable_asset"
  | "equipment_unsigned_checkout"
  | "equipment_auditable_item"
  | "equipment_supplier"
  | "hr_training_type"
  | "hr_training_library"
  | "hr_job_position"
  | "hr_contract_type"
  | "stripe_plan"
  | "stripe_tax_rate"
  | "estimate_request_status"
  | "gatepass_vehicle"
  | "otp_source"
  | "material_category"
  | "budget_expense_category"
  | "budget_item"
  | "budget_specification"
  | "budget_unit";

export type ModuleField = {
  key: string;
  label: string;
  type?: FieldType;
  relation?: RelationKind;
  /** Allow selecting several relation records; stored as a comma-separated ID list. */
  multiple?: boolean;
  /** Convert the comma-separated picker value to an array in the API payload. */
  submitAsArray?: boolean;
  required?: boolean;
  /** Required only when creating and the named boolean field is not enabled. */
  requiredOnCreateUnless?: string;
  readOnly?: boolean;
  /** Included in form state/payload but never rendered; used for parent-scoped child defaults. */
  hidden?: boolean;
  /** Rendered by a module-specific native editor while remaining visible on detail screens. */
  customEditor?: boolean;
  /** Editable when creating, then immutable in the generic edit form. */
  createOnly?: boolean;
  /** Secret may be replaced on edit; a blank value is omitted to retain the saved secret. */
  editableSecret?: boolean;
  section?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string | number }>;
  hideIfZero?: boolean;
  /** Perfix filter rule type override (default: inferred from field.type). */
  filterRuleType?: FilterRuleType;
  /** Perfix filter operator allowlist (omit = use FILTER_TYPE_OPERATORS default). */
  filterOperators?: FilterOperator[];
};

/**
 * Workflow action exposed in the CrudDetailScreen overflow menu.
 *
 *  - `endpointTemplate` may contain `{id}` placeholder (resolved at runtime).
 *  - `method` defaults to POST.
 *  - `body` is an object literal sent as JSON; values may also be `{id}` etc.
 *  - `fields` is an optional small inline form shown in the confirmation
 *    sheet (e.g. ticket reply needs a `content` textarea).
 *  - `confirm` is the prompt body, e.g. "Mark this PO as received?".
 *  - `successMessage` is the toast shown on 2xx.
 *  - `destructive` flags the action as red (e.g. Reject).
 *  - `requiresConfirm` defaults true. Set false for trivial pickers.
 */
export type ModuleAction = {
  key: string;
  /** Optional key returned by the API in the record's `_actions` map. */
  availabilityKey?: string;
  title: string;
  icon: string;
  endpointTemplate?: string;
  /**
   * Optional read-only GET performed before the confirmation dialog opens.
   * Its response is shown to the user and `confirm_token` is forwarded to the
   * mutation. Use for guarded outward-facing actions such as RFQ email sends.
   */
  preflightEndpointTemplate?: string;
  /** Body key populated from the preflight response (default: confirm_token). */
  preflightTokenField?: string;
  /** Fields from a successful response to show in a selectable result dialog. */
  resultFields?: Array<{ key: string; label: string }>;
  /** Native route template for navigation-only actions such as conversions. */
  navigateTemplate?: string;
  method?: "POST" | "PUT" | "DELETE";
  body?: Record<string, string | number>;
  fields?: ModuleField[];
  confirm?: string;
  successMessage?: string;
  destructive?: boolean;
  requiresConfirm?: boolean;
};

export type ModuleTab = {
  key: string;
  title: string;
  moduleKey: string;
  endpointTemplate?: string;
  /** Read related rows embedded in the parent detail response instead of fetching a list endpoint. */
  embeddedField?: string;
  /** Override the POST collection URL for a child whose create route is parent-scoped. */
  createEndpointTemplate?: string;
  childField?: string;
  parentField?: string;
  fixedFilters?: Record<string, string | number>;
  createDefaults?: Record<string, string | number>;
  /** Override whether the related tab offers an Add button. */
  canCreate?: boolean;
  /** The related endpoint returns the whole scoped collection and ignores pagination. */
  unpaginated?: boolean;
  /**
   * Special-cased tab kinds. "files" → renders the attachments tab with
   * camera/gallery/document upload, not the generic related-list view.
   * The associated rel_type for /api/files is taken from `fixedFilters.rel_type`.
   */
  kind?: "files" | "survey_results";
};

export type StatusOption = {
  label: string;
  value: string | number;
  color?: string;
};

export type ModuleDefinition = {
  key: string;
  title: string;
  plural: string;
  group: string;
  endpoint: string;
  detailEndpoint?: string;
  deleteEndpoint?: string;
  idKey: string;
  icon: string;
  color: string;
  titleFields: string[];
  subtitleFields?: string[];
  searchFields?: string[];
  fields: ModuleField[];
  tabs?: ModuleTab[];
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  /** List rows are informational when the API has no single-record GET contract. */
  canOpenDetail?: boolean;
  /** Extract this object from a wrapped detail payload while retaining sibling embedded collections. */
  detailRootKey?: string;
  /** Search the fully returned collection on-device because the endpoint has no server search contract. */
  clientSideSearch?: boolean;
  /** Query-string key used by endpoints that name search differently (for example `q`). */
  searchParam?: string;
  /** Do not call the endpoint until the user enters a search term. */
  requiresSearch?: boolean;
  /** The endpoint returns its complete collection and ignores limit/offset. */
  unpaginated?: boolean;
  /** Record mutations are available only to Perfex administrators. */
  adminOnlyMutations?: boolean;
  /** The entire module is a Perfex administrator-only settings surface. */
  adminOnlyAccess?: boolean;
  /**
   * Perfex permission feature key(s) that control access to this module.
   * Maps to `tblstaff_permissions.feature`. When set, the module is hidden
   * from users who lack any permission on this feature.
   * Can be a single string or an array (user needs permission on at least one).
   */
  permissionFeature?: string | string[];
  /** Override Perfex capability names for generic create/edit/delete controls. */
  permissionCapabilities?: Partial<Record<"create" | "edit" | "delete", string>>;
  /**
   * Workflow actions exposed in the detail-screen overflow menu (three-dot
   * icon in the header). Each action POSTs/PUTs to its endpoint and shows a
   * confirmation sheet first. Use for state transitions: approve, reject,
   * mark received, publish, mark won/lost, etc.
   */
  actions?: ModuleAction[];
  /**
   * Perfex's /api/custom_fields/<type>/ URL segment. Mixed singular/plural in
   * the upstream API: invoice/estimate/proposal/credit_note are singular while
   * customers/leads/tasks/etc. are plural. Set this when the module supports
   * custom fields; leave undefined to opt out.
   */
  customFieldsType?:
    | "customers"
    | "contacts"
    | "leads"
    | "company"
    | "staff"
    | "projects"
    | "tasks"
    | "tickets"
    | "items"
    | "expenses"
    | "contracts"
    | "invoice"
    | "estimate"
    | "credit_note"
    | "proposal";

  /** Default sort applied when the list first loads. */
  defaultSort?: { field: string; direction: "asc" | "desc" };
  /** Explicit server-supported sort keys. Defaults to the defaultSort key only. */
  sortableFields?: string[];
  /** Subset of field keys exposed in the filter panel. */
  filterableFields?: string[];
  /** The field key that holds the entity status (for quick-filter chips). */
  statusField?: string;
  /** Status options with optional color for StatusBadge rendering. */
  statusOptions?: StatusOption[];
  /** Extra params used when every status is selected but the server's default
   * list scope would otherwise hide records. */
  allStatusesParams?: Record<string, string | number>;
  /** Endpoint accepts a serialized Perfex logical filter group. */
  supportsAdvancedFilters?: boolean;
  /**
   * Perfix filter rule definitions — maps field keys to explicit filter rule
   * types and operator allowlists. When set, this overrides auto-inference
   * from field.type. Used to match Web UI App_table::rules() definitions.
   *
   * Example:
   *   filterRules: {
   *     status: { ruleType: "SelectRule", operators: ["equal", "not_equal"] },
   *     dateadded: { ruleType: "DateRule" },
   *   }
   */
  filterRules?: Record<string, {
    ruleType?: FilterRuleType;
    operators?: FilterOperator[];
  }>;
};

const statusOptions = [
  { label: "Active", value: "1" },
  { label: "Inactive", value: "0" },
];

const yesNoOptions = [
  { label: "Yes", value: "1" },
  { label: "No", value: "0" },
];

const priorityOptions = [
  { label: "Low", value: "1" },
  { label: "Medium", value: "2" },
  { label: "High", value: "3" },
  { label: "Urgent", value: "4" },
];

const projectStatusOptions = [
  { label: "Not Started", value: "1" },
  { label: "In Progress", value: "2" },
  { label: "On Hold", value: "3" },
  { label: "Finished", value: "4" },
  { label: "Cancelled", value: "5" },
];

const invoiceStatusOptions: StatusOption[] = [
  { label: "Draft", value: "6", color: "#64748B" },
  { label: "Sent", value: "2", color: "#2563EB" },
  { label: "Paid", value: "4", color: "#16A34A" },
  { label: "Overdue", value: "1", color: "#DC2626" },
  { label: "Partially Paid", value: "3", color: "#F59E0B" },
  { label: "Cancelled", value: "5", color: "#94A3B8" },
];

const estimateStatusOptions: StatusOption[] = [
  { label: "Draft", value: "1", color: "#64748B" },
  { label: "Sent", value: "2", color: "#2563EB" },
  { label: "Accepted", value: "4", color: "#16A34A" },
  { label: "Declined", value: "3", color: "#DC2626" },
  { label: "Expired", value: "5", color: "#94A3B8" },
];

const proposalStatusOptions: StatusOption[] = [
  { label: "Open", value: "1", color: "#64748B" },
  { label: "Declined", value: "2", color: "#DC2626" },
  { label: "Accepted", value: "3", color: "#16A34A" },
  { label: "Sent", value: "4", color: "#2563EB" },
  { label: "Revised", value: "5", color: "#0891B2" },
  { label: "Draft", value: "6", color: "#64748B" },
];

const creditNoteStatusOptions: StatusOption[] = [
  { label: "Open", value: "1", color: "#03A9F4" },
  { label: "Closed", value: "2", color: "#84C529" },
  { label: "Void", value: "3", color: "#777777" },
];

const subscriptionStatusOptions: StatusOption[] = [
  { label: "Not Subscribed", value: "", color: "#0284C7" },
  { label: "Active", value: "active", color: "#16A34A" },
  { label: "Future", value: "future", color: "#16A34A" },
  { label: "Past Due", value: "past_due", color: "#F59E0B" },
  { label: "Unpaid", value: "unpaid", color: "#DC2626" },
  { label: "Incomplete", value: "incomplete", color: "#F59E0B" },
  { label: "Canceled", value: "canceled", color: "#64748B" },
  { label: "Incomplete Expired", value: "incomplete_expired", color: "#64748B" },
];

const estimateRequestStatusOptions: StatusOption[] = [
  { label: "Cancelled", value: "1", color: "#64748B" },
  { label: "Processing", value: "2", color: "#2563EB" },
  { label: "Completed", value: "3", color: "#16A34A" },
];

const projectStatusFilterOptions: StatusOption[] = [
  { label: "Not Started", value: "1", color: "#64748B" },
  { label: "In Progress", value: "2", color: "#2563EB" },
  { label: "On Hold", value: "3", color: "#F59E0B" },
  { label: "Finished", value: "4", color: "#16A34A" },
  { label: "Cancelled", value: "5", color: "#DC2626" },
];

const taskStatusFilterOptions: StatusOption[] = [
  { label: "Not Started", value: "1", color: "#64748B" },
  { label: "In Progress", value: "4", color: "#2563EB" },
  { label: "Testing", value: "3", color: "#7C3AED" },
  { label: "Awaiting Feedback", value: "2", color: "#F59E0B" },
  { label: "Complete", value: "5", color: "#16A34A" },
];

const ticketStatusFilterOptions: StatusOption[] = [
  { label: "Open", value: "1", color: "#DC2626" },
  { label: "In Progress", value: "2", color: "#2563EB" },
  { label: "Answered", value: "3", color: "#16A34A" },
  { label: "On Hold", value: "4", color: "#F59E0B" },
  { label: "Closed", value: "5", color: "#64748B" },
];

const ticketPriorityFilterOptions: StatusOption[] = [
  { label: "Low", value: "1", color: "#64748B" },
  { label: "Medium", value: "2", color: "#F59E0B" },
  { label: "High", value: "3", color: "#EA580C" },
  { label: "Urgent", value: "4", color: "#DC2626" },
];

const contractStatusOptions: StatusOption[] = [
  { label: "Not Started", value: "1", color: "#64748B" },
  { label: "Active", value: "2", color: "#16A34A" },
  { label: "Expired", value: "3", color: "#DC2626" },
  { label: "About to Expire", value: "4", color: "#F59E0B" },
];

const tenderStatusFilterOptions: StatusOption[] = [
  { label: "Active", value: "1", color: "#475569" },
  { label: "Pending", value: "2", color: "#2563EB" },
  { label: "Announced", value: "3", color: "#F97316" },
  { label: "Archived", value: "4", color: "#16A34A" },
  { label: "Canceled", value: "6", color: "#94A3B8" },
];

const opportunityStageFilterOptions: StatusOption[] = [
  { label: "New", value: "1", color: "#64748B" },
  { label: "Qualification", value: "2", color: "#2563EB" },
  { label: "Proposal", value: "3", color: "#7C3AED" },
  { label: "Negotiation", value: "4", color: "#F59E0B" },
  { label: "Won", value: "5", color: "#16A34A" },
  { label: "Lost", value: "6", color: "#DC2626" },
];

const purchaseStatusFilterOptions: StatusOption[] = [
  { label: "Draft", value: "draft", color: "#64748B" },
  { label: "Pending", value: "pending", color: "#F59E0B" },
  { label: "Approved", value: "approved", color: "#16A34A" },
  { label: "Rejected", value: "rejected", color: "#DC2626" },
  { label: "Closed", value: "closed", color: "#94A3B8" },
];

const projectBillingOptions = [
  { label: "Fixed Rate", value: "1" },
  { label: "Project Hours", value: "2" },
  { label: "Task Hours", value: "3" },
];

const addressFields: ModuleField[] = [
  { key: "address", label: "Street", section: "Address", type: "multiline" },
  { key: "city", label: "City", section: "Address" },
  { key: "state", label: "State", section: "Address" },
  { key: "zip", label: "Zip", section: "Address" },
  { key: "country", label: "Country", section: "Address", type: "number", relation: "country", hideIfZero: true },
];

const billingFields: ModuleField[] = [
  { key: "billing_street", label: "Billing Street", section: "Billing", type: "multiline", required: true },
  { key: "billing_city", label: "Billing City", section: "Billing" },
  { key: "billing_state", label: "Billing State", section: "Billing" },
  { key: "billing_zip", label: "Billing Zip", section: "Billing" },
  { key: "billing_country", label: "Billing Country", section: "Billing", type: "number", relation: "country", hideIfZero: true },
];

const shippingFields: ModuleField[] = [
  { key: "shipping_street", label: "Shipping Street", section: "Shipping", type: "multiline" },
  { key: "shipping_city", label: "Shipping City", section: "Shipping" },
  { key: "shipping_state", label: "Shipping State", section: "Shipping" },
  { key: "shipping_zip", label: "Shipping Zip", section: "Shipping" },
  { key: "shipping_country", label: "Shipping Country", section: "Shipping", type: "number", relation: "country", hideIfZero: true },
];

const itemFields: ModuleField[] = [
  { key: "description", label: "Description", required: true },
  { key: "long_description", label: "Long Description", type: "multiline" },
  { key: "rate", label: "Rate", type: "money", required: true },
  { key: "unit", label: "Unit" },
  { key: "group_id", label: "Group ID", type: "number" },
  { key: "group_name", label: "Group", readOnly: true },
  { key: "commodity_code", label: "Commodity Code" },
  { key: "sku_code", label: "SKU Code" },
  { key: "sku_name", label: "SKU Name" },
  { key: "purchase_price", label: "Purchase Price", type: "money" },
  { key: "active", label: "Active", type: "select", options: statusOptions },
];

const moneyDocFields: ModuleField[] = [
  { key: "clientid", label: "Customer", section: "Customer", type: "number", relation: "customer", required: true },
  { key: "number", label: "Number", section: "Document", required: true },
  { key: "date", label: "Date", section: "Document", type: "date", required: true },
  { key: "duedate", label: "Due Date", section: "Document", type: "date" },
  { key: "currency", label: "Currency", section: "Document", type: "number", relation: "currency", required: true },
  {
    key: "allowed_payment_modes",
    label: "Allowed Payment Modes",
    section: "Document",
    type: "number",
    relation: "payment_mode",
    multiple: true,
    submitAsArray: true,
    required: true,
  },
  {
    key: "newitems",
    label: "Line Items",
    section: "Items",
    type: "json",
    required: true,
    placeholder: "[{\"description\":\"Item\",\"qty\":1,\"rate\":100,\"order\":1}]",
  },
  { key: "subtotal", label: "Subtotal", section: "Totals", type: "money", required: true },
  { key: "total", label: "Total", section: "Totals", type: "money", required: true },
  { key: "discount_percent", label: "Discount %", section: "Totals", type: "number" },
  { key: "discount_total", label: "Discount Total", section: "Totals", type: "money" },
  { key: "adjustment", label: "Adjustment", section: "Totals", type: "money" },
  { key: "adminnote", label: "Admin Note", section: "Notes", type: "multiline" },
  { key: "clientnote", label: "Client Note", section: "Notes", type: "multiline" },
  { key: "terms", label: "Terms", section: "Notes", type: "multiline" },
  ...billingFields,
  ...shippingFields,
];

export const MODULES: ModuleDefinition[] = [
  {
    key: "customers",
    title: "Customer",
    plural: "Customers",
    group: "CRM",
    endpoint: "customers",
    permissionFeature: "customers",
    customFieldsType: "customers",
    idKey: "userid",
    icon: "business-outline",
    color: "#0284C7",
    titleFields: ["company"],
    subtitleFields: ["name", "phonenumber", "email", "city", "state", "country", "vat", "active", "website", "datecreated"],
    searchFields: ["company", "name", "phonenumber", "email", "city", "state", "vat", "website"],
    defaultSort: { field: "company", direction: "asc" },
    filterableFields: ["active", "country", "city", "state", "phonenumber", "website", "vat", "datecreated"],
    statusField: "active",
    statusOptions: [
      { label: "Active", value: "1", color: "#16A34A" },
      { label: "Inactive", value: "0", color: "#DC2626" },
    ],
    allStatusesParams: { include_inactive: "1" },
    filterRules: {
      active: { ruleType: "MultiSelectRule", operators: ["in"] },
      country: { operators: ["equal"] },
      city: { operators: ["contains"] },
      state: { operators: ["contains"] },
      phonenumber: { operators: ["contains"] },
      website: { operators: ["contains"] },
      vat: { operators: ["contains"] },
      datecreated: { ruleType: "DateRule", operators: ["equal", "between"] },
    },
    fields: [
      { key: "company", label: "Company", section: "Customer", required: true },
      { key: "name", label: "Contact Name", section: "Customer" },
      { key: "email", label: "Email", section: "Customer", type: "email" },
      { key: "phonenumber", label: "Phone", section: "Customer", type: "phone" },
      { key: "vat", label: "VAT", section: "Customer" },
      { key: "website", label: "Website", section: "Customer", type: "url" },
      { key: "datecreated", label: "Date Created", section: "Customer", type: "date", readOnly: true },
      { key: "default_currency", label: "Default Currency", section: "Customer", type: "number", relation: "currency", hideIfZero: true },
      { key: "default_language", label: "Default Language", section: "Customer" },
      { key: "active", label: "Active", section: "Customer", type: "select", options: statusOptions },
      ...addressFields,
      ...billingFields,
      ...shippingFields,
    ],
    tabs: [
      { key: "contacts", title: "Contacts", moduleKey: "contacts", endpointTemplate: "customers/contacts?customer_id={id}", createDefaults: { customer_id: "{id}" } },
      { key: "invoices", title: "Invoices", moduleKey: "invoices", endpointTemplate: "invoices?clientid={userid}", childField: "clientid", parentField: "userid", createDefaults: { clientid: "{id}" } },
      { key: "estimates", title: "Estimates", moduleKey: "estimates", endpointTemplate: "estimates?clientid={userid}", childField: "clientid", parentField: "userid", createDefaults: { clientid: "{id}" } },
      { key: "proposals", title: "Proposals", moduleKey: "proposals", endpointTemplate: "proposals?rel_id={userid}", childField: "rel_id", parentField: "userid", fixedFilters: { rel_type: "customer" }, createDefaults: { rel_id: "{id}", rel_type: "customer" } },
      { key: "projects", title: "Projects", moduleKey: "projects", endpointTemplate: "projects?clientid={userid}", childField: "clientid", parentField: "userid", createDefaults: { clientid: "{id}", rel_type: "customer" } },
      { key: "tasks", title: "Tasks", moduleKey: "tasks", endpointTemplate: "tasks?rel_type=customer&rel_id={userid}", childField: "rel_id", parentField: "userid", fixedFilters: { rel_type: "customer" }, createDefaults: { rel_id: "{id}", rel_type: "customer" } },
      { key: "tickets", title: "Tickets", moduleKey: "tickets", endpointTemplate: "tickets?userid={userid}", childField: "userid", parentField: "userid", createDefaults: { userid: "{id}" } },
      { key: "contracts", title: "Contracts", moduleKey: "contracts", endpointTemplate: "contracts?client={userid}", childField: "client", parentField: "userid", createDefaults: { client: "{id}" } },
      { key: "expenses", title: "Expenses", moduleKey: "expenses", endpointTemplate: "expenses?clientid={userid}", childField: "clientid", parentField: "userid", createDefaults: { clientid: "{id}" } },
      { key: "credit_notes", title: "Credit Notes", moduleKey: "credit_notes", endpointTemplate: "credit_notes?clientid={userid}", childField: "clientid", parentField: "userid", createDefaults: { clientid: "{id}" } },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "customer" } },
    ],
  },
  {
    key: "contacts",
    title: "Contact",
    plural: "Contacts",
    group: "CRM",
    endpoint: "contacts",
    detailEndpoint: "contacts/detail",
    permissionFeature: "customers",
    customFieldsType: "contacts",
    idKey: "id",
    icon: "person-outline",
    color: "#0F766E",
    titleFields: ["firstname", "lastname", "email"],
    subtitleFields: ["company", "title", "phonenumber"],
    searchFields: ["firstname", "lastname", "email", "company"],
    defaultSort: { field: "lastname", direction: "asc" },
    sortableFields: ["lastname", "firstname", "email", "company", "datecreated", "active", "id"],
    filterableFields: ["customer_id", "firstname", "lastname", "email", "phonenumber", "title", "is_primary", "active", "datecreated"],
    filterRules: { active: { ruleType: "MultiSelectRule" } },
    fields: [
      { key: "customer_id", label: "Customer", section: "Contact", type: "number", relation: "customer", required: true },
      { key: "firstname", label: "First Name", section: "Contact", required: true },
      { key: "lastname", label: "Last Name", section: "Contact", required: true },
      { key: "email", label: "Email", section: "Contact", type: "email", required: true },
      { key: "password", label: "Password", section: "Portal", type: "password", requiredOnCreateUnless: "send_set_password_email" },
      { key: "send_set_password_email", label: "Email a secure password setup link", section: "Portal", type: "boolean" },
      { key: "title", label: "Title", section: "Contact" },
      { key: "phonenumber", label: "Phone", section: "Contact", type: "phone" },
      { key: "is_primary", label: "Primary", section: "Portal", type: "boolean" },
      { key: "active", label: "Active", section: "Portal", type: "select", options: statusOptions, readOnly: true },
      { key: "invoice_emails", label: "Invoice Emails", section: "Notifications", type: "boolean" },
      { key: "estimate_emails", label: "Estimate Emails", section: "Notifications", type: "boolean" },
      { key: "credit_note_emails", label: "Credit Note Emails", section: "Notifications", type: "boolean" },
      { key: "contract_emails", label: "Contract Emails", section: "Notifications", type: "boolean" },
      { key: "project_emails", label: "Project Emails", section: "Notifications", type: "boolean" },
      { key: "ticket_emails", label: "Ticket Emails", section: "Notifications", type: "boolean" },
      { key: "task_emails", label: "Task Emails", section: "Notifications", type: "boolean" },
    ],
    actions: [
      {
        key: "change_status",
        title: "Change active status",
        icon: "toggle-outline",
        endpointTemplate: "contacts/{id}/status",
        method: "PUT",
        requiresConfirm: false,
        fields: [{ key: "status", label: "Status", type: "select", required: true, options: statusOptions }],
        successMessage: "Contact status updated.",
      },
    ],
  },
  {
    key: "leads",
    title: "Lead",
    plural: "Leads",
    group: "CRM",
    endpoint: "leads",
    permissionFeature: "leads",
    customFieldsType: "leads",
    idKey: "id",
    icon: "people-outline",
    color: "#16A34A",
    titleFields: ["name", "company"],
    subtitleFields: ["email", "phonenumber", "status"],
    searchFields: ["name", "company", "email", "phonenumber"],
    defaultSort: { field: "dateadded", direction: "desc" },
    filterableFields: ["status", "source", "assigned", "country", "city", "name", "company", "email", "phonenumber", "dateadded"],
    statusField: "status",
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
      source: { operators: ["equal", "not_equal"] },
      assigned: { operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "name", label: "Lead Name", section: "Lead", required: true },
      { key: "source", label: "Source", section: "Lead", type: "number", relation: "lead_source", required: true },
      { key: "status", label: "Status", section: "Lead", type: "number", relation: "lead_status", required: true },
      { key: "assigned", label: "Assigned To", section: "Lead", type: "number", relation: "staff", hideIfZero: true },
      { key: "client_id", label: "Customer", section: "Lead", type: "number", relation: "customer", hideIfZero: true },
      { key: "contact", label: "Contact", section: "Contact" },
      { key: "title", label: "Title", section: "Contact" },
      { key: "email", label: "Email", section: "Contact", type: "email" },
      { key: "website", label: "Website", section: "Contact", type: "url" },
      { key: "phonenumber", label: "Phone", section: "Contact", type: "phone" },
      { key: "company", label: "Company", section: "Company" },
      ...addressFields,
      { key: "description", label: "Description", section: "Notes", type: "multiline" },
      { key: "is_public", label: "Public", section: "Lead", type: "boolean" },
      { key: "dateadded", label: "Date Added", section: "Dates", type: "datetime", readOnly: true },
    ],
    tabs: [
      { key: "tasks", title: "Tasks", moduleKey: "tasks", endpointTemplate: "tasks?rel_type=lead&rel_id={id}", childField: "rel_id", parentField: "id", fixedFilters: { rel_type: "lead" }, createDefaults: { rel_id: "{id}", rel_type: "lead" } },
      { key: "notes", title: "Notes", moduleKey: "lead_notes", endpointTemplate: "leads/notes?lead_id={id}" },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "lead" } },
    ],
    actions: [
      { key: "change_status", title: "Change Status…", icon: "swap-vertical-outline", endpointTemplate: "leads/{id}/status", method: "PUT",
        fields: [
          { key: "status", label: "New Status", type: "number", relation: "lead_status", required: true },
        ],
        successMessage: "Lead status updated" },
      { key: "convert", title: "Convert to Customer", icon: "person-add-outline", endpointTemplate: "leads/{id}/convert_to_customer", method: "POST",
        confirm: "Convert this lead to a customer?", successMessage: "Lead converted" },
      { key: "mark_lost", title: "Mark as Lost", icon: "close-circle-outline", endpointTemplate: "leads/{id}/mark_lost", method: "PUT",
        confirm: "Mark this lead as lost?", successMessage: "Lead marked lost", destructive: true },
      { key: "mark_junk", title: "Mark as Junk", icon: "trash-bin-outline", endpointTemplate: "leads/{id}/mark_junk", method: "PUT",
        confirm: "Mark this lead as junk?", successMessage: "Lead marked junk", destructive: true },
    ],
  },
  {
    key: "advance_leads",
    title: "Advance Lead",
    plural: "Advance Leads",
    group: "CRM",
    endpoint: "advance_leads_api",
    permissionFeature: "advanceleads",
    permissionCapabilities: { edit: "action" },
    idKey: "lead_id",
    icon: "alert-circle-outline",
    color: "#7C3AED",
    titleFields: ["name", "company"],
    subtitleFields: ["status_name", "closingdate", "job_type"],
    searchFields: ["name", "company", "email", "phonenumber", "description", "job_field", "job_type", "status_name"],
    defaultSort: { field: "closingdate", direction: "asc" },
    sortableFields: ["closingdate", "floatingdate", "lead_id", "name", "company", "assigned", "dateadded", "job_field", "job_type", "status", "action"],
    filterableFields: ["lead_id", "name", "company", "email", "phonenumber", "description", "assigned", "dateadded", "job_field", "job_type", "status", "action", "is_dewa", "floatingdate", "closingdate"],
    statusField: "status",
    statusOptions: [
      { label: "Initialized", value: 1, color: "#64748B" },
      { label: "Apply", value: 2, color: "#16A34A" },
      { label: "Dismiss", value: 3, color: "#DC2626" },
      { label: "Observe", value: 4, color: "#D97706" },
      { label: "Interested", value: 5, color: "#2563EB" },
      { label: "Active", value: 6, color: "#7C3AED" },
      { label: "Closed", value: 7, color: "#475569" },
    ],
    filterRules: {
      assigned: { ruleType: "MultiSelectRule" },
      status: { ruleType: "MultiSelectRule" },
      action: { ruleType: "MultiSelectRule" },
    },
    fields: [
      { key: "lead_id", label: "Lead", section: "Lead", type: "number", relation: "lead", readOnly: true },
      { key: "name", label: "RFx / Lead Name", section: "Lead", readOnly: true },
      { key: "company", label: "Company", section: "Lead", readOnly: true },
      { key: "email", label: "Email", section: "Contact", type: "email", readOnly: true },
      { key: "phonenumber", label: "Phone", section: "Contact", type: "phone", readOnly: true },
      { key: "description", label: "Description", section: "Lead", type: "multiline", readOnly: true },
      { key: "assigned", label: "Assigned To", section: "Ownership", type: "number", relation: "staff", readOnly: true, hideIfZero: true },
      { key: "responsible_staff_id", label: "Responsible Staff", section: "Ownership", type: "number", relation: "staff", readOnly: true, hideIfZero: true },
      { key: "status", label: "Advance Status", section: "Tracking", type: "number", relation: "advance_lead_status", readOnly: true },
      { key: "action", label: "Decision", section: "Tracking", type: "select", readOnly: true, options: [
        { label: "Reset", value: 0 }, { label: "Apply", value: 1 }, { label: "Dismiss", value: 2 }, { label: "Observe", value: 3 },
      ] },
      { key: "job_field", label: "Job Field", section: "Classification" },
      { key: "job_type", label: "Job Type", section: "Classification" },
      { key: "notes", label: "Decision Notes", section: "Notes", type: "multiline" },
      { key: "feedback_note", label: "Feedback", section: "Notes", type: "multiline", readOnly: true },
      { key: "is_dewa", label: "DEWA", section: "Tracking", type: "boolean", readOnly: true },
      { key: "floatingdate", label: "Floating Date", section: "Dates", type: "datetime", readOnly: true },
      { key: "closingdate", label: "Closing Date", section: "Dates", type: "datetime", readOnly: true },
      { key: "extensions", label: "Extensions", section: "Dates", type: "number", readOnly: true },
      { key: "dateadded", label: "Lead Added", section: "Dates", type: "datetime", readOnly: true },
      { key: "action_at", label: "Decision At", section: "Dates", type: "datetime", readOnly: true },
      { key: "feedback_at", label: "Feedback At", section: "Dates", type: "datetime", readOnly: true },
      { key: "active_at", label: "Activated At", section: "Dates", type: "datetime", readOnly: true },
      { key: "keyword_checked_at", label: "Keywords Checked", section: "Automation", type: "datetime", readOnly: true },
      { key: "is_keyword_scraped", label: "Keywords Scraped", section: "Automation", type: "boolean", readOnly: true },
      { key: "is_materials_scraped", label: "Materials Scraped", section: "Automation", type: "boolean", readOnly: true },
    ],
    tabs: [
      {
        key: "date_extensions",
        title: "Date Extensions",
        moduleKey: "advance_lead_details",
        endpointTemplate: "advance_leads_api/details/{id}",
        createDefaults: { lead_id: "{id}" },
      },
    ],
    canCreate: false,
    canDelete: false,
  },
  {
    key: "advance_lead_details",
    title: "Advance Lead Date",
    plural: "Advance Lead Dates",
    group: "CRM",
    endpoint: "advance_leads_api/details",
    permissionFeature: "advanceleads",
    idKey: "id",
    icon: "calendar-outline",
    color: "#7C3AED",
    titleFields: ["closingdate", "floatingdate"],
    subtitleFields: ["scrapedat"],
    fields: [
      { key: "lead_id", label: "Lead ID", section: "Lead", type: "number", required: true, createOnly: true },
      { key: "floatingdate", label: "Floating Date", section: "Dates", type: "datetime" },
      { key: "closingdate", label: "Closing Date", section: "Dates", type: "datetime" },
      { key: "scrapedat", label: "Scraped At", section: "Dates", type: "datetime" },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "advance_lead_statuses",
    title: "Advance Lead Status",
    plural: "Advance Lead Statuses",
    group: "CRM",
    endpoint: "advance_leads_api/statuses",
    permissionFeature: "advanceleads",
    permissionCapabilities: { create: "change_status" },
    idKey: "id",
    icon: "flag-outline",
    color: "#7C3AED",
    titleFields: ["name"],
    subtitleFields: ["statusorder", "color"],
    fields: [
      { key: "name", label: "Name", section: "Status", required: true },
      { key: "color", label: "Color", section: "Status", required: true, placeholder: "#7C3AED" },
      { key: "statusorder", label: "Order", section: "Status", type: "number" },
      { key: "isdefault", label: "Default", section: "Status", type: "boolean" },
      { key: "filter_default", label: "Default Filter", section: "Status", type: "boolean" },
    ],
    canOpenDetail: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "projects",
    title: "Project",
    plural: "Projects",
    group: "Work",
    endpoint: "projects",
    permissionFeature: "projects",
    customFieldsType: "projects",
    idKey: "id",
    icon: "folder-outline",
    color: "#2563EB",
    titleFields: ["name"],
    subtitleFields: ["company", "clientid", "status", "deadline"],
    searchFields: ["name", "description"],
    defaultSort: { field: "deadline", direction: "asc" },
    filterableFields: ["status", "clientid", "billing_type", "start_date", "deadline"],
    statusField: "status",
    statusOptions: projectStatusFilterOptions,
    supportsAdvancedFilters: true,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
      clientid: { operators: ["equal", "not_equal"] },
      billing_type: { operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "name", label: "Project Name", section: "Project", required: true },
      { key: "rel_type", label: "Related Type", section: "Project", type: "select", defaultValue: "customer", options: [{ label: "Customer", value: "customer" }, { label: "Lead", value: "lead" }, { label: "Internal", value: "internal" }] },
      { key: "clientid", label: "Customer", section: "Project", type: "number", relation: "customer", required: true },
      { key: "billing_type", label: "Billing Type", section: "Billing", type: "select", required: true, defaultValue: "3", options: projectBillingOptions },
      { key: "status", label: "Status", section: "Project", type: "select", required: true, defaultValue: "2", options: projectStatusOptions },
      { key: "start_date", label: "Start Date", section: "Dates", type: "date", required: true },
      { key: "deadline", label: "Deadline", section: "Dates", type: "date" },
      { key: "progress", label: "Progress", section: "Project", type: "number" },
      { key: "project_cost", label: "Project Cost", section: "Billing", type: "money" },
      { key: "project_rate_per_hour", label: "Hourly Rate", section: "Billing", type: "money" },
      { key: "estimated_hours", label: "Estimated Hours", section: "Billing", type: "number" },
      { key: "tags", label: "Tags", section: "Project" },
      { key: "description", label: "Description", section: "Notes", type: "multiline" },
      { key: "project_created", label: "Created", section: "Dates", type: "date", readOnly: true },
      { key: "date_finished", label: "Finished", section: "Dates", type: "datetime", readOnly: true },
      { key: "projectmanager", label: "Project Manager", section: "Team", type: "number", relation: "staff", hideIfZero: true, readOnly: true },
      { key: "projectseniorManager", label: "Senior Manager", section: "Team", type: "number", relation: "staff", hideIfZero: true, readOnly: true },
      { key: "projectsenior_manager", label: "Senior Manager", section: "Team", type: "number", relation: "staff", hideIfZero: true, readOnly: true },
      { key: "projectseniormanager", label: "Senior Manager", section: "Team", type: "number", relation: "staff", hideIfZero: true, readOnly: true },
      { key: "addedfrom", label: "Added By", section: "Team", type: "number", relation: "staff", hideIfZero: true, readOnly: true },
      { key: "progress_from_tasks", label: "Progress Uses Tasks", section: "Settings", type: "boolean", readOnly: true },
      { key: "contact_notification", label: "Contact Notifications", section: "Notifications", type: "boolean", readOnly: true },
      { key: "notify_contacts", label: "Notify Contacts", section: "Notifications", type: "json", readOnly: true },
      { key: "teams_channel", label: "Teams Channel", section: "Collaboration", type: "url", readOnly: true },
    ],
    tabs: [
      { key: "tasks", title: "Tasks", moduleKey: "tasks", endpointTemplate: "tasks?rel_type=project&rel_id={id}", childField: "rel_id", parentField: "id", fixedFilters: { rel_type: "project" }, createDefaults: { rel_id: "{id}", rel_type: "project" } },
      { key: "milestones", title: "Milestones", moduleKey: "milestones", endpointTemplate: "milestones?project_id={id}", childField: "project_id", parentField: "id", createDefaults: { project_id: "{id}" } },
      { key: "members", title: "Members", moduleKey: "project_members", endpointTemplate: "projects/members?project_id={id}" },
      { key: "discussions", title: "Discussions", moduleKey: "project_discussions", endpointTemplate: "projects/discussions?project_id={id}" },
      { key: "notes", title: "Notes", moduleKey: "project_notes", endpointTemplate: "projects/notes?project_id={id}" },
      { key: "activity", title: "Activity", moduleKey: "project_activity", endpointTemplate: "projects/activity?project_id={id}" },
      { key: "invoices", title: "Invoices", moduleKey: "invoices", endpointTemplate: "invoices?clientid={clientid}", childField: "project_id", parentField: "id", createDefaults: { project_id: "{id}" } },
      { key: "expenses", title: "Expenses", moduleKey: "expenses", endpointTemplate: "expenses?project_id={id}", childField: "project_id", parentField: "id", createDefaults: { project_id: "{id}" } },
      { key: "tickets", title: "Tickets", moduleKey: "tickets", endpointTemplate: "tickets?userid={clientid}", childField: "project_id", parentField: "id", createDefaults: { project_id: "{id}" } },
      { key: "cost_calculations", title: "Calculation Sheets", moduleKey: "cost_calculations", endpointTemplate: "cost_calculation_api?rel_type=project&rel_id={id}", unpaginated: true, createDefaults: { rel_type: "project", rel_id: "{id}", rel_name: "{name}" } },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "project" } },
    ],
    actions: [
      { key: "mark_in_progress", title: "Mark as In Progress", icon: "play-outline", endpointTemplate: "projects/{id}/mark_in_progress", method: "PUT", confirm: "Move this project to In Progress?", successMessage: "Project marked in progress" },
      { key: "mark_on_hold", title: "Mark as On Hold", icon: "pause-outline", endpointTemplate: "projects/{id}/mark_on_hold", method: "PUT", confirm: "Put this project on hold?", successMessage: "Project on hold" },
      { key: "mark_finished", title: "Mark as Finished", icon: "checkmark-done-outline", endpointTemplate: "projects/{id}/mark_finished", method: "PUT", confirm: "Mark this project as finished?", successMessage: "Project finished" },
      { key: "mark_cancelled", title: "Mark as Cancelled", icon: "close-circle-outline", endpointTemplate: "projects/{id}/mark_cancelled", method: "PUT", confirm: "Cancel this project?", successMessage: "Project cancelled", destructive: true },
    ],
  },
  {
    key: "tasks",
    title: "Task",
    plural: "Tasks",
    group: "Work",
    endpoint: "tasks",
    permissionFeature: "tasks",
    customFieldsType: "tasks",
    idKey: "id",
    icon: "checkbox-outline",
    color: "#F59E0B",
    titleFields: ["name"],
    // A task's raw rel_type can be an internal implementation bucket such as
    // `erp_dev`. Prefer the human record name and due date in list cards.
    subtitleFields: ["rel_name", "duedate"],
    searchFields: ["name", "description"],
    filterableFields: ["status", "priority", "billable"],
    statusField: "status",
    statusOptions: taskStatusFilterOptions,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
      priority: { ruleType: "MultiSelectRule" },
      billable: { operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "name", label: "Task Name", section: "Task", required: true },
      { key: "startdate", label: "Start Date", section: "Dates", type: "date", required: true },
      { key: "duedate", label: "Due Date", section: "Dates", type: "datetime" },
      { key: "priority", label: "Priority", section: "Task", type: "select", options: priorityOptions, defaultValue: "2" },
      { key: "status", label: "Status", section: "Task", type: "number" },
      { key: "rel_type", label: "Related Type", section: "Relation" },
      { key: "rel_id", label: "Related ID", section: "Relation", type: "number" },
      { key: "billable", label: "Billable", section: "Billing", type: "boolean" },
      { key: "hourly_rate", label: "Hourly Rate", section: "Billing", type: "money" },
      { key: "tags", label: "Tags", section: "Task" },
      { key: "description", label: "Description", section: "Notes", type: "multiline" },
    ],
    tabs: [
      { key: "checklist", title: "Checklist", moduleKey: "task_checklist", endpointTemplate: "tasks/checklist/{id}", createDefaults: { taskid: "{id}" } },
      { key: "comments", title: "Comments", moduleKey: "task_comments", endpointTemplate: "tasks/comments/{id}", createDefaults: { taskid: "{id}" } },
      { key: "assignments", title: "Assignments", moduleKey: "task_assignments", endpointTemplate: "tasks/assignments/{id}", createDefaults: { taskid: "{id}" } },
      { key: "followers", title: "Followers", moduleKey: "task_followers", endpointTemplate: "tasks/followers/{id}", createDefaults: { taskid: "{id}" } },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "task" } },
    ],
    actions: [
      { key: "timer_start", title: "Start Timer", icon: "play-outline", endpointTemplate: "tasks/{id}/timer/start", confirm: "Start a timer on this task?", successMessage: "Timer started" },
      { key: "timer_stop", title: "Stop Timer…", icon: "stop-outline", endpointTemplate: "tasks/{id}/timer/stop",
        fields: [
          { key: "timer_id", label: "Timer ID (from the running timer)", type: "number", required: true },
          { key: "note", label: "Note (optional)", type: "multiline" },
        ],
        successMessage: "Timer stopped",
      },
      { key: "mark_complete", title: "Mark Complete", icon: "checkmark-done-circle-outline", endpointTemplate: "tasks/{id}/mark_complete", method: "PUT", confirm: "Mark this task as complete?", successMessage: "Task marked complete" },
      { key: "reopen", title: "Reopen Task", icon: "refresh-circle-outline", endpointTemplate: "tasks/{id}/reopen", method: "PUT", confirm: "Reopen this task?", successMessage: "Task reopened" },
    ],
  },
  {
    key: "task_checklist",
    title: "Checklist Item",
    plural: "Checklist",
    group: "Work",
    endpoint: "tasks/checklist",
    idKey: "id",
    icon: "list-outline",
    color: "#F59E0B",
    titleFields: ["description"],
    subtitleFields: ["finished", "dateadded"],
    fields: [
      { key: "taskid", label: "Task ID", type: "number", required: true },
      { key: "description", label: "Description", type: "multiline", required: true },
      { key: "finished", label: "Finished", type: "boolean" },
    ],
  },
  {
    key: "task_comments",
    title: "Task Comment",
    plural: "Task Comments",
    group: "Work",
    endpoint: "tasks/comments",
    idKey: "id",
    icon: "chatbubble-outline",
    color: "#F59E0B",
    titleFields: ["content", "comment"],
    subtitleFields: ["dateadded", "staffid"],
    fields: [
      { key: "taskid", label: "Task ID", type: "number", required: true },
      { key: "content", label: "Comment", type: "multiline", required: true },
    ],
    canUpdate: false,
  },
  {
    key: "task_assignments",
    title: "Task Assignment",
    plural: "Task Assignments",
    group: "Work",
    endpoint: "tasks/assignments",
    idKey: "id",
    icon: "person-add-outline",
    color: "#F59E0B",
    titleFields: ["staffid", "firstname", "lastname"],
    subtitleFields: ["dateassigned"],
    fields: [
      { key: "taskid", label: "Task ID", type: "number", required: true },
      { key: "staffid", label: "Staff", type: "number", relation: "staff", required: true },
    ],
    canUpdate: false,
  },
  {
    key: "task_followers",
    title: "Task Follower",
    plural: "Task Followers",
    group: "Work",
    endpoint: "tasks/followers",
    idKey: "id",
    icon: "eye-outline",
    color: "#F59E0B",
    titleFields: ["staffid", "firstname", "lastname"],
    subtitleFields: ["dateadded"],
    fields: [
      { key: "taskid", label: "Task ID", type: "number", required: true },
      { key: "staffid", label: "Staff", type: "number", relation: "staff", required: true },
    ],
    canUpdate: false,
  },
  {
    key: "invoices",
    title: "Invoice",
    plural: "Invoices",
    group: "Sales",
    endpoint: "invoices",
    permissionFeature: "invoices",
    customFieldsType: "invoice",
    idKey: "id",
    icon: "document-text-outline",
    color: "#DC2626",
    titleFields: ["invoice_number", "number", "prefix"],
    subtitleFields: ["company", "total", "status"],
    searchFields: ["number", "company", "clientid"],
    defaultSort: { field: "date", direction: "desc" },
    filterableFields: ["status", "date", "duedate", "total", "clientid", "number"],
    statusField: "status",
    statusOptions: invoiceStatusOptions,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
      clientid: { operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "status", label: "Status", section: "Document", type: "select", options: invoiceStatusOptions, readOnly: true },
      ...moneyDocFields,
    ],
    tabs: [
      { key: "payments", title: "Payments", moduleKey: "payments", endpointTemplate: "payments?invoiceid={id}", childField: "invoiceid", parentField: "id", createDefaults: { invoiceid: "{id}" } },
      { key: "tasks", title: "Tasks", moduleKey: "tasks", endpointTemplate: "tasks?rel_type=invoice&rel_id={id}", childField: "rel_id", parentField: "id", fixedFilters: { rel_type: "invoice" }, createDefaults: { rel_id: "{id}", rel_type: "invoice" } },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "invoice" } },
    ],
    actions: [
      { key: "send", title: "Send to Client", icon: "paper-plane-outline", endpointTemplate: "invoices/{id}/send", confirm: "Email this invoice to the client?", successMessage: "Invoice sent" },
      { key: "record_payment", title: "Record Payment…", icon: "cash-outline", endpointTemplate: "invoices/{id}/record_payment",
        fields: [
          { key: "amount", label: "Amount", type: "money", required: true },
          { key: "paymentmode", label: "Payment Mode", type: "number", relation: "payment_mode", required: true },
          { key: "date", label: "Date", type: "date" },
          { key: "transactionid", label: "Transaction ID" },
          { key: "note", label: "Note", type: "multiline" },
        ],
        successMessage: "Payment recorded",
      },
      { key: "mark_cancelled", title: "Mark Cancelled", icon: "close-circle-outline", endpointTemplate: "invoices/{id}/mark_cancelled", method: "PUT", confirm: "Cancel this invoice?", successMessage: "Invoice cancelled", destructive: true },
      { key: "unmark_cancelled", title: "Reopen Cancelled Invoice", icon: "refresh-outline", endpointTemplate: "invoices/{id}/unmark_cancelled", method: "PUT", confirm: "Reopen this cancelled invoice?", successMessage: "Invoice reopened" },
      { key: "copy", title: "Copy Invoice", icon: "copy-outline", endpointTemplate: "invoices/{id}/copy", confirm: "Create a new draft from this invoice?", successMessage: "Invoice copied" },
    ],
  },
  {
    key: "estimates",
    title: "Estimate",
    plural: "Estimates",
    group: "Sales",
    endpoint: "estimates",
    permissionFeature: "estimates",
    customFieldsType: "estimate",
    idKey: "id",
    icon: "reader-outline",
    color: "#7C3AED",
    titleFields: ["estimate_number", "number", "prefix"],
    subtitleFields: ["company", "total", "status"],
    searchFields: ["number", "company", "clientid"],
    defaultSort: { field: "date", direction: "desc" },
    filterableFields: ["status", "date", "total", "clientid", "number"],
    statusField: "status",
    statusOptions: estimateStatusOptions,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
      clientid: { operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "status", label: "Status", section: "Document", type: "select", options: estimateStatusOptions, required: true, createOnly: true, defaultValue: "1" },
      { key: "estimate_request_id", label: "Source Estimate Request", section: "Relation", type: "number", hideIfZero: true },
      ...moneyDocFields,
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "estimate" } },
    ],
    actions: [
      { key: "send", title: "Send to Client", icon: "paper-plane-outline", endpointTemplate: "estimates/{id}/send", confirm: "Email this estimate to the client?", successMessage: "Estimate sent" },
      { key: "convert", title: "Convert to Invoice", icon: "swap-horizontal-outline", endpointTemplate: "estimates/{id}/convert_to_invoice", confirm: "Convert this estimate to an invoice?", successMessage: "Converted to invoice" },
      { key: "convert_to_project", title: "Convert to Project", icon: "briefcase-outline", endpointTemplate: "estimates/{id}/convert_to_project", confirm: "Create a linked project from this estimate?", successMessage: "Converted to project" },
      { key: "copy", title: "Copy Estimate", icon: "copy-outline", endpointTemplate: "estimates/{id}/copy", confirm: "Create a copy of this estimate?", successMessage: "Estimate copied" },
      { key: "mark_sent", title: "Mark as Sent", icon: "checkmark-done-outline", endpointTemplate: "estimates/{id}/mark_sent", method: "PUT", confirm: "Mark this estimate as sent?", successMessage: "Marked sent" },
      { key: "mark_accepted", title: "Mark as Accepted", icon: "thumbs-up-outline", endpointTemplate: "estimates/{id}/mark_accepted", method: "PUT", confirm: "Mark this estimate as accepted?", successMessage: "Marked accepted" },
      { key: "mark_declined", title: "Mark as Declined", icon: "thumbs-down-outline", endpointTemplate: "estimates/{id}/mark_declined", method: "PUT", confirm: "Mark this estimate as declined?", successMessage: "Marked declined", destructive: true },
    ],
  },
  {
    key: "proposals",
    title: "Proposal",
    plural: "Proposals",
    group: "Sales",
    endpoint: "proposals",
    permissionFeature: "proposals",
    customFieldsType: "proposal",
    idKey: "id",
    icon: "newspaper-outline",
    color: "#0891B2",
    titleFields: ["subject", "proposal_number", "id"],
    subtitleFields: ["rel_type", "rel_id", "total"],
    searchFields: ["subject", "proposal_to", "email"],
    defaultSort: { field: "date", direction: "desc" },
    filterableFields: ["subject", "total", "subtotal", "date", "open_till", "signed", "expired", "rel_type", "assigned", "status", "year"],
    statusField: "status",
    statusOptions: proposalStatusOptions,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
      year: { ruleType: "MultiSelectRule" },
      open_till: { operators: ["equal", "not_equal", "between", "not_between", "less", "less_or_equal", "greater", "greater_or_equal", "dynamic", "is_empty", "is_not_empty"] },
      assigned: { operators: ["equal", "not_equal", "is_empty", "is_not_empty"] },
    },
    fields: [
      { key: "subject", label: "Subject", section: "Proposal", required: true },
      { key: "estimate_request_id", label: "Source Estimate Request", section: "Relation", type: "number", hideIfZero: true },
      { key: "rel_type", label: "Related Type", section: "Relation", type: "select", required: true, options: [
        { label: "Customer", value: "customer" },
        { label: "Lead", value: "lead" },
      ] },
      { key: "rel_id", label: "Related ID", section: "Relation", type: "number", required: true },
      { key: "proposal_to", label: "Proposal To", section: "Recipient" },
      { key: "email", label: "Email", section: "Recipient", type: "email" },
      { key: "phone", label: "Phone", section: "Recipient", type: "phone" },
      { key: "date", label: "Date", section: "Dates", type: "date", required: true },
      { key: "open_till", label: "Open Till", section: "Dates", type: "date" },
      { key: "currency", label: "Currency ID", section: "Totals", type: "number" },
      { key: "subtotal", label: "Subtotal", section: "Totals", type: "money" },
      { key: "total", label: "Total", section: "Totals", type: "money" },
      { key: "content", label: "Content", section: "Content", type: "multiline" },
      { key: "assigned", label: "Assigned To", section: "Proposal", type: "number", relation: "staff", hideIfZero: true },
      { key: "status", label: "Status", section: "Proposal", type: "select", options: proposalStatusOptions, required: true, createOnly: true, defaultValue: "6" },
      { key: "signed", label: "Signed", section: "Filter", type: "select", options: yesNoOptions, readOnly: true },
      { key: "expired", label: "Expired", section: "Filter", type: "select", options: yesNoOptions, readOnly: true },
      { key: "year", label: "Year", section: "Filter", type: "number", readOnly: true },
    ],
    actions: [
      { key: "send", title: "Send to Client…", icon: "paper-plane-outline", endpointTemplate: "proposals/{id}/send",
        fields: [
          { key: "cc", label: "CC (optional)", type: "email" },
          { key: "attachpdf", label: "Attach PDF", type: "boolean", defaultValue: true },
        ],
        successMessage: "Proposal sent" },
      { key: "copy", title: "Copy Proposal", icon: "copy-outline", endpointTemplate: "proposals/{id}/copy", confirm: "Make a copy of this proposal?", successMessage: "Proposal copied" },
      { key: "mark_open", title: "Mark as Open", icon: "mail-open-outline", endpointTemplate: "proposals/{id}/mark_open", method: "PUT", confirm: "Mark this proposal as open?", successMessage: "Marked open" },
      { key: "mark_sent", title: "Mark as Sent", icon: "checkmark-done-outline", endpointTemplate: "proposals/{id}/mark_sent", method: "PUT", confirm: "Mark this proposal as sent?", successMessage: "Marked sent" },
      { key: "mark_revised", title: "Mark as Revised", icon: "refresh-outline", endpointTemplate: "proposals/{id}/mark_revised", method: "PUT", confirm: "Mark this proposal as revised?", successMessage: "Marked revised" },
      { key: "mark_accepted", title: "Mark as Accepted", icon: "thumbs-up-outline", endpointTemplate: "proposals/{id}/mark_accepted", method: "PUT", confirm: "Mark this proposal as accepted?", successMessage: "Marked accepted" },
      { key: "mark_declined", title: "Mark as Declined", icon: "thumbs-down-outline", endpointTemplate: "proposals/{id}/mark_declined", method: "PUT", confirm: "Mark this proposal as declined?", successMessage: "Marked declined", destructive: true },
    ],
  },
  {
    key: "payments",
    title: "Payment",
    plural: "Payments",
    group: "Sales",
    endpoint: "payments",
    permissionFeature: "payments",
    idKey: "id",
    icon: "card-outline",
    color: "#059669",
    titleFields: ["amount", "transactionid"],
    subtitleFields: ["invoiceid", "date", "payment_mode_name"],
    searchFields: ["transactionid", "invoiceid", "amount", "paymentmethod", "payment_mode_name", "note"],
    filterableFields: ["invoiceid", "amount", "paymentmode", "paymentmethod", "date", "daterecorded", "transactionid"],
    filterRules: { paymentmode: { ruleType: "MultiSelectRule" } },
    fields: [
      { key: "invoiceid", label: "Invoice ID", section: "Payment", type: "number", required: true },
      { key: "amount", label: "Amount", section: "Payment", type: "money", required: true },
      { key: "date", label: "Date", section: "Payment", type: "date", required: true },
      { key: "paymentmode", label: "Payment Mode ID", section: "Payment", type: "number" },
      { key: "payment_mode_name", label: "Payment Mode", section: "Payment", readOnly: true },
      { key: "paymentmethod", label: "Payment Method", section: "Payment" },
      { key: "transactionid", label: "Transaction ID", section: "Payment" },
      { key: "note", label: "Note", section: "Notes", type: "multiline" },
      { key: "daterecorded", label: "Recorded", section: "Audit", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "expenses",
    title: "Expense",
    plural: "Expenses",
    group: "Finance",
    endpoint: "expenses",
    permissionFeature: "expenses",
    customFieldsType: "expenses",
    idKey: "id",
    icon: "receipt-outline",
    color: "#EA580C",
    titleFields: ["expense_name", "category_name", "amount"],
    subtitleFields: ["clientid", "date", "paymentmode"],
    searchFields: ["expense_name", "amount", "clientid"],
    defaultSort: { field: "date", direction: "desc" },
    filterableFields: ["category", "date", "clientid", "project_id", "amount", "expense_name"],
    fields: [
      { key: "category", label: "Category ID", section: "Expense", type: "number", required: true },
      { key: "amount", label: "Amount", section: "Expense", type: "money", required: true },
      { key: "date", label: "Date", section: "Expense", type: "date", required: true },
      { key: "currency", label: "Currency ID", section: "Expense", type: "number" },
      { key: "clientid", label: "Customer", section: "Relation", type: "number", relation: "customer" },
      { key: "project_id", label: "Project ID", section: "Relation", type: "number" },
      { key: "paymentmode", label: "Payment Mode ID", section: "Expense", type: "number" },
      { key: "reference_no", label: "Reference No", section: "Expense" },
      { key: "expense_name", label: "Expense Name", section: "Expense" },
      { key: "note", label: "Note", section: "Notes", type: "multiline" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "expense" } },
    ],
    actions: [
      { key: "mark_billable", title: "Mark as Billable", icon: "pricetag-outline", endpointTemplate: "expenses/{id}/mark_billable", method: "PUT", confirm: "Mark this expense as billable to the customer?", successMessage: "Marked billable" },
      { key: "mark_not_billable", title: "Mark as Not Billable", icon: "remove-circle-outline", endpointTemplate: "expenses/{id}/mark_not_billable", method: "PUT", successMessage: "Marked not billable" },
      { key: "copy", title: "Copy this Expense", icon: "copy-outline", endpointTemplate: "expenses/{id}/copy", confirm: "Clone this expense?", successMessage: "Expense copied" },
    ],
  },
  {
    key: "credit_notes",
    title: "Credit Note",
    plural: "Credit Notes",
    group: "Finance",
    endpoint: "credit_notes",
    permissionFeature: "credit_notes",
    customFieldsType: "credit_note",
    idKey: "id",
    icon: "return-down-back-outline",
    color: "#BE123C",
    titleFields: ["credit_note_number", "number", "prefix"],
    subtitleFields: ["clientid", "total", "status"],
    searchFields: ["credit_note_number", "number", "reference_no", "client_name", "company"],
    defaultSort: { field: "date", direction: "desc" },
    filterableFields: ["number", "reference_no", "date", "total", "remaining_amount", "status", "year"],
    statusField: "status",
    statusOptions: creditNoteStatusOptions,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
      year: { ruleType: "MultiSelectRule" },
    },
    fields: [
      { key: "status", label: "Status", section: "Document", type: "select", options: creditNoteStatusOptions, readOnly: true },
      { key: "reference_no", label: "Reference No", section: "Document" },
      { key: "remaining_amount", label: "Remaining Credits", section: "Totals", type: "money", readOnly: true },
      { key: "remaining_credits", label: "Remaining Credits", section: "Totals", type: "money", readOnly: true },
      { key: "credits_used", label: "Applied to Invoices", section: "Totals", type: "money", readOnly: true },
      { key: "total_refunds", label: "Refunded", section: "Totals", type: "money", readOnly: true },
      { key: "applied_credits_summary", label: "Applied Credits", section: "Applications", type: "multiline", readOnly: true },
      { key: "refunds_summary", label: "Refunds", section: "Refunds", type: "multiline", readOnly: true },
      { key: "year", label: "Year", section: "Filter", type: "number", readOnly: true },
      ...moneyDocFields,
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "credit_note" } },
    ],
    actions: [
      { key: "send", availabilityKey: "send", title: "Send to Client", icon: "paper-plane-outline", endpointTemplate: "credit_notes/{id}/send", confirm: "Email this credit note to all eligible customer contacts?", successMessage: "Credit note sent" },
      { key: "apply_credits", availabilityKey: "apply_credits", title: "Apply to Invoice", icon: "document-attach-outline", endpointTemplate: "credit_notes/{id}/apply_credits",
        fields: [
          { key: "invoice_id", label: "Invoice", type: "number", relation: "invoice", required: true },
          { key: "amount", label: "Amount", type: "money", required: true },
        ],
        successMessage: "Credit applied to invoice",
      },
      { key: "refund", availabilityKey: "refund", title: "Record Refund", icon: "cash-outline", endpointTemplate: "credit_notes/{id}/refunds",
        fields: [
          { key: "amount", label: "Refund Amount", type: "money", required: true },
          { key: "refunded_on", label: "Refund Date", type: "date", required: true },
          { key: "payment_mode", label: "Payment Mode", type: "number", relation: "payment_mode", required: true },
          { key: "note", label: "Note", type: "multiline" },
        ],
        successMessage: "Refund recorded",
      },
      { key: "mark_void", availabilityKey: "mark_void", title: "Mark Void", icon: "ban-outline", endpointTemplate: "credit_notes/{id}/mark_void", method: "PUT", confirm: "Mark this unused credit note as void?", successMessage: "Credit note marked void", destructive: true },
      { key: "mark_open", availabilityKey: "mark_open", title: "Reopen Credit Note", icon: "refresh-outline", endpointTemplate: "credit_notes/{id}/mark_open", method: "PUT", confirm: "Reopen this void credit note?", successMessage: "Credit note reopened" },
      { key: "delete_refund", availabilityKey: "delete_refund", title: "Delete Refund", icon: "trash-outline", endpointTemplate: "credit_notes/{id}/refunds/{refund_id}", method: "DELETE",
        fields: [{ key: "refund_id", label: "Refund ID (shown in Refunds)", type: "number", required: true }],
        confirm: "Delete this refund record?", successMessage: "Refund deleted", destructive: true,
      },
      { key: "delete_applied_credit", availabilityKey: "delete_applied_credit", title: "Remove Applied Credit", icon: "unlink-outline", endpointTemplate: "credit_notes/{id}/applied_credits/{credit_id}", method: "DELETE",
        fields: [{ key: "credit_id", label: "Applied Credit ID (shown in Applications)", type: "number", required: true }],
        confirm: "Remove this credit from its invoice?", successMessage: "Applied credit removed", destructive: true,
      },
    ],
  },
  {
    key: "subscriptions",
    title: "Subscription",
    plural: "Subscriptions",
    group: "Sales",
    endpoint: "subscriptions",
    permissionFeature: "subscriptions",
    idKey: "id",
    icon: "repeat-outline",
    color: "#7C3AED",
    titleFields: ["name"],
    subtitleFields: ["company", "project_name", "status"],
    searchFields: ["name", "company", "project_name", "status", "stripe_subscription_id"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["name", "date_subscribed", "status"],
    statusField: "status",
    statusOptions: subscriptionStatusOptions,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
    },
    fields: [
      { key: "name", label: "Subscription Name", section: "Subscription", required: true },
      { key: "stripe_plan_id", label: "Billing Plan", section: "Billing", relation: "stripe_plan", required: true },
      { key: "quantity", label: "Quantity", section: "Billing", type: "number", required: true, defaultValue: 1 },
      { key: "date", label: "First Billing Date", section: "Billing", type: "date" },
      { key: "clientid", label: "Customer", section: "Relation", type: "number", relation: "customer", required: true },
      { key: "project_id", label: "Project", section: "Relation", type: "number", relation: "project", hideIfZero: true },
      { key: "currency", label: "Currency", section: "Billing", type: "number", relation: "currency", required: true },
      { key: "stripe_tax_id", label: "Stripe Tax 1", section: "Billing", relation: "stripe_tax_rate" },
      { key: "stripe_tax_id_2", label: "Stripe Tax 2", section: "Billing", relation: "stripe_tax_rate" },
      { key: "description", label: "Description", section: "Content", type: "multiline" },
      { key: "description_in_item", label: "Include Description in Invoice Item", section: "Content", type: "boolean" },
      { key: "terms", label: "Terms and Conditions", section: "Content", type: "multiline" },
      { key: "status", label: "Status", section: "Stripe", type: "select", options: subscriptionStatusOptions, readOnly: true },
      { key: "stripe_subscription_id", label: "Stripe Subscription ID", section: "Stripe", readOnly: true },
      { key: "date_subscribed", label: "Date Subscribed", section: "Stripe", type: "datetime", readOnly: true },
      { key: "next_billing_cycle", label: "Next Billing Cycle (Unix)", section: "Stripe", type: "number", readOnly: true },
      { key: "ends_at", label: "Scheduled End (Unix)", section: "Stripe", type: "number", readOnly: true },
      { key: "last_sent_at", label: "Last Sent", section: "Activity", type: "datetime", readOnly: true },
      { key: "public_url", label: "Customer Subscription Link", section: "Activity", type: "url", readOnly: true },
      { key: "child_invoices_count", label: "Child Invoices", section: "Invoices", type: "number", readOnly: true },
      { key: "child_invoices_summary", label: "Invoice Summary", section: "Invoices", type: "multiline", readOnly: true },
    ],
    tabs: [
      { key: "invoices", title: "Invoices", moduleKey: "invoices", endpointTemplate: "subscriptions/{id}/invoices", canCreate: false },
    ],
    actions: [
      {
        key: "send",
        availabilityKey: "send",
        title: "Send to Customer",
        icon: "paper-plane-outline",
        endpointTemplate: "subscriptions/{id}/send",
        fields: [{ key: "cc", label: "CC (optional)", type: "email" }],
        confirm: "Email this subscription to the customer's primary contact?",
        successMessage: "Subscription sent",
      },
      {
        key: "cancel",
        availabilityKey: "cancel",
        title: "Cancel Subscription",
        icon: "close-circle-outline",
        endpointTemplate: "subscriptions/{id}/cancel",
        fields: [{
          key: "type",
          label: "Cancellation Timing",
          type: "select",
          required: true,
          options: [
            { label: "At end of billing period", value: "at_period_end" },
            { label: "Immediately", value: "immediately" },
          ],
        }],
        confirm: "Cancel this live Stripe subscription? Immediate cancellation cannot be resumed.",
        successMessage: "Subscription cancellation requested",
        destructive: true,
      },
      {
        key: "resume",
        availabilityKey: "resume",
        title: "Resume Subscription",
        icon: "play-circle-outline",
        endpointTemplate: "subscriptions/{id}/resume",
        confirm: "Remove the scheduled period-end cancellation and resume billing?",
        successMessage: "Subscription resumed",
      },
    ],
  },
  {
    key: "contracts",
    title: "Contract",
    plural: "Contracts",
    group: "CRM",
    endpoint: "contracts",
    permissionFeature: "contracts",
    customFieldsType: "contracts",
    idKey: "id",
    icon: "document-lock-outline",
    color: "#475569",
    titleFields: ["subject"],
    subtitleFields: ["company", "datestart", "dateend"],
    searchFields: ["subject", "description", "company"],
    defaultSort: { field: "datestart", direction: "desc" },
    filterableFields: ["contract_type", "datestart", "dateend", "client", "subject"],
    statusField: "contract_type",
    statusOptions: contractStatusOptions,
    filterRules: {
      contract_type: { ruleType: "MultiSelectRule" },
      client: { operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "subject", label: "Subject", section: "Contract", required: true },
      { key: "client", label: "Customer", section: "Contract", type: "number", relation: "customer", required: true },
      { key: "datestart", label: "Start Date", section: "Dates", type: "date", required: true },
      { key: "dateend", label: "End Date", section: "Dates", type: "date" },
      { key: "contract_type", label: "Contract Type ID", section: "Contract", type: "number" },
      { key: "project_id", label: "Project ID", section: "Contract", type: "number" },
      { key: "contract_value", label: "Contract Value", section: "Contract", type: "money" },
      { key: "description", label: "Description", section: "Content", type: "multiline" },
      { key: "content", label: "Content", section: "Content", type: "multiline" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "contract" } },
      { key: "comments", title: "Comments", moduleKey: "contract_comments", endpointTemplate: "contracts/comments?contract_id={id}" },
      { key: "notes", title: "Notes", moduleKey: "contract_notes", endpointTemplate: "contracts/notes?contract_id={id}" },
    ],
    canUpdate: true,
    actions: [
      { key: "sign", title: "Mark as Signed", icon: "checkmark-done-circle-outline", endpointTemplate: "contracts/{id}/sign", confirm: "Mark this contract as signed?", successMessage: "Contract signed" },
      { key: "send", title: "Send to Client", icon: "paper-plane-outline", endpointTemplate: "contracts/{id}/send", confirm: "Email this contract to the client?", successMessage: "Contract sent" },
      { key: "renew", title: "Renew…", icon: "refresh-outline", endpointTemplate: "contracts/{id}/renew",
        fields: [
          { key: "date_start", label: "New Start Date", type: "date", required: true },
          { key: "date_end", label: "New End Date", type: "date", required: true },
          { key: "value", label: "Contract Value (optional)", type: "money" },
        ],
        successMessage: "Contract renewed",
      },
      { key: "unsign", title: "Clear Signature", icon: "close-circle-outline", endpointTemplate: "contracts/unsign", method: "POST",
        fields: [{ key: "id", label: "Contract ID", type: "number", required: true, defaultValue: "{id}" }],
        confirm: "Remove signed status from this contract?", successMessage: "Signature cleared", destructive: true },
    ],
  },
  {
    key: "tickets",
    title: "Ticket",
    plural: "Tickets",
    group: "Support",
    endpoint: "tickets",
    permissionFeature: "tickets",
    customFieldsType: "tickets",
    idKey: "ticketid",
    icon: "help-buoy-outline",
    color: "#DB2777",
    titleFields: ["subject"],
    subtitleFields: ["userid", "status", "priority"],
    searchFields: ["subject", "message", "email"],
    defaultSort: { field: "date", direction: "desc" },
    filterableFields: ["status", "priority", "department", "userid", "assigned", "service", "merged_ticket_id", "subject", "date"],
    statusField: "status",
    statusOptions: ticketStatusFilterOptions,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
      priority: { ruleType: "MultiSelectRule" },
      department: { operators: ["equal", "not_equal"] },
      userid: { operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "subject", label: "Subject", section: "Ticket", required: true },
      { key: "userid", label: "Customer", section: "Relation", type: "number", relation: "customer" },
      { key: "contactid", label: "Contact ID", section: "Relation", type: "number" },
      { key: "project_id", label: "Project ID", section: "Relation", type: "number" },
      { key: "department", label: "Department ID", section: "Ticket", type: "number", required: true },
      { key: "priority", label: "Priority", section: "Ticket", type: "number", relation: "ticket_priority" },
      { key: "service", label: "Service ID", section: "Ticket", type: "number" },
      { key: "status", label: "Status", section: "Ticket", type: "number", relation: "ticket_status" },
      { key: "email", label: "Email", section: "Requester", type: "email" },
      { key: "name", label: "Requester Name", section: "Requester" },
      { key: "message", label: "Message", section: "Content", type: "multiline", required: true },
      { key: "assigned", label: "Assigned Staff", section: "Ticket", type: "number", relation: "staff", readOnly: true },
      { key: "merged_ticket_id", label: "Merged Into Ticket", section: "Ticket", type: "number", readOnly: true },
      { key: "date", label: "Created", section: "Dates", type: "datetime", readOnly: true },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "ticket" } },
    ],
    actions: [
      { key: "reply", title: "Reply…", icon: "chatbubble-outline", endpointTemplate: "tickets/{id}/reply",
        fields: [
          { key: "content", label: "Reply Content", type: "multiline", required: true, placeholder: "Type your reply…" },
        ],
        successMessage: "Reply added",
      },
      { key: "change_status", title: "Change Status…", icon: "swap-horizontal-outline", endpointTemplate: "tickets/{id}/status", method: "PUT",
        fields: [{ key: "status", label: "Status", type: "number", relation: "ticket_status", required: true }],
        successMessage: "Status updated",
      },
      { key: "change_priority", title: "Change Priority…", icon: "flag-outline", endpointTemplate: "tickets/{id}/priority", method: "PUT",
        fields: [{ key: "priority", label: "Priority", type: "number", relation: "ticket_priority", required: true }],
        successMessage: "Priority updated",
      },
      { key: "assign", title: "Assign…", icon: "person-add-outline", endpointTemplate: "tickets/{id}/assign", method: "PUT",
        fields: [{ key: "assigned", label: "Assigned Staff", type: "number", relation: "staff", required: true }],
        successMessage: "Assigned",
      },
    ],
  },
  {
    key: "items",
    title: "Item",
    plural: "Items",
    group: "Sales",
    endpoint: "items",
    permissionFeature: "items",
    customFieldsType: "items",
    idKey: "itemid",
    icon: "cube-outline",
    color: "#4F46E5",
    titleFields: ["description", "name"],
    subtitleFields: ["rate", "unit", "group_name"],
    searchFields: ["description", "long_description", "commodity_code", "sku_code", "sku_name", "group_name"],
    filterableFields: ["description", "long_description", "rate", "unit", "group_id", "active", "commodity_code", "sku_code", "purchase_price"],
    filterRules: { group_id: { ruleType: "MultiSelectRule" }, active: { ruleType: "SelectRule" } },
    fields: itemFields,
  },
  {
    key: "staff",
    title: "Staff",
    plural: "Staff",
    group: "Admin",
    endpoint: "staffs",
    permissionFeature: "staff",
    customFieldsType: "staff",
    idKey: "staffid",
    icon: "people-circle-outline",
    color: "#64748B",
    titleFields: ["firstname", "lastname", "email"],
    subtitleFields: ["role", "phonenumber"],
    searchFields: ["firstname", "middlename", "lastname", "email", "phonenumber", "employee_code", "job_position_name", "role_name"],
    filterableFields: ["firstname", "lastname", "email", "phonenumber", "role", "active", "admin", "datecreated", "last_login", "job_position", "workplace", "employee_code"],
    filterRules: {
      role: { ruleType: "MultiSelectRule" }, active: { ruleType: "SelectRule" }, admin: { ruleType: "SelectRule" },
      job_position: { ruleType: "MultiSelectRule" }, workplace: { ruleType: "MultiSelectRule" },
    },
    fields: [
      { key: "firstname", label: "First Name", section: "Staff", required: true },
      { key: "middlename", label: "Middle Name", section: "Staff" },
      { key: "lastname", label: "Last Name", section: "Staff", required: true },
      { key: "email", label: "Email", section: "Staff", type: "email", required: true },
      { key: "password", label: "Password", section: "Staff", type: "password", createOnly: true, required: true },
      { key: "phonenumber", label: "Phone", section: "Staff", type: "phone" },
      { key: "role", label: "Role ID", section: "Staff", type: "number" },
      { key: "active", label: "Active", section: "Staff", type: "select", options: statusOptions },
      { key: "admin", label: "Administrator", section: "Staff", type: "boolean", readOnly: true },
      { key: "employee_code", label: "Employee Code", section: "Employment" },
      { key: "job_position", label: "Job Position ID", section: "Employment", type: "number" },
      { key: "job_position_name", label: "Job Position", section: "Employment", readOnly: true },
      { key: "workplace", label: "Workplace ID", section: "Employment", type: "number" },
      { key: "birthday", label: "Birthday", section: "Personal", type: "date" },
      { key: "sex", label: "Gender", section: "Personal" },
      { key: "datecreated", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "last_login", label: "Last Login", section: "Audit", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "calendar",
    title: "Calendar Event",
    plural: "Calendar",
    group: "Work",
    endpoint: "calendar",
    idKey: "eventid",
    icon: "calendar-outline",
    color: "#0284C7",
    titleFields: ["title"],
    subtitleFields: ["start", "end"],
    searchFields: ["title", "description"],
    filterableFields: ["title", "start", "end", "public"],
    fields: [
      { key: "title", label: "Title", section: "Event", required: true },
      { key: "description", label: "Description", section: "Event", type: "multiline" },
      { key: "start", label: "Start", section: "Dates", type: "datetime", required: true },
      { key: "end", label: "End", section: "Dates", type: "datetime" },
      { key: "public", label: "Public", section: "Event", type: "boolean" },
      { key: "reminder_before", label: "Reminder Before", section: "Reminder", type: "number", required: true, defaultValue: 30 },
      { key: "reminder_before_type", label: "Reminder Unit", section: "Reminder", type: "select", required: true, defaultValue: "minutes", options: [
        { label: "Minutes", value: "minutes" },
        { label: "Hours", value: "hours" },
        { label: "Days", value: "days" },
        { label: "Weeks", value: "weeks" },
      ] },
      { key: "color", label: "Color", section: "Display", defaultValue: "#28B8DA" },
      { key: "isstartnotified", label: "Reminder Sent", section: "Audit", type: "boolean", readOnly: true },
    ],
  },
  {
    key: "milestones",
    title: "Milestone",
    plural: "Milestones",
    group: "Work",
    endpoint: "milestones",
    idKey: "id",
    icon: "flag-outline",
    color: "#2563EB",
    titleFields: ["name"],
    subtitleFields: ["project_id", "due_date"],
    searchFields: ["name", "description", "project_name"],
    filterableFields: ["name", "project_id", "start_date", "due_date", "datecreated", "hide_from_customer"],
    filterRules: { project_id: { ruleType: "MultiSelectRule" }, hide_from_customer: { ruleType: "SelectRule" } },
    fields: [
      { key: "name", label: "Name", section: "Milestone", required: true },
      { key: "project_id", label: "Project ID", section: "Milestone", type: "number", required: true },
      { key: "project_name", label: "Project", section: "Milestone", readOnly: true },
      { key: "start_date", label: "Start Date", section: "Milestone", type: "date" },
      { key: "due_date", label: "Due Date", section: "Milestone", type: "date" },
      { key: "description", label: "Description", section: "Milestone", type: "multiline" },
      { key: "hide_from_customer", label: "Hide from Customer", section: "Visibility", type: "boolean" },
      { key: "total_tasks", label: "Tasks", section: "Progress", type: "number", readOnly: true },
      { key: "total_finished_tasks", label: "Completed Tasks", section: "Progress", type: "number", readOnly: true },
      { key: "datecreated", label: "Created", section: "Audit", type: "date", readOnly: true },
    ],
  },
  {
    key: "estimate_requests",
    title: "Estimate Request",
    plural: "Estimate Requests",
    group: "Sales",
    endpoint: "estimate_requests",
    permissionFeature: "estimate_request",
    idKey: "id",
    icon: "document-attach-outline",
    color: "#0F766E",
    titleFields: ["email", "id"],
    subtitleFields: ["assigned_name", "status_name", "date_added"],
    searchFields: ["email", "submission", "tags", "assigned_name", "status_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["id", "email", "assigned", "status", "date_added", "from_form_id"],
    statusField: "status",
    statusOptions: estimateRequestStatusOptions,
    filterRules: {
      assigned: { ruleType: "MultiSelectRule" },
      status: { ruleType: "MultiSelectRule" },
    },
    canCreate: false,
    fields: [
      { key: "email", label: "Email", section: "Request", type: "email", readOnly: true },
      { key: "submission_summary", label: "Submitted Information", section: "Request", type: "multiline", readOnly: true },
      { key: "tags", label: "Tags", section: "Management" },
      { key: "assigned", label: "Assigned Staff", section: "Management", type: "number", relation: "staff" },
      { key: "status", label: "Status", section: "Management", relation: "estimate_request_status", required: true },
      { key: "status_name", label: "Status Name", section: "Management", readOnly: true },
      { key: "form_name", label: "Source Form", section: "Source", readOnly: true },
      { key: "from_form_id", label: "Source Form ID", section: "Source", type: "number", readOnly: true, hideIfZero: true },
      { key: "date_added", label: "Submitted", section: "Source", type: "datetime", readOnly: true },
      { key: "last_status_change", label: "Last Status Change", section: "Source", type: "datetime", readOnly: true },
      { key: "date_estimated", label: "Converted", section: "Source", type: "datetime", readOnly: true },
      { key: "attachments_count", label: "Attachments", section: "Files", type: "number", readOnly: true },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "estimate_request" } },
    ],
    actions: [
      {
        key: "convert_estimate",
        availabilityKey: "convert_estimate",
        title: "Create Estimate",
        icon: "reader-outline",
        navigateTemplate: "/(tabs)/erp/estimates/new?clientid={customer_id}&estimate_request_id={id}",
        fields: [{ key: "customer_id", label: "Customer", type: "number", relation: "customer", required: true }],
        confirm: "Open a new estimate linked to this request?",
        requiresConfirm: true,
      },
      {
        key: "convert_proposal_customer",
        availabilityKey: "convert_proposal",
        title: "Proposal for Customer",
        icon: "newspaper-outline",
        navigateTemplate: "/(tabs)/erp/proposals/new?rel_type=customer&rel_id={customer_id}&estimate_request_id={id}",
        fields: [{ key: "customer_id", label: "Customer", type: "number", relation: "customer", required: true }],
        confirm: "Open a new customer proposal linked to this request?",
      },
      {
        key: "convert_proposal_lead",
        availabilityKey: "convert_proposal",
        title: "Proposal for Lead",
        icon: "trending-up-outline",
        navigateTemplate: "/(tabs)/erp/proposals/new?rel_type=lead&rel_id={lead_id}&estimate_request_id={id}",
        fields: [{ key: "lead_id", label: "Lead", type: "number", relation: "lead", required: true }],
        confirm: "Open a new lead proposal linked to this request?",
      },
    ],
  },
  {
    key: "estimate_request_statuses",
    title: "Estimate Request Status",
    plural: "Estimate Request Statuses",
    group: "Sales",
    endpoint: "estimate_requests/statuses",
    permissionFeature: "estimate_request",
    idKey: "id",
    icon: "flag-outline",
    color: "#0D9488",
    titleFields: ["name"],
    subtitleFields: ["statusorder", "flag"],
    searchFields: ["name", "flag"],
    filterableFields: ["id", "name", "statusorder", "color", "flag"],
    filterRules: { flag: { ruleType: "MultiSelectRule" } },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "name", label: "Name", section: "Status", required: true },
      { key: "color", label: "Color", section: "Status", required: true, placeholder: "#0D9488" },
      { key: "statusorder", label: "Order", section: "Status", type: "number" },
      { key: "flag", label: "System Flag", section: "System", readOnly: true },
    ],
  },
  {
    key: "estimate_request_forms",
    title: "Estimate Request Form",
    plural: "Estimate Request Forms",
    group: "Sales",
    endpoint: "estimate_requests/forms",
    permissionFeature: "estimate_request",
    idKey: "id",
    icon: "reader-outline",
    color: "#14B8A6",
    titleFields: ["name"],
    subtitleFields: ["language", "request_count", "dateadded"],
    searchFields: ["name", "language", "success_submit_msg"],
    filterableFields: ["id", "name", "status", "language", "recaptcha", "responsible", "notify_request_submitted", "dateadded"],
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
      language: { ruleType: "MultiSelectRule" },
      recaptcha: { ruleType: "SelectRule" },
      responsible: { ruleType: "MultiSelectRule" },
      notify_request_submitted: { ruleType: "SelectRule" },
    },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "name", label: "Name", section: "Form", required: true },
      { key: "status", label: "Default Status", section: "Form", relation: "estimate_request_status", required: true },
      { key: "language", label: "Language", section: "Form", defaultValue: "english" },
      { key: "recaptcha", label: "Use reCAPTCHA", section: "Form", type: "boolean" },
      { key: "form_data", label: "Form Fields (JSON)", section: "Fields", type: "json", required: true, placeholder: "Include a required field whose subtype is email" },
      { key: "submit_btn_name", label: "Submit Button Text", section: "Branding", defaultValue: "Submit" },
      { key: "submit_btn_bg_color", label: "Button Background", section: "Branding", defaultValue: "#84c529" },
      { key: "submit_btn_text_color", label: "Button Text Color", section: "Branding", defaultValue: "#ffffff" },
      { key: "submit_action", label: "After Submission", section: "Submission", type: "select", options: [{ label: "Show thank-you message", value: 0 }, { label: "Redirect to website", value: 1 }], defaultValue: 0 },
      { key: "success_submit_msg", label: "Success Message", section: "Submission", type: "multiline", defaultValue: "Thank you. Your request has been submitted." },
      { key: "submit_redirect_url", label: "Redirect URL", section: "Submission", type: "url" },
      { key: "responsible", label: "Responsible Staff", section: "Notifications", relation: "staff" },
      { key: "notify_request_submitted", label: "Notify on Submission", section: "Notifications", type: "boolean" },
      { key: "notify_type", label: "Notify", section: "Notifications", type: "select", options: [{ label: "Specific staff", value: "specific_staff" }, { label: "Staff with roles", value: "roles" }, { label: "Assigned user", value: "assigned" }] },
      { key: "notify_ids", label: "Notification Staff / Role IDs", section: "Notifications", type: "json" },
      { key: "form_key", label: "Public Form Key", section: "System", readOnly: true },
      { key: "request_count", label: "Submissions", section: "System", type: "number", readOnly: true },
      { key: "dateadded", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "announcements",
    title: "Announcement",
    plural: "Announcements",
    group: "Utilities",
    endpoint: "announcements_api",
    idKey: "announcementid",
    icon: "megaphone-outline",
    color: "#EA580C",
    titleFields: ["name"],
    subtitleFields: ["userid", "dateadded"],
    searchFields: ["name", "message"],
    defaultSort: { field: "dateadded", direction: "desc" },
    filterableFields: ["name", "dateadded", "showname", "showtostaff", "showtousers"],
    filterRules: {
      showname: { ruleType: "SelectRule" },
      showtostaff: { ruleType: "SelectRule" },
      showtousers: { ruleType: "SelectRule" },
    },
    adminOnlyMutations: true,
    fields: [
      { key: "name", label: "Title", section: "Announcement", required: true },
      { key: "message", label: "Message", section: "Announcement", type: "multiline", required: true },
      { key: "showname", label: "Show Author Name", section: "Audience", type: "boolean" },
      { key: "showtostaff", label: "Show to Staff", section: "Audience", type: "boolean", defaultValue: true },
      { key: "showtousers", label: "Show to Customers", section: "Audience", type: "boolean" },
      { key: "userid", label: "Author", section: "Activity", readOnly: true },
      { key: "dateadded", label: "Published", section: "Activity", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "todos",
    title: "To-Do",
    plural: "My To-Dos",
    group: "Work",
    endpoint: "todo_api",
    idKey: "todoid",
    icon: "checkbox-outline",
    color: "#7C3AED",
    titleFields: ["description"],
    subtitleFields: ["date", "finished"],
    searchFields: ["description"],
    defaultSort: { field: "item_order", direction: "asc" },
    filterableFields: ["description", "date", "finished", "dateadded", "datefinished"],
    supportsAdvancedFilters: true,
    sortableFields: ["todoid", "item_order", "date", "finished", "dateadded", "datefinished"],
    statusField: "finished",
    statusOptions: [
      { label: "Open", value: "0", color: "#F59E0B" },
      { label: "Completed", value: "1", color: "#10B981" },
    ],
    filterRules: {
      finished: { ruleType: "MultiSelectRule" },
    },
    fields: [
      { key: "description", label: "Description", section: "To-Do", type: "multiline", required: true },
      { key: "date", label: "Due Date", section: "To-Do", type: "date" },
      { key: "finished", label: "Status", section: "Status", type: "select", readOnly: true, options: [
        { label: "Open", value: "0" },
        { label: "Completed", value: "1" },
      ] },
      { key: "dateadded", label: "Created", section: "Activity", type: "datetime", readOnly: true },
      { key: "datefinished", label: "Completed", section: "Activity", type: "datetime", readOnly: true },
    ],
    actions: [
      {
        key: "mark_complete",
        title: "Mark Complete",
        icon: "checkmark-circle-outline",
        endpointTemplate: "todo_api/{id}/status",
        method: "PUT",
        body: { finished: 1 },
        successMessage: "To-do completed",
      },
      {
        key: "reopen",
        title: "Reopen",
        icon: "refresh-outline",
        endpointTemplate: "todo_api/{id}/status",
        method: "PUT",
        body: { finished: 0 },
        successMessage: "To-do reopened",
      },
    ],
  },
  {
    key: "technical_inquiries",
    title: "Technical Inquiry",
    plural: "Technical Inquiries",
    group: "PRIZM",
    endpoint: "technical_inquiries",
    permissionFeature: "technicalinquiries",
    idKey: "id",
    icon: "construct-outline",
    color: "#0D9488",
    titleFields: ["title", "inquiry_code"],
    subtitleFields: ["rel_type", "rel_id", "status", "dateadded"],
    searchFields: ["title", "description", "inquiry_code"],
    defaultSort: { field: "dateadded", direction: "desc" },
    filterableFields: ["inquiry_code", "title", "status_id", "rel_type", "rel_id", "responsible_id", "staff_id", "dateadded"],
    filterRules: {
      status_id: { ruleType: "MultiSelectRule" },
      rel_type: { ruleType: "SelectRule", operators: ["equal", "not_equal"] },
      rel_id: { ruleType: "SelectRule", operators: ["equal", "not_equal"] },
      responsible_id: { ruleType: "SelectRule", operators: ["equal", "not_equal"] },
      staff_id: { ruleType: "SelectRule", operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "inquiry_code", label: "Inquiry Code", section: "Inquiry", readOnly: true },
      { key: "title", label: "Title", section: "Inquiry", required: true },
      { key: "description", label: "Description", section: "Inquiry", type: "multiline" },
      { key: "staff_id", label: "Created By", section: "Team", type: "number", relation: "staff", readOnly: true },
      { key: "responsible_id", label: "Responsible", section: "Team", type: "number", relation: "staff" },
      { key: "rel_type", label: "Related Type", section: "Relation", type: "select", required: true, options: [
        { label: "Project", value: "project" }, { label: "Opportunity", value: "opportunity" },
      ] },
      { key: "rel_id", label: "Related Record ID", section: "Relation", type: "number", required: true },
      { key: "project_type", label: "Project Type", section: "Classification" },
      { key: "project_field", label: "Project Field", section: "Classification" },
      { key: "status_id", label: "Status", section: "Inquiry", type: "select", options: [
        { label: "Draft", value: 0 }, { label: "Submitted", value: 1 },
      ], readOnly: true },
      { key: "dateadded", label: "Created", section: "Audit", type: "datetime", readOnly: true },
    ],
    tabs: [
      { key: "items", title: "Items", moduleKey: "technical_items", endpointTemplate: "technical_inquiries/items/{id}", createDefaults: { inquiry_id: "{id}" } },
    ],
  },
  {
    key: "technical_items",
    title: "Technical Item",
    plural: "Technical Items",
    group: "PRIZM",
    endpoint: "technical_inquiries/items",
    permissionFeature: "technicalinquiries",
    idKey: "id",
    icon: "layers-outline",
    color: "#0D9488",
    titleFields: ["item_name", "item_code", "item_id"],
    subtitleFields: ["qty", "unit_name", "require_rfq"],
    fields: [
      { key: "inquiry_id", label: "Inquiry ID", section: "Inquiry", type: "number", required: true, createOnly: true },
      { key: "item_id", label: "Catalog Item", section: "Item", type: "number", relation: "budget_item", required: true, createOnly: true },
      { key: "item_code", label: "Item Code", section: "Item", readOnly: true },
      { key: "item_name", label: "Item Name", section: "Item", readOnly: true },
      { key: "item_long_name", label: "Description", section: "Item", type: "multiline", readOnly: true },
      { key: "qty", label: "Quantity", section: "Item", type: "number", required: true, defaultValue: 1 },
      { key: "unit_id", label: "Unit", section: "Item", type: "number", relation: "budget_unit" },
      { key: "unit_name", label: "Unit", section: "Item", readOnly: true },
      { key: "milestone_id", label: "Milestone ID", section: "Relation", type: "number" },
      { key: "require_rfq", label: "Requires RFQ", section: "Workflow", type: "boolean" },
      { key: "ai_classified", label: "AI Classified", section: "Workflow", type: "boolean", createOnly: true },
      { key: "notes", label: "Notes", section: "Item", type: "multiline" },
      { key: "specs", label: "Specifications", section: "Specifications", type: "json", readOnly: true },
    ],
    canOpenDetail: false,
  },
  {
    key: "cost_calculations",
    title: "Calculation Sheet",
    plural: "Calculation Sheets",
    group: "PRIZM",
    endpoint: "cost_calculation_api",
    permissionFeature: "boq_tree",
    idKey: "id",
    icon: "grid-outline",
    color: "#EA580C",
    titleFields: ["title", "rel_name", "id"],
    subtitleFields: ["rel_type", "version_label", "total_value", "currency"],
    searchFields: ["title", "rel_name", "rel_type", "version_label", "currency"],
    clientSideSearch: true,
    unpaginated: true,
    detailRootKey: "snapshot",
    fields: [
      { key: "rel_type", label: "Related Type", section: "Relation", type: "select", required: true, options: [
        { label: "Opportunity", value: "opportunity" },
        { label: "Project", value: "project" },
      ] },
      { key: "rel_id", label: "Related Record ID", section: "Relation", type: "number", required: true },
      { key: "rel_name", label: "Related Record", section: "Relation" },
      { key: "title", label: "Title", section: "Calculation", required: true, placeholder: "e.g. Initial estimate" },
      { key: "version_label", label: "Version", section: "Calculation" },
      { key: "visibility", label: "Visibility", section: "Calculation", type: "select", defaultValue: "internal", options: [
        { label: "Internal", value: "internal" },
        { label: "External", value: "external" },
      ] },
      { key: "currency", label: "Currency", section: "Commercial", defaultValue: "USD" },
      { key: "total_value", label: "Total Value", section: "Commercial", type: "money", readOnly: true },
      { key: "notes", label: "Notes", section: "Calculation", type: "multiline" },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "created_by", label: "Created By", section: "Audit", type: "number", relation: "staff", readOnly: true },
      { key: "updated_at", label: "Updated", section: "Audit", type: "datetime", readOnly: true },
      { key: "updated_by", label: "Updated By", section: "Audit", type: "number", relation: "staff", readOnly: true },
    ],
    tabs: [{
      key: "items",
      title: "Line Items",
      moduleKey: "cost_calculation_items",
      embeddedField: "nodes",
      createEndpointTemplate: "cost_calculation_api/{id}/items",
    }],
  },
  {
    key: "cost_calculation_items",
    title: "Calculation Line",
    plural: "Calculation Lines",
    group: "PRIZM",
    endpoint: "cost_calculation_api/items",
    permissionFeature: "boq_tree",
    idKey: "id",
    icon: "reorder-four-outline",
    color: "#EA580C",
    titleFields: ["name", "item_code", "node_key"],
    subtitleFields: ["qty", "unit_name", "unit_rate", "total_amount"],
    fields: [
      { key: "snapshot_id", label: "Calculation ID", section: "Calculation", type: "number", readOnly: true },
      { key: "name", label: "Line Name", section: "Line", required: true },
      { key: "item_code", label: "Item Code", section: "Line" },
      { key: "row_type", label: "Line Type", section: "Structure", type: "select", defaultValue: "item", options: [
        { label: "BOQ", value: "boq" },
        { label: "Kit", value: "kit" },
        { label: "Item", value: "item" },
        { label: "Sub-item", value: "sub" },
      ] },
      { key: "node_key", label: "Node Key", section: "Structure" },
      { key: "parent_key", label: "Parent Key", section: "Structure" },
      { key: "depth", label: "Depth", section: "Structure", type: "number", defaultValue: 0 },
      { key: "sort_order", label: "Order", section: "Structure", type: "number" },
      { key: "source_id", label: "Source ID", section: "Source", type: "number" },
      { key: "source_table", label: "Source Table", section: "Source" },
      { key: "qty", label: "Quantity", section: "Cost", type: "number", defaultValue: 1 },
      { key: "unit_name", label: "Unit", section: "Cost" },
      { key: "unit_rate", label: "Unit Rate", section: "Cost", type: "money", defaultValue: 0 },
      { key: "total_amount", label: "Total Amount", section: "Cost", type: "money" },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "created_by", label: "Created By", section: "Audit", type: "number", relation: "staff", readOnly: true },
    ],
    canOpenDetail: false,
  },
  {
    key: "rfq2",
    title: "RFQ",
    plural: "RFQ Pipeline",
    group: "PRIZM",
    endpoint: "rfq2_api",
    permissionFeature: "rfq2",
    idKey: "id",
    icon: "flash-outline",
    color: "#7C3AED",
    titleFields: ["code", "title"],
    subtitleFields: ["stage", "items_count", "suppliers_count", "due_date"],
    searchFields: ["code", "title", "description", "notes", "remarks"],
    filterableFields: ["code", "title", "stage", "rel_type", "rel_id", "send_from", "currency", "due_date", "assigned_to", "created_by", "created_at", "updated_at"],
    statusField: "stage",
    statusOptions: [
      { label: "Intake", value: "intake", color: "#64748B" },
      { label: "Compose", value: "compose", color: "#2563EB" },
      { label: "Match", value: "match", color: "#7C3AED" },
      { label: "Approve", value: "approve", color: "#D97706" },
      { label: "Sent", value: "sent", color: "#0891B2" },
      { label: "Tracking", value: "tracking", color: "#0D9488" },
      { label: "Received", value: "received", color: "#059669" },
      { label: "Compared", value: "compared", color: "#4F46E5" },
      { label: "Awarded", value: "awarded", color: "#16A34A" },
      { label: "Closed", value: "closed", color: "#475569" },
      { label: "Hold", value: "hold", color: "#DC2626" },
      { label: "Monitor", value: "monitor", color: "#9333EA" },
    ],
    filterRules: {
      stage: { ruleType: "MultiSelectRule" },
      rel_type: { ruleType: "MultiSelectRule" },
      send_from: { ruleType: "MultiSelectRule" },
      currency: { ruleType: "MultiSelectRule" },
      assigned_to: { ruleType: "MultiSelectRule" },
      created_by: { ruleType: "MultiSelectRule" },
    },
    fields: [
      { key: "code", label: "RFQ Code", section: "RFQ", readOnly: true },
      { key: "title", label: "Title", section: "RFQ", required: true },
      { key: "stage", label: "Pipeline Stage", section: "RFQ", type: "select", readOnly: true, options: [
        { label: "Intake", value: "intake" }, { label: "Compose", value: "compose" },
        { label: "Match", value: "match" }, { label: "Approve", value: "approve" },
        { label: "Sent", value: "sent" }, { label: "Tracking", value: "tracking" },
        { label: "Received", value: "received" }, { label: "Compared", value: "compared" },
        { label: "Awarded", value: "awarded" }, { label: "Closed", value: "closed" },
        { label: "Hold", value: "hold" }, { label: "Monitor", value: "monitor" },
      ] },
      { key: "description", label: "Description", section: "Content", type: "multiline" },
      { key: "notes", label: "Notes", section: "Content", type: "multiline" },
      { key: "remarks", label: "Remarks", section: "Content", type: "multiline" },
      { key: "rel_type", label: "Related Type", section: "Relation", type: "select", options: [
        { label: "Opportunity", value: "opportunity" }, { label: "Project", value: "project" },
        { label: "Tender", value: "tender" }, { label: "Inquiry", value: "inquiry" },
      ] },
      { key: "rel_id", label: "Related Record ID", section: "Relation", type: "number" },
      { key: "send_from", label: "Sender Mailbox", section: "Delivery", type: "select", required: true, defaultValue: "prizm", options: [
        { label: "Prizm", value: "prizm" }, { label: "Al Manshour", value: "almanshour" },
      ] },
      { key: "currency", label: "Currency", section: "Delivery", defaultValue: "AED", required: true },
      { key: "due_date", label: "Due Date", section: "Delivery", type: "date" },
      { key: "assigned_to", label: "Assigned To", section: "Team", relation: "staff", type: "number" },
      { key: "embed_table", label: "Embed Item Table", section: "Email Options", type: "boolean", defaultValue: true },
      { key: "hide_address", label: "Hide Address", section: "Email Options", type: "boolean" },
      { key: "allow_alternatives", label: "Allow Alternatives", section: "Email Options", type: "boolean" },
      { key: "allow_breakdown", label: "Allow Price Breakdown", section: "Email Options", type: "boolean" },
      { key: "items_count", label: "Items", section: "Summary", type: "number", readOnly: true },
      { key: "suppliers_count", label: "Suppliers", section: "Summary", type: "number", readOnly: true },
      { key: "created_by", label: "Created By", section: "Audit", relation: "staff", type: "number", readOnly: true },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "Audit", type: "datetime", readOnly: true },
      { key: "sent_at", label: "Sent", section: "Audit", type: "datetime", readOnly: true },
      { key: "closed_at", label: "Closed", section: "Audit", type: "datetime", readOnly: true },
    ],
    tabs: [
      { key: "items", title: "Items", moduleKey: "rfq2_items", endpointTemplate: "rfq2_api/{id}/items", canCreate: false },
      { key: "suppliers", title: "Suppliers", moduleKey: "rfq2_suppliers", endpointTemplate: "rfq2_api/{id}/suppliers", canCreate: false },
    ],
    actions: [
      {
        key: "attach_supplier", title: "Attach Supplier…", icon: "business-outline", endpointTemplate: "rfq2_api/{id}/suppliers",
        fields: [
          { key: "supplier_id", label: "Supplier ID", type: "number", required: true },
          { key: "contact_id", label: "Supplier Contact ID", type: "number", required: true },
          { key: "add_as_cc", label: "Add Different Contact as CC", type: "boolean" },
          { key: "replace_contact", label: "Replace Existing Primary Contact", type: "boolean" },
        ],
        confirm: "The supplier contact must be active and have a reachable email address.", successMessage: "Supplier attached",
      },
      {
        key: "approve_drafts", title: "Approve Eligible Drafts", icon: "checkmark-done-outline", endpointTemplate: "rfq2_api/{id}/approve_drafts",
        confirm: "Approve all eligible supplier email drafts for this RFQ?", successMessage: "Eligible drafts approved",
      },
      {
        key: "add_manual_item", title: "Add Manual Exception…", icon: "add-circle-outline", endpointTemplate: "rfq2_api/{id}/items",
        fields: [
          { key: "item_name", label: "Item Name", required: true },
          { key: "item_long_name", label: "Detailed Description", type: "multiline" },
          { key: "qty", label: "Quantity", type: "number", required: true, defaultValue: 1 },
          { key: "uom", label: "Unit of Measure" },
          { key: "catalog_search_query", label: "Catalog Search Performed", required: true, placeholder: "Exact search terms used" },
          { key: "catalog_no_match_confirmed", label: "Confirm No Catalog Match", type: "boolean", required: true },
          { key: "confirmed_no_technical_inquiry_source", label: "Confirm No Technical Inquiry Source", type: "boolean", required: true },
          { key: "manual_override_reason", label: "Override Reason", type: "multiline", required: true },
        ],
        confirm: "Manual lines are exceptions. Confirm the catalog and Technical Inquiry checks below.", successMessage: "Manual item added",
      },
      {
        key: "pull_catalog", title: "Add Catalog Item…", icon: "library-outline", endpointTemplate: "rfq2_api/{id}/pull_catalog",
        fields: [
          { key: "catalog_item_id", label: "Catalog Item ID", type: "number", required: true },
          { key: "qty", label: "Quantity", type: "number", required: true, defaultValue: 1 },
        ], successMessage: "Catalog item added",
      },
      {
        key: "pull_inquiry", title: "Pull Technical Inquiry Items…", icon: "construct-outline", endpointTemplate: "rfq2_api/{id}/pull_inquiry",
        fields: [
          { key: "technical_inquiry_detail_ids", label: "Technical Inquiry Detail IDs", required: true, submitAsArray: true, placeholder: "Comma-separated IDs" },
        ], successMessage: "Technical Inquiry items added",
      },
      {
        key: "pull_kit", title: "Expand Resource Kit…", icon: "cube-outline", endpointTemplate: "rfq2_api/{id}/pull_kit",
        fields: [{ key: "kit_id", label: "Resource Kit ID", type: "number", required: true }], successMessage: "Resource kit expanded",
      },
      {
        key: "send", title: "Review & Send Approved Drafts", icon: "paper-plane-outline",
        preflightEndpointTemplate: "rfq2_api/{id}/preflight", endpointTemplate: "rfq2_api/{id}/send",
        confirm: "Review the exact sender, recipients, CCs, skipped entries, and batch size before confirming.",
        successMessage: "Approved RFQ drafts sent",
      },
    ],
  },
  {
    key: "rfq2_items",
    title: "RFQ Item",
    plural: "RFQ Items",
    group: "PRIZM",
    endpoint: "rfq2_api/items",
    permissionFeature: "rfq2",
    idKey: "id",
    icon: "list-outline",
    color: "#7C3AED",
    titleFields: ["item_code", "item_name"],
    subtitleFields: ["rfq_code", "qty", "uom", "source_type"],
    searchFields: ["item_code", "item_name", "item_long_name", "category_name", "rfq_code", "rfq_title"],
    filterableFields: ["rfq_id", "rfq_code", "item_name", "source_type", "qty", "uom", "category_name", "include_next_send", "created_at"],
    filterRules: { source_type: { ruleType: "MultiSelectRule" }, include_next_send: { ruleType: "SelectRule" } },
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    fields: [
      { key: "rfq_id", label: "RFQ ID", section: "RFQ", type: "number", readOnly: true },
      { key: "rfq_code", label: "RFQ Code", section: "RFQ", readOnly: true },
      { key: "rfq_stage", label: "RFQ Stage", section: "RFQ", readOnly: true },
      { key: "item_code", label: "Catalog Code", section: "Item", readOnly: true },
      { key: "item_name", label: "Item", section: "Item", readOnly: true },
      { key: "item_long_name", label: "Description", section: "Item", type: "multiline", readOnly: true },
      { key: "qty", label: "Quantity", section: "Item", type: "number", readOnly: true },
      { key: "uom", label: "Unit", section: "Item", readOnly: true },
      { key: "source_type", label: "Source", section: "Provenance", readOnly: true },
      { key: "source_inquiry_id", label: "Inquiry ID", section: "Provenance", type: "number", readOnly: true },
      { key: "source_item_id", label: "Source Item ID", section: "Provenance", type: "number", readOnly: true },
      { key: "source_detail_id", label: "Source Detail ID", section: "Provenance", type: "number", readOnly: true },
      { key: "category_name", label: "Category", section: "Classification", readOnly: true },
      { key: "specs_json", label: "Specifications", section: "Specifications", type: "json", readOnly: true },
      { key: "include_next_send", label: "Included in Next Send", section: "Delivery", type: "boolean", readOnly: true },
      { key: "sent_at", label: "Sent", section: "Delivery", type: "datetime", readOnly: true },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "rfq2_suppliers",
    title: "RFQ Supplier",
    plural: "RFQ Suppliers",
    group: "PRIZM",
    endpoint: "rfq2_api/suppliers",
    permissionFeature: "rfq2",
    idKey: "id",
    icon: "business-outline",
    color: "#7C3AED",
    titleFields: ["company", "contact_email"],
    subtitleFields: ["rfq_code", "status", "draft_status", "delivery_status"],
    searchFields: ["company", "firstname", "lastname", "contact_email", "rfq_code", "rfq_title"],
    filterableFields: ["rfq_id", "rfq_code", "supplier_id", "company", "contact_email", "status", "delivery_status", "draft_status", "sent_at", "responded_at", "created_at"],
    filterRules: { status: { ruleType: "MultiSelectRule" }, delivery_status: { ruleType: "MultiSelectRule" }, draft_status: { ruleType: "MultiSelectRule" } },
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    fields: [
      { key: "rfq_id", label: "RFQ ID", section: "RFQ", type: "number", readOnly: true },
      { key: "rfq_code", label: "RFQ Code", section: "RFQ", readOnly: true },
      { key: "rfq_stage", label: "RFQ Stage", section: "RFQ", readOnly: true },
      { key: "company", label: "Supplier", section: "Recipient", readOnly: true },
      { key: "supplier_id", label: "Supplier ID", section: "Recipient", type: "number", readOnly: true },
      { key: "contact_id", label: "Contact ID", section: "Recipient", type: "number", readOnly: true },
      { key: "firstname", label: "First Name", section: "Recipient", readOnly: true },
      { key: "lastname", label: "Last Name", section: "Recipient", readOnly: true },
      { key: "contact_email", label: "Email", section: "Recipient", type: "email", readOnly: true },
      { key: "email_reachability", label: "Email Reachability", section: "Recipient", readOnly: true },
      { key: "status", label: "Supplier Status", section: "Delivery", readOnly: true },
      { key: "draft_status", label: "Draft Status", section: "Delivery", readOnly: true },
      { key: "delivery_status", label: "Delivery Status", section: "Delivery", readOnly: true },
      { key: "draft_subject", label: "Email Subject", section: "Draft", readOnly: true },
      { key: "draft_email", label: "Draft Body", section: "Draft", type: "multiline", readOnly: true },
      { key: "draft_cc", label: "Supplier CC", section: "Draft", type: "json", readOnly: true },
      { key: "recommended_by", label: "Recommended By", section: "Matching", readOnly: true },
      { key: "match_score", label: "Match Score", section: "Matching", type: "number", readOnly: true },
      { key: "match_reason", label: "Match Reason", section: "Matching", type: "multiline", readOnly: true },
      { key: "sent_at", label: "Sent", section: "Activity", type: "datetime", readOnly: true },
      { key: "responded_at", label: "Responded", section: "Activity", type: "datetime", readOnly: true },
      { key: "reminded_at", label: "Reminded", section: "Activity", type: "datetime", readOnly: true },
      { key: "reminder_count", label: "Reminders", section: "Activity", type: "number", readOnly: true },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "Audit", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "cost_center_members",
    title: "Cost Center Member",
    plural: "Cost Center Members",
    group: "Finance",
    endpoint: "cost_centers_api/members",
    permissionFeature: "costcenters",
    permissionCapabilities: { create: "edit", delete: "edit" },
    idKey: "id",
    icon: "people-outline",
    color: "#EA580C",
    titleFields: ["staff_name", "member_id"],
    subtitleFields: ["email"],
    fields: [
      { key: "costcenter_id", label: "Cost Center", section: "Assignment", type: "number", hidden: true, required: true },
      { key: "member_id", label: "Staff Member", section: "Assignment", relation: "staff", required: true },
      { key: "staff_name", label: "Name", section: "Staff", readOnly: true },
      { key: "email", label: "Email", section: "Staff", type: "email", readOnly: true },
    ],
    canOpenDetail: false,
    canUpdate: false,
  },
  {
    key: "cost_center_supervisors",
    title: "Cost Center Supervisor",
    plural: "Cost Center Supervisors",
    group: "Finance",
    endpoint: "cost_centers_api/supervisors",
    permissionFeature: "costcenters",
    permissionCapabilities: { create: "edit", delete: "edit" },
    idKey: "id",
    icon: "person-circle-outline",
    color: "#EA580C",
    titleFields: ["staff_name", "supervisor_id"],
    subtitleFields: ["email"],
    fields: [
      { key: "costcenter_id", label: "Cost Center", section: "Assignment", type: "number", hidden: true, required: true },
      { key: "supervisor_id", label: "Supervisor", section: "Assignment", relation: "staff", required: true },
      { key: "staff_name", label: "Name", section: "Staff", readOnly: true },
      { key: "email", label: "Email", section: "Staff", type: "email", readOnly: true },
    ],
    canOpenDetail: false,
    canUpdate: false,
  },
  {
    key: "cost_center_activity",
    title: "Cost Center Activity",
    plural: "Cost Center Activity",
    group: "Finance",
    endpoint: "cost_centers_api/activity",
    permissionFeature: "costcenters",
    idKey: "id",
    icon: "pulse-outline",
    color: "#EA580C",
    titleFields: ["description"],
    subtitleFields: ["full_name", "date"],
    fields: [
      { key: "description", label: "Activity", section: "Event", readOnly: true },
      { key: "additional_data", label: "Details", section: "Event", readOnly: true },
      { key: "full_name", label: "By", section: "Audit", readOnly: true },
      { key: "date", label: "Date", section: "Audit", type: "datetime", readOnly: true },
    ],
    canCreate: false,
    canOpenDetail: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "tenders",
    title: "Tender",
    plural: "Tenders",
    group: "PRIZM",
    endpoint: "tenders_api",
    permissionFeature: "tenders",
    idKey: "id",
    icon: "briefcase-outline",
    color: "#9333EA",
    titleFields: ["title", "name", "tender_number"],
    subtitleFields: ["source", "closing_date", "status"],
    searchFields: ["tender_number", "title", "name", "tender_description", "client", "source"],
    defaultSort: { field: "closing_date", direction: "asc" },
    filterableFields: ["status", "closing_date", "source"],
    statusField: "status",
    statusOptions: tenderStatusFilterOptions,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
    },
    fields: [
      { key: "tender_description", label: "Description", section: "Tender", type: "multiline", required: true },
      { key: "tender_number", label: "Tender Number", section: "Tender" },
      { key: "source", label: "Source", section: "Tender" },
      { key: "client", label: "Client", section: "Tender" },
      { key: "floating_date", label: "Floating Date", section: "Dates", type: "date" },
      { key: "closing_date", label: "Closing Date", section: "Dates", type: "date" },
      { key: "status", label: "Status", section: "Tender", type: "select", options: tenderStatusFilterOptions },
    ],
    tabs: [
      { key: "boq", title: "BOQ", moduleKey: "tender_boq", endpointTemplate: "tenders_api/boq/{id}", createDefaults: { tender_id: "{id}" } },
      { key: "requirements", title: "Requirements", moduleKey: "tender_requirements", endpointTemplate: "tenders_api/requirements/{id}", createDefaults: { tender_id: "{id}" } },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "tender" } },
    ],
    actions: [
      {
        key: "set_status",
        title: "Change Status…",
        icon: "swap-horizontal-outline",
        endpointTemplate: "tenders_api/{id}/status",
        method: "PUT",
        fields: [
          { key: "status", label: "Status", type: "select", required: true, options: tenderStatusFilterOptions },
        ],
        successMessage: "Status updated",
      },
      {
        key: "convert",
        title: "Convert to Opportunity…",
        icon: "arrow-forward-circle-outline",
        endpointTemplate: "tenders_api/{id}/convert",
        method: "POST",
        fields: [
          { key: "responsible_id", label: "Responsible Employee", type: "number", relation: "staff", required: true },
          { key: "opportunity_field", label: "Field", type: "select", defaultValue: "0", options: [
            { label: "Civil", value: "0" }, { label: "Mechanical", value: "1" }, { label: "Electrical", value: "2" },
          ] },
          { key: "priority", label: "Priority", type: "select", defaultValue: "1", options: [
            { label: "High", value: "0" }, { label: "Medium", value: "1" }, { label: "Low", value: "2" },
          ] },
          { key: "opportunity_job_type", label: "Job Type", type: "select", defaultValue: "0", options: [
            { label: "Install", value: "0" }, { label: "Supply & Install", value: "1" }, { label: "Supply", value: "2" },
          ] },
        ],
        confirm: "Convert this tender to an opportunity and carry its linked data?",
        successMessage: "Tender converted to an opportunity",
      },
    ],
  },
  {
    key: "tender_boq",
    title: "Tender BOQ",
    plural: "Tender BOQ",
    group: "PRIZM",
    endpoint: "tenders_api/boq",
    idKey: "id",
    icon: "list-outline",
    color: "#9333EA",
    titleFields: ["item_description", "item_number", "line_number"],
    subtitleFields: ["quantity", "uom", "unit_price", "currency"],
    canOpenDetail: false,
    canUpdate: false,
    canDelete: false,
    fields: [
      { key: "tender_id", label: "Tender ID", type: "number", required: true },
      { key: "line_number", label: "Line Number", section: "Item" },
      { key: "item_number", label: "Item Number", section: "Item" },
      { key: "item_description", label: "Description", section: "Item", type: "multiline", required: true },
      { key: "category", label: "Category", section: "Item" },
      { key: "uom", label: "Unit of Measure", section: "Quantity" },
      { key: "quantity", label: "Quantity", section: "Quantity", type: "number" },
      { key: "unit_price", label: "Unit Price", section: "Pricing", type: "money" },
      { key: "total_price", label: "Total Price", section: "Pricing", type: "money" },
      { key: "currency", label: "Currency", section: "Pricing" },
      { key: "target_price", label: "Target Price", section: "Pricing", type: "money" },
      { key: "current_price", label: "Current Price", section: "Pricing", type: "money" },
      { key: "specification", label: "Specification", section: "Details", type: "multiline" },
      { key: "mandatory_list", label: "Mandatory List", section: "Details" },
      { key: "construction_code", label: "Construction Code", section: "Details" },
      { key: "ship_to_address", label: "Ship-to Address", section: "Delivery", type: "multiline" },
      { key: "need_by_start_date", label: "Need-by Start", section: "Delivery", type: "date" },
      { key: "need_by_date", label: "Need-by Date", section: "Delivery", type: "date" },
      { key: "negotiation_id", label: "Negotiation ID", section: "Source" },
      { key: "page_number", label: "Page Number", section: "Source" },
      { key: "table_number", label: "Table Number", section: "Source" },
      { key: "boq_group_name", label: "BOQ Group", section: "Source" },
      { key: "boq_group_index", label: "Group Order", section: "Source", type: "number" },
      { key: "metadata", label: "Metadata", section: "Source", type: "multiline" },
    ],
  },
  {
    key: "tender_requirements",
    title: "Tender Requirement",
    plural: "Tender Requirements",
    group: "PRIZM",
    endpoint: "tenders_api/requirements",
    idKey: "id",
    icon: "clipboard-outline",
    color: "#9333EA",
    titleFields: ["requirement", "title"],
    subtitleFields: ["status"],
    canOpenDetail: false,
    canUpdate: false,
    canDelete: false,
    fields: [
      { key: "tender_id", label: "Tender ID", type: "number", required: true },
      { key: "requirement", label: "Requirement", type: "multiline", required: true },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "notes", label: "Notes", type: "multiline" },
    ],
  },
  {
    key: "tender_risks",
    title: "Tender Risk",
    plural: "Tender Risks",
    group: "PRIZM",
    endpoint: "tenders_api/risks",
    idKey: "id",
    icon: "warning-outline",
    color: "#9333EA",
    titleFields: ["risk", "title"],
    subtitleFields: ["impact", "status"],
    canCreate: false,
    canOpenDetail: false,
    canUpdate: false,
    canDelete: false,
    fields: [
      { key: "tender_id", label: "Tender ID", type: "number", required: true },
      { key: "risk", label: "Risk", type: "multiline", required: true },
      { key: "impact", label: "Impact" },
      { key: "mitigation", label: "Mitigation", type: "multiline" },
      { key: "status", label: "Status" },
    ],
  },
  {
    key: "opportunities",
    title: "Opportunity",
    plural: "Opportunities",
    group: "PRIZM",
    endpoint: "opportunities_api/data",
    detailEndpoint: "opportunities_api/data",
    permissionFeature: "opportunities",
    idKey: "opportunity_id",
    icon: "trending-up-outline",
    color: "#22C55E",
    titleFields: ["opportunity_name", "opportunity_code"],
    subtitleFields: ["company", "stage", "status"],
    searchFields: ["opportunity_name", "opportunity_code", "company", "description"],
    filterableFields: [
      "opportunity_code",
      "partner_reference",
      "opportunity_name",
      "client",
      "opportunity_status",
      "start_date",
      "end_date",
      "expiry_date",
      "approval_status",
      "responsible_employee",
      "opportunity_field",
      "opportunity_job_type",
    ],
    statusField: "stage",
    statusOptions: opportunityStageFilterOptions,
    filterRules: {
      stage: { ruleType: "MultiSelectRule" },
      status: { ruleType: "MultiSelectRule" },
      partner_id: { operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "opportunity_name", label: "Name", section: "Opportunity", required: true },
      { key: "partner_id", label: "Customer", section: "Relation", type: "number", relation: "customer", required: true },
      { key: "summary", label: "Summary", section: "Opportunity", type: "multiline" },
      { key: "start_date", label: "Start Date", section: "Dates", type: "date" },
      { key: "end_date", label: "End Date", section: "Dates", type: "date" },
      { key: "expiry_date", label: "Expiry Date", section: "Dates", type: "date" },
      { key: "responsible_id", label: "Responsible Staff", section: "Team", type: "number", relation: "staff" },
      { key: "staff_id", label: "Assigned Staff", section: "Team", type: "number", relation: "staff" },
      { key: "priority", label: "Priority", section: "Opportunity" },
      { key: "opportunity_type", label: "Type", section: "Opportunity" },
      { key: "estimated_price", label: "Estimated Price", section: "Financial", type: "money" },
      { key: "client_price", label: "Client Price", section: "Financial", type: "money" },
      { key: "opportunity_job_type", label: "Job Type", section: "Classification" },
      { key: "opportunity_field", label: "Field", section: "Classification" },
      { key: "business_sector", label: "Sector", section: "Classification" },
      { key: "entity", label: "Entity", section: "Classification" },
      { key: "country", label: "Country", section: "Classification" },
      { key: "partner_reference", label: "Customer Ref", section: "Opportunity" },
    ],
    tabs: [
      { key: "boq", title: "BOQ", moduleKey: "opportunity_boq", endpointTemplate: "opportunities_api/boq/{id}", createDefaults: { opportunity_id: "{id}" } },
      { key: "notes", title: "Notes", moduleKey: "opportunity_notes", endpointTemplate: "opportunities_api/notes/{id}", createDefaults: { opportunity_id: "{id}" } },
      { key: "cost_calculations", title: "Calculation Sheets", moduleKey: "cost_calculations", endpointTemplate: "cost_calculation_api?rel_type=opportunity&rel_id={id}", unpaginated: true, createDefaults: { rel_type: "opportunity", rel_id: "{id}", rel_name: "{opportunity_name}" } },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "opportunity" } },
    ],
    actions: [
      {
        key: "submit",
        title: "Submit for Approval",
        icon: "send-outline",
        endpointTemplate: "opportunities_api/submit/{id}",
        confirm: "Submit this opportunity for approval?",
        successMessage: "Submitted for approval",
      },
      {
        key: "change_status",
        title: "Advance Workflow…",
        icon: "swap-horizontal-outline",
        endpointTemplate: "opportunities_api/{id}/change_status",
        method: "POST",
        fields: [
          { key: "statusID", label: "Next Workflow Status", type: "number", relation: "opportunity_status", required: true },
        ],
        successMessage: "Workflow updated",
      },
    ],
  },
  {
    key: "opportunity_boq",
    title: "Opportunity BOQ",
    plural: "Opportunity BOQ",
    group: "PRIZM",
    endpoint: "opportunities_api/boq_items",
    idKey: "id",
    icon: "list-outline",
    color: "#22C55E",
    titleFields: ["item_name", "description", "item_code"],
    subtitleFields: ["quantity", "unit_rate", "total_amount"],
    canCreate: false,
    canOpenDetail: false,
    canUpdate: false,
    canDelete: false,
    fields: [
      { key: "boq_id", label: "BOQ ID", type: "number", required: true },
      { key: "item_code", label: "Item Code" },
      { key: "item_name", label: "Item Name", required: true },
      { key: "description", label: "Description", type: "multiline", required: true },
      { key: "unit_id", label: "Unit ID", type: "number" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "unit_rate", label: "Unit Rate", type: "money" },
      { key: "category", label: "Category" },
      { key: "remarks", label: "Remarks", type: "multiline" },
    ],
  },
  {
    key: "opportunity_notes",
    title: "Opportunity Note",
    plural: "Opportunity Notes",
    group: "PRIZM",
    endpoint: "opportunities_api/notes",
    idKey: "id",
    icon: "document-outline",
    color: "#22C55E",
    titleFields: ["content"],
    subtitleFields: ["dateadded", "staffid"],
    canOpenDetail: false,
    canUpdate: false,
    canDelete: false,
    fields: [
      { key: "opportunity_id", label: "Opportunity ID", type: "number", required: true },
      { key: "content", label: "Note", type: "multiline", required: true },
    ],
  },
  {
    key: "purchase_vendors",
    title: "Vendor",
    plural: "Vendors",
    group: "Purchase",
    endpoint: "purchase_api/vendors",
    permissionFeature: "przsuppliers",
    idKey: "id",
    icon: "storefront-outline",
    color: "#CA8A04",
    titleFields: ["company", "name"],
    subtitleFields: ["email", "phone"],
    searchFields: ["company", "supplier_code", "email", "phone", "trn", "keywords"],
    filterableFields: ["company", "supplier_code", "email", "phone", "status", "supplier_category", "country", "is_verified"],
    fields: [
      { key: "company", label: "Company", section: "Vendor", required: true },
      { key: "supplier_code", label: "Supplier Code", section: "Vendor" },
      { key: "trn", label: "TRN", section: "Vendor" },
      { key: "email", label: "Email", section: "Vendor", type: "email" },
      { key: "phone", label: "Phone", section: "Vendor", type: "phone" },
      { key: "website", label: "Website", section: "Vendor", type: "url" },
      ...addressFields,
    ],
    tabs: [
      { key: "contacts", title: "Contacts", moduleKey: "purchase_vendor_contacts", endpointTemplate: "purchase_api/vendor_contacts/{id}", createDefaults: { supplier_id: "{id}" } },
    ],
  },
  {
    key: "purchase_vendor_contacts",
    title: "Vendor Contact",
    plural: "Vendor Contacts",
    group: "Purchase",
    endpoint: "purchase_api/vendor_contacts",
    detailEndpoint: "purchase_api/vendor_contact",
    permissionFeature: "przsuppliers",
    idKey: "id",
    icon: "person-outline",
    color: "#CA8A04",
    titleFields: ["firstname", "lastname", "email"],
    subtitleFields: ["supplier_id", "phone", "designation", "active"],
    searchFields: ["firstname", "lastname", "email", "phone", "designation"],
    filterableFields: ["supplier_id", "firstname", "lastname", "email", "phone", "designation", "Department", "primary_contact", "active"],
    supportsAdvancedFilters: true,
    sortableFields: ["id", "supplier_id", "firstname", "lastname", "email", "primary_contact", "active"],
    fields: [
      { key: "supplier_id", label: "Vendor ID", type: "number", required: true },
      { key: "firstname", label: "First Name", required: true },
      { key: "lastname", label: "Last Name", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "phone" },
      { key: "title", label: "Title" },
      { key: "designation", label: "Designation" },
      { key: "Department", label: "Department" },
      { key: "primary_contact", label: "Primary Contact", type: "boolean" },
      { key: "active", label: "Active", type: "boolean" },
    ],
  },
  {
    key: "purchase_requests",
    title: "Purchase Request",
    plural: "Purchase Requests",
    group: "Purchase",
    endpoint: "purchase_api/requests",
    permissionFeature: "przpurchase",
    idKey: "id",
    icon: "cart-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "request_title", "title", "sequence_number", "number", "id"],
    subtitleFields: ["project_name", "department_name", "status", "requested_date"],
    searchFields: ["title", "sequence_number", "project_name", "department_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["title", "sequence_number", "staff_id", "requested_date", "department_id", "resource_type", "project_id", "total_amount", "currency_id", "rel_type", "resreq_type", "status"],
    statusField: "status",
    statusOptions: purchaseStatusFilterOptions,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
    },
    fields: [
      { key: "title", label: "Request Title", section: "Request", required: true },
      { key: "requested_date", label: "Requested Date", section: "Dates", type: "date" },
      { key: "department_id", label: "Department ID", section: "Request", type: "number" },
      { key: "project_id", label: "Project ID", section: "Request", type: "number" },
      { key: "resource_type", label: "Resource Type", section: "Request" },
      { key: "resource_request", label: "Resource Request", section: "Request", type: "multiline" },
      { key: "total_amount", label: "Total", section: "Request", type: "money" },
      { key: "status", label: "Status", section: "Request" },
      { key: "notes", label: "Notes", section: "Request", type: "multiline" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "purchase_request" } },
    ],
    actions: [
      {
        key: "publish",
        title: "Publish",
        icon: "megaphone-outline",
        endpointTemplate: "purchase_api/requests/{id}/publish",
        confirm: "Publish this purchase request to suppliers?",
        successMessage: "Published",
      },
      {
        key: "close",
        title: "Close",
        icon: "lock-closed-outline",
        endpointTemplate: "purchase_api/requests/{id}/close",
        confirm: "Close this purchase request?",
        successMessage: "Closed",
      },
    ],
  },
  {
    key: "purchase_orders",
    title: "Purchase Order",
    plural: "Purchase Orders",
    group: "Purchase",
    endpoint: "purchase_api/orders",
    permissionFeature: "przorder",
    idKey: "id",
    icon: "bag-check-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "order_number", "title", "sequence_number", "number", "id"],
    subtitleFields: ["supplier_company", "project_name", "status", "requested_date"],
    searchFields: ["title", "sequence_number", "supplier_company", "project_name", "department_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["title", "sequence_number", "staff_id", "requested_date", "delivery_date", "department_id", "supplier_id", "project_id", "status", "delivery_status", "total", "currency_id", "resreq_type"],
    statusField: "status",
    statusOptions: purchaseStatusFilterOptions,
    filterRules: {
      status: { ruleType: "MultiSelectRule" },
    },
    fields: [
      { key: "title", label: "Order Title", section: "Order", required: true },
      { key: "supplier_id", label: "Supplier ID", section: "Order", type: "number" },
      { key: "requested_date", label: "Date", section: "Dates", type: "date" },
      { key: "delivery_date", label: "Delivery Date", section: "Dates", type: "date" },
      { key: "department_id", label: "Department ID", section: "Order", type: "number" },
      { key: "project_id", label: "Project ID", section: "Order", type: "number" },
      { key: "status", label: "Status", section: "Order" },
      { key: "total", label: "Total", section: "Order", type: "money" },
      { key: "notes", label: "Notes", section: "Order", type: "multiline" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "purchase_order" } },
    ],
    actions: [
      {
        key: "approve",
        title: "Approve",
        icon: "checkmark-circle-outline",
        endpointTemplate: "purchase_api/orders/{id}/approve",
        confirm: "Approve this purchase order?",
        successMessage: "Approved",
      },
      {
        key: "reject",
        title: "Reject",
        icon: "close-circle-outline",
        endpointTemplate: "purchase_api/orders/{id}/reject",
        confirm: "Reject this purchase order?",
        successMessage: "Rejected",
        destructive: true,
      },
      {
        key: "send_to_supplier",
        title: "Send to Supplier",
        icon: "paper-plane-outline",
        endpointTemplate: "purchase_api/orders/{id}/send_to_supplier",
        confirm: "Send this PO to the supplier?",
        successMessage: "Sent",
      },
      {
        key: "mark_received",
        title: "Mark Received",
        icon: "cube-outline",
        endpointTemplate: "purchase_api/orders/{id}/mark_received",
        confirm: "Mark this PO as received?",
        successMessage: "Marked received",
      },
      {
        key: "mark_paid",
        title: "Mark Paid",
        icon: "cash-outline",
        endpointTemplate: "purchase_api/orders/{id}/mark_paid",
        confirm: "Mark this PO as paid?",
        successMessage: "Marked paid",
      },
    ],
  },
  {
    key: "purchase_payment_requests",
    title: "Payment Request",
    plural: "Payment Requests",
    group: "Purchase",
    endpoint: "purchase_api/payment_requests",
    permissionFeature: "payment_request",
    idKey: "id",
    icon: "card-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "sequence_number", "number", "id"],
    subtitleFields: ["supplier_company", "project_name", "payment_status", "requested_date", "total"],
    searchFields: ["sequence_number", "supplier_company", "project_name", "department_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["sequence_number", "staff_id", "project_id", "po_id", "source_type", "expense_id", "department_id", "supplier_id", "paymentmode", "transaction_amount", "transaction_date", "requested_date", "payment_status", "status", "currency_id", "total", "remaining_amount"],
    fields: [
      { key: "po_id", label: "Purchase Order ID", section: "Payment", type: "number" },
      { key: "supplier_id", label: "Supplier ID", section: "Payment", type: "number" },
      { key: "project_id", label: "Project ID", section: "Payment", type: "number" },
      { key: "requested_date", label: "Requested Date", section: "Payment", type: "date" },
      { key: "transaction_date", label: "Transaction Date", section: "Payment", type: "date" },
      { key: "transaction_amount", label: "Transaction Amount", section: "Payment", type: "money" },
      { key: "payment_status", label: "Payment Status", section: "Payment" },
      { key: "total", label: "Total", section: "Payment", type: "money" },
      { key: "notes", label: "Notes", section: "Payment", type: "multiline" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "payment_request" } },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "purchase_expense_requests",
    title: "Expense Request",
    plural: "Expense Requests",
    group: "Purchase",
    endpoint: "purchase_api/expense_requests",
    permissionFeature: "prz_expense_request",
    idKey: "id",
    icon: "receipt-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "sequence_number", "title", "number", "id"],
    subtitleFields: ["project_id", "status", "requested_date", "total"],
    searchFields: ["title", "sequence_number", "project_name", "department_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["title", "sequence_number", "staff_id", "project_id", "requested_date", "department_id", "resource_type", "status", "payment_status", "total", "currency_id", "notes"],
    fields: [
      { key: "title", label: "Title", section: "Expense" },
      { key: "project_id", label: "Project ID", section: "Expense", type: "number" },
      { key: "requested_date", label: "Requested Date", section: "Expense", type: "date" },
      { key: "status", label: "Status", section: "Expense" },
      { key: "total", label: "Total", section: "Expense", type: "money" },
      { key: "notes", label: "Notes", section: "Expense", type: "multiline" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "expense_request" } },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "purchase_received_vouchers",
    title: "Received Voucher",
    plural: "Received Vouchers",
    group: "Purchase",
    endpoint: "purchase_api/received_vouchers",
    permissionFeature: "prz_received_vouchers",
    idKey: "id",
    icon: "archive-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "sequence_number", "number", "id"],
    subtitleFields: ["supplier_company", "project_name", "status", "received_date", "total"],
    searchFields: ["supplier_company", "project_name", "notes"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["project_id", "po_id", "department_id", "supplier_id", "voucher_date", "received_date", "expiry_date", "delivery_status", "status", "total", "currency_id"],
    fields: [
      { key: "po_id", label: "Purchase Order ID", section: "Voucher", type: "number" },
      { key: "project_id", label: "Project ID", section: "Voucher", type: "number" },
      { key: "supplier_id", label: "Supplier ID", section: "Voucher", type: "number" },
      { key: "voucher_date", label: "Voucher Date", section: "Voucher", type: "date" },
      { key: "received_date", label: "Received Date", section: "Voucher", type: "date" },
      { key: "expiry_date", label: "Expiry Date", section: "Voucher", type: "date" },
      { key: "delivery_status", label: "Delivery Status", section: "Voucher" },
      { key: "status", label: "Status", section: "Voucher" },
      { key: "total", label: "Total", section: "Voucher", type: "money" },
      { key: "notes", label: "Notes", section: "Voucher", type: "multiline" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "received_voucher" } },
    ],
    actions: [
      { key: "approve", title: "Approve", icon: "checkmark-circle-outline", endpointTemplate: "purchase_api/received_vouchers/{id}/approve", confirm: "Approve this received voucher?", successMessage: "Approved" },
      { key: "reject", title: "Reject", icon: "close-circle-outline", endpointTemplate: "purchase_api/received_vouchers/{id}/reject", confirm: "Reject this received voucher?", successMessage: "Rejected", destructive: true },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "purchase_delivery_notes",
    title: "Delivery Note",
    plural: "Delivery Notes",
    group: "Purchase",
    endpoint: "purchase_api/delivery_notes",
    permissionFeature: "delivery_notes",
    idKey: "id",
    icon: "cube-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "sequence_number", "number", "id"],
    subtitleFields: ["supplier_company", "project_name", "status", "requested_date", "total"],
    searchFields: ["sequence_number", "supplier_company", "project_name", "notes", "remarks"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["sequence_number", "project_id", "po_id", "supplier_id", "requested_date", "status", "total", "currency_id", "notes"],
    fields: [
      { key: "po_id", label: "Purchase Order ID", section: "Delivery", type: "number" },
      { key: "requested_date", label: "Requested Date", section: "Delivery", type: "date" },
      { key: "status", label: "Status", section: "Delivery" },
      { key: "total", label: "Total", section: "Delivery", type: "money" },
      { key: "notes", label: "Notes", section: "Delivery", type: "multiline" },
      { key: "remarks", label: "Remarks", section: "Delivery", type: "multiline" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "delivery_note" } },
    ],
    actions: [
      { key: "approve", title: "Approve", icon: "checkmark-circle-outline", endpointTemplate: "purchase_api/delivery_notes/{id}/approve", confirm: "Approve this delivery note?", successMessage: "Approved" },
      { key: "reject", title: "Reject", icon: "close-circle-outline", endpointTemplate: "purchase_api/delivery_notes/{id}/reject", confirm: "Reject this delivery note?", successMessage: "Rejected", destructive: true },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "purchase_quotations",
    title: "Quotation",
    plural: "Quotations",
    group: "Purchase",
    endpoint: "purchase_api/quotations",
    permissionFeature: "przquotation",
    idKey: "id",
    icon: "document-text-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "prefix", "quocode", "quotation_number", "id"],
    subtitleFields: ["supplier_company", "project_name", "pr_id", "date", "total"],
    searchFields: ["quocode", "number", "adminnote", "suppliernote", "description", "supplier_company", "project_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["supplier_id", "number", "quocode", "date", "expirydate", "project_id", "status", "total", "currency", "rfq_id", "pr_id"],
    fields: [
      { key: "supplier_id", label: "Supplier ID", section: "Quotation", type: "number" },
      { key: "pr_id", label: "Purchase Request ID", section: "Quotation", type: "number" },
      { key: "rfq_id", label: "RFQ ID", section: "Quotation", type: "number" },
      { key: "project_id", label: "Project ID", section: "Quotation", type: "number" },
      { key: "date", label: "Date", section: "Quotation", type: "date" },
      { key: "expirydate", label: "Expiry Date", section: "Quotation", type: "date" },
      { key: "status", label: "Status", section: "Quotation" },
      { key: "total", label: "Total", section: "Quotation", type: "money" },
      { key: "adminnote", label: "Notes", section: "Quotation", type: "multiline" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "quotation" } },
    ],
    actions: [
      { key: "approve", title: "Approve", icon: "checkmark-circle-outline", endpointTemplate: "purchase_api/quotations/{id}/approve", confirm: "Approve this quotation?", successMessage: "Approved" },
      { key: "reject", title: "Reject", icon: "close-circle-outline", endpointTemplate: "purchase_api/quotations/{id}/reject", confirm: "Reject this quotation?", successMessage: "Rejected", destructive: true },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "purchase_completion_certificates",
    title: "Completion Certificate",
    plural: "Completion Certificates",
    group: "Purchase",
    endpoint: "purchase_api/completion_certificates",
    permissionFeature: "completion_certificates",
    idKey: "id",
    icon: "ribbon-outline",
    color: "#CA8A04",
    titleFields: ["project_name", "attachment", "id"],
    subtitleFields: ["project_id", "amount", "created_at"],
    searchFields: ["project_name", "attachment"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["project_id", "amount", "created_at", "updated_at", "created_by"],
    fields: [
      { key: "project_id", label: "Project ID", section: "Certificate", type: "number" },
      { key: "attachment", label: "Attachment", section: "Certificate", readOnly: true },
      { key: "amount", label: "Amount", section: "Certificate", type: "money" },
      { key: "created_at", label: "Created At", section: "Audit", readOnly: true },
      { key: "updated_at", label: "Updated At", section: "Audit", readOnly: true },
      { key: "created_by", label: "Created By", section: "Audit", type: "number", readOnly: true },
    ],
    actions: [
      { key: "approve", title: "Approve", icon: "checkmark-circle-outline", endpointTemplate: "purchase_api/completion_certificates/{id}/approve", confirm: "Approve this completion certificate?", successMessage: "Approved" },
      { key: "reject", title: "Reject", icon: "close-circle-outline", endpointTemplate: "purchase_api/completion_certificates/{id}/reject", confirm: "Reject this completion certificate?", successMessage: "Rejected", destructive: true },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "documents",
    title: "Prizm Document",
    plural: "Prizm Documents",
    group: "PRIZM",
    endpoint: "dms_api",
    permissionFeature: "prizmsubscription",
    idKey: "id",
    icon: "folder-open-outline",
    color: "#0369A1",
    titleFields: ["title", "doc_number"],
    subtitleFields: ["type", "status", "expiration_date"],
    searchFields: ["title", "description", "doc_number", "type", "rel_type"],
    fields: [
      { key: "title", label: "Title", section: "Document", required: true },
      { key: "doc_number", label: "Document Number", section: "Document" },
      { key: "description", label: "Description", section: "Document", type: "multiline" },
      { key: "type", label: "Document Type", section: "Classification" },
      { key: "status", label: "Status", section: "Classification", defaultValue: "Active" },
      { key: "start_date", label: "Start Date", section: "Validity", type: "date", required: true },
      { key: "expiration_date", label: "Expiration Date", section: "Validity", type: "date", required: true },
      { key: "rel_type", label: "Related Type", section: "Relation" },
      { key: "rel_id", label: "Related Record ID", section: "Relation", type: "number" },
      { key: "folder_id", label: "Folder ID", section: "Organization", type: "number" },
      { key: "categories", label: "Category IDs", section: "Organization", type: "json", placeholder: "[1, 2]" },
      { key: "responsible_employee", label: "Responsible Staff", section: "Responsibility", type: "number", relation: "staff", multiple: true, submitAsArray: true },
      { key: "documentTags", label: "Tags", section: "Organization" },
      { key: "notes", label: "Notes", section: "Notes", type: "multiline" },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "Audit", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "dewa_contacts",
    title: "DEWA Contact",
    plural: "DEWA Contacts",
    group: "CRM",
    endpoint: "dewa_contacts_api",
    permissionFeature: "dewa_contacts",
    idKey: "id",
    icon: "people-outline",
    color: "#0284C7",
    titleFields: ["first_name", "last_name", "email"],
    subtitleFields: ["rfxno", "phone", "status"],
    searchFields: ["first_name", "last_name", "email"],
    fields: [
      { key: "contact_id", label: "Contact ID", section: "Contact", type: "number", required: true },
      { key: "rfxno", label: "RFx Number", section: "Reference" },
      { key: "first_name", label: "First Name", section: "Contact", required: true },
      { key: "last_name", label: "Last Name", section: "Contact" },
      { key: "email", label: "Email", section: "Contact", type: "email" },
      { key: "phone", label: "Phone", section: "Contact", type: "phone" },
      { key: "note", label: "Note", section: "Notes", type: "multiline" },
      { key: "status", label: "Active", section: "Status", type: "boolean", defaultValue: true },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "Audit", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "materials",
    title: "Material",
    plural: "Materials",
    group: "Inventory",
    endpoint: "materials_catalog/materials",
    permissionFeature: "materials",
    idKey: "id",
    icon: "hardware-chip-outline",
    color: "#0F766E",
    titleFields: ["item_name", "item_code"],
    subtitleFields: ["category", "partner", "partner_item_code", "converted"],
    searchFields: ["item_code", "item_name", "remarks", "partner", "partner_item_code", "partner_item_name", "category"],
    defaultSort: { field: "item_name", direction: "asc" },
    sortableFields: ["item_name", "item_code", "partner", "purchase_price", "sell_price", "datecreated", "id"],
    statusField: "converted",
    statusOptions: [{ label: "Source", value: "0", color: "#D97706" }, { label: "Converted", value: "1", color: "#16A34A" }],
    filterableFields: ["item_code", "item_name", "remarks", "partner", "converted", "ai_formatted", "purchase_price", "sell_price", "datecreated"],
    fields: [
      { key: "item_code", label: "Item Code", section: "Material", required: true },
      { key: "item_name", label: "Item Name", section: "Material", required: true },
      { key: "category_id", label: "Categories", section: "Classification", type: "number", relation: "material_category", multiple: true, submitAsArray: true },
      { key: "category", label: "Category Names", section: "Classification", readOnly: true },
      { key: "remarks", label: "Reference / Remarks", section: "Source", type: "multiline" },
      { key: "partner", label: "Partner", section: "Source", filterRuleType: "MultiSelectRule" },
      { key: "partner_item_code", label: "Partner Item Code", section: "Source" },
      { key: "partner_item_name", label: "Partner Item Name", section: "Source" },
      { key: "purchase_price", label: "Purchase Price", section: "Commercial", type: "money" },
      { key: "sell_price", label: "Sell Price", section: "Commercial", type: "money" },
      { key: "converted", label: "Converted", section: "Catalog", type: "boolean", readOnly: true },
      { key: "item_id", label: "Catalog Item ID", section: "Catalog", type: "number", readOnly: true, hideIfZero: true },
      { key: "ai_formatted", label: "AI Formatted", section: "Catalog", type: "boolean", readOnly: true },
      { key: "metadata_count", label: "Specifications", section: "Catalog", type: "number", readOnly: true },
      { key: "staff_id", label: "Imported By", section: "System", type: "number", relation: "staff", readOnly: true },
      { key: "datecreated", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
    canDelete: false,
    actions: [{
      key: "convert", availabilityKey: "convert", title: "Convert to Catalog Item", icon: "swap-forward-outline",
      endpointTemplate: "materials_catalog/materials/{id}/convert", method: "POST",
      confirm: "Create a catalog item from this source material and its specifications?",
      successMessage: "Material converted to a catalog item",
      fields: [
        { key: "item_name", label: "Catalog Item Name", required: true },
        { key: "long_name", label: "Long Description", type: "multiline" },
        { key: "expensecategoryID", label: "Expense Category", type: "number", relation: "budget_expense_category", required: true },
        { key: "defaultunit", label: "Default Unit", type: "number", relation: "budget_unit", required: true },
      ],
    }],
    tabs: [{ key: "metadata", title: "Specifications", moduleKey: "material_metadata", endpointTemplate: "materials_catalog/material_metadata?material_id={id}", createDefaults: { material_id: "{id}" } }],
  },
  {
    key: "material_metadata",
    title: "Material Specification",
    plural: "Material Specifications",
    group: "Inventory",
    endpoint: "materials_catalog/material_metadata",
    permissionFeature: "materials",
    idKey: "id",
    icon: "list-outline",
    color: "#0F766E",
    titleFields: ["meta_field", "meta_value"],
    subtitleFields: ["meta_unit", "remarks"],
    searchFields: ["meta_field", "meta_value", "meta_unit", "remarks"],
    fields: [
      { key: "material_id", label: "Material ID", section: "Material", type: "number", required: true, createOnly: true },
      { key: "meta_field", label: "Specification", section: "Specification", required: true },
      { key: "meta_value", label: "Value", section: "Specification" },
      { key: "meta_unit", label: "Unit", section: "Specification" },
      { key: "remarks", label: "Remarks", section: "Specification", type: "multiline" },
      { key: "dateadded", label: "Added", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "material_categories",
    title: "Material Category",
    plural: "Material Categories",
    group: "Inventory",
    endpoint: "materials_catalog/categories",
    permissionFeature: "materials",
    idKey: "id",
    icon: "folder-open-outline",
    color: "#0F766E",
    titleFields: ["name"],
    subtitleFields: ["parent_id", "child_count"],
    searchFields: ["name"],
    clientSideSearch: true,
    unpaginated: true,
    fields: [
      { key: "name", label: "Category Name", section: "Category", required: true },
      { key: "parent_id", label: "Parent Category", section: "Hierarchy", type: "number", relation: "material_category" },
      { key: "child_count", label: "Subcategories", section: "Hierarchy", type: "number", readOnly: true },
      { key: "dateadded", label: "Created", section: "Audit", type: "datetime", readOnly: true },
    ],
    canOpenDetail: false,
  },
  {
    key: "unspsc_commodities",
    title: "UNSPSC Commodity",
    plural: "UNSPSC Commodities",
    group: "Inventory",
    endpoint: "materials_catalog/unspsc/search",
    detailEndpoint: "materials_catalog/unspsc/commodity",
    permissionFeature: "classification",
    idKey: "id",
    icon: "git-network-outline",
    color: "#0F766E",
    titleFields: ["code", "title"],
    subtitleFields: ["class_id"],
    searchFields: ["code", "title"],
    searchParam: "q",
    requiresSearch: true,
    fields: [
      { key: "code", label: "Commodity Code", section: "UNSPSC", readOnly: true },
      { key: "title", label: "Commodity Title", section: "UNSPSC", readOnly: true },
      { key: "class_id", label: "Class ID", section: "Hierarchy", type: "number", readOnly: true },
      { key: "added_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "added_by", label: "Created By", section: "Audit", type: "number", relation: "staff", readOnly: true },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    tabs: [
      {
        key: "specifications",
        title: "Specifications",
        moduleKey: "unspsc_commodity_specs",
        endpointTemplate: "materials_catalog/unspsc/commodity_specs/{id}",
        canCreate: false,
        unpaginated: true,
      },
    ],
  },
  {
    key: "unspsc_commodity_specs",
    title: "Commodity Specification",
    plural: "Commodity Specifications",
    group: "Inventory",
    endpoint: "materials_catalog/unspsc/commodity_specs",
    permissionFeature: "classification",
    idKey: "id",
    icon: "options-outline",
    color: "#0F766E",
    titleFields: ["spec_name", "value"],
    subtitleFields: ["unit", "status", "required"],
    fields: [
      { key: "commodity_id", label: "Commodity ID", section: "UNSPSC", type: "number", readOnly: true },
      { key: "commodity_code", label: "Commodity Code", section: "UNSPSC", readOnly: true },
      { key: "spec_name", label: "Specification", section: "Specification", readOnly: true },
      { key: "value", label: "Default Value", section: "Specification", readOnly: true },
      { key: "unit", label: "Unit", section: "Specification", readOnly: true },
      { key: "required", label: "Required", section: "Specification", type: "boolean", readOnly: true },
      { key: "status", label: "Status", section: "Specification", readOnly: true },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canOpenDetail: false,
  },
  {
    key: "material_kits",
    title: "Resource Kit",
    plural: "Resource Kits",
    group: "Inventory",
    endpoint: "materials_catalog/kits",
    permissionFeature: "prizm_items",
    idKey: "id",
    icon: "albums-outline",
    color: "#0F766E",
    titleFields: ["name"],
    subtitleFields: ["description", "status"],
    searchFields: ["name"],
    fields: [
      { key: "name", label: "Kit Name", section: "Kit", required: true },
      { key: "parent_id", label: "Parent Kit ID", section: "Structure", type: "number", defaultValue: 0 },
      { key: "description", label: "Description", section: "Kit", type: "multiline" },
      { key: "status", label: "Active", section: "Status", type: "boolean", defaultValue: true },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "added_by", label: "Added By", section: "Audit", type: "number", relation: "staff", readOnly: true },
      { key: "updated_at", label: "Updated", section: "Audit", type: "datetime", readOnly: true },
      { key: "updated_by", label: "Updated By", section: "Audit", type: "number", relation: "staff", readOnly: true },
    ],
    tabs: [{
      key: "items",
      title: "Components",
      moduleKey: "material_kit_items",
      endpointTemplate: "materials_catalog/kit_items?kit_id={id}",
      childField: "kit_id",
      createDefaults: { kit_id: "{id}" },
    }],
  },
  {
    key: "material_kit_items",
    title: "Kit Component",
    plural: "Kit Components",
    group: "Inventory",
    endpoint: "materials_catalog/kit_items",
    permissionFeature: "prizm_items",
    idKey: "id",
    icon: "cube-outline",
    color: "#0F766E",
    titleFields: ["item_name", "code", "item_id"],
    subtitleFields: ["quantity", "unit_name", "unit_id"],
    fields: [
      { key: "kit_id", label: "Kit ID", section: "Kit", type: "number", required: true, createOnly: true },
      { key: "item_id", label: "Catalog Item", section: "Component", type: "number", relation: "budget_item", required: true, createOnly: true },
      { key: "code", label: "Component Code", section: "Component" },
      { key: "quantity", label: "Quantity", section: "Component", type: "number", defaultValue: 1 },
      { key: "unit_id", label: "Unit", section: "Component", type: "number", relation: "budget_unit", required: true },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "added_by", label: "Added By", section: "Audit", type: "number", relation: "staff", readOnly: true },
      { key: "updated_at", label: "Updated", section: "Audit", type: "datetime", readOnly: true },
      { key: "updated_by", label: "Updated By", section: "Audit", type: "number", relation: "staff", readOnly: true },
    ],
    canOpenDetail: false,
  },
  {
    key: "budget_items",
    title: "Budget Item",
    plural: "Budget Items",
    group: "Finance",
    endpoint: "budget_api/items",
    permissionFeature: "prizmbudget",
    idKey: "id",
    icon: "calculator-outline",
    color: "#EA580C",
    titleFields: ["name", "item_code"],
    subtitleFields: ["category_name", "unit_name", "commodity_title", "ai_classified"],
    searchFields: ["name", "long_name", "item_code", "category_name", "unit_name", "spec_name", "commodity_title", "class_title", "family_title", "segment_title"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["name", "long_name", "code", "expensecategoryID", "itemspecificationID", "unitID", "commodity_id", "product_family_id", "item_type", "ai_classified", "ai_formatted", "created_at", "updated_at", "added_by", "updated_by", "resreq_type"],
    statusField: "ai_classified",
    statusOptions: [{ label: "Classified", value: 1, color: "#16A34A" }, { label: "Unclassified", value: 0, color: "#D97706" }],
    fields: [
      { key: "name", label: "Name", section: "Catalog", required: true },
      { key: "long_name", label: "Long Description", section: "Catalog", type: "multiline", required: true },
      { key: "code", label: "Item Code", section: "Catalog" },
      { key: "expensecategoryID", label: "Expense Category", section: "Classification", relation: "budget_expense_category", required: true },
      { key: "unitID", label: "Default Unit", section: "Classification", relation: "budget_unit", required: true },
      { key: "itemspecificationID", label: "Primary Specification ID", section: "Classification", type: "number" },
      { key: "commodity_id", label: "UNSPSC Commodity ID", section: "Classification", type: "number" },
      { key: "product_family_id", label: "Product Family ID", section: "Classification", type: "number" },
      { key: "item_type", label: "Item Type", section: "Classification", type: "number", defaultValue: 1 },
      { key: "category_name", label: "Category", section: "Resolved", readOnly: true },
      { key: "unit_name", label: "Unit", section: "Resolved", readOnly: true },
      { key: "commodity_title", label: "Commodity", section: "Resolved", readOnly: true },
      { key: "ai_classified", label: "Classified", section: "AI", type: "boolean", readOnly: true },
      { key: "ai_formatted", label: "Formatted", section: "AI", type: "boolean", readOnly: true },
      { key: "added_by", label: "Added By", section: "System", relation: "staff", readOnly: true },
      { key: "created_at", label: "Created", section: "System", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [
      { key: "approve", title: "Classify", icon: "checkmark-circle-outline", endpointTemplate: "budget_api/items/{id}", method: "PUT",
        body: { ai_classified: 1 },
        confirm: "Approve this budget item?", successMessage: "Approved" },
      { key: "reject", title: "Unclassify", icon: "close-circle-outline", endpointTemplate: "budget_api/items/{id}", method: "PUT", body: { ai_classified: 0 },
        confirm: "Reject this budget item?", successMessage: "Rejected", destructive: true },
    ],
    tabs: [
      {
        key: "specifications",
        title: "Specifications",
        moduleKey: "budget_item_specs",
        endpointTemplate: "budget_api/item_specs/{id}",
        createDefaults: { item_id: "{id}" },
        unpaginated: true,
      },
    ],
  },
  {
    key: "budget_item_specs",
    title: "Item Specification",
    plural: "Item Specifications",
    group: "Finance",
    endpoint: "budget_api/item_specs",
    permissionFeature: "prizmbudget",
    idKey: "id",
    icon: "options-outline",
    color: "#EA580C",
    titleFields: ["spec_name", "value"],
    subtitleFields: ["unit_name", "unit_symbol", "sort_order"],
    fields: [
      { key: "item_id", label: "Catalog Item", section: "Specification", type: "number", relation: "budget_item", required: true, createOnly: true },
      { key: "spec_id", label: "Specification", section: "Specification", type: "number", relation: "budget_specification", required: true },
      { key: "spec_name", label: "Specification", section: "Resolved", readOnly: true },
      { key: "value", label: "Value", section: "Specification", required: true },
      { key: "unit_id", label: "Unit", section: "Specification", type: "number", relation: "budget_unit" },
      { key: "unit_name", label: "Unit", section: "Resolved", readOnly: true },
      { key: "unit_symbol", label: "Symbol", section: "Resolved", readOnly: true },
      { key: "sort_order", label: "Order", section: "Specification", type: "number", defaultValue: 0 },
    ],
    canOpenDetail: false,
  },
  {
    key: "goals",
    title: "Goal",
    plural: "Goals",
    group: "Work",
    endpoint: "goals_api",
    permissionFeature: "goals",
    idKey: "id",
    icon: "trophy-outline",
    color: "#65A30D",
    titleFields: ["subject"],
    subtitleFields: ["goal_type_name", "progress_percent", "end_date"],
    searchFields: ["subject", "description"],
    supportsAdvancedFilters: true,
    sortableFields: ["id", "subject", "start_date", "end_date", "goal_type", "achievement", "staff_id"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["subject", "description", "start_date", "end_date", "goal_type", "contract_type", "achievement", "staff_id", "notify_when_fail", "notify_when_achieve"],
    statusField: "status",
    statusOptions: [{ label: "In Progress", value: "in_progress", color: "#2563EB" }, { label: "Achieved", value: "achieved", color: "#16A34A" }, { label: "Overdue", value: "overdue", color: "#DC2626" }],
    fields: [
      { key: "subject", label: "Subject", section: "Goal", required: true },
      { key: "description", label: "Description", section: "Goal", type: "multiline" },
      { key: "goal_type", label: "Goal Type ID", section: "Goal", type: "number", required: true },
      { key: "goal_type_name", label: "Goal Type", section: "Goal", readOnly: true },
      { key: "contract_type", label: "Contract Type ID", section: "Scope", type: "number", defaultValue: 0 },
      { key: "staff_id", label: "Responsible Staff", section: "Scope", relation: "staff", defaultValue: 0 },
      { key: "start_date", label: "Start Date", section: "Dates", type: "date", required: true },
      { key: "end_date", label: "End Date", section: "Dates", type: "date", required: true },
      { key: "achievement", label: "Target", section: "Progress", type: "number", required: true },
      { key: "current_achievement", label: "Current Achievement", section: "Progress", type: "number", readOnly: true },
      { key: "progress_percent", label: "Progress (%)", section: "Progress", type: "number", readOnly: true },
      { key: "status", label: "Status", section: "Progress", readOnly: true },
      { key: "notify_when_achieve", label: "Notify When Achieved", section: "Notifications", type: "boolean" },
      { key: "notify_when_fail", label: "Notify When Failed", section: "Notifications", type: "boolean" },
    ],
    actions: [{
      key: "notify_staff", availabilityKey: "notify_staff", title: "Notify Staff of Result", icon: "notifications-outline",
      endpointTemplate: "goals_api/{id}/notify", method: "PUT",
      confirm: "Notify the applicable staff members of this goal result?",
      successMessage: "Goal result notification sent",
    }],
  },
  {
    key: "business_partners",
    title: "Business Partner",
    plural: "Business Partners",
    group: "CRM",
    endpoint: "business_partners_api",
    permissionFeature: "prizmbusinesspartners",
    idKey: "id",
    icon: "git-network-outline",
    color: "#0E7490",
    titleFields: ["company"],
    subtitleFields: ["email", "customer", "supplier"],
    searchFields: ["company", "email"],
    defaultSort: { field: "company", direction: "asc" },
    filterableFields: ["company", "email", "customer", "supplier", "parent_id", "created_at", "updated_at", "created_by", "updated_by"],
    fields: [
      { key: "company", label: "Company", section: "Partner", required: true },
      { key: "email", label: "Email", section: "Partner", type: "email" },
      { key: "parent_id", label: "Parent Partner ID", section: "Structure", type: "number" },
      { key: "customer", label: "Customer", section: "Classification", type: "boolean" },
      { key: "supplier", label: "Supplier", section: "Classification", type: "boolean" },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "Audit", type: "datetime", readOnly: true },
      { key: "created_by", label: "Created By", section: "Audit", relation: "staff", readOnly: true },
      { key: "updated_by", label: "Updated By", section: "Audit", relation: "staff", readOnly: true },
    ],
  },
  {
    key: "cost_centers",
    title: "Cost Center",
    plural: "Cost Centers",
    group: "Finance",
    endpoint: "cost_centers_api",
    permissionFeature: "costcenters",
    idKey: "id",
    icon: "analytics-outline",
    color: "#EA580C",
    titleFields: ["cost_center_code", "title"],
    subtitleFields: ["manager_id", "section", "status"],
    searchFields: ["cost_center_code", "title", "description"],
    defaultSort: { field: "cost_center_code", direction: "asc" },
    filterableFields: ["cost_center_code", "title", "description", "parent_id", "staff_id", "manager_id", "section", "status", "created_at"],
    statusField: "status",
    statusOptions: [{ label: "Active", value: 1, color: "#16A34A" }, { label: "Inactive", value: 0, color: "#64748B" }],
    fields: [
      { key: "cost_center_code", label: "Code", section: "Cost Center", required: true },
      { key: "title", label: "Title", section: "Cost Center", required: true },
      { key: "parent_id", label: "Parent ID", section: "Cost Center", type: "number" },
      { key: "manager_id", label: "Manager", section: "Ownership", relation: "staff", required: true },
      { key: "section", label: "Section", section: "Cost Center", type: "select", options: [{ label: "Projects", value: 1 }, { label: "Opportunities", value: 2 }, { label: "Administration", value: 3 }], required: true },
      { key: "status", label: "Status", section: "Cost Center", type: "select", options: statusOptions, defaultValue: 1 },
      { key: "description", label: "Description", section: "Cost Center", type: "multiline" },
      { key: "staff_id", label: "Created By", section: "Audit", relation: "staff", readOnly: true },
      { key: "created_at", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "Audit", type: "datetime", readOnly: true },
    ],
    tabs: [
      { key: "members", title: "Members", moduleKey: "cost_center_members", endpointTemplate: "cost_centers_api/members/{id}", createDefaults: { costcenter_id: "{id}" }, unpaginated: true },
      { key: "supervisors", title: "Supervisors", moduleKey: "cost_center_supervisors", endpointTemplate: "cost_centers_api/supervisors/{id}", createDefaults: { costcenter_id: "{id}" }, unpaginated: true },
      { key: "activity", title: "Activity", moduleKey: "cost_center_activity", endpointTemplate: "cost_centers_api/activity/{id}", canCreate: false, unpaginated: true },
    ],
  },
  {
    key: "timesheets",
    title: "Timesheet",
    plural: "Timesheets",
    group: "Work",
    endpoint: "timesheets_api",
    idKey: "id",
    icon: "time-outline",
    color: "#2563EB",
    titleFields: ["task_name", "task_id"],
    subtitleFields: ["staff_name", "project_name", "active", "start_time", "end_time"],
    searchFields: ["task_name", "staff_name", "note"],
    defaultSort: { field: "start_time", direction: "desc" },
    sortableFields: ["start_time", "end_time", "staff_id", "task_id", "task_name", "project_name"],
    filterableFields: ["staff_id", "task_id", "start_time", "end_time", "note", "active"],
    fields: [
      { key: "task_id", label: "Task", section: "Timesheet", type: "number", relation: "task", required: true },
      { key: "staff_id", label: "Staff", section: "Timesheet", type: "number", relation: "staff", required: true },
      { key: "start_time", label: "Start Time", section: "Timesheet", type: "datetime", required: true },
      { key: "end_time", label: "End Time", section: "Timesheet", type: "datetime", required: true },
      { key: "note", label: "Note", section: "Timesheet", type: "multiline" },
      { key: "task_name", label: "Task", section: "Context", readOnly: true },
      { key: "project_name", label: "Project", section: "Context", readOnly: true },
      { key: "staff_name", label: "Staff Member", section: "Context", readOnly: true },
      { key: "duration_seconds", label: "Duration (seconds)", section: "Time", type: "number", readOnly: true },
      { key: "active", label: "Timer", section: "Time", type: "select", readOnly: true, options: [
        { label: "Finished", value: 0 },
        { label: "Running", value: 1 },
      ] },
      { key: "task_status", label: "Task Status", section: "Context", type: "select", readOnly: true, options: [
        { label: "Not Started", value: 1 },
        { label: "Awaiting Feedback", value: 2 },
        { label: "Testing", value: 3 },
        { label: "In Progress", value: 4 },
        { label: "Complete", value: 5 },
      ] },
      { key: "billable", label: "Billable", section: "Billing", type: "boolean", readOnly: true },
      { key: "billed", label: "Billed", section: "Billing", type: "boolean", readOnly: true },
      { key: "hourly_rate", label: "Hourly Rate", section: "Billing", type: "money", readOnly: true },
    ],
  },
  {
    key: "recruitment_candidates",
    title: "Candidate",
    plural: "Candidates",
    group: "HR",
    endpoint: "recruitment_api/candidates",
    permissionFeature: "recruitment",
    idKey: "id",
    icon: "id-card-outline",
    color: "#7C3AED",
    titleFields: ["candidate_name", "last_name", "candidate_code"],
    subtitleFields: ["email", "phonenumber", "status", "date_add"],
    searchFields: ["candidate_code", "candidate_name", "last_name", "email", "phonenumber"],
    filterableFields: ["candidate_code", "candidate_name", "last_name", "email", "phonenumber", "birthday", "gender", "nationality", "nation", "status", "rate", "Visa_Status", "desired_salary", "date_add", "recruitment_channel", "year_experience", "active"],
    statusField: "status",
    statusOptions: [
      { label: "Application", value: 1, color: "#64748B" }, { label: "Potential", value: 2, color: "#2563EB" },
      { label: "Interview", value: 3, color: "#7C3AED" }, { label: "Won Interview", value: 4, color: "#16A34A" },
      { label: "Send Offer", value: 5, color: "#0D9488" }, { label: "Elect", value: 6, color: "#0891B2" },
      { label: "Not Elected", value: 7, color: "#DC2626" }, { label: "Unanswered", value: 8, color: "#D97706" },
      { label: "Transferred", value: 9, color: "#16A34A" }, { label: "Freedom", value: 10, color: "#475569" },
    ],
    fields: [
      { key: "candidate_name", label: "Candidate Name", section: "Candidate", required: true },
      { key: "last_name", label: "Last Name", section: "Candidate" },
      { key: "candidate_code", label: "Candidate Code", section: "Candidate", required: true },
      { key: "email", label: "Email", section: "Candidate", type: "email" },
      { key: "phonenumber", label: "Phone", section: "Candidate", type: "phone" },
      { key: "birthday", label: "Date of Birth", section: "Personal", type: "date" },
      { key: "gender", label: "Gender", section: "Personal" },
      { key: "nationality", label: "Nationality", section: "Personal" },
      { key: "nation", label: "Country / Nation", section: "Personal", required: true },
      { key: "identification", label: "Identification", section: "Personal" },
      { key: "days_for_identity", label: "ID Issue Date", section: "Personal", type: "date" },
      { key: "place_of_issue", label: "Place of Issue", section: "Personal" },
      { key: "Visa_Status", label: "Visa Status", section: "Employment" },
      { key: "desired_salary", label: "Desired Salary", section: "Employment", type: "money" },
      { key: "year_experience", label: "Years of Experience", section: "Employment" },
      { key: "recruitment_channel", label: "Recruitment Channel ID", section: "Employment", type: "number" },
      { key: "skill", label: "Skills", section: "Employment" },
      { key: "introduce_yourself", label: "Profile", section: "Employment", type: "multiline" },
      { key: "status", label: "Stage", section: "Workflow", type: "number", readOnly: true },
      { key: "rate", label: "Rating", section: "Workflow", type: "number" },
      { key: "active", label: "Portal Active", section: "Workflow", type: "boolean" },
      { key: "date_add", label: "Added", section: "System", type: "date", readOnly: true },
      { key: "applied_jobs", label: "Applied Jobs", section: "Applications", type: "json", readOnly: true },
    ],
    tabs: [
      { key: "education", title: "Education", moduleKey: "recruitment_candidate_education", endpointTemplate: "recruitment_api/education?candidate_id={id}", createDefaults: { candidate: "{id}" } },
      { key: "experience", title: "Experience", moduleKey: "recruitment_candidate_experience", endpointTemplate: "recruitment_api/experience?candidate_id={id}", createDefaults: { candidate: "{id}" } },
    ],
    actions: [
      { key: "change_stage", title: "Change Stage…", icon: "swap-horizontal-outline", endpointTemplate: "recruitment_api/candidates/{id}/change_stage", method: "PUT",
        fields: [{ key: "status", label: "Candidate Stage", type: "select", required: true, options: [
          { label: "Application", value: 1 }, { label: "Potential", value: 2 },
          { label: "Interview", value: 3 }, { label: "Won Interview", value: 4 },
          { label: "Send Offer", value: 5 }, { label: "Elect", value: 6 },
          { label: "Not Elected", value: 7 }, { label: "Unanswered", value: 8 },
          { label: "Transferred", value: 9 }, { label: "Freedom", value: 10 },
        ] }],
        successMessage: "Stage updated",
      },
    ],
  },
  {
    key: "recruitment_candidate_education",
    title: "Education Record",
    plural: "Education",
    group: "HR",
    endpoint: "recruitment_api/education",
    permissionFeature: "recruitment",
    idKey: "li_id",
    icon: "school-outline",
    color: "#7C3AED",
    titleFields: ["diploma", "specialized", "training_places"],
    subtitleFields: ["literacy_from_date", "literacy_to_date", "training_form"],
    searchFields: ["diploma", "specialized", "training_places", "training_form"],
    filterableFields: ["candidate", "literacy_from_date", "literacy_to_date", "diploma", "training_places", "specialized", "training_form"],
    fields: [
      { key: "candidate", label: "Candidate ID", type: "number", required: true, createOnly: true },
      { key: "literacy_from_date", label: "From", type: "date" },
      { key: "literacy_to_date", label: "To", type: "date" },
      { key: "diploma", label: "Diploma / Degree" },
      { key: "training_places", label: "Institution" },
      { key: "specialized", label: "Specialization" },
      { key: "training_form", label: "Study Format" },
    ],
  },
  {
    key: "recruitment_candidate_experience",
    title: "Work Experience",
    plural: "Work Experience",
    group: "HR",
    endpoint: "recruitment_api/experience",
    permissionFeature: "recruitment",
    idKey: "we_id",
    icon: "briefcase-outline",
    color: "#7C3AED",
    titleFields: ["position", "company"],
    subtitleFields: ["from_date", "to_date", "salary"],
    searchFields: ["company", "position", "contact_person", "reason_quitwork", "job_description"],
    filterableFields: ["candidate", "from_date", "to_date", "company", "position", "contact_person", "salary", "reason_quitwork", "job_description"],
    fields: [
      { key: "candidate", label: "Candidate ID", type: "number", required: true, createOnly: true },
      { key: "from_date", label: "From", type: "date" },
      { key: "to_date", label: "To", type: "date" },
      { key: "company", label: "Company" },
      { key: "position", label: "Position" },
      { key: "contact_person", label: "Contact Person" },
      { key: "salary", label: "Salary", type: "money" },
      { key: "reason_quitwork", label: "Reason for Leaving", type: "multiline" },
      { key: "job_description", label: "Job Description", type: "multiline" },
    ],
  },
  {
    key: "recruitment_positions",
    title: "Job Position",
    plural: "Job Positions",
    group: "HR",
    endpoint: "recruitment_api/positions",
    permissionFeature: "recruitment",
    idKey: "position_id",
    icon: "briefcase-outline",
    color: "#7C3AED",
    titleFields: ["position_name"],
    subtitleFields: ["industry_id", "company_id"],
    searchFields: ["position_name", "position_description", "job_skill"],
    filterableFields: ["position_id", "position_name", "position_description", "industry_id", "company_id", "job_skill"],
    fields: [
      { key: "position_name", label: "Position Name", section: "Position", required: true },
      { key: "position_description", label: "Description", section: "Position", type: "multiline" },
      { key: "industry_id", label: "Industry ID", section: "Classification", type: "number" },
      { key: "company_id", label: "Company ID", section: "Classification", type: "number" },
      { key: "job_skill", label: "Skill IDs", section: "Classification", placeholder: "Comma-separated IDs" },
    ],
  },
  {
    key: "recruitment_proposals",
    title: "Recruitment Proposal",
    plural: "Recruitment Proposals",
    group: "HR",
    endpoint: "recruitment_api/proposals",
    permissionFeature: "recruitment",
    idKey: "id",
    icon: "document-text-outline",
    color: "#6D28D9",
    titleFields: ["proposal_name"],
    subtitleFields: ["position", "department", "from_date", "to_date", "status"],
    searchFields: ["proposal_name", "reason_recruitment", "job_description", "workplace"],
    filterableFields: ["proposal_name", "position", "department", "amount_recruiment", "workplace", "salary_from", "salary_to", "from_date", "to_date", "approver", "status", "date_add"],
    fields: [
      { key: "proposal_name", label: "Proposal Name", section: "Proposal", required: true },
      { key: "position", label: "Position ID", section: "Proposal", type: "number", required: true },
      { key: "department", label: "Department ID", section: "Proposal", type: "number" },
      { key: "amount_recruiment", label: "Headcount", section: "Proposal", type: "number" },
      { key: "form_work", label: "Work Form", section: "Proposal" },
      { key: "workplace", label: "Workplace", section: "Proposal" },
      { key: "salary_from", label: "Salary From", section: "Compensation", type: "money" },
      { key: "salary_to", label: "Salary To", section: "Compensation", type: "money" },
      { key: "from_date", label: "From", section: "Dates", type: "date" },
      { key: "to_date", label: "To", section: "Dates", type: "date", required: true },
      { key: "reason_recruitment", label: "Recruitment Reason", section: "Details", type: "multiline" },
      { key: "job_description", label: "Job Description", section: "Details", type: "multiline" },
      { key: "approver", label: "Approver", section: "Approval", relation: "staff", required: true },
      { key: "status", label: "Status", section: "Approval", type: "number", readOnly: true },
      { key: "add_from", label: "Added By", section: "System", relation: "staff", readOnly: true },
      { key: "date_add", label: "Added", section: "System", type: "date", readOnly: true },
    ],
  },
  {
    key: "hr_payslips",
    title: "Payroll Run",
    plural: "Payroll Runs",
    group: "HR",
    endpoint: "hr_payroll_api/payslips",
    permissionFeature: "hrp_payslip",
    idKey: "id",
    icon: "cash-outline",
    color: "#16A34A",
    titleFields: ["payslip_name"],
    subtitleFields: ["payslip_month", "payslip_status"],
    searchFields: ["payslip_name"],
    filterableFields: ["payslip_month", "payslip_status", "payslip_name", "payslip_template_id", "date_created"],
    filterRules: {
      payslip_status: { ruleType: "MultiSelectRule" },
      payslip_template_id: { ruleType: "SelectRule", operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "payslip_name", label: "Payroll Name", section: "Payroll", required: true },
      { key: "payslip_month", label: "Payroll Month", section: "Payroll", type: "date", required: true },
      { key: "payslip_template_id", label: "Template ID", section: "Payroll", type: "number" },
      { key: "payslip_status", label: "Status", section: "Payroll", type: "select", options: [
        { label: "Opening", value: "payslip_opening" },
        { label: "Closed", value: "payslip_closed" },
        { label: "Paid", value: "payslip_paid" },
      ] },
      { key: "payslip_range", label: "Staff Range", section: "Payroll", type: "multiline" },
      { key: "date_created", label: "Created", section: "Audit", type: "datetime", readOnly: true },
    ],
    tabs: [
      { key: "staff_payslips", title: "Staff Payslips", moduleKey: "hr_payslip_details", endpointTemplate: "hr_payroll_api/payslip_details?payslip_id={id}", childField: "payslip_id", parentField: "id", createDefaults: { payslip_id: "{id}" } },
    ],
    actions: [
      { key: "mark_paid", title: "Mark as Paid", icon: "cash-outline", endpointTemplate: "hr_payroll_api/payslips/{id}/mark_paid", method: "PUT", confirm: "Mark this payslip as paid?", successMessage: "Payslip marked paid" },
    ],
  },
  {
    key: "hr_payslip_details",
    title: "Staff Payslip",
    plural: "Staff Payslips",
    group: "HR",
    endpoint: "hr_payroll_api/payslip_details",
    permissionFeature: "hrp_payslip",
    idKey: "id",
    icon: "person-outline",
    color: "#15803D",
    titleFields: ["employee_name", "pay_slip_number"],
    subtitleFields: ["month", "net_pay"],
    searchFields: ["employee_name", "pay_slip_number", "dept_name"],
    filterableFields: ["payslip_id", "staff_id", "month", "gross_pay", "total_deductions", "net_pay"],
    filterRules: {
      payslip_id: { ruleType: "SelectRule", operators: ["equal", "not_equal"] },
      staff_id: { ruleType: "SelectRule", operators: ["equal", "not_equal"] },
    },
    fields: [
      { key: "payslip_id", label: "Payroll Run ID", section: "Payroll", type: "number", required: true },
      { key: "staff_id", label: "Staff", section: "Employee", type: "number", relation: "staff", required: true },
      { key: "month", label: "Month", section: "Payroll", type: "date", required: true },
      { key: "pay_slip_number", label: "Payslip Number", section: "Payroll" },
      { key: "payment_run_date", label: "Payment Date", section: "Payroll", type: "date" },
      { key: "employee_name", label: "Employee", section: "Employee", readOnly: true },
      { key: "dept_name", label: "Department", section: "Employee", readOnly: true },
      { key: "standard_workday", label: "Standard Workdays", section: "Attendance", type: "number" },
      { key: "actual_workday", label: "Actual Workdays", section: "Attendance", type: "number" },
      { key: "paid_leave", label: "Paid Leave", section: "Attendance", type: "number" },
      { key: "unpaid_leave", label: "Unpaid Leave", section: "Attendance", type: "number" },
      { key: "gross_pay", label: "Gross Pay", section: "Totals", type: "money" },
      { key: "commission_amount", label: "Commission", section: "Totals", type: "money" },
      { key: "bonus_kpi", label: "Bonus / KPI", section: "Totals", type: "money" },
      { key: "income_tax_paye", label: "Income Tax", section: "Deductions", type: "money" },
      { key: "total_insurance", label: "Insurance", section: "Deductions", type: "money" },
      { key: "total_deductions", label: "Total Deductions", section: "Deductions", type: "money" },
      { key: "net_pay", label: "Net Pay", section: "Totals", type: "money" },
    ],
  },
  {
    key: "hr_payroll_commissions",
    title: "Commission",
    plural: "Commissions",
    group: "HR",
    endpoint: "hr_payroll_api/commissions",
    permissionFeature: "hrp_commission",
    idKey: "id",
    icon: "trending-up-outline",
    color: "#0F766E",
    titleFields: ["staff_id", "commission_amount"],
    subtitleFields: ["month", "rel_type"],
    searchFields: ["staff_name", "rel_type"],
    defaultSort: { field: "month", direction: "desc" },
    sortableFields: ["month", "staff_id", "commission_amount", "rel_type", "id"],
    filterableFields: ["staff_id", "month", "commission_amount", "rel_type"],
    filterRules: { staff_id: { ruleType: "SelectRule", operators: ["equal", "not_equal"] } },
    fields: [
      { key: "staff_id", label: "Staff", section: "Commission", type: "number", relation: "staff", required: true },
      { key: "month", label: "Month", section: "Commission", type: "date", required: true },
      { key: "commission_amount", label: "Amount", section: "Commission", type: "money", required: true },
      { key: "rel_type", label: "Source", section: "Commission" },
    ],
  },
  {
    key: "hr_payroll_templates",
    title: "Payroll Template",
    plural: "Payroll Templates",
    group: "HR",
    endpoint: "hr_payroll_api/templates",
    permissionFeature: "hrp_payslip_template",
    idKey: "id",
    icon: "grid-outline",
    color: "#475569",
    titleFields: ["templates_name"],
    subtitleFields: ["date_created"],
    searchFields: ["templates_name"],
    defaultSort: { field: "templates_name", direction: "asc" },
    sortableFields: ["templates_name", "staff_id_created", "date_created", "id"],
    filterableFields: ["templates_name", "staff_id_created", "date_created"],
    fields: [
      { key: "templates_name", label: "Template Name", section: "Template", required: true },
      { key: "staff_id_created", label: "Created By", section: "Audit", type: "number", relation: "staff", readOnly: true },
      { key: "date_created", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "department_id", label: "Departments", section: "Scope", type: "json" },
      { key: "role_employees", label: "Roles", section: "Scope", type: "json" },
      { key: "staff_employees", label: "Staff", section: "Scope", type: "json" },
      { key: "except_staff", label: "Excluded Staff", section: "Scope", type: "json" },
      { key: "payslip_columns", label: "Payslip Columns", section: "Template", type: "json" },
    ],
  },
  {
    key: "hr_earning_types",
    title: "Earning Type",
    plural: "Earning Types",
    group: "HR",
    endpoint: "hr_payroll_api/earning_types",
    permissionFeature: "hrp_setting",
    idKey: "id",
    icon: "add-circle-outline",
    color: "#16A34A",
    titleFields: ["description", "code"],
    subtitleFields: ["short_name", "basis_type"],
    searchFields: ["code", "description", "short_name", "basis_type"],
    defaultSort: { field: "description", direction: "asc" },
    sortableFields: ["description", "code", "short_name", "basis_type", "id"],
    filterableFields: ["code", "description", "short_name", "taxable", "basis_type"],
    fields: [
      { key: "code", label: "Code", section: "Earning" },
      { key: "description", label: "Description", section: "Earning", required: true },
      { key: "short_name", label: "Short Name", section: "Earning" },
      { key: "taxable", label: "Taxable", section: "Earning", type: "boolean" },
      { key: "basis_type", label: "Basis Type", section: "Earning" },
    ],
  },
  {
    key: "hr_deduction_types",
    title: "Deduction Type",
    plural: "Deduction Types",
    group: "HR",
    endpoint: "hr_payroll_api/deduction_types",
    permissionFeature: "hrp_setting",
    idKey: "id",
    icon: "remove-circle-outline",
    color: "#DC2626",
    titleFields: ["description", "code"],
    subtitleFields: ["rate", "basis"],
    searchFields: ["code", "description", "basis", "earn_inclusion", "earn_exclusion"],
    defaultSort: { field: "description", direction: "asc" },
    sortableFields: ["description", "code", "rate", "basis", "annual_tax_limit", "id"],
    filterableFields: ["code", "description", "rate", "basis", "earnings_max", "tax", "annual_tax_limit"],
    fields: [
      { key: "code", label: "Code", section: "Deduction" },
      { key: "description", label: "Description", section: "Deduction", required: true },
      { key: "rate", label: "Rate", section: "Deduction", type: "number" },
      { key: "basis", label: "Basis", section: "Deduction" },
      { key: "tax", label: "Tax", section: "Deduction", type: "boolean" },
      { key: "annual_tax_limit", label: "Annual Tax Limit", section: "Deduction", type: "money" },
    ],
  },
  {
    key: "hr_contracts",
    title: "Employment Contract",
    plural: "Employment Contracts",
    group: "HR",
    endpoint: "hr_profile_api/contracts",
    permissionFeature: "hrm_contract",
    idKey: "id_contract",
    icon: "document-lock-outline",
    color: "#334155",
    titleFields: ["contract_code"],
    subtitleFields: ["staff", "start_valid", "contract_status"],
    searchFields: ["contract_code"],
    defaultSort: { field: "start_valid", direction: "desc" },
    filterableFields: ["contract_code", "name_contract", "staff", "start_valid", "end_valid", "contract_status"],
    fields: [
      { key: "contract_code", label: "Contract Code", section: "Contract", required: true },
      { key: "name_contract", label: "Contract Type", section: "Contract", type: "number", relation: "hr_contract_type", required: true },
      { key: "staff", label: "Employee", section: "Employee", type: "number", relation: "staff", required: true },
      { key: "staff_delegate", label: "Company Signatory", section: "Employee", type: "number", relation: "staff" },
      { key: "start_valid", label: "Starts", section: "Dates", type: "date", required: true },
      { key: "end_valid", label: "Ends", section: "Dates", type: "date" },
      { key: "sign_day", label: "Company Sign Date", section: "Dates", type: "date" },
      { key: "staff_sign_day", label: "Employee Sign Date", section: "Dates", type: "date", readOnly: true },
      { key: "contract_status", label: "Status", section: "Contract" },
      { key: "hourly_or_month", label: "Pay Basis", section: "Contract" },
      { key: "content", label: "Contract Content", section: "Content", type: "multiline" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "hr_contract" } },
    ],
  },
  {
    key: "hr_contract_types",
    title: "Contract Type",
    plural: "Contract Types",
    group: "HR",
    endpoint: "hr_profile_api/contract_types",
    permissionFeature: "hrm_setting",
    idKey: "id_contracttype",
    icon: "documents-outline",
    color: "#475569",
    titleFields: ["name_contracttype"],
    subtitleFields: ["duration", "unit"],
    searchFields: ["name_contracttype", "description"],
    filterableFields: ["name_contracttype", "duration", "unit", "insurance"],
    fields: [
      { key: "name_contracttype", label: "Name", section: "Contract Type", required: true },
      { key: "description", label: "Description", section: "Contract Type", type: "multiline" },
      { key: "duration", label: "Duration", section: "Term", type: "number" },
      { key: "unit", label: "Duration Unit", section: "Term", type: "select", options: [
        { label: "Days", value: "day" }, { label: "Months", value: "month" }, { label: "Years", value: "year" },
      ] },
      { key: "insurance", label: "Insurance Included", section: "Benefits", type: "boolean" },
    ],
  },
  {
    key: "hr_contract_templates",
    title: "Contract Template",
    plural: "Contract Templates",
    group: "HR",
    endpoint: "hr_profile_api/contract_templates",
    permissionFeature: "hrm_setting",
    idKey: "id",
    icon: "newspaper-outline",
    color: "#475569",
    titleFields: ["name"],
    subtitleFields: ["job_position"],
    searchFields: ["name", "content"],
    filterableFields: ["name", "job_position"],
    fields: [
      { key: "name", label: "Template Name", section: "Template", required: true },
      { key: "job_position", label: "Job Positions", section: "Applies To", type: "number", relation: "hr_job_position", multiple: true, required: true },
      { key: "content", label: "Contract Content", section: "Template", type: "multiline" },
    ],
  },
  {
    key: "hr_salary_types",
    title: "Salary Type",
    plural: "Salary Types",
    group: "HR",
    endpoint: "hr_profile_api/salary_types",
    permissionFeature: "hrm_setting",
    idKey: "form_id",
    icon: "wallet-outline",
    color: "#15803D",
    titleFields: ["form_name"],
    subtitleFields: ["salary_val", "tax"],
    searchFields: ["form_name"],
    filterableFields: ["form_name", "salary_val", "tax"],
    fields: [
      { key: "form_name", label: "Name", section: "Salary Type", required: true },
      { key: "salary_val", label: "Default Value", section: "Salary Type", type: "money", required: true },
      { key: "tax", label: "Taxable", section: "Salary Type", type: "boolean" },
    ],
  },
  {
    key: "hr_allowance_types",
    title: "Allowance Type",
    plural: "Allowance Types",
    group: "HR",
    endpoint: "hr_profile_api/allowance_types",
    permissionFeature: "hrm_setting",
    idKey: "type_id",
    icon: "add-circle-outline",
    color: "#15803D",
    titleFields: ["type_name"],
    subtitleFields: ["allowance_val", "taxable"],
    searchFields: ["type_name"],
    filterableFields: ["type_name", "allowance_val", "taxable"],
    fields: [
      { key: "type_name", label: "Name", section: "Allowance Type", required: true },
      { key: "allowance_val", label: "Default Value", section: "Allowance Type", type: "money", required: true },
      { key: "taxable", label: "Taxable", section: "Allowance Type", type: "boolean" },
    ],
  },
  {
    key: "hr_dependents",
    title: "Dependent",
    plural: "Dependents",
    group: "HR",
    endpoint: "hr_profile_api/dependents",
    permissionFeature: "hrm_dependent_person",
    idKey: "id",
    icon: "people-outline",
    color: "#7C3AED",
    titleFields: ["dependent_name"],
    subtitleFields: ["relationship", "dependent_bir", "status"],
    searchFields: ["dependent_name", "dependent_iden", "relationship"],
    filterableFields: ["staffid", "dependent_name", "relationship", "dependent_bir", "start_month", "end_month", "status"],
    statusField: "status",
    statusOptions: [
      { label: "Pending", value: 0, color: "#D97706" },
      { label: "Approved", value: 1, color: "#16A34A" },
      { label: "Rejected", value: 2, color: "#DC2626" },
    ],
    fields: [
      { key: "staffid", label: "Employee", section: "Employee", type: "number", relation: "staff", required: true },
      { key: "dependent_name", label: "Dependent Name", section: "Dependent", required: true },
      { key: "relationship", label: "Relationship", section: "Dependent" },
      { key: "dependent_bir", label: "Date of Birth", section: "Dependent", type: "date", required: true },
      { key: "dependent_iden", label: "Identification Number", section: "Dependent", required: true },
      { key: "start_month", label: "Effective From", section: "Dates", type: "date" },
      { key: "end_month", label: "Effective Until", section: "Dates", type: "date" },
      { key: "reason", label: "Reason", section: "Dependent", type: "multiline" },
      { key: "status", label: "Approval Status", section: "Approval", type: "select", options: [
        { label: "Pending", value: 0 }, { label: "Approved", value: 1 }, { label: "Rejected", value: 2 },
      ], readOnly: true },
      { key: "status_comment", label: "Approval Comment", section: "Approval", type: "multiline", readOnly: true },
    ],
    actions: [
      { key: "approve", title: "Approve", icon: "checkmark-circle-outline", endpointTemplate: "hr_profile_api/dependents/{id}/approve", confirm: "Approve this dependent?", successMessage: "Dependent approved" },
      { key: "reject", title: "Reject…", icon: "close-circle-outline", endpointTemplate: "hr_profile_api/dependents/{id}/reject", destructive: true, fields: [
        { key: "reason", label: "Rejection Reason", type: "multiline", required: true },
      ], successMessage: "Dependent rejected" },
    ],
  },
  {
    key: "hr_job_positions",
    title: "Job Position",
    plural: "HR Job Positions",
    group: "HR",
    endpoint: "hr_profile_api/job_positions",
    permissionFeature: "staffmanage_job_position",
    idKey: "position_id",
    icon: "briefcase-outline",
    color: "#4F46E5",
    titleFields: ["position_name"],
    subtitleFields: ["position_code", "department_id"],
    searchFields: ["position_name", "position_code"],
    filterableFields: ["position_name", "position_code", "job_p_id"],
    fields: [
      { key: "position_name", label: "Position Name", section: "Position", required: true },
      { key: "position_code", label: "Position Code", section: "Position" },
      { key: "job_p_id", label: "Job Group ID", section: "Position", type: "number", required: true },
      { key: "department_id", label: "Department IDs", section: "Position", placeholder: "1, 2" },
      { key: "job_position_description", label: "Description", section: "Position", type: "multiline" },
      { key: "tags", label: "Tags", section: "Position" },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "job_position" } },
    ],
  },
  {
    key: "hr_workplaces",
    title: "Workplace",
    plural: "Workplaces",
    group: "HR",
    endpoint: "hr_profile_api/workplaces",
    permissionFeature: "hrm_setting",
    idKey: "id",
    icon: "location-outline",
    color: "#0F766E",
    titleFields: ["name"],
    subtitleFields: ["workplace_address"],
    searchFields: ["name", "workplace_address"],
    filterableFields: ["name", "workplace_address", "default"],
    fields: [
      { key: "name", label: "Name", section: "Workplace", required: true },
      { key: "workplace_address", label: "Address", section: "Workplace", type: "multiline" },
      { key: "latitude", label: "Latitude", section: "Location", type: "number" },
      { key: "longitude", label: "Longitude", section: "Location", type: "number" },
      { key: "default", label: "Default Workplace", section: "Workplace", type: "boolean" },
    ],
  },
  {
    key: "hr_training_types",
    title: "Training Type",
    plural: "Training Types",
    group: "HR",
    endpoint: "hr_profile_api/training_types",
    permissionFeature: "hrm_setting",
    idKey: "id",
    icon: "school-outline",
    color: "#0891B2",
    titleFields: ["name"],
    searchFields: ["name"],
    filterableFields: ["name"],
    fields: [
      { key: "name", label: "Training Type", section: "Training", required: true },
    ],
  },
  {
    key: "hr_training_libraries",
    title: "Training Material",
    plural: "Training Library",
    group: "HR",
    endpoint: "hr_profile_api/training_libraries",
    permissionFeature: "staffmanage_training",
    idKey: "training_id",
    icon: "library-outline",
    color: "#4338CA",
    titleFields: ["subject"],
    subtitleFields: ["training_type", "active", "datecreated"],
    searchFields: ["subject", "description", "viewdescription", "fromname"],
    defaultSort: { field: "datecreated", direction: "desc" },
    filterableFields: ["subject", "training_type", "datecreated", "active", "onlyforloggedin"],
    statusField: "active",
    statusOptions: [
      { label: "Active", value: 1, color: "#16A34A" },
      { label: "Disabled", value: 0, color: "#64748B" },
    ],
    fields: [
      { key: "subject", label: "Title", section: "Training", required: true },
      { key: "training_type", label: "Training Type", section: "Training", type: "number", relation: "hr_training_type", required: true },
      { key: "description", label: "Description", section: "Content", type: "multiline" },
      { key: "viewdescription", label: "Instructions", section: "Content", type: "multiline" },
      { key: "fromname", label: "Presenter / Sender", section: "Delivery" },
      { key: "active", label: "Active", section: "Access", type: "boolean", defaultValue: "on" },
      { key: "onlyforloggedin", label: "Login Required", section: "Access", type: "boolean" },
      { key: "iprestrict", label: "Restrict by IP", section: "Access", type: "boolean" },
      { key: "datecreated", label: "Created", section: "Audit", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "hr_training_programs",
    title: "Training Program",
    plural: "Training Programs",
    group: "HR",
    endpoint: "hr_profile_api/training_programs",
    permissionFeature: "staffmanage_training",
    idKey: "training_process_id",
    icon: "ribbon-outline",
    color: "#7C3AED",
    titleFields: ["training_name"],
    subtitleFields: ["training_type", "time_to_start", "time_to_end", "mint_point"],
    searchFields: ["training_name", "description"],
    defaultSort: { field: "date_add", direction: "desc" },
    filterableFields: ["training_name", "training_type", "mint_point", "date_add", "time_to_start", "time_to_end", "additional_training"],
    fields: [
      { key: "training_name", label: "Program Name", section: "Program", required: true },
      { key: "training_type", label: "Training Type", section: "Program", type: "number", relation: "hr_training_type", required: true },
      { key: "position_training_id", label: "Training Materials", section: "Program", type: "number", relation: "hr_training_library", multiple: true, required: true },
      { key: "description", label: "Description", section: "Program", type: "multiline" },
      { key: "mint_point", label: "Minimum Passing Points", section: "Outcome", type: "number" },
      { key: "additional_training", label: "Assign Directly to Employees", section: "Audience", type: "boolean" },
      { key: "job_position_id", label: "Job Positions", section: "Audience", type: "number", relation: "hr_job_position", multiple: true },
      { key: "staff_id", label: "Employees", section: "Audience", type: "number", relation: "staff", multiple: true },
      { key: "time_to_start", label: "Starts", section: "Dates", type: "date" },
      { key: "time_to_end", label: "Ends", section: "Dates", type: "date" },
      { key: "date_add", label: "Created", section: "Audit", type: "datetime", readOnly: true },
      { key: "training_results", label: "Results", section: "Outcome", type: "json", readOnly: true },
    ],
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "training_program" } },
    ],
  },
  {
    key: "hr_education",
    title: "Education Record",
    plural: "Education & Training History",
    group: "HR",
    endpoint: "hr_profile_api/education",
    permissionFeature: "hrm_hr_records",
    idKey: "id",
    icon: "school-outline",
    color: "#0369A1",
    titleFields: ["training_programs_name"],
    subtitleFields: ["staff_id", "training_places", "degree"],
    searchFields: ["training_programs_name", "training_places", "training_result", "degree", "notes"],
    defaultSort: { field: "training_time_from", direction: "desc" },
    filterableFields: ["staff_id", "training_programs_name", "training_places", "training_time_from", "training_time_to", "training_result", "degree"],
    fields: [
      { key: "staff_id", label: "Employee", section: "Employee", type: "number", relation: "staff", required: true },
      { key: "training_programs_name", label: "Program / Qualification", section: "Education", required: true },
      { key: "training_places", label: "Institution / Place", section: "Education" },
      { key: "training_time_from", label: "From", section: "Dates", type: "datetime" },
      { key: "training_time_to", label: "To", section: "Dates", type: "datetime" },
      { key: "training_result", label: "Result", section: "Outcome" },
      { key: "degree", label: "Degree", section: "Outcome" },
      { key: "notes", label: "Notes", section: "Outcome", type: "multiline" },
      { key: "admin_id", label: "Added By", section: "Audit", type: "number", relation: "staff", readOnly: true },
      { key: "date_create", label: "Created", section: "Audit", type: "date", readOnly: true },
    ],
  },
  {
    key: "hr_resignations",
    title: "Offboarding Record",
    plural: "Resignation & Offboarding",
    group: "HR",
    endpoint: "hr_profile_api/resignations",
    permissionFeature: "hrm_procedures_for_quitting_work",
    idKey: "id",
    icon: "exit-outline",
    color: "#B45309",
    titleFields: ["staff_name"],
    subtitleFields: ["department_name", "dateoff", "approval", "progress_percent"],
    searchFields: ["staff_name", "department_name", "role_name", "email"],
    defaultSort: { field: "dateoff", direction: "desc" },
    filterableFields: ["staffid", "staff_name", "department_name", "role_name", "dateoff", "approval"],
    statusField: "approval",
    statusOptions: [
      { label: "Approved", value: "approved", color: "#16A34A" },
    ],
    filterRules: {
      approval: { ruleType: "SelectRule", operators: ["equal", "not_equal", "is_empty", "is_not_empty"] },
      staffid: { ruleType: "SelectRule", operators: ["equal", "not_equal"] },
    },
    canUpdate: false,
    fields: [
      { key: "staffid", label: "Employee", section: "Employee", type: "number", relation: "staff", required: true },
      { key: "staff_name", label: "Employee Name", section: "Employee", readOnly: true },
      { key: "department_name", label: "Department", section: "Employee" },
      { key: "role_name", label: "Role", section: "Employee" },
      { key: "email", label: "Email", section: "Employee", type: "email" },
      { key: "dateoff", label: "Last Working Day", section: "Offboarding", type: "datetime", required: true },
      { key: "approval", label: "Approval", section: "Offboarding", readOnly: true },
      { key: "progress_percent", label: "Checklist Progress (%)", section: "Offboarding", type: "number", readOnly: true },
    ],
    actions: [
      { key: "approve", title: "Complete Offboarding", icon: "checkmark-done-circle-outline", endpointTemplate: "hr_profile_api/resignations/{id}/approve", confirm: "Approve offboarding and deactivate this employee? Every checklist item must be complete.", successMessage: "Offboarding completed" },
    ],
  },
  {
    key: "gatepass",
    title: "Gatepass",
    plural: "Gatepasses",
    group: "Operations",
    endpoint: "gatepass_api",
    permissionFeature: "gatepass",
    idKey: "id",
    icon: "log-in-outline",
    color: "#0F766E",
    titleFields: ["ref_number", "po_number", "id"],
    subtitleFields: ["work_location", "duration_from", "duration_to", "status"],
    searchFields: ["ref_number", "po_number", "work_location", "work_details", "stations", "substation", "contract_number"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["ref_number", "po_number", "project_id", "representative_id", "rel_type", "rel_id", "duration", "duration_from", "duration_to", "work_location", "stations", "substation", "status", "created_at"],
    statusField: "status",
    statusOptions: [{ label: "Active", value: 1, color: "#16A34A" }, { label: "Expired", value: 0, color: "#64748B" }],
    fields: [
      { key: "ref_number", label: "Reference Number", section: "Reference" },
      { key: "po_number", label: "RFX / PO Number", section: "Reference" },
      { key: "contract_number", label: "Contract Number", section: "Reference" },
      { key: "rel_type", label: "Related Type", section: "Relation", type: "select", options: [{ label: "Project", value: "project" }, { label: "Opportunity", value: "opportunity" }] },
      { key: "rel_id", label: "Related Record ID", section: "Relation", type: "number" },
      { key: "project_id", label: "Project ID", section: "Relation", type: "number" },
      { key: "work_location", label: "Work Location", section: "Work", required: true },
      { key: "stations", label: "Stations", section: "Work" },
      { key: "substation", label: "Substations", section: "Work" },
      { key: "work_details", label: "Work Details", section: "Work", type: "multiline", required: true },
      { key: "duration", label: "Duration Type", section: "Validity", type: "select", options: [{ label: "Short Term Entry Pass", value: "Short Term Entry Pass" }, { label: "Long Term Entry Pass", value: "Long Term Entry Pass" }, { label: "One Day Entry Pass", value: "One Day Entry Pass" }], required: true },
      { key: "duration_from", label: "Valid From", section: "Validity", type: "date", required: true },
      { key: "duration_to", label: "Valid Until", section: "Validity", type: "date", required: true },
      { key: "representative_id", label: "Representative Employee", section: "People", relation: "staff" },
      { key: "staff_id", label: "People Involved", section: "People", relation: "staff", multiple: true, submitAsArray: true },
      { key: "vehicle_id", label: "Vehicles", section: "People", relation: "gatepass_vehicle", multiple: true, submitAsArray: true },
      { key: "status", label: "Status", section: "System", type: "boolean", readOnly: true },
      { key: "created_by", label: "Created By", section: "System", relation: "staff", readOnly: true },
      { key: "updated_by", label: "Updated By", section: "System", relation: "staff", readOnly: true },
      { key: "created_at", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "gatepass_vehicles",
    title: "Gatepass Vehicle",
    plural: "Gatepass Vehicles",
    group: "Operations",
    endpoint: "gatepass_api/vehicles",
    permissionFeature: "gatepass_vehicles",
    idKey: "id",
    icon: "car-outline",
    color: "#0F766E",
    titleFields: ["plate_code", "register_number"],
    subtitleFields: ["type", "emirate", "driver_id", "status"],
    searchFields: ["plate_code", "register_number", "type", "emirate", "remarks"],
    filterableFields: ["plate_code", "register_number", "type", "emirate", "insurance_expiration", "expiration_date", "status", "driver_id"],
    statusField: "status",
    statusOptions: [{ label: "Active", value: 1, color: "#16A34A" }, { label: "Expired", value: 0, color: "#64748B" }],
    fields: [
      { key: "plate_code", label: "Plate Code", section: "Vehicle", required: true },
      { key: "register_number", label: "Registration Number", section: "Vehicle", required: true },
      { key: "type", label: "Vehicle Type", section: "Vehicle" },
      { key: "color", label: "Color", section: "Vehicle" },
      { key: "emirate", label: "Emirate", section: "Vehicle" },
      { key: "driver_id", label: "Driver", section: "Vehicle", relation: "staff" },
      { key: "insurance_expiration", label: "Insurance Expiration", section: "Validity", type: "date", required: true },
      { key: "expiration_date", label: "Registration Expiration", section: "Validity", type: "date", required: true },
      { key: "remarks", label: "Remarks", section: "Vehicle", type: "multiline" },
      { key: "status", label: "Status", section: "System", type: "boolean", readOnly: true },
      { key: "created_at", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "fixed_equipment",
    title: "Asset",
    plural: "Fixed Equipment",
    group: "Operations",
    endpoint: "fixed_equipment_api",
    permissionFeature: "fixed_equipment_assets",
    idKey: "id",
    icon: "build-outline",
    color: "#475569",
    titleFields: ["assets_name", "series", "assets_code"],
    subtitleFields: ["model_name", "status_name", "current_location_name"],
    searchFields: ["assets_name", "series", "assets_code", "order_number", "description", "model_name", "model_no", "category_name", "status_name", "supplier_name", "current_location_name", "manufacturer_name"],
    defaultSort: { field: "id", direction: "desc" },
    sortableFields: ["id", "assets_name", "series", "date_buy", "unit_price", "date_creator", "updated_at"],
    filterableFields: ["id", "assets_name", "series", "model_id", "category_id", "manufacturer_id", "status", "supplier_id", "asset_location", "date_buy", "unit_price", "order_number", "warranty_period", "description", "requestable", "checkin_out", "date_creator", "updated_at"],
    fields: [
      { key: "assets_name", label: "Asset Name", section: "Asset", placeholder: "Uses model name when blank" },
      { key: "series", label: "Asset Tag / Serial", section: "Asset", required: true },
      { key: "model_id", label: "Model", section: "Asset", type: "number", relation: "equipment_model", required: true, filterRuleType: "SelectRule" },
      { key: "category_id", label: "Category", section: "Asset", type: "number", relation: "equipment_category", readOnly: true, filterRuleType: "SelectRule" },
      { key: "manufacturer_id", label: "Manufacturer", section: "Asset", type: "number", relation: "equipment_manufacturer", readOnly: true, filterRuleType: "SelectRule" },
      { key: "status", label: "Status", section: "Asset", type: "number", relation: "equipment_status", required: true, filterRuleType: "MultiSelectRule" },
      { key: "supplier_id", label: "Supplier", section: "Purchase", type: "number", relation: "equipment_supplier", filterRuleType: "SelectRule" },
      { key: "date_buy", label: "Purchase Date", section: "Purchase", type: "date" },
      { key: "unit_price", label: "Purchase Cost", section: "Purchase", type: "money" },
      { key: "order_number", label: "Order Number", section: "Purchase" },
      { key: "asset_location", label: "Default Location", section: "Location", type: "number", relation: "equipment_location", filterRuleType: "SelectRule" },
      { key: "warranty_period", label: "Warranty (months)", section: "Purchase", type: "number" },
      { key: "requestable", label: "Requestable", section: "Asset", type: "boolean" },
      { key: "checkin_out", label: "Custody State", section: "Location", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Checked in", value: 1 }, { label: "Checked out", value: 2 },
      ] },
      { key: "description", label: "Description", section: "Notes", type: "multiline" },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [
      { key: "checkout_staff", availabilityKey: "checkout", title: "Check Out to Staff", icon: "person-add-outline", endpointTemplate: "fixed_equipment_api/{id}/checkout", method: "POST", body: { checkout_to: "user" },
        fields: [
          { key: "status", label: "Deployable Status", type: "number", required: true, relation: "equipment_deployable_status" },
          { key: "staff_id", label: "Staff", type: "number", required: true, relation: "staff" },
          { key: "checkin_date", label: "Check-out Date", type: "date" },
          { key: "expected_checkin_date", label: "Expected Check-in", type: "date" },
          { key: "notes", label: "Notes", type: "multiline" },
        ],
        successMessage: "Asset checked out",
      },
      { key: "checkout_asset", availabilityKey: "checkout", title: "Check Out to Asset", icon: "git-compare-outline", endpointTemplate: "fixed_equipment_api/{id}/checkout", method: "POST", body: { checkout_to: "asset" }, fields: [
        { key: "status", label: "Deployable Status", type: "number", required: true, relation: "equipment_deployable_status" },
        { key: "asset_id", label: "Target Asset", type: "number", required: true, relation: "equipment_asset" },
        { key: "checkin_date", label: "Check-out Date", type: "date" },
        { key: "expected_checkin_date", label: "Expected Check-in", type: "date" },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "Asset checked out" },
      { key: "checkout_location", availabilityKey: "checkout", title: "Check Out to Location", icon: "location-outline", endpointTemplate: "fixed_equipment_api/{id}/checkout", method: "POST", body: { checkout_to: "location" }, fields: [
        { key: "status", label: "Deployable Status", type: "number", required: true, relation: "equipment_deployable_status" },
        { key: "location_id", label: "Location", type: "number", required: true, relation: "equipment_location" },
        { key: "checkin_date", label: "Check-out Date", type: "date" },
        { key: "expected_checkin_date", label: "Expected Check-in", type: "date" },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "Asset checked out" },
      { key: "checkin", availabilityKey: "checkin", title: "Check In", icon: "arrow-undo-outline", endpointTemplate: "fixed_equipment_api/{id}/checkin", method: "POST", fields: [
        { key: "status", label: "Status", type: "number", required: true, relation: "equipment_status" },
        { key: "location_id", label: "Return Location (optional)", type: "number", relation: "equipment_location" },
        { key: "checkin_date", label: "Check-in Date", type: "date", required: true },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "Asset checked in" },
    ],
    tabs: [
      { key: "maintenances", title: "Maintenance", moduleKey: "fixed_equipment_maintenances", endpointTemplate: "fixed_equipment_api/maintenances?asset_id={id}", createDefaults: { asset_id: "{id}" } },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "asset_files" } },
    ],
  },
  {
    key: "fixed_equipment_categories",
    title: "Equipment Category",
    plural: "Equipment Categories",
    group: "Inventory",
    endpoint: "fixed_equipment_api/categories",
    permissionFeature: ["fixed_equipment_assets", "fixed_equipment_licenses", "fixed_equipment_accessories", "fixed_equipment_consumables", "fixed_equipment_components"],
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    idKey: "id",
    icon: "folder-open-outline",
    color: "#475569",
    titleFields: ["category_name"],
    subtitleFields: ["type", "confirm_acceptance", "date_creator"],
    searchFields: ["category_name", "category_eula"],
    filterableFields: ["category_name", "type", "primary_default_eula", "confirm_acceptance", "send_mail_to_user", "date_creator"],
    fields: [
      { key: "category_name", label: "Category Name", section: "Category", required: true },
      { key: "type", label: "Inventory Type", section: "Category", type: "select", required: true, defaultValue: "asset", filterRuleType: "MultiSelectRule", options: [
        { label: "Asset", value: "asset" }, { label: "Accessory", value: "accessory" }, { label: "Consumable", value: "consumable" }, { label: "Component", value: "component" }, { label: "License", value: "license" },
      ] },
      { key: "category_eula", label: "Acceptance Terms", section: "Acceptance", type: "multiline" },
      { key: "primary_default_eula", label: "Default Terms", section: "Acceptance", type: "boolean" },
      { key: "confirm_acceptance", label: "Require Acceptance", section: "Acceptance", type: "boolean" },
      { key: "send_mail_to_user", label: "Email User", section: "Acceptance", type: "boolean" },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "fixed_equipment_manufacturers",
    title: "Equipment Manufacturer",
    plural: "Equipment Manufacturers",
    group: "Inventory",
    endpoint: "fixed_equipment_api/manufacturers",
    permissionFeature: ["fixed_equipment_assets", "fixed_equipment_licenses", "fixed_equipment_accessories", "fixed_equipment_consumables", "fixed_equipment_components"],
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    idKey: "id",
    icon: "business-outline",
    color: "#475569",
    titleFields: ["name"],
    subtitleFields: ["support_email", "support_phone", "date_creator"],
    searchFields: ["name", "url", "support_url", "support_phone", "support_email"],
    filterableFields: ["name", "url", "support_phone", "support_email", "date_creator"],
    fields: [
      { key: "name", label: "Manufacturer", section: "Manufacturer", required: true },
      { key: "url", label: "Website", section: "Support", type: "url" },
      { key: "support_url", label: "Support Website", section: "Support", type: "url" },
      { key: "support_phone", label: "Support Phone", section: "Support", type: "phone" },
      { key: "support_email", label: "Support Email", section: "Support", type: "email" },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "fixed_equipment_models",
    title: "Equipment Model",
    plural: "Equipment Models",
    group: "Inventory",
    endpoint: "fixed_equipment_api/models",
    permissionFeature: "fixed_equipment_assets",
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    idKey: "id",
    icon: "cube-outline",
    color: "#475569",
    titleFields: ["model_name", "model_no"],
    subtitleFields: ["manufacturer", "category", "depreciation", "eol"],
    searchFields: ["model_name", "model_no", "note"],
    filterableFields: ["model_name", "model_no", "manufacturer", "category", "depreciation", "eol", "may_request", "date_creator"],
    fields: [
      { key: "model_name", label: "Model Name", section: "Model", required: true },
      { key: "model_no", label: "Model Number", section: "Model" },
      { key: "manufacturer", label: "Manufacturer", section: "Classification", type: "number", relation: "equipment_manufacturer", filterRuleType: "MultiSelectRule" },
      { key: "category", label: "Asset Category", section: "Classification", type: "number", relation: "equipment_category", filterRuleType: "MultiSelectRule" },
      { key: "depreciation", label: "Depreciation", section: "Lifecycle", type: "number", relation: "equipment_depreciation", filterRuleType: "MultiSelectRule" },
      { key: "eol", label: "End of Life (months)", section: "Lifecycle", type: "number" },
      { key: "may_request", label: "Requestable", section: "Availability", type: "boolean" },
      { key: "fieldset_id", label: "Fieldset ID", section: "Configuration", type: "number" },
      { key: "note", label: "Notes", section: "Notes", type: "multiline" },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "fixed_equipment_suppliers",
    title: "Equipment Supplier",
    plural: "Equipment Suppliers",
    group: "Inventory",
    endpoint: "fixed_equipment_api/suppliers",
    permissionFeature: ["fixed_equipment_assets", "fixed_equipment_licenses", "fixed_equipment_accessories", "fixed_equipment_consumables", "fixed_equipment_components"],
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    idKey: "id",
    icon: "storefront-outline",
    color: "#475569",
    titleFields: ["supplier_name", "contact_name"],
    subtitleFields: ["email", "phone", "city", "country"],
    searchFields: ["supplier_name", "contact_name", "email", "phone", "address", "city", "state", "country"],
    filterableFields: ["supplier_name", "contact_name", "email", "phone", "city", "state", "country", "date_creator"],
    fields: [
      { key: "supplier_name", label: "Supplier Name", section: "Supplier", required: true },
      { key: "contact_name", label: "Contact Name", section: "Contact" },
      { key: "email", label: "Email", section: "Contact", type: "email" },
      { key: "phone", label: "Phone", section: "Contact", type: "phone" },
      { key: "fax", label: "Fax", section: "Contact" },
      { key: "url", label: "Website", section: "Contact", type: "url" },
      { key: "address", label: "Address", section: "Address", type: "multiline" },
      { key: "city", label: "City", section: "Address" },
      { key: "state", label: "State", section: "Address" },
      { key: "country", label: "Country", section: "Address" },
      { key: "zip", label: "Postal Code", section: "Address" },
      { key: "note", label: "Notes", section: "Notes", type: "multiline" },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "fixed_equipment_statuses",
    title: "Equipment Status",
    plural: "Equipment Statuses",
    group: "Inventory",
    endpoint: "fixed_equipment_api/statuses",
    permissionFeature: "fixed_equipment_assets",
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    idKey: "id",
    icon: "pricetags-outline",
    color: "#475569",
    titleFields: ["name"],
    subtitleFields: ["status_type", "default_label", "chart_color"],
    searchFields: ["name", "status_type", "note"],
    filterableFields: ["name", "status_type", "chart_color", "show_in_side_nav", "default_label", "date_creator"],
    fields: [
      { key: "name", label: "Status Name", section: "Status", required: true },
      { key: "status_type", label: "Status Type", section: "Status", type: "select", required: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Deployable", value: "deployable" }, { label: "Pending", value: "pending" }, { label: "Archived", value: "archived" }, { label: "Undeployable", value: "undeployable" },
      ] },
      { key: "chart_color", label: "Color (hex)", section: "Display", required: true, placeholder: "#0284C7" },
      { key: "show_in_side_nav", label: "Show in Navigation", section: "Display", type: "boolean" },
      { key: "default_label", label: "Default for Type", section: "Display", type: "boolean" },
      { key: "note", label: "Notes", section: "Notes", type: "multiline" },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "fixed_equipment_depreciations",
    title: "Depreciation Rule",
    plural: "Depreciation Rules",
    group: "Inventory",
    endpoint: "fixed_equipment_api/depreciations",
    permissionFeature: "fixed_equipment_depreciations",
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    idKey: "id",
    icon: "trending-down-outline",
    color: "#475569",
    titleFields: ["name"],
    subtitleFields: ["term", "date_creator"],
    searchFields: ["name"],
    filterableFields: ["name", "term", "date_creator"],
    fields: [
      { key: "name", label: "Rule Name", section: "Depreciation", required: true },
      { key: "term", label: "Term (months)", section: "Depreciation", type: "number", required: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "fixed_equipment_locations",
    title: "Equipment Location",
    plural: "Equipment Locations",
    group: "Operations",
    endpoint: "fixed_equipment_api/locations",
    permissionFeature: "fixed_equipment_locations",
    idKey: "id",
    icon: "location-outline",
    color: "#0F766E",
    titleFields: ["location_name"],
    subtitleFields: ["parent_name", "city", "country_name"],
    searchFields: ["location_name", "parent_name", "address", "city", "state", "zip", "country_name", "currency_name", "manager_name"],
    defaultSort: { field: "location_name", direction: "asc" },
    sortableFields: ["location_name", "city", "date_creator", "id"],
    filterableFields: ["id", "location_name", "parent", "manager", "location_currency", "address", "city", "state", "zip", "country", "date_creator"],
    fields: [
      { key: "location_name", label: "Location Name", section: "Location", required: true },
      { key: "parent", label: "Parent Location", section: "Location", type: "number", relation: "equipment_location", filterRuleType: "SelectRule" },
      { key: "manager", label: "Manager", section: "Location", type: "number", relation: "staff", filterRuleType: "SelectRule" },
      { key: "location_currency", label: "Currency", section: "Location", type: "number", relation: "currency", filterRuleType: "SelectRule" },
      { key: "address", label: "Address", section: "Address", type: "multiline" },
      { key: "city", label: "City", section: "Address" },
      { key: "state", label: "State", section: "Address" },
      { key: "zip", label: "Postal Code", section: "Address" },
      { key: "country", label: "Country", section: "Address", type: "number", relation: "country", filterRuleType: "SelectRule" },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
    tabs: [{ key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "locations" } }],
  },
  {
    key: "fixed_equipment_maintenances",
    title: "Asset Maintenance",
    plural: "Asset Maintenances",
    group: "Operations",
    endpoint: "fixed_equipment_api/maintenances",
    permissionFeature: "fixed_equipment_maintenances",
    idKey: "id",
    icon: "construct-outline",
    color: "#B45309",
    titleFields: ["title", "assets_name"],
    subtitleFields: ["maintenance_type", "series", "start_date"],
    searchFields: ["title", "notes", "maintenance_type", "assets_name", "series", "location_name", "supplier_name"],
    defaultSort: { field: "id", direction: "desc" },
    sortableFields: ["id", "title", "start_date", "completion_date", "cost", "date_creator"],
    filterableFields: ["id", "asset_id", "supplier_id", "maintenance_type", "title", "start_date", "completion_date", "cost", "notes", "warranty_improvement", "date_creator"],
    fields: [
      { key: "asset_id", label: "Asset", section: "Maintenance", type: "number", relation: "equipment_maintenance_asset", required: true, filterRuleType: "SelectRule" },
      { key: "supplier_id", label: "Supplier", section: "Maintenance", type: "number", relation: "equipment_supplier", required: true, filterRuleType: "SelectRule" },
      { key: "maintenance_type", label: "Type", section: "Maintenance", type: "select", required: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Maintenance", value: "maintenance" }, { label: "Repair", value: "repair" },
        { label: "Upgrade", value: "upgrade" }, { label: "PAT Test", value: "pat_test" },
        { label: "Calibration", value: "calibration" }, { label: "Software Support", value: "software_support" },
        { label: "Hardware Support", value: "hardware_support" },
      ] },
      { key: "title", label: "Title", section: "Maintenance", required: true },
      { key: "start_date", label: "Start Date", section: "Dates", type: "date", required: true },
      { key: "completion_date", label: "Completion Date", section: "Dates", type: "date" },
      { key: "warranty_improvement", label: "Warranty Improvement", section: "Maintenance", type: "boolean" },
      { key: "cost", label: "Cost", section: "Maintenance", type: "money" },
      { key: "notes", label: "Notes", section: "Notes", type: "multiline" },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "fixed_equipment_requests",
    title: "Equipment Request",
    plural: "Equipment Requests",
    group: "Operations",
    endpoint: "fixed_equipment_api/requests",
    permissionFeature: "fixed_equipment_requested",
    idKey: "id",
    icon: "hand-left-outline",
    color: "#0369A1",
    titleFields: ["request_title", "assets_name"],
    subtitleFields: ["staff_name", "series", "date_creator"],
    searchFields: ["request_title", "notes", "assets_name", "series", "model_name", "staff_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["request_status", "staff_id", "item_id", "request_title", "date_creator", "notes"],
    statusField: "request_status",
    statusOptions: [
      { label: "New", value: 0, color: "#2563EB" },
      { label: "Approved", value: 1, color: "#16A34A" },
      { label: "Rejected", value: 2, color: "#DC2626" },
    ],
    fields: [
      { key: "request_title", label: "Request Title", section: "Request", required: true },
      { key: "item_id", label: "Asset", section: "Request", type: "number", relation: "equipment_requestable_asset", required: true, createOnly: true, filterRuleType: "SelectRule" },
      { key: "staff_id", label: "Check Out For", section: "Request", type: "number", relation: "staff", required: true, createOnly: true, filterRuleType: "SelectRule" },
      { key: "notes", label: "Notes", section: "Request", type: "multiline", createOnly: true },
      { key: "request_status", label: "Status", section: "Approval", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "New", value: 0 }, { label: "Approved", value: 1 }, { label: "Rejected", value: 2 },
      ] },
      { key: "current_approver_id", label: "Current Approver", section: "Approval", type: "number", relation: "staff", readOnly: true, hideIfZero: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [
      { key: "choose_approver", availabilityKey: "choose_approver", title: "Choose Approver", icon: "person-add-outline", endpointTemplate: "fixed_equipment_api/requests/{id}/choose_approver", method: "POST", fields: [
        { key: "approver_id", label: "Approver", type: "number", relation: "staff", required: true },
      ], successMessage: "Approver assigned" },
      { key: "submit_approval", availabilityKey: "submit_approval", title: "Submit for Approval", icon: "paper-plane-outline", endpointTemplate: "fixed_equipment_api/requests/{id}/submit_approval", method: "POST", confirm: "Submit this equipment request to its configured approval sequence?", successMessage: "Request submitted for approval" },
      { key: "approve", availabilityKey: "approve", title: "Approve Request", icon: "checkmark-circle-outline", endpointTemplate: "fixed_equipment_api/requests/{id}/approve", method: "POST", fields: [
        { key: "note", label: "Approval Note", type: "multiline" },
      ], confirm: "Approve this equipment request?", successMessage: "Equipment request approved" },
      { key: "reject", availabilityKey: "reject", title: "Reject Request", icon: "close-circle-outline", endpointTemplate: "fixed_equipment_api/requests/{id}/reject", method: "POST", fields: [
        { key: "note", label: "Reason", type: "multiline" },
      ], confirm: "Reject this equipment request?", successMessage: "Equipment request rejected", destructive: true },
    ],
    canUpdate: false,
  },
  {
    key: "fixed_equipment_checkout_history",
    title: "Custody Event",
    plural: "Equipment Custody History",
    group: "Operations",
    endpoint: "fixed_equipment_api/checkout_history",
    permissionFeature: "fixed_equipment_sign_manager",
    idKey: "id",
    icon: "swap-horizontal-outline",
    color: "#475569",
    titleFields: ["display_name", "asset_name"],
    subtitleFields: ["series", "item_type", "type", "date_creator"],
    searchFields: ["id", "asset_name", "display_name", "series", "item_type", "type", "sign_document_reference"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["id", "asset_name", "item_id", "staff_id", "location_id", "item_type", "type", "date_creator"],
    statusField: "type",
    statusOptions: [
      { label: "Check Out", value: "checkout", color: "#D97706" },
      { label: "Check In", value: "checkin", color: "#16A34A" },
    ],
    fields: [
      { key: "id", label: "Event ID", section: "Custody", type: "number", readOnly: true },
      { key: "display_name", label: "Item", section: "Custody", readOnly: true },
      { key: "series", label: "Asset Tag", section: "Custody", readOnly: true },
      { key: "item_type", label: "Item Type", section: "Custody", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Asset", value: "asset" }, { label: "Accessory", value: "accessory" },
        { label: "Consumable", value: "consumable" }, { label: "Component", value: "component" },
        { label: "License", value: "license" },
      ] },
      { key: "type", label: "Movement", section: "Custody", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Check Out", value: "checkout" }, { label: "Check In", value: "checkin" },
      ] },
      { key: "quantity", label: "Quantity", section: "Custody", type: "number", readOnly: true, hideIfZero: true },
      { key: "staff_id", label: "Staff", section: "Destination", type: "number", relation: "staff", readOnly: true, filterRuleType: "SelectRule" },
      { key: "checkout_to", label: "Destination Type", section: "Destination", readOnly: true },
      { key: "location_id", label: "Location", section: "Destination", type: "number", relation: "equipment_location", readOnly: true, hideIfZero: true, filterRuleType: "SelectRule" },
      { key: "checkin_date", label: "Movement Date", section: "Dates", type: "date", readOnly: true },
      { key: "expected_checkin_date", label: "Expected Check-in", section: "Dates", type: "date", readOnly: true },
      { key: "date_creator", label: "Recorded", section: "Dates", type: "datetime", readOnly: true },
      { key: "notes", label: "Notes", section: "Notes", type: "multiline", readOnly: true },
      { key: "sign_document_reference", label: "Sign Document", section: "Sign-off", readOnly: true },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "fixed_equipment_sign_documents",
    title: "Sign Document",
    plural: "Equipment Sign Documents",
    group: "Operations",
    endpoint: "fixed_equipment_api/sign_documents",
    permissionFeature: "fixed_equipment_sign_manager",
    idKey: "id",
    icon: "create-outline",
    color: "#7C3AED",
    titleFields: ["reference"],
    subtitleFields: ["check_to_staff_name", "signer_summary", "date_creator"],
    searchFields: ["reference", "checkin_out_id_name", "check_to_staff_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["reference", "status", "check_to_staff", "date_creator"],
    statusField: "status",
    statusOptions: [
      { label: "Not Yet Signed", value: 1, color: "#64748B" },
      { label: "Signing", value: 2, color: "#D97706" },
      { label: "Signed", value: 3, color: "#16A34A" },
    ],
    fields: [
      { key: "check_in_out_id", label: "Custody Events", section: "Document", type: "number", relation: "equipment_unsigned_checkout", multiple: true, submitAsArray: true, required: true, createOnly: true },
      { key: "reference", label: "Reference", section: "Document", readOnly: true },
      { key: "checkin_out_id_name", label: "Included Events", section: "Document", readOnly: true },
      { key: "check_to_staff", label: "Equipment Owner", section: "Document", type: "number", relation: "staff", readOnly: true, filterRuleType: "SelectRule" },
      { key: "status", label: "Status", section: "Signatures", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Not Yet Signed", value: 1 }, { label: "Signing", value: 2 }, { label: "Signed", value: 3 },
      ] },
      { key: "signer_summary", label: "Progress", section: "Signatures", readOnly: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [
      { key: "sign", availabilityKey: "sign", title: "Sign Document", icon: "pencil-outline", endpointTemplate: "fixed_equipment_api/sign_documents/{id}/sign", method: "POST", fields: [
        { key: "signature", label: "Signature", type: "signature", required: true },
      ], confirm: "Confirm your identity with the current signed-in account and add your handwritten signature.", successMessage: "Document signed" },
      { key: "change_status", availabilityKey: "change_status", title: "Change Sign Status", icon: "flag-outline", endpointTemplate: "fixed_equipment_api/sign_documents/{id}/status", method: "POST", fields: [
        { key: "status", label: "Status", type: "select", required: true, options: [
          { label: "Not Yet Signed", value: 1 }, { label: "Signing", value: 2 }, { label: "Signed", value: 3 },
        ] },
      ], successMessage: "Sign status changed" },
    ],
    tabs: [
      { key: "events", title: "Custody Events", moduleKey: "fixed_equipment_checkout_history", endpointTemplate: "fixed_equipment_api/checkout_history?sign_document_id={id}", canCreate: false },
    ],
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "fixed_equipment_audits",
    title: "Equipment Audit",
    plural: "Equipment Audits",
    group: "Operations",
    endpoint: "fixed_equipment_api/audits",
    permissionFeature: "fixed_equipment_audit",
    idKey: "id",
    icon: "clipboard-outline",
    color: "#0F766E",
    titleFields: ["title"],
    subtitleFields: ["auditor_name", "audit_date", "audit_progress"],
    searchFields: ["title", "auditor_name", "location_name", "model_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["title", "auditor", "audit_date", "status", "closed", "date_creator"],
    statusField: "status",
    statusOptions: [
      { label: "New", value: 0, color: "#2563EB" }, { label: "Approved", value: 1, color: "#16A34A" }, { label: "Rejected", value: 2, color: "#DC2626" },
    ],
    fields: [
      { key: "title", label: "Audit Title", section: "Audit", required: true },
      { key: "audit_date", label: "Audit Date", section: "Audit", type: "date", required: true },
      { key: "auditor", label: "Auditor", section: "Audit", type: "number", relation: "staff", required: true, filterRuleType: "SelectRule" },
      { key: "asset_location", label: "Location Filter", section: "Scope", type: "number", relation: "equipment_location", filterRuleType: "SelectRule" },
      { key: "model_id", label: "Model Filter", section: "Scope", type: "number", relation: "equipment_model", filterRuleType: "SelectRule" },
      { key: "asset_id", label: "Specific Equipment", section: "Scope", type: "number", relation: "equipment_auditable_item", multiple: true, submitAsArray: true },
      { key: "checkin_checkout_status", label: "Custody Filter", section: "Scope", type: "select", options: [
        { label: "Checked In", value: 1 }, { label: "Checked Out", value: 2 },
      ] },
      { key: "status", label: "Authorization", section: "Workflow", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "New", value: 0 }, { label: "Approved", value: 1 }, { label: "Rejected", value: 2 },
      ] },
      { key: "closed", label: "Audit Result", section: "Workflow", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Open", value: 0 }, { label: "Completed", value: 1 }, { label: "Close Rejected", value: 2 }, { label: "Awaiting Close Approval", value: 4 },
      ] },
      { key: "audit_progress", label: "Count Progress", section: "Workflow", readOnly: true },
      { key: "current_approver_id", label: "Current Approver", section: "Workflow", type: "number", relation: "staff", readOnly: true, hideIfZero: true },
      { key: "close_approver_id", label: "Close Approver", section: "Workflow", type: "number", relation: "staff", readOnly: true, hideIfZero: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [
      { key: "choose_approver", availabilityKey: "choose_approver", title: "Choose Approver", icon: "person-add-outline", endpointTemplate: "fixed_equipment_api/audits/{id}/choose_approver", fields: [
        { key: "approver_id", label: "Approver", type: "number", relation: "staff", required: true },
      ], successMessage: "Audit approver assigned" },
      { key: "submit_approval", availabilityKey: "submit_approval", title: "Submit for Approval", icon: "paper-plane-outline", endpointTemplate: "fixed_equipment_api/audits/{id}/submit_approval", confirm: "Submit this audit to its configured approval sequence?", successMessage: "Audit submitted for approval" },
      { key: "approve", availabilityKey: "approve", title: "Approve Audit", icon: "checkmark-circle-outline", endpointTemplate: "fixed_equipment_api/audits/{id}/approve", fields: [{ key: "note", label: "Approval Note", type: "multiline" }], successMessage: "Audit approved" },
      { key: "reject", availabilityKey: "reject", title: "Reject Audit", icon: "close-circle-outline", endpointTemplate: "fixed_equipment_api/audits/{id}/reject", fields: [{ key: "note", label: "Reason", type: "multiline" }], destructive: true, successMessage: "Audit rejected" },
      { key: "submit_results", availabilityKey: "submit_results", title: "Submit Audit Results", icon: "send-outline", endpointTemplate: "fixed_equipment_api/audits/{id}/submit_results", fields: [
        { key: "approver_id", label: "Close Approver (if required)", type: "number", relation: "staff" },
      ], confirm: "Submit all counted results and accepted adjustments?", successMessage: "Audit results submitted" },
      { key: "approve_close", availabilityKey: "approve_close", title: "Approve Audit Results", icon: "shield-checkmark-outline", endpointTemplate: "fixed_equipment_api/audits/{id}/close_approve", fields: [{ key: "note", label: "Approval Note", type: "multiline" }], successMessage: "Audit results approved" },
      { key: "reject_close", availabilityKey: "reject_close", title: "Reject Audit Results", icon: "shield-outline", endpointTemplate: "fixed_equipment_api/audits/{id}/close_reject", fields: [{ key: "note", label: "Reason", type: "multiline" }], destructive: true, successMessage: "Audit results rejected" },
    ],
    tabs: [{ key: "items", title: "Audit Items", moduleKey: "fixed_equipment_audit_items", endpointTemplate: "fixed_equipment_api/audit_details?audit_id={id}", canCreate: false }],
    canUpdate: false,
  },
  {
    key: "fixed_equipment_audit_items",
    title: "Audit Item",
    plural: "Equipment Audit Items",
    group: "Operations",
    endpoint: "fixed_equipment_api/audit_details",
    permissionFeature: "fixed_equipment_audit",
    idKey: "id",
    icon: "checkbox-outline",
    color: "#0F766E",
    titleFields: ["asset_name"],
    subtitleFields: ["type", "quantity", "adjusted"],
    fields: [
      { key: "asset_name", label: "Equipment", section: "Count", readOnly: true },
      { key: "type", label: "Type", section: "Count", readOnly: true },
      { key: "quantity", label: "Recorded Quantity", section: "Count", type: "number", readOnly: true },
      { key: "adjusted", label: "Counted Quantity", section: "Count", type: "number", readOnly: true },
      { key: "maintenance", label: "Broken / Maintenance", section: "Result", type: "boolean", readOnly: true },
      { key: "accept", label: "Accept Adjustment", section: "Result", type: "boolean", readOnly: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [{ key: "record_count", availabilityKey: "record_count", title: "Record Count", icon: "calculator-outline", endpointTemplate: "fixed_equipment_api/audit_details/{id}/count", fields: [
      { key: "adjusted", label: "Counted Quantity", type: "number", required: true },
      { key: "maintenance", label: "Broken / Needs Maintenance", type: "boolean" },
      { key: "accept", label: "Accept Inventory Adjustment", type: "boolean" },
    ], successMessage: "Audit count saved" }],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "fixed_equipment_dashboard",
    title: "Equipment Metric",
    plural: "Equipment Dashboard",
    group: "Operations",
    endpoint: "fixed_equipment_api/dashboard_metrics",
    permissionFeature: "fixed_equipment_dashboard",
    idKey: "id",
    icon: "speedometer-outline",
    color: "#0369A1",
    titleFields: ["metric"],
    subtitleFields: ["section", "value", "type"],
    fields: [
      { key: "section", label: "Section", section: "Metric", readOnly: true },
      { key: "metric", label: "Metric", section: "Metric", readOnly: true },
      { key: "value", label: "Count", section: "Metric", type: "number", readOnly: true },
      { key: "type", label: "Equipment Type", section: "Metric", readOnly: true },
      { key: "color", label: "Chart Color", section: "Metric", readOnly: true },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "fixed_equipment_activity",
    title: "Equipment Activity",
    plural: "Equipment Activity Report",
    group: "Operations",
    endpoint: "fixed_equipment_api/activity",
    permissionFeature: ["fixed_equipment_dashboard", "fixed_equipment_report"],
    idKey: "id",
    icon: "pulse-outline",
    color: "#475569",
    titleFields: ["action", "target_name"],
    subtitleFields: ["admin_name", "date_creator"],
    searchFields: ["action", "target", "changed", "notes", "admin_name", "target_name", "assets_name", "location_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["admin_id", "action", "target", "notes", "date_creator"],
    fields: [
      { key: "date_creator", label: "Date", section: "Activity", type: "datetime", readOnly: true },
      { key: "admin_id", label: "Manager", section: "Activity", type: "number", relation: "staff", readOnly: true, filterRuleType: "SelectRule" },
      { key: "action", label: "Action", section: "Activity", readOnly: true, filterRuleType: "MultiSelectRule" },
      { key: "target_name", label: "Target", section: "Activity", readOnly: true },
      { key: "changed", label: "Changed", section: "Activity", readOnly: true },
      { key: "notes", label: "Notes", section: "Notes", type: "multiline", readOnly: true },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "fixed_equipment_depreciation_schedule",
    title: "Equipment Depreciation",
    plural: "Equipment Depreciation",
    group: "Operations",
    endpoint: "fixed_equipment_api/depreciation_schedule",
    permissionFeature: "fixed_equipment_depreciations",
    idKey: "id",
    icon: "trending-down-outline",
    color: "#B45309",
    titleFields: ["assets_name", "series"],
    subtitleFields: ["depreciation_name", "current_value", "remaining_months"],
    searchFields: ["assets_name", "series", "model_name", "depreciation_name", "status_name", "location_name"],
    defaultSort: { field: "id", direction: "desc" },
    filterableFields: ["assets_name", "series", "status", "type", "date_buy", "unit_price"],
    fields: [
      { key: "assets_name", label: "Equipment", section: "Asset", readOnly: true },
      { key: "series", label: "Asset Tag", section: "Asset", readOnly: true },
      { key: "type", label: "Type", section: "Asset", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Asset", value: "asset" }, { label: "License", value: "license" },
      ] },
      { key: "status", label: "Status", section: "Asset", type: "number", relation: "equipment_status", readOnly: true, filterRuleType: "MultiSelectRule" },
      { key: "location_name", label: "Location", section: "Asset", readOnly: true },
      { key: "date_buy", label: "Purchase Date", section: "Schedule", type: "date", readOnly: true },
      { key: "eol_date", label: "End of Life", section: "Schedule", type: "date", readOnly: true },
      { key: "depreciation_name", label: "Depreciation", section: "Schedule", readOnly: true },
      { key: "depreciation_term", label: "Term (months)", section: "Schedule", type: "number", readOnly: true },
      { key: "remaining_months", label: "Remaining Months", section: "Schedule", type: "number", readOnly: true },
      { key: "unit_price", label: "Cost", section: "Value", type: "money", readOnly: true },
      { key: "monthly_depreciation", label: "Monthly Depreciation", section: "Value", type: "money", readOnly: true },
      { key: "accumulated_depreciation", label: "Accumulated Depreciation", section: "Value", type: "money", readOnly: true },
      { key: "current_value", label: "Current Value", section: "Value", type: "money", readOnly: true },
      { key: "maintenance_cost", label: "Maintenance Cost", section: "Value", type: "money", readOnly: true },
      { key: "current_value_with_maintenance", label: "Value incl. Maintenance", section: "Value", type: "money", readOnly: true },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "fixed_equipment_licenses",
    title: "Software License",
    plural: "Equipment Licenses",
    group: "Operations",
    endpoint: "fixed_equipment_api/licenses",
    permissionFeature: "fixed_equipment_licenses",
    idKey: "id",
    icon: "key-outline",
    color: "#4F46E5",
    titleFields: ["assets_name"],
    subtitleFields: ["licensed_to_name", "manufacturer_name", "expiration_date"],
    searchFields: ["assets_name", "product_key", "licensed_to_email", "licensed_to_name", "model_no", "order_number", "purchase_order_number", "category_name", "manufacturer_name", "supplier_name"],
    defaultSort: { field: "id", direction: "desc" },
    sortableFields: ["id", "assets_name", "expiration_date", "seats", "date_buy", "unit_price", "date_creator", "updated_at"],
    filterableFields: ["id", "assets_name", "product_key", "seats", "category_id", "manufacturer_id", "licensed_to_name", "licensed_to_email", "reassignable", "supplier_id", "unit_price", "date_buy", "expiration_date", "termination_date", "depreciation", "maintained", "description", "date_creator", "updated_at"],
    fields: [
      { key: "assets_name", label: "Software Name", section: "License", required: true },
      { key: "category_id", label: "Category", section: "License", type: "number", relation: "equipment_license_category", required: true, filterRuleType: "SelectRule" },
      { key: "product_key", label: "Product Key", section: "License", type: "multiline" },
      { key: "seats", label: "Seats", section: "License", type: "number", required: true, filterRuleType: "NumberRule" },
      { key: "available_seats", label: "Available Seats", section: "License", type: "number", readOnly: true },
      { key: "assigned_seats", label: "Assigned Seats", section: "License", type: "number", readOnly: true },
      { key: "manufacturer_id", label: "Manufacturer", section: "License", type: "number", relation: "equipment_manufacturer", required: true, filterRuleType: "SelectRule" },
      { key: "licensed_to_name", label: "Licensed To", section: "Ownership" },
      { key: "licensed_to_email", label: "Licensed Email", section: "Ownership", type: "email" },
      { key: "reassignable", label: "Reassignable", section: "Ownership", type: "boolean" },
      { key: "supplier_id", label: "Supplier", section: "Purchase", type: "number", relation: "equipment_supplier", filterRuleType: "SelectRule" },
      { key: "order_number", label: "Order Number", section: "Purchase" },
      { key: "purchase_order_number", label: "Purchase Order Number", section: "Purchase" },
      { key: "unit_price", label: "Purchase Cost", section: "Purchase", type: "money" },
      { key: "date_buy", label: "Purchase Date", section: "Purchase", type: "date" },
      { key: "expiration_date", label: "Expiration Date", section: "Dates", type: "date" },
      { key: "termination_date", label: "Termination Date", section: "Dates", type: "date" },
      { key: "depreciation", label: "Depreciation", section: "Accounting", type: "number", relation: "equipment_depreciation", filterRuleType: "SelectRule" },
      { key: "maintained", label: "Maintained", section: "License", type: "boolean" },
      { key: "description", label: "Notes", section: "Notes", type: "multiline" },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "System", type: "datetime", readOnly: true },
    ],
    tabs: [
      { key: "seats", title: "Seats", moduleKey: "fixed_equipment_license_seats", endpointTemplate: "fixed_equipment_api/license_seats?license_id={id}", canCreate: false },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "license_files" } },
    ],
  },
  {
    key: "fixed_equipment_license_seats",
    title: "License Seat",
    plural: "License Seats",
    group: "Operations",
    endpoint: "fixed_equipment_api/license_seats",
    permissionFeature: "fixed_equipment_licenses",
    idKey: "id",
    icon: "person-circle-outline",
    color: "#4F46E5",
    titleFields: ["seat_name", "to_name"],
    subtitleFields: ["license_name", "date_creator"],
    fields: [
      { key: "seat_name", label: "Seat", section: "Seat", readOnly: true },
      { key: "license_name", label: "License", section: "Seat", readOnly: true },
      { key: "status", label: "Status", section: "Assignment", type: "select", readOnly: true, options: [
        { label: "Available", value: 1 }, { label: "Checked Out", value: 2 },
      ] },
      { key: "to", label: "Assigned Type", section: "Assignment", readOnly: true },
      { key: "to_name", label: "Assigned To", section: "Assignment", readOnly: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [
      { key: "checkout_staff", availabilityKey: "checkout", title: "Check Out to Staff", icon: "person-add-outline", endpointTemplate: "fixed_equipment_api/license_seats/{id}/checkout", method: "POST", body: { checkout_to: "user" }, fields: [
        { key: "staff_id", label: "Staff", type: "number", relation: "staff", required: true },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "License seat checked out" },
      { key: "checkout_asset", availabilityKey: "checkout", title: "Check Out to Asset", icon: "git-compare-outline", endpointTemplate: "fixed_equipment_api/license_seats/{id}/checkout", method: "POST", body: { checkout_to: "asset" }, fields: [
        { key: "asset_id", label: "Target Asset", type: "number", relation: "equipment_asset", required: true },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "License seat checked out" },
      { key: "checkin", availabilityKey: "checkin", title: "Check In", icon: "arrow-undo-outline", endpointTemplate: "fixed_equipment_api/license_seats/{id}/checkin", method: "POST", fields: [
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "License seat checked in" },
    ],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "fixed_equipment_predefined_kits",
    title: "Predefined Kit",
    plural: "Predefined Equipment Kits",
    group: "Operations",
    endpoint: "fixed_equipment_api/predefined_kits",
    permissionFeature: "fixed_equipment_predefined_kits",
    idKey: "id",
    icon: "briefcase-outline",
    color: "#0F766E",
    titleFields: ["assets_name"],
    subtitleFields: ["model_count", "required_asset_count", "active_asset_count"],
    searchFields: ["assets_name"],
    defaultSort: { field: "id", direction: "desc" },
    sortableFields: ["id", "assets_name", "date_creator", "updated_at"],
    filterableFields: ["id", "assets_name", "date_creator", "updated_at"],
    fields: [
      { key: "assets_name", label: "Kit Name", section: "Kit", required: true },
      { key: "model_count", label: "Models", section: "Composition", type: "number", readOnly: true },
      { key: "required_asset_count", label: "Assets Required", section: "Composition", type: "number", readOnly: true },
      { key: "active_asset_count", label: "Assets Checked Out", section: "Custody", type: "number", readOnly: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [
      { key: "checkout", availabilityKey: "checkout", title: "Check Out Kit", icon: "log-out-outline", endpointTemplate: "fixed_equipment_api/predefined_kits/{id}/checkout", method: "POST", fields: [
        { key: "staff_id", label: "Staff", type: "number", relation: "staff", required: true },
        { key: "checkin_date", label: "Checkout Date", type: "date" },
        { key: "expected_checkin_date", label: "Expected Check-in", type: "date" },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "Kit checked out" },
      { key: "checkin", availabilityKey: "checkin", title: "Check In Kit", icon: "log-in-outline", endpointTemplate: "fixed_equipment_api/predefined_kits/{id}/checkin", method: "POST", fields: [
        { key: "checkin_date", label: "Check-in Date", type: "date" },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "Kit checked in" },
    ],
    tabs: [{ key: "models", title: "Models", moduleKey: "fixed_equipment_predefined_kit_models", endpointTemplate: "fixed_equipment_api/predefined_kit_models?parent_id={id}", createDefaults: { parent_id: "{id}" } }],
  },
  {
    key: "fixed_equipment_predefined_kit_models",
    title: "Kit Model",
    plural: "Kit Models",
    group: "Operations",
    endpoint: "fixed_equipment_api/predefined_kit_models",
    permissionFeature: "fixed_equipment_predefined_kits",
    idKey: "id",
    icon: "cube-outline",
    color: "#0F766E",
    titleFields: ["model_name", "model_no"],
    subtitleFields: ["quantity"],
    fields: [
      { key: "parent_id", label: "Kit ID", section: "Kit", type: "number", required: true, createOnly: true },
      { key: "model_id", label: "Asset Model", section: "Kit", type: "number", relation: "equipment_model", required: true },
      { key: "quantity", label: "Quantity", section: "Kit", type: "number", required: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "fixed_equipment_accessories",
    title: "Accessory",
    plural: "Equipment Accessories",
    group: "Operations",
    endpoint: "fixed_equipment_api/accessories",
    permissionFeature: "fixed_equipment_accessories",
    idKey: "id",
    icon: "extension-puzzle-outline",
    color: "#7C3AED",
    titleFields: ["assets_name"],
    subtitleFields: ["category_name", "model_no", "asset_location_name"],
    searchFields: ["assets_name", "series", "model_no", "item_no", "order_number", "category_name", "manufacturer_name", "supplier_name", "asset_location_name"],
    defaultSort: { field: "id", direction: "desc" },
    sortableFields: ["id", "assets_name", "quantity", "min_quantity", "unit_price", "date_buy", "date_creator", "updated_at"],
    filterableFields: ["id", "assets_name", "series", "model_no", "item_no", "category_id", "manufacturer_id", "supplier_id", "asset_location", "quantity", "min_quantity", "unit_price", "date_buy", "order_number", "date_creator", "updated_at"],
    fields: [
      { key: "assets_name", label: "Accessory Name", section: "Accessory", required: true },
      { key: "category_id", label: "Category", section: "Accessory", type: "number", relation: "equipment_accessory_category", required: true, filterRuleType: "SelectRule" },
      { key: "supplier_id", label: "Supplier", section: "Source", type: "number", relation: "equipment_supplier", filterRuleType: "SelectRule" },
      { key: "manufacturer_id", label: "Manufacturer", section: "Source", type: "number", relation: "equipment_manufacturer", filterRuleType: "SelectRule" },
      { key: "asset_location", label: "Location", section: "Source", type: "number", relation: "equipment_location", filterRuleType: "SelectRule" },
      { key: "model_no", label: "Model Number", section: "Accessory" },
      { key: "order_number", label: "Order Number", section: "Purchase" },
      { key: "unit_price", label: "Purchase Cost", section: "Purchase", type: "money" },
      { key: "date_buy", label: "Purchase Date", section: "Purchase", type: "date" },
      { key: "quantity", label: "Quantity", section: "Stock", type: "number", required: true, filterRuleType: "NumberRule" },
      { key: "min_quantity", label: "Minimum Quantity", section: "Stock", type: "number", filterRuleType: "NumberRule" },
      { key: "checked_out_quantity", label: "Checked Out", section: "Stock", type: "number", readOnly: true },
      { key: "available_quantity", label: "Available", section: "Stock", type: "number", readOnly: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [{
      key: "checkout", availabilityKey: "checkout", title: "Check Out to Staff", icon: "person-add-outline",
      endpointTemplate: "fixed_equipment_api/accessories/{id}/checkout", method: "POST",
      fields: [
        { key: "staff_id", label: "Staff", type: "number", relation: "staff", required: true },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "Accessory checked out",
    }],
    tabs: [
      { key: "checkouts", title: "Checked Out", moduleKey: "fixed_equipment_inventory_checkouts", endpointTemplate: "fixed_equipment_api/inventory_checkouts?kind=accessory&item_id={id}", canCreate: false },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "accessory" } },
    ],
  },
  {
    key: "fixed_equipment_consumables",
    title: "Consumable",
    plural: "Equipment Consumables",
    group: "Operations",
    endpoint: "fixed_equipment_api/consumables",
    permissionFeature: "fixed_equipment_consumables",
    idKey: "id",
    icon: "layers-outline",
    color: "#D97706",
    titleFields: ["assets_name", "item_no"],
    subtitleFields: ["category_name", "model_no", "asset_location_name"],
    searchFields: ["assets_name", "series", "model_no", "item_no", "order_number", "category_name", "manufacturer_name", "supplier_name", "asset_location_name"],
    defaultSort: { field: "id", direction: "desc" },
    sortableFields: ["id", "assets_name", "quantity", "min_quantity", "unit_price", "date_buy", "date_creator", "updated_at"],
    filterableFields: ["id", "assets_name", "series", "model_no", "item_no", "category_id", "manufacturer_id", "supplier_id", "asset_location", "quantity", "min_quantity", "unit_price", "date_buy", "order_number", "date_creator", "updated_at"],
    fields: [
      { key: "assets_name", label: "Consumable Name", section: "Consumable", required: true },
      { key: "category_id", label: "Category", section: "Consumable", type: "number", relation: "equipment_consumable_category", required: true, filterRuleType: "SelectRule" },
      { key: "manufacturer_id", label: "Manufacturer", section: "Source", type: "number", relation: "equipment_manufacturer", filterRuleType: "SelectRule" },
      { key: "asset_location", label: "Location", section: "Source", type: "number", relation: "equipment_location", filterRuleType: "SelectRule" },
      { key: "model_no", label: "Model Number", section: "Consumable" },
      { key: "item_no", label: "Item Number", section: "Consumable" },
      { key: "order_number", label: "Order Number", section: "Purchase" },
      { key: "unit_price", label: "Purchase Cost", section: "Purchase", type: "money" },
      { key: "date_buy", label: "Purchase Date", section: "Purchase", type: "date" },
      { key: "quantity", label: "Quantity", section: "Stock", type: "number", required: true, filterRuleType: "NumberRule" },
      { key: "min_quantity", label: "Minimum Quantity", section: "Stock", type: "number", filterRuleType: "NumberRule" },
      { key: "checked_out_quantity", label: "Checked Out", section: "Stock", type: "number", readOnly: true },
      { key: "available_quantity", label: "Available", section: "Stock", type: "number", readOnly: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [{
      key: "checkout", availabilityKey: "checkout", title: "Check Out to Staff", icon: "person-add-outline",
      endpointTemplate: "fixed_equipment_api/consumables/{id}/checkout", method: "POST",
      fields: [
        { key: "staff_id", label: "Staff", type: "number", relation: "staff", required: true },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "Consumable checked out",
    }],
    tabs: [
      { key: "checkouts", title: "Checked Out", moduleKey: "fixed_equipment_inventory_checkouts", endpointTemplate: "fixed_equipment_api/inventory_checkouts?kind=consumable&item_id={id}", canCreate: false },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "consumable" } },
    ],
  },
  {
    key: "fixed_equipment_components",
    title: "Component",
    plural: "Equipment Components",
    group: "Operations",
    endpoint: "fixed_equipment_api/components",
    permissionFeature: "fixed_equipment_components",
    idKey: "id",
    icon: "hardware-chip-outline",
    color: "#0369A1",
    titleFields: ["assets_name", "series"],
    subtitleFields: ["category_name", "asset_location_name"],
    searchFields: ["assets_name", "series", "model_no", "item_no", "order_number", "category_name", "manufacturer_name", "supplier_name", "asset_location_name"],
    defaultSort: { field: "id", direction: "desc" },
    sortableFields: ["id", "assets_name", "quantity", "min_quantity", "unit_price", "date_buy", "date_creator", "updated_at"],
    filterableFields: ["id", "assets_name", "series", "model_no", "item_no", "category_id", "manufacturer_id", "supplier_id", "asset_location", "quantity", "min_quantity", "unit_price", "date_buy", "order_number", "date_creator", "updated_at"],
    fields: [
      { key: "assets_name", label: "Component Name", section: "Component", required: true },
      { key: "category_id", label: "Category", section: "Component", type: "number", relation: "equipment_component_category", filterRuleType: "SelectRule" },
      { key: "series", label: "Serial Number", section: "Component" },
      { key: "asset_location", label: "Location", section: "Source", type: "number", relation: "equipment_location", filterRuleType: "SelectRule" },
      { key: "order_number", label: "Order Number", section: "Purchase" },
      { key: "unit_price", label: "Purchase Cost", section: "Purchase", type: "money" },
      { key: "date_buy", label: "Purchase Date", section: "Purchase", type: "date" },
      { key: "quantity", label: "Quantity", section: "Stock", type: "number", required: true, filterRuleType: "NumberRule" },
      { key: "min_quantity", label: "Minimum Quantity", section: "Stock", type: "number", filterRuleType: "NumberRule" },
      { key: "checked_out_quantity", label: "Checked Out", section: "Stock", type: "number", readOnly: true },
      { key: "available_quantity", label: "Available", section: "Stock", type: "number", readOnly: true },
      { key: "date_creator", label: "Created", section: "System", type: "datetime", readOnly: true },
      { key: "updated_at", label: "Updated", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [{
      key: "checkout", availabilityKey: "checkout", title: "Check Out to Asset", icon: "git-compare-outline",
      endpointTemplate: "fixed_equipment_api/components/{id}/checkout", method: "POST",
      fields: [
        { key: "asset_id", label: "Target Asset", type: "number", relation: "equipment_asset", required: true },
        { key: "quantity", label: "Quantity", type: "number", required: true, defaultValue: 1 },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "Component checked out",
    }],
    tabs: [
      { key: "checkouts", title: "Checked Out", moduleKey: "fixed_equipment_inventory_checkouts", endpointTemplate: "fixed_equipment_api/inventory_checkouts?kind=component&item_id={id}", canCreate: false },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "component" } },
    ],
  },
  {
    key: "fixed_equipment_inventory_checkouts",
    title: "Inventory Checkout",
    plural: "Inventory Checkouts",
    group: "Operations",
    endpoint: "fixed_equipment_api/inventory_checkouts",
    permissionFeature: ["fixed_equipment_accessories", "fixed_equipment_consumables", "fixed_equipment_components"],
    idKey: "id",
    icon: "swap-horizontal-outline",
    color: "#475569",
    titleFields: ["staff_name", "asset_id_name", "id"],
    subtitleFields: ["item_name", "quantity", "date_creator"],
    fields: [
      { key: "item_name", label: "Item", section: "Checkout", readOnly: true },
      { key: "item_type", label: "Inventory Type", section: "Checkout", readOnly: true },
      { key: "staff_id", label: "Staff", section: "Assigned To", type: "number", relation: "staff", readOnly: true },
      { key: "asset_id", label: "Target Asset", section: "Assigned To", type: "number", relation: "equipment_asset", readOnly: true },
      { key: "quantity", label: "Quantity", section: "Checkout", type: "number", readOnly: true },
      { key: "notes", label: "Notes", section: "Checkout", type: "multiline", readOnly: true },
      { key: "date_creator", label: "Checked Out", section: "Checkout", type: "datetime", readOnly: true },
    ],
    actions: [{
      key: "checkin", availabilityKey: "checkin", title: "Check In", icon: "arrow-undo-outline",
      endpointTemplate: "fixed_equipment_api/inventory_checkouts/{id}/checkin", method: "POST",
      fields: [
        { key: "quantity", label: "Quantity (components)", type: "number", required: true, defaultValue: 1 },
        { key: "checkin_date", label: "Check-in Date (accessories/consumables)", type: "date" },
        { key: "notes", label: "Notes", type: "multiline" },
      ], successMessage: "Inventory checked in",
    }],
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "knowledge",
    title: "Knowledge Article",
    plural: "Knowledge Base",
    group: "Support",
    endpoint: "knowledge_api",
    permissionFeature: "knowledge_base",
    idKey: "articleid",
    icon: "book-outline",
    color: "#0369A1",
    titleFields: ["subject"],
    subtitleFields: ["articlegroup", "active", "datecreated"],
    searchFields: ["subject", "description", "slug", "curator"],
    defaultSort: { field: "datecreated", direction: "desc" },
    filterableFields: ["subject", "description", "articlegroup", "active", "datecreated", "staff_article", "curator", "benchmark", "score"],
    statusField: "active",
    statusOptions: [{ label: "Published", value: 1, color: "#16A34A" }, { label: "Unpublished", value: 0, color: "#64748B" }],
    fields: [
      { key: "subject", label: "Subject", section: "Article", required: true },
      { key: "articlegroup", label: "Group", section: "Article", type: "number", relation: "knowledge_group", required: true },
      { key: "description", label: "Article", section: "Article", type: "multiline" },
      { key: "active", label: "Active", section: "Article", type: "select", options: statusOptions },
      { key: "article_order", label: "Order", section: "Article", type: "number" },
      { key: "staff_article", label: "Staff Article", section: "Audience", type: "boolean" },
      { key: "question_answers", label: "Question & Answers", section: "Article", type: "boolean" },
      { key: "curator", label: "Curator", section: "Scoring" },
      { key: "benchmark", label: "Benchmark", section: "Scoring", type: "number" },
      { key: "score", label: "Score", section: "Scoring", type: "number" },
      { key: "datecreated", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [
      { key: "publish", title: "Publish", icon: "globe-outline", endpointTemplate: "knowledge_api/{id}/publish", method: "PUT", confirm: "Publish this article?", successMessage: "Article published" },
      { key: "unpublish", title: "Unpublish", icon: "eye-off-outline", endpointTemplate: "knowledge_api/{id}/unpublish", method: "PUT", confirm: "Unpublish this article?", successMessage: "Article unpublished" },
    ],
  },
  {
    key: "surveys",
    title: "Survey",
    plural: "Surveys",
    group: "Support",
    endpoint: "surveys_api",
    permissionFeature: "surveys",
    idKey: "surveyid",
    icon: "stats-chart-outline",
    color: "#0369A1",
    titleFields: ["subject"],
    subtitleFields: ["datecreated", "active"],
    searchFields: ["subject", "description", "viewdescription", "fromname"],
    defaultSort: { field: "datecreated", direction: "desc" },
    filterableFields: ["subject", "description", "datecreated", "active", "onlyforloggedin", "iprestrict", "fromname"],
    statusField: "active",
    statusOptions: [{ label: "Active", value: 1, color: "#16A34A" }, { label: "Disabled", value: 0, color: "#64748B" }],
    fields: [
      { key: "subject", label: "Subject", section: "Survey", required: true },
      { key: "description", label: "Description", section: "Survey", type: "multiline" },
      { key: "viewdescription", label: "View Description", section: "Survey", type: "multiline" },
      { key: "redirect_url", label: "Redirect URL", section: "Response", type: "url" },
      { key: "fromname", label: "Sender Name", section: "Delivery" },
      { key: "onlyforloggedin", label: "Login Required", section: "Access", type: "boolean" },
      { key: "iprestrict", label: "One Response per IP", section: "Access", type: "boolean" },
      { key: "active", label: "Active", section: "Survey", type: "select", options: statusOptions },
      { key: "datecreated", label: "Created", section: "System", type: "datetime", readOnly: true },
    ],
    actions: [
      { key: "publish", title: "Publish (Activate)", icon: "play-circle-outline", endpointTemplate: "surveys_api/{id}/publish", method: "PUT", confirm: "Activate this survey for responses?", successMessage: "Survey published" },
      { key: "close", title: "Close (Deactivate)", icon: "stop-circle-outline", endpointTemplate: "surveys_api/{id}/close", method: "PUT", confirm: "Close this survey to new responses?", successMessage: "Survey closed" },
    ],
    tabs: [
      { key: "results", title: "Results", moduleKey: "surveys", endpointTemplate: "surveys_api/results/{id}", kind: "survey_results", canCreate: false, unpaginated: true },
      { key: "send_log", title: "Send History", moduleKey: "survey_send_log", endpointTemplate: "surveys_api/send_log/{id}", canCreate: false, unpaginated: true },
    ],
  },
  {
    key: "survey_send_log",
    title: "Survey Send",
    plural: "Survey Send History",
    group: "Support",
    endpoint: "surveys_api/send_log",
    permissionFeature: "surveys",
    idKey: "id",
    icon: "mail-outline",
    color: "#0369A1",
    titleFields: ["date", "id"],
    subtitleFields: ["total", "iscronfinished"],
    fields: [
      { key: "surveyid", label: "Survey ID", section: "Survey", type: "number", readOnly: true },
      { key: "date", label: "Started", section: "Delivery", type: "datetime", readOnly: true },
      { key: "total", label: "Sent", section: "Delivery", type: "number", readOnly: true },
      { key: "iscronfinished", label: "Finished", section: "Delivery", type: "boolean", readOnly: true },
      { key: "send_to_mail_lists", label: "Recipient Lists", section: "Delivery", readOnly: true },
    ],
    canCreate: false,
    canOpenDetail: false,
    canUpdate: false,
    canDelete: false,
  },
  {
    key: "custom_statuses",
    title: "Custom Status",
    plural: "Custom Statuses",
    group: "Admin",
    endpoint: "custom_statuses_api",
    permissionFeature: "si_custom_status",
    idKey: "id",
    icon: "color-palette-outline",
    color: "#64748B",
    titleFields: ["name"],
    subtitleFields: ["relto", "order", "filter_default"],
    searchFields: ["name", "relto"],
    defaultSort: { field: "order", direction: "asc" },
    sortableFields: ["order", "name", "relto", "id"],
    filterableFields: ["name", "relto", "order", "color", "filter_default"],
    filterRules: {
      relto: { ruleType: "MultiSelectRule" },
    },
    fields: [
      { key: "name", label: "Name", section: "Status", required: true },
      { key: "relto", label: "Applies To", section: "Status", type: "select", required: true, options: [
        { label: "Projects", value: "projects" },
        { label: "Tasks", value: "tasks" },
      ] },
      { key: "order", label: "Order", section: "Display", type: "number", defaultValue: 0 },
      { key: "color", label: "Color", section: "Display", defaultValue: "#757575", placeholder: "#757575" },
      { key: "filter_default", label: "Show in Default Filter", section: "Display", type: "boolean" },
    ],
  },
  {
    key: "automation",
    title: "Automation",
    plural: "Automations",
    group: "Admin",
    endpoint: "automation_api",
    permissionFeature: "automation",
    idKey: "id",
    icon: "flash-outline",
    color: "#64748B",
    titleFields: ["name", "title"],
    subtitleFields: ["active", "trigger_count", "action_count", "last_triggered"],
    searchFields: ["name", "type"],
    statusField: "active",
    statusOptions: [{ label: "Active", value: "1", color: "#16A34A" }, { label: "Inactive", value: "0", color: "#64748B" }],
    filterableFields: ["name", "type", "join", "active"],
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "name", label: "Name", section: "Automation", required: true },
      { key: "type", label: "Entity", section: "Automation", type: "select", readOnly: true, options: [{ label: "Task", value: "task" }] },
      { key: "join", label: "Match Triggers", section: "Automation", type: "select", required: true, defaultValue: "and", filterRuleType: "MultiSelectRule", options: [
        { label: "All (AND)", value: "and" }, { label: "Any (OR)", value: "or" },
      ] },
      { key: "active", label: "Active", section: "Automation", type: "boolean", readOnly: true },
      { key: "trigger_count", label: "Triggers", section: "Summary", type: "number", readOnly: true },
      { key: "action_count", label: "Actions", section: "Summary", type: "number", readOnly: true },
      { key: "last_triggered", label: "Last Triggered", section: "Activity", type: "date", readOnly: true },
      { key: "last_triggered_by", label: "Last Task", section: "Activity", type: "number", relation: "task", readOnly: true, hideIfZero: true },
    ],
    actions: [
      { key: "activate", availabilityKey: "activate", title: "Activate", icon: "play-circle-outline", endpointTemplate: "automation_api/activate/{id}", method: "PUT", body: { active: 1 }, confirm: "Activate this automation?", successMessage: "Automation activated" },
      { key: "deactivate", availabilityKey: "deactivate", title: "Deactivate", icon: "pause-circle-outline", endpointTemplate: "automation_api/activate/{id}", method: "PUT", body: { active: 0 }, confirm: "Deactivate this automation?", successMessage: "Automation deactivated", destructive: true },
    ],
    tabs: [
      { key: "triggers", title: "Triggers", moduleKey: "automation_triggers", endpointTemplate: "automation_api/triggers?automation_id={id}", createDefaults: { automation_id: "{id}" } },
      { key: "actions", title: "Actions", moduleKey: "automation_actions", endpointTemplate: "automation_api/actions?automation_id={id}", createDefaults: { automation_id: "{id}" } },
    ],
  },
  {
    key: "automation_triggers",
    title: "Automation Trigger",
    plural: "Automation Triggers",
    group: "Admin",
    endpoint: "automation_api/triggers",
    permissionFeature: "automation",
    adminOnlyMutations: true,
    idKey: "id",
    icon: "git-branch-outline",
    color: "#64748B",
    titleFields: ["type", "value"],
    subtitleFields: ["additional_argument", "last_triggered", "last_triggered_by"],
    searchFields: ["type", "value", "additional_argument", "additional_argument_2"],
    fields: [
      { key: "automation_id", label: "Automation ID", section: "Trigger", type: "number", required: true, createOnly: true },
      { key: "type", label: "Trigger", section: "Trigger", type: "select", required: true, options: [
        { label: "Task status changed to", value: "status" }, { label: "Start date is today", value: "start_date" }, { label: "Finish date is today", value: "finish_date" },
        { label: "Due date is today", value: "due_date" }, { label: "Priority changed to", value: "priority" }, { label: "Custom field", value: "custom_field" },
        { label: "Task created", value: "task_created" }, { label: "Due date changed", value: "due_date_changed" }, { label: "Start date changed", value: "start_date_changed" }, { label: "Inactive for days", value: "inactive" },
      ] },
      { key: "value", label: "Value", section: "Condition" },
      { key: "additional_argument", label: "Additional Argument", section: "Condition" },
      { key: "additional_argument_2", label: "Second Argument", section: "Condition" },
      { key: "last_triggered", label: "Last Triggered", section: "Activity", type: "date", readOnly: true },
      { key: "last_triggered_by", label: "Last Task", section: "Activity", type: "number", relation: "task", readOnly: true, hideIfZero: true },
    ],
  },
  {
    key: "automation_actions",
    title: "Automation Action",
    plural: "Automation Actions",
    group: "Admin",
    endpoint: "automation_api/actions",
    permissionFeature: "automation",
    adminOnlyMutations: true,
    idKey: "id",
    icon: "flash-outline",
    color: "#64748B",
    titleFields: ["type", "value"],
    subtitleFields: ["additional_argument", "additional_argument_2"],
    searchFields: ["type", "value", "additional_argument", "additional_argument_2"],
    fields: [
      { key: "automation_id", label: "Automation ID", section: "Action", type: "number", required: true, createOnly: true },
      { key: "type", label: "Action", section: "Action", type: "select", required: true, options: [
        { label: "Change status to", value: "change_status" }, { label: "Add comment", value: "add_comment" }, { label: "Add timer", value: "add_timer" },
        { label: "Change priority to", value: "change_priority" }, { label: "Change follower", value: "set_follower" }, { label: "Change assignee", value: "set_assignee" },
        { label: "Add reminder", value: "add_reminder" }, { label: "Set custom field", value: "set_custom_field" }, { label: "Add tag", value: "add_tag" }, { label: "Change due date", value: "change_due_date" },
      ] },
      { key: "value", label: "Value", section: "Action" },
      { key: "additional_argument", label: "Additional Argument", section: "Action" },
      { key: "additional_argument_2", label: "Second Argument", section: "Action" },
    ],
  },
  {
    key: "otpmanager",
    title: "OTP",
    plural: "OTP Manager",
    group: "Admin",
    endpoint: "otpmanager",
    permissionFeature: "otpmanager",
    idKey: "id",
    icon: "keypad-outline",
    color: "#64748B",
    titleFields: ["source_name", "sender"],
    subtitleFields: ["status", "account", "purpose_tag", "created_at"],
    searchFields: ["sender", "source_name", "account", "purpose_tag", "expected_source", "requester_name"],
    statusField: "status",
    statusOptions: [
      { label: "Pending", value: "pending", color: "#D97706" },
      { label: "Active", value: "active", color: "#0284C7" },
      { label: "Used", value: "used", color: "#64748B" },
      { label: "Expired", value: "expired", color: "#DC2626" },
    ],
    filterableFields: ["source_id", "sender", "account", "purpose_tag", "sensitivity", "geo_match_status", "used", "requested_by", "created_at", "expired_at", "received_at"],
    fields: [
      { key: "source_id", label: "Source", section: "OTP", type: "number", relation: "otp_source", required: true, createOnly: true, filterRuleType: "MultiSelectRule" },
      { key: "source_name", label: "Source", section: "OTP", readOnly: true },
      { key: "sender", label: "Sender", section: "OTP", required: true, createOnly: true },
      { key: "otp_code", label: "OTP Code (optional)", section: "OTP", createOnly: true },
      { key: "message", label: "Message (optional)", section: "OTP", type: "multiline", createOnly: true },
      { key: "status", label: "Status", section: "OTP", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Pending", value: "pending" }, { label: "Active", value: "active" }, { label: "Used", value: "used" }, { label: "Expired", value: "expired" },
      ] },
      { key: "account", label: "Account", section: "Context" },
      { key: "purpose_tag", label: "Purpose", section: "Context", type: "select", filterRuleType: "MultiSelectRule", options: [
        { label: "Login", value: "login" }, { label: "Transfer", value: "transfer" }, { label: "Withdrawal", value: "withdrawal" },
        { label: "Verification", value: "verification" }, { label: "Password Reset", value: "reset" }, { label: "Sign-up", value: "signup" },
      ] },
      { key: "expected_source", label: "Expected Source", section: "Context" },
      { key: "sensitivity", label: "Sensitivity", section: "Privacy", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Public", value: "public" }, { label: "Internal", value: "internal" }, { label: "Sensitive", value: "sensitive" }, { label: "Restricted", value: "restricted" },
      ] },
      { key: "geo_match_status", label: "Location Match", section: "Privacy", type: "select", readOnly: true, filterRuleType: "MultiSelectRule", options: [
        { label: "Match", value: "match" }, { label: "Mismatch", value: "mismatch" }, { label: "Unknown", value: "unknown" },
      ] },
      { key: "used", label: "Used", section: "OTP", type: "boolean", filterRuleType: "SelectRule" },
      { key: "has_code", label: "Code Received", section: "OTP", type: "boolean", readOnly: true },
      { key: "requested_by", label: "Requested By", section: "Request", type: "number", relation: "staff", readOnly: true, filterRuleType: "MultiSelectRule" },
      { key: "requester_name", label: "Requester", section: "Request", readOnly: true },
      { key: "requester_country", label: "Requester Country", section: "Request", readOnly: true },
      { key: "requester_city", label: "Requester City", section: "Request", readOnly: true },
      { key: "requested_at", label: "Requested", section: "Dates", type: "datetime", readOnly: true },
      { key: "created_at", label: "Created", section: "Dates", type: "datetime", readOnly: true },
      { key: "received_at", label: "Received", section: "Dates", type: "datetime", readOnly: true },
      { key: "expired_at", label: "Expires", section: "Dates", type: "datetime", readOnly: true },
      { key: "seen_at", label: "First Seen", section: "Dates", type: "datetime", readOnly: true },
    ],
    actions: [{
      key: "reveal", availabilityKey: "reveal", title: "Reveal OTP", icon: "eye-outline",
      endpointTemplate: "otpmanager/{id}/reveal", method: "POST",
      confirm: "Reveal this OTP code? The access will be recorded in the audit log.",
      successMessage: "OTP revealed and access logged",
      resultFields: [
        { key: "otp_code", label: "OTP Code" }, { key: "sender", label: "Sender" },
        { key: "source_name", label: "Source" }, { key: "message", label: "Message" },
      ],
    }],
  },
  {
    key: "otp_sources",
    title: "OTP Source",
    plural: "OTP Sources",
    group: "Admin",
    endpoint: "otpmanager/sources",
    permissionFeature: "otpmanager",
    permissionCapabilities: { create: "manage_sources", edit: "manage_sources", delete: "manage_sources" },
    idKey: "id",
    icon: "radio-outline",
    color: "#64748B",
    titleFields: ["source"],
    subtitleFields: ["source_type", "status", "sensitivity", "ttl_seconds"],
    searchFields: ["source", "normalized_name", "source_type"],
    statusField: "status",
    statusOptions: [
      { label: "Active", value: "active", color: "#16A34A" },
      { label: "Pending", value: "pending", color: "#D97706" },
      { label: "Disabled", value: "disabled", color: "#64748B" },
    ],
    filterableFields: ["source", "source_type", "status", "sensitivity", "ttl_seconds", "created_at"],
    fields: [
      { key: "source", label: "Source Name", section: "Source", required: true },
      { key: "source_type", label: "Source Type", section: "Source", type: "select", required: true, defaultValue: "sms", filterRuleType: "MultiSelectRule", options: [
        { label: "SMS", value: "sms" }, { label: "Email", value: "email" }, { label: "App", value: "app" },
      ] },
      { key: "status", label: "Status", section: "Source", type: "select", required: true, defaultValue: "active", filterRuleType: "MultiSelectRule", options: [
        { label: "Active", value: "active" }, { label: "Pending", value: "pending" }, { label: "Disabled", value: "disabled" },
      ] },
      { key: "sensitivity", label: "Sensitivity", section: "Privacy", type: "select", required: true, defaultValue: "internal", filterRuleType: "MultiSelectRule", options: [
        { label: "Public", value: "public" }, { label: "Internal", value: "internal" }, { label: "Sensitive", value: "sensitive" }, { label: "Restricted", value: "restricted" },
      ] },
      { key: "staff_ids", label: "Allowed Staff", section: "Privacy", type: "number", relation: "staff", multiple: true, submitAsArray: true },
      { key: "ttl_seconds", label: "Lifetime (seconds)", section: "Delivery", type: "number", required: true, defaultValue: 300 },
      { key: "webhook_url", label: "Webhook URL", section: "Delivery", type: "url" },
      { key: "normalized_name", label: "Normalized Name", section: "System", readOnly: true },
      { key: "created_at", label: "Created", section: "System", type: "datetime", readOnly: true },
      { key: "created_by", label: "Created By", section: "System", type: "number", relation: "staff", readOnly: true },
      { key: "updated_by", label: "Updated By", section: "System", type: "number", relation: "staff", readOnly: true },
    ],
  },
  {
    key: "setup_customer_groups",
    title: "Customer Group",
    plural: "Customer Groups",
    group: "Admin",
    endpoint: "setup_api/customer_groups",
    supportsAdvancedFilters: true,
    idKey: "id",
    icon: "people-circle-outline",
    color: "#475569",
    titleFields: ["name"],
    searchFields: ["name"],
    filterableFields: ["id", "name"],
    sortableFields: ["id", "name"],
    defaultSort: { field: "name", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [{ key: "name", label: "Group Name", section: "Group", required: true }],
  },
  {
    key: "setup_ticket_priorities",
    title: "Ticket Priority",
    plural: "Ticket Priorities",
    group: "Admin",
    endpoint: "setup_api/ticket_priorities",
    supportsAdvancedFilters: true,
    idKey: "priorityid",
    icon: "alert-circle-outline",
    color: "#D97706",
    titleFields: ["name"],
    searchFields: ["name"],
    filterableFields: ["priorityid", "name"],
    sortableFields: ["priorityid", "name"],
    defaultSort: { field: "name", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "priorityid", label: "Priority ID", section: "Priority", type: "number", readOnly: true },
      { key: "name", label: "Priority Name", section: "Priority", required: true },
    ],
  },
  {
    key: "setup_ticket_replies",
    title: "Predefined Reply",
    plural: "Predefined Replies",
    group: "Admin",
    endpoint: "setup_api/ticket_replies",
    supportsAdvancedFilters: true,
    idKey: "id",
    icon: "chatbox-ellipses-outline",
    color: "#2563EB",
    titleFields: ["name"],
    subtitleFields: ["message"],
    searchFields: ["name", "message"],
    filterableFields: ["id", "name", "message"],
    sortableFields: ["id", "name"],
    defaultSort: { field: "name", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "name", label: "Reply Name", section: "Reply", required: true },
      { key: "message", label: "Reply HTML", section: "Reply", type: "multiline" },
    ],
  },
  {
    key: "setup_ticket_statuses",
    title: "Ticket Status",
    plural: "Ticket Statuses",
    group: "Admin",
    endpoint: "setup_api/ticket_statuses",
    supportsAdvancedFilters: true,
    idKey: "ticketstatusid",
    icon: "flag-outline",
    color: "#0F766E",
    titleFields: ["name"],
    subtitleFields: ["statusorder", "statuscolor", "isdefault"],
    searchFields: ["name", "statuscolor"],
    filterableFields: ["ticketstatusid", "name", "statuscolor", "statusorder", "isdefault"],
    sortableFields: ["ticketstatusid", "name", "statusorder", "isdefault"],
    defaultSort: { field: "statusorder", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "ticketstatusid", label: "Status ID", section: "Status", type: "number", readOnly: true },
      { key: "name", label: "Status Name", section: "Status", required: true },
      { key: "statuscolor", label: "Color", section: "Status", placeholder: "#0F766E" },
      { key: "statusorder", label: "Order", section: "Status", type: "number" },
      { key: "isdefault", label: "System Default", section: "System", type: "boolean", readOnly: true },
    ],
  },
  {
    key: "setup_ticket_services",
    title: "Ticket Service",
    plural: "Ticket Services",
    group: "Admin",
    endpoint: "setup_api/ticket_services",
    supportsAdvancedFilters: true,
    idKey: "serviceid",
    icon: "headset-outline",
    color: "#0369A1",
    titleFields: ["name"],
    searchFields: ["name"],
    filterableFields: ["serviceid", "name"],
    sortableFields: ["serviceid", "name"],
    defaultSort: { field: "name", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "serviceid", label: "Service ID", section: "Service", type: "number", readOnly: true },
      { key: "name", label: "Service Name", section: "Service", required: true },
    ],
  },
  {
    key: "setup_lead_sources",
    title: "Lead Source",
    plural: "Lead Sources",
    group: "Admin",
    endpoint: "setup_api/lead_sources",
    supportsAdvancedFilters: true,
    idKey: "id",
    icon: "navigate-circle-outline",
    color: "#7C3AED",
    titleFields: ["name"],
    searchFields: ["name"],
    filterableFields: ["id", "name"],
    sortableFields: ["id", "name"],
    defaultSort: { field: "name", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [{ key: "name", label: "Source Name", section: "Source", required: true }],
  },
  {
    key: "setup_lead_statuses",
    title: "Lead Status",
    plural: "Lead Statuses",
    group: "Admin",
    endpoint: "setup_api/lead_statuses",
    supportsAdvancedFilters: true,
    idKey: "id",
    icon: "git-commit-outline",
    color: "#16A34A",
    titleFields: ["name"],
    subtitleFields: ["statusorder", "color", "isdefault"],
    searchFields: ["name", "color"],
    filterableFields: ["id", "name", "statusorder", "color", "isdefault"],
    sortableFields: ["id", "name", "statusorder", "isdefault"],
    defaultSort: { field: "statusorder", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "name", label: "Status Name", section: "Status", required: true },
      { key: "color", label: "Color", section: "Status", placeholder: "#16A34A" },
      { key: "statusorder", label: "Order", section: "Status", type: "number" },
      { key: "isdefault", label: "System Default", section: "System", type: "boolean", readOnly: true },
    ],
  },
  {
    key: "setup_taxes",
    title: "Tax Rate",
    plural: "Tax Rates",
    group: "Admin",
    endpoint: "setup_api/taxes",
    supportsAdvancedFilters: true,
    idKey: "id",
    icon: "receipt-outline",
    color: "#DC2626",
    titleFields: ["name"],
    subtitleFields: ["taxrate"],
    searchFields: ["name"],
    filterableFields: ["id", "name", "taxrate"],
    sortableFields: ["id", "name", "taxrate"],
    defaultSort: { field: "taxrate", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "name", label: "Tax Name", section: "Tax", required: true },
      { key: "taxrate", label: "Rate (%)", section: "Tax", type: "number", required: true },
    ],
  },
  {
    key: "setup_currencies",
    title: "Currency",
    plural: "Currencies",
    group: "Admin",
    endpoint: "setup_api/currencies",
    supportsAdvancedFilters: true,
    idKey: "id",
    icon: "cash-outline",
    color: "#059669",
    titleFields: ["name", "symbol"],
    subtitleFields: ["placement", "decimal_separator", "thousand_separator", "isdefault"],
    searchFields: ["name", "symbol"],
    filterableFields: ["id", "name", "symbol", "decimal_separator", "thousand_separator", "placement", "isdefault"],
    sortableFields: ["id", "name", "symbol", "isdefault"],
    defaultSort: { field: "name", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "name", label: "ISO Code", section: "Currency", required: true, placeholder: "AED" },
      { key: "symbol", label: "Symbol", section: "Currency", required: true, placeholder: "د.إ" },
      { key: "decimal_separator", label: "Decimal Separator", section: "Formatting", type: "select", required: true, defaultValue: ".", options: [{ label: "Dot (.)", value: "." }, { label: "Comma (,)", value: "," }] },
      { key: "thousand_separator", label: "Thousands Separator", section: "Formatting", type: "select", defaultValue: ",", options: [{ label: "Comma (,)", value: "," }, { label: "Dot (.)", value: "." }, { label: "Apostrophe (')", value: "'" }, { label: "None", value: "" }, { label: "Space", value: " " }] },
      { key: "placement", label: "Symbol Placement", section: "Formatting", type: "select", required: true, defaultValue: "before", options: [{ label: "Before amount", value: "before" }, { label: "After amount", value: "after" }] },
      { key: "isdefault", label: "Base Currency", section: "System", type: "boolean", readOnly: true },
    ],
    actions: [{
      key: "make_base",
      title: "Make base currency",
      icon: "star-outline",
      endpointTemplate: "setup_api/currencies/{id}/make_base",
      confirm: "Use this as the ERP base currency? Perfex blocks this after transactions exist in the current base currency.",
      successMessage: "Base currency updated",
    }],
  },
  {
    key: "setup_payment_modes",
    title: "Payment Mode",
    plural: "Payment Modes",
    group: "Admin",
    endpoint: "setup_api/payment_modes",
    supportsAdvancedFilters: true,
    idKey: "id",
    icon: "card-outline",
    color: "#4F46E5",
    titleFields: ["name"],
    subtitleFields: ["description", "active", "invoices_only", "expenses_only"],
    searchFields: ["name", "description"],
    filterableFields: ["id", "name", "description", "active", "show_on_pdf", "selected_by_default", "invoices_only", "expenses_only"],
    sortableFields: ["id", "name", "active", "show_on_pdf", "selected_by_default"],
    defaultSort: { field: "name", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "name", label: "Payment Mode", section: "Payment", required: true },
      { key: "description", label: "Description", section: "Payment", type: "multiline" },
      { key: "active", label: "Active", section: "Availability", type: "boolean", defaultValue: true },
      { key: "show_on_pdf", label: "Show on invoice PDF", section: "Availability", type: "boolean" },
      { key: "selected_by_default", label: "Selected by default", section: "Availability", type: "boolean" },
      { key: "invoices_only", label: "Invoices only", section: "Scope", type: "boolean" },
      { key: "expenses_only", label: "Expenses only", section: "Scope", type: "boolean" },
    ],
  },
  {
    key: "setup_expense_categories",
    title: "Expense Category",
    plural: "Expense Categories",
    group: "Admin",
    endpoint: "setup_api/expense_categories",
    supportsAdvancedFilters: true,
    idKey: "id",
    icon: "wallet-outline",
    color: "#EA580C",
    titleFields: ["name"],
    subtitleFields: ["description"],
    searchFields: ["name", "description"],
    filterableFields: ["id", "name", "description"],
    sortableFields: ["id", "name"],
    defaultSort: { field: "name", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "name", label: "Category Name", section: "Category", required: true },
      { key: "description", label: "Description", section: "Category", type: "multiline" },
    ],
  },
  {
    key: "setup_contract_types",
    title: "Contract Type",
    plural: "Contract Types",
    group: "Admin",
    endpoint: "setup_api/contract_types",
    supportsAdvancedFilters: true,
    idKey: "id",
    icon: "document-lock-outline",
    color: "#64748B",
    titleFields: ["name"],
    searchFields: ["name"],
    filterableFields: ["id", "name"],
    sortableFields: ["id", "name"],
    defaultSort: { field: "name", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [{ key: "name", label: "Contract Type", section: "Type", required: true }],
  },
  {
    key: "setup_departments",
    title: "Department",
    plural: "Departments",
    group: "Admin",
    endpoint: "setup_api/departments",
    supportsAdvancedFilters: true,
    idKey: "departmentid",
    icon: "business-outline",
    color: "#0F766E",
    titleFields: ["name"],
    subtitleFields: ["email", "calendar_id", "host"],
    searchFields: ["name", "email", "calendar_id"],
    filterableFields: [
      "departmentid", "name", "email", "calendar_id", "hidefromclient",
      "imap_username", "host", "encryption", "folder", "delete_after_import",
    ],
    sortableFields: ["departmentid", "name", "email", "calendar_id"],
    defaultSort: { field: "name", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "departmentid", label: "Department ID", section: "Department", type: "number", readOnly: true },
      { key: "name", label: "Department Name", section: "Department", required: true },
      { key: "calendar_id", label: "Google Calendar ID", section: "Department", placeholder: "Optional calendar ID" },
      { key: "hidefromclient", label: "Hide from customers", section: "Department", type: "boolean" },
      { key: "email", label: "Department Email", section: "Incoming Email", type: "email" },
      { key: "imap_username", label: "IMAP Username", section: "Incoming Email", placeholder: "Defaults to department email" },
      { key: "host", label: "IMAP Host", section: "Incoming Email", placeholder: "imap.example.com" },
      { key: "password", label: "IMAP Password", section: "Incoming Email", type: "password", editableSecret: true, placeholder: "Leave blank to keep the saved password" },
      { key: "encryption", label: "Encryption", section: "Incoming Email", type: "select", defaultValue: "", options: [
        { label: "None", value: "" },
        { label: "TLS", value: "tls" },
        { label: "SSL", value: "ssl" },
      ] },
      { key: "folder", label: "Folder", section: "Incoming Email", placeholder: "INBOX when blank" },
      { key: "delete_after_import", label: "Delete mail after import", section: "Incoming Email", type: "boolean" },
    ],
  },
  {
    key: "setup_email_templates",
    title: "Email Template",
    plural: "Email Templates",
    group: "Admin",
    endpoint: "email_templates_api",
    permissionFeature: "email_templates",
    supportsAdvancedFilters: true,
    idKey: "emailtemplateid",
    icon: "mail-unread-outline",
    color: "#4F46E5",
    titleFields: ["name"],
    subtitleFields: ["type_label", "delivery_summary"],
    searchFields: ["name", "slug", "subject", "fromname"],
    filterableFields: ["emailtemplateid", "name", "slug", "type", "subject", "fromname", "plaintext", "active", "order"],
    sortableFields: ["emailtemplateid", "name", "slug", "type", "subject", "fromname", "plaintext", "active", "order"],
    defaultSort: { field: "order", direction: "asc" },
    statusField: "active",
    statusOptions: [
      { label: "Enabled", value: 1, color: "#16A34A" },
      { label: "Disabled", value: 0, color: "#DC2626" },
    ],
    filterRules: {
      type: { ruleType: "MultiSelectRule" },
      active: { ruleType: "MultiSelectRule" },
    },
    canCreate: false,
    canDelete: false,
    fields: [
      { key: "emailtemplateid", label: "Template ID", section: "Identity", type: "number", readOnly: true },
      { key: "name", label: "Template", section: "Identity", readOnly: true },
      { key: "slug", label: "Slug", section: "Identity", readOnly: true },
      { key: "type", label: "Module", section: "Identity", readOnly: true },
      { key: "language", label: "Primary Language", section: "Identity", readOnly: true },
      { key: "subject", label: "Subject", section: "Content", required: true, customEditor: true },
      { key: "fromname", label: "Sender Name", section: "Delivery", required: true, customEditor: true },
      { key: "fromemail", label: "Sender Email", section: "Delivery", type: "email", customEditor: true },
      { key: "message", label: "Message", section: "Content", type: "multiline", customEditor: true },
      { key: "plaintext", label: "Send as Plain Text", section: "Delivery", type: "boolean", customEditor: true },
      { key: "active", label: "Enabled", section: "Delivery", type: "boolean", customEditor: true },
      { key: "variants", label: "Language Variants", section: "Content", type: "json", hidden: true, customEditor: true },
      { key: "order", label: "Display Order", section: "Identity", type: "number", readOnly: true },
      { key: "language_count", label: "Languages", section: "Coverage", type: "number", readOnly: true },
      { key: "status_summary", label: "Delivery Status", section: "Coverage", readOnly: true },
      { key: "delivery_summary", label: "Format & Coverage", section: "Coverage", readOnly: true },
    ],
    actions: [
      {
        key: "status",
        title: "Change delivery status…",
        icon: "power-outline",
        endpointTemplate: "email_templates_api/{id}/status",
        method: "PUT",
        fields: [{ key: "active", label: "Enabled", type: "boolean", required: true }],
        successMessage: "Email template status updated",
      },
    ],
  },
  {
    key: "setup_custom_fields",
    title: "Custom Field",
    plural: "Custom Fields",
    group: "Admin",
    endpoint: "custom_fields_admin_api",
    supportsAdvancedFilters: true,
    idKey: "id",
    icon: "options-outline",
    color: "#0891B2",
    titleFields: ["name"],
    subtitleFields: ["scope_summary", "visibility_summary"],
    searchFields: ["name", "fieldto", "type", "slug"],
    filterableFields: ["id", "name", "fieldto", "type", "slug", "active", "required", "show_on_table"],
    sortableFields: ["id", "name", "fieldto", "type", "slug", "active", "field_order", "value_count"],
    defaultSort: { field: "field_order", direction: "asc" },
    adminOnlyAccess: true,
    adminOnlyMutations: true,
    fields: [
      { key: "fieldto", label: "Belongs To", section: "Definition", required: true, customEditor: true },
      { key: "name", label: "Field Name", section: "Definition", required: true, customEditor: true },
      { key: "type", label: "Type", section: "Definition", required: true, customEditor: true },
      { key: "options", label: "Options", section: "Values", type: "multiline", customEditor: true },
      { key: "default_value", label: "Default Value", section: "Values", customEditor: true },
      { key: "field_order", label: "Display Order", section: "Layout", type: "number", defaultValue: 0, customEditor: true },
      { key: "bs_column", label: "Column Width", section: "Layout", type: "number", required: true, defaultValue: 12, customEditor: true },
      { key: "active", label: "Active", section: "Behaviour", type: "boolean", defaultValue: "on", customEditor: true },
      { key: "display_inline", label: "Display Checkboxes Inline", section: "Behaviour", type: "boolean", customEditor: true },
      { key: "only_admin", label: "Admin Only", section: "Behaviour", type: "boolean", customEditor: true },
      { key: "disalow_client_to_edit", label: "Prevent Customer Editing", section: "Behaviour", type: "boolean", customEditor: true },
      { key: "required", label: "Required", section: "Behaviour", type: "boolean", customEditor: true },
      { key: "show_on_table", label: "Show on Table", section: "Visibility", type: "boolean", customEditor: true },
      { key: "show_on_pdf", label: "Show on PDF", section: "Visibility", type: "boolean", customEditor: true },
      { key: "show_on_client_portal", label: "Show on Customer Portal", section: "Visibility", type: "boolean", customEditor: true },
      { key: "show_on_ticket_form", label: "Show on Ticket Form", section: "Visibility", type: "boolean", customEditor: true },
      { key: "locked_schema", label: "Schema Locked", hidden: true },
      { key: "slug", label: "Slug", section: "Identity", readOnly: true },
      { key: "target_label", label: "Module", section: "Identity", readOnly: true },
      { key: "type_label", label: "Field Type", section: "Identity", readOnly: true },
      { key: "value_count", label: "Saved Values", section: "Usage", type: "number", readOnly: true },
      { key: "visibility_summary", label: "Visibility", section: "Usage", type: "multiline", readOnly: true },
    ],
  },
  {
    key: "setup_roles",
    title: "Role",
    plural: "Roles",
    group: "Admin",
    endpoint: "roles_api",
    permissionFeature: "roles",
    supportsAdvancedFilters: true,
    idKey: "roleid",
    icon: "key-outline",
    color: "#7C3AED",
    titleFields: ["name"],
    subtitleFields: ["coverage_summary"],
    searchFields: ["name"],
    filterableFields: ["roleid", "name"],
    sortableFields: ["roleid", "name", "user_count"],
    defaultSort: { field: "name", direction: "asc" },
    fields: [
      { key: "roleid", label: "Role ID", section: "Role", type: "number", readOnly: true },
      { key: "name", label: "Role Name", section: "Role", required: true },
      { key: "permissions", label: "Permissions", section: "Permissions", type: "json", hidden: true, defaultValue: "{}" },
      { key: "update_staff_permissions", label: "Update assigned staff", section: "Permissions", type: "boolean", hidden: true },
      { key: "user_count", label: "Assigned Staff", section: "Coverage", type: "number", readOnly: true },
      { key: "feature_count", label: "Granted Features", section: "Coverage", type: "number", readOnly: true },
      { key: "permission_count", label: "Granted Capabilities", section: "Coverage", type: "number", readOnly: true },
      { key: "assigned_staff", label: "Staff Using This Role", section: "Assigned Staff", type: "multiline", readOnly: true },
      { key: "permissions_summary", label: "Permission Matrix", section: "Permissions", type: "multiline", readOnly: true },
    ],
  },
];

const MODULE_MAP = new Map(MODULES.map((module) => [module.key, module]));

export function getModule(key: string | undefined): ModuleDefinition | undefined {
  if (!key) return undefined;
  return MODULE_MAP.get(key);
}

export function listVisibleModules(): ModuleDefinition[] {
  const hidden = new Set([
    "task_checklist",
    "task_comments",
    "task_assignments",
    "task_followers",
    "technical_items",
    "budget_item_specs",
    "unspsc_commodity_specs",
    "cost_calculation_items",
    "survey_send_log",
    "tender_boq",
    "tender_requirements",
    "tender_risks",
    "opportunity_boq",
    "opportunity_notes",
    "purchase_vendor_contacts",
    "advance_lead_details",
    "recruitment_candidate_education",
    "recruitment_candidate_experience",
    "fixed_equipment_inventory_checkouts",
    "fixed_equipment_license_seats",
    "fixed_equipment_predefined_kit_models",
    "fixed_equipment_audit_items",
    "material_metadata",
    "material_kit_items",
    "automation_triggers",
    "automation_actions",
  ]);
  return MODULES.filter((module) => !hidden.has(module.key));
}

export function moduleGroups(): string[] {
  return Array.from(new Set(listVisibleModules().map((module) => module.group)));
}

export function moduleId(module: ModuleDefinition, row: any): string {
  const value = row?.[module.idKey] ?? row?.id ?? row?.userid ?? row?.staffid ?? row?.ticketid ?? row?.itemid;
  return String(value ?? "");
}

export function moduleTitle(module: ModuleDefinition, row: any): string {
  const parts = module.titleFields
    .map((field) => row?.[field])
    .filter((value) => !isBlankDisplayValue(value))
    .map((value) => cleanModuleText(value));
  if (parts.length > 0) return parts.join(" ");
  return `${module.title} #${moduleId(module, row) || "?"}`;
}

export function moduleSubtitle(module: ModuleDefinition, row: any): string {
  const fields = module.subtitleFields || [];
  const seen = new Set<string>();
  return fields
    .map((field) => moduleFieldDisplayValue(module, row, field))
    .filter((value) => {
      if (!value) return false;
      const normalized = value.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 6)
    .join(" • ");
}

function moduleFieldDisplayValue(module: ModuleDefinition, row: any, key: string): string {
  const value = row?.[key];
  if (isBlankDisplayValue(value)) return "";

  const field = module.fields.find((item) => item.key === key);
  const option = field?.options?.find((item) => String(item.value) === String(value));
  if (option) return option.label;

  if (key === "rel_type") return relationTypeDisplayLabel(value);

  if (field?.relation === "customer") {
    return cleanModuleText(row?.company || row?.customer_name || row?.client_name || `Customer #${value}`);
  }

  if (field?.relation === "staff") {
    return cleanModuleText(`Staff #${value}`);
  }

  return cleanModuleText(value);
}

function isBlankDisplayValue(value: any): boolean {
  if (value === undefined || value === null) return true;
  const text = cleanModuleText(value).toLowerCase();
  return (
    text === "" ||
    text === "0" ||
    text === "0.00" ||
    text === "0000-00-00" ||
    text === "0000-00-00 00:00:00" ||
    text === "a:0:{}" ||
    text === "[]" ||
    text === "{}"
  );
}

function cleanModuleText(value: any): string {
  return String(value ?? "")
    .replace(/<\/(p|div|li|br|tr|h[1-6])>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function relationTypeDisplayLabel(value: any): string {
  const key = cleanModuleText(value).toLowerCase();
  if (!key) return "";
  if (key === "erp_dev") return "ERP Development Module";
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isCrudEnabled(module: ModuleDefinition, action: "create" | "update" | "delete"): boolean {
  if (action === "create") return module.canCreate !== false;
  if (action === "update") return module.canUpdate !== false;
  return module.canDelete !== false;
}

/**
 * Returns the permission feature key(s) for a module as an array.
 * Modules without a permissionFeature are accessible to everyone.
 */
export function getModulePermissionFeatures(module: ModuleDefinition): string[] {
  if (!module.permissionFeature) return [];
  return Array.isArray(module.permissionFeature)
    ? module.permissionFeature
    : [module.permissionFeature];
}

export function getModuleMutationCapability(
  module: ModuleDefinition,
  action: "create" | "edit" | "delete",
): string {
  return module.permissionCapabilities?.[action] ?? action;
}

export function resolveTemplateValue(value: string | number, row: any, fallbackId: string): string | number {
  if (typeof value !== "string") return value;
  return value.replace(/\{id\}/g, fallbackId).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const next = row?.[key];
    return next === undefined || next === null ? "" : String(next);
  });
}

// ── Perfix Filter Helpers ────────────────────────────────────────────────

/**
 * Return only fields explicitly declared as supported by the endpoint. A filter
 * key does not have to be an editable form field (audit/user-facing list
 * columns often are not), so create a read-only descriptor for those keys.
 */
export function getFilterFields(module: ModuleDefinition): ModuleField[] {
  if (module.filterableFields?.length) {
    return module.filterableFields
      .map((key) => module.fields.find((f) => f.key === key) ?? syntheticFilterField(key));
  }
  return [];
}

function syntheticFilterField(key: string): ModuleField {
  const normalized = key.toLowerCase();
  const label = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bId\b/g, "ID");
  let type: FieldType = "text";
  if (/(^|_)(date|created|updated|start|end|expiry|birthday|month)(_|$)/.test(normalized) || normalized.endsWith("_at")) {
    type = "date";
  } else if (/(^id$|_id$|^number$|amount|total|price|rate|salary|quantity|qty|duration|point|percent|balance|achievement)/.test(normalized)) {
    type = "number";
  } else if (/^(is_|has_|active$|closed$|sent$|public$|default$|finished$)/.test(normalized)) {
    type = "boolean";
  }
  return { key, label, type, readOnly: true };
}

/**
 * REST advanced-filter contracts that cannot be inferred safely from a form
 * field's display type. For example, a numeric staff ID is a Number field in
 * the editor but a MultiSelectRule in Perfex filters. Keeping these overrides
 * centralized prevents the UI from offering operators the endpoint rejects.
 */
const API_FILTER_RULE_TYPE_OVERRIDES: Partial<
  Record<string, Record<string, FilterRuleType>>
> = {
  customers: { country: "SelectRule" },
  contacts: { customer_id: "SelectRule", datecreated: "DateRule" },
  leads: { source: "SelectRule", assigned: "SelectRule", country: "SelectRule" },
  projects: { clientid: "SelectRule" },
  invoices: { clientid: "SelectRule" },
  estimates: { clientid: "SelectRule" },
  proposals: { assigned: "SelectRule" },
  expenses: { category: "SelectRule", clientid: "SelectRule", project_id: "SelectRule" },
  credit_notes: { number: "NumberRule" },
  contracts: { client: "SelectRule" },
  tickets: {
    department: "SelectRule",
    userid: "SelectRule",
    assigned: "SelectRule",
    service: "SelectRule",
    merged_ticket_id: "SelectRule",
  },
  tenders: { source: "MultiSelectRule" },
  opportunities: {
    opportunity_code: "MultiSelectRule",
    client: "MultiSelectRule",
    opportunity_status: "MultiSelectRule",
    approval_status: "MultiSelectRule",
    responsible_employee: "MultiSelectRule",
    opportunity_field: "MultiSelectRule",
    opportunity_job_type: "MultiSelectRule",
  },
  purchase_vendors: {
    status: "SelectRule",
    supplier_category: "MultiSelectRule",
    country: "MultiSelectRule",
  },
  purchase_vendor_contacts: { supplier_id: "MultiSelectRule" },
  purchase_requests: {
    staff_id: "MultiSelectRule",
    department_id: "MultiSelectRule",
    resource_type: "MultiSelectRule",
    project_id: "MultiSelectRule",
    currency_id: "MultiSelectRule",
    rel_type: "MultiSelectRule",
    resreq_type: "MultiSelectRule",
  },
  purchase_orders: {
    staff_id: "MultiSelectRule",
    department_id: "MultiSelectRule",
    supplier_id: "MultiSelectRule",
    project_id: "MultiSelectRule",
    delivery_status: "MultiSelectRule",
    currency_id: "MultiSelectRule",
    resreq_type: "MultiSelectRule",
  },
  purchase_payment_requests: {
    staff_id: "MultiSelectRule",
    project_id: "MultiSelectRule",
    po_id: "MultiSelectRule",
    source_type: "MultiSelectRule",
    expense_id: "MultiSelectRule",
    department_id: "MultiSelectRule",
    supplier_id: "MultiSelectRule",
    paymentmode: "MultiSelectRule",
    payment_status: "MultiSelectRule",
    status: "MultiSelectRule",
    currency_id: "MultiSelectRule",
  },
  purchase_expense_requests: {
    staff_id: "MultiSelectRule",
    project_id: "MultiSelectRule",
    department_id: "MultiSelectRule",
    resource_type: "MultiSelectRule",
    status: "MultiSelectRule",
    payment_status: "MultiSelectRule",
    currency_id: "MultiSelectRule",
  },
  purchase_received_vouchers: {
    project_id: "MultiSelectRule",
    po_id: "MultiSelectRule",
    department_id: "MultiSelectRule",
    supplier_id: "MultiSelectRule",
    delivery_status: "MultiSelectRule",
    status: "MultiSelectRule",
    currency_id: "MultiSelectRule",
  },
  purchase_delivery_notes: {
    project_id: "MultiSelectRule",
    po_id: "MultiSelectRule",
    supplier_id: "MultiSelectRule",
    status: "MultiSelectRule",
    currency_id: "MultiSelectRule",
  },
  purchase_quotations: {
    supplier_id: "MultiSelectRule",
    number: "TextRule",
    project_id: "MultiSelectRule",
    status: "MultiSelectRule",
    currency: "MultiSelectRule",
    rfq_id: "MultiSelectRule",
    pr_id: "MultiSelectRule",
  },
  purchase_completion_certificates: {
    project_id: "MultiSelectRule",
    created_at: "DateRule",
    updated_at: "DateRule",
    created_by: "MultiSelectRule",
  },
  budget_items: {
    expensecategoryID: "MultiSelectRule",
    itemspecificationID: "MultiSelectRule",
    unitID: "MultiSelectRule",
    commodity_id: "MultiSelectRule",
    product_family_id: "MultiSelectRule",
    item_type: "MultiSelectRule",
    added_by: "MultiSelectRule",
    updated_by: "MultiSelectRule",
    resreq_type: "MultiSelectRule",
  },
  goals: {
    goal_type: "MultiSelectRule",
    contract_type: "MultiSelectRule",
    staff_id: "MultiSelectRule",
  },
  business_partners: {
    parent_id: "MultiSelectRule",
    created_by: "MultiSelectRule",
    updated_by: "MultiSelectRule",
  },
  cost_centers: {
    parent_id: "MultiSelectRule",
    staff_id: "MultiSelectRule",
    manager_id: "MultiSelectRule",
    section: "MultiSelectRule",
    status: "MultiSelectRule",
  },
  timesheets: { staff_id: "SelectRule", task_id: "SelectRule" },
  recruitment_candidates: {
    gender: "MultiSelectRule",
    nationality: "MultiSelectRule",
    nation: "MultiSelectRule",
    status: "MultiSelectRule",
    Visa_Status: "MultiSelectRule",
    recruitment_channel: "MultiSelectRule",
    year_experience: "NumberRule",
  },
  recruitment_candidate_education: { candidate: "MultiSelectRule" },
  recruitment_candidate_experience: { candidate: "MultiSelectRule" },
  recruitment_positions: {
    industry_id: "MultiSelectRule",
    company_id: "MultiSelectRule",
  },
  recruitment_proposals: {
    position: "MultiSelectRule",
    department: "MultiSelectRule",
    approver: "MultiSelectRule",
    status: "MultiSelectRule",
  },
  hr_payroll_templates: { staff_id_created: "SelectRule" },
  hr_deduction_types: { earnings_max: "NumberRule" },
  hr_contracts: {
    name_contract: "TextRule",
    staff: "SelectRule",
    contract_status: "SelectRule",
  },
  hr_contract_templates: { job_position: "TextRule" },
  hr_dependents: { staffid: "SelectRule", status: "MultiSelectRule" },
  hr_job_positions: { job_p_id: "SelectRule" },
  hr_training_libraries: { training_type: "SelectRule" },
  hr_training_programs: { training_type: "SelectRule" },
  hr_education: { staff_id: "SelectRule" },
  gatepass: {
    project_id: "MultiSelectRule",
    representative_id: "MultiSelectRule",
    rel_type: "MultiSelectRule",
    duration: "MultiSelectRule",
  },
  gatepass_vehicles: {
    type: "MultiSelectRule",
    emirate: "MultiSelectRule",
    driver_id: "MultiSelectRule",
  },
  fixed_equipment_checkout_history: { item_id: "SelectRule" },
  fixed_equipment_consumables: { supplier_id: "SelectRule" },
  fixed_equipment_components: {
    manufacturer_id: "SelectRule",
    supplier_id: "SelectRule",
  },
  knowledge: {
    articlegroup: "MultiSelectRule",
    staff_article: "MultiSelectRule",
    active: "MultiSelectRule",
  },
  surveys: {
    active: "MultiSelectRule",
    onlyforloggedin: "MultiSelectRule",
    iprestrict: "MultiSelectRule",
  },
  automation: { type: "MultiSelectRule" },
};

/**
 * Return the effective FilterRuleType for a field, checking module-level
 * filterRules override first, then field-level filterRuleType, then inferring
 * from field.type.
 */
export function getFieldFilterRuleType(
  module: ModuleDefinition,
  field: ModuleField,
): FilterRuleType {
  const apiContractType = API_FILTER_RULE_TYPE_OVERRIDES[module.key]?.[field.key];
  if (apiContractType) return apiContractType;
  // Module-level override takes highest priority
  if (module.filterRules?.[field.key]?.ruleType) {
    return module.filterRules[field.key].ruleType!;
  }
  // Field-level override
  if (field.filterRuleType) return field.filterRuleType;
  // Infer from data type
  return inferFilterRuleType(field.type);
}

/**
 * Return the allowed filter operators for a field, checking module-level
 * filterRules override first, then field-level filterOperators, then the
 * default operators for its FilterRuleType.
 */
export function getFieldFilterOperators(
  module: ModuleDefinition,
  field: ModuleField,
): FilterOperator[] {
  // Module-level override
  if (module.filterRules?.[field.key]?.operators) {
    return module.filterRules[field.key].operators!;
  }
  // Field-level override
  if (field.filterOperators) return field.filterOperators;
  // Default operators for the rule type
  const ruleType = getFieldFilterRuleType(module, field);
  return FILTER_TYPE_OPERATORS[ruleType] ?? [];
}

/**
 * Apply a single filter rule against a row value. Returns true if the row
 * matches the rule.
 */
export function evaluateFilterRule(
  rule: FilterRule,
  rowValue: any,
): boolean {
  const rawValue = rowValue;
  const rowStr = rawValue === null || rawValue === undefined ? "" : String(rawValue);
  const ruleValue = rule.value;

  // is_empty / is_not_empty don't need a comparison value
  if (rule.operator === "is_empty") return rowStr === "" || rowStr === "0" || rowStr === "0.00";
  if (rule.operator === "is_not_empty") return !(rowStr === "" || rowStr === "0" || rowStr === "0.00");

  // For "in" / "not_in", value must be an array
  if (rule.operator === "in" || rule.operator === "not_in") {
    const values = Array.isArray(ruleValue) ? ruleValue : String(ruleValue).split(",");
    const match = values.map(String).includes(rowStr);
    return rule.operator === "in" ? match : !match;
  }

  // Scalar comparison — normalize to string
  const compareVal = Array.isArray(ruleValue) ? String(ruleValue[0] ?? "") : String(ruleValue ?? "");

  switch (rule.operator) {
    case "equal":
      return rowStr === compareVal;

    case "not_equal":
      return rowStr !== compareVal;

    case "contains":
      return rowStr.toLowerCase().includes(compareVal.toLowerCase());

    case "not_contains":
      return !rowStr.toLowerCase().includes(compareVal.toLowerCase());

    case "begins_with":
      return rowStr.toLowerCase().startsWith(compareVal.toLowerCase());

    case "not_begins_with":
      return !rowStr.toLowerCase().startsWith(compareVal.toLowerCase());

    case "ends_with":
      return rowStr.toLowerCase().endsWith(compareVal.toLowerCase());

    case "not_ends_with":
      return !rowStr.toLowerCase().endsWith(compareVal.toLowerCase());

    case "between":
    case "not_between": {
      const [from, to] = compareVal.split("..").map((s) => s.trim());
      const numRow = parseFloat(rowStr);
      const numFrom = parseFloat(from);
      const numTo = parseFloat(to);
      // Try numeric comparison first
      if (!isNaN(numRow) && !isNaN(numFrom) && !isNaN(numTo)) {
        const inRange = numRow >= numFrom && numRow <= numTo;
        return rule.operator === "between" ? inRange : !inRange;
      }
      // String comparison fallback
      const inRangeStr = rowStr >= from && rowStr <= to;
      return rule.operator === "between" ? inRangeStr : !inRangeStr;
    }

    case "less":
      return parseFloat(rowStr) < parseFloat(compareVal);

    case "less_or_equal":
      return parseFloat(rowStr) <= parseFloat(compareVal);

    case "greater":
      return parseFloat(rowStr) > parseFloat(compareVal);

    case "greater_or_equal":
      return parseFloat(rowStr) >= parseFloat(compareVal);

    default:
      return true;
  }
}
