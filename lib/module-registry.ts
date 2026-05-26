export type FieldType =
  | "text"
  | "multiline"
  | "number"
  | "money"
  | "date"
  | "datetime"
  | "email"
  | "phone"
  | "url"
  | "boolean"
  | "select"
  | "json";

export type RelationKind =
  | "customer"
  | "staff"
  | "country"
  | "currency"
  | "customer_group"
  | "payment_mode"
  | "tax_rate"
  | "lead_source"
  | "lead_status"
  | "ticket_priority"
  | "ticket_status";

export type ModuleField = {
  key: string;
  label: string;
  type?: FieldType;
  relation?: RelationKind;
  required?: boolean;
  readOnly?: boolean;
  section?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string | number }>;
  hideIfZero?: boolean;
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
  title: string;
  icon: string;
  endpointTemplate: string;
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
  childField?: string;
  parentField?: string;
  fixedFilters?: Record<string, string | number>;
  createDefaults?: Record<string, string | number>;
  /**
   * Special-cased tab kinds. "files" → renders the attachments tab with
   * camera/gallery/document upload, not the generic related-list view.
   * The associated rel_type for /api/files is taken from `fixedFilters.rel_type`.
   */
  kind?: "files";
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
  { key: "billing_street", label: "Billing Street", section: "Billing", type: "multiline" },
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
    type: "json",
    placeholder: "[\"1\"]",
  },
  {
    key: "newitems",
    label: "Line Items",
    section: "Items",
    type: "json",
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
    customFieldsType: "customers",
    idKey: "userid",
    icon: "business-outline",
    color: "#0284C7",
    titleFields: ["company", "name"],
    subtitleFields: ["phonenumber", "city", "vat"],
    searchFields: ["company", "phonenumber", "city", "vat"],
    fields: [
      { key: "company", label: "Company", section: "Customer", required: true },
      { key: "vat", label: "VAT", section: "Customer" },
      { key: "phonenumber", label: "Phone", section: "Customer", type: "phone" },
      { key: "website", label: "Website", section: "Customer", type: "url" },
      { key: "default_currency", label: "Default Currency", section: "Customer", type: "number", relation: "currency", hideIfZero: true },
      { key: "default_language", label: "Default Language", section: "Customer" },
      { key: "active", label: "Active", section: "Customer", type: "select", options: statusOptions },
      ...addressFields,
      ...billingFields,
      ...shippingFields,
    ],
    tabs: [
      { key: "contacts", title: "Contacts", moduleKey: "contacts", endpointTemplate: "contacts/{id}", createDefaults: { customer_id: "{id}" } },
      { key: "invoices", title: "Invoices", moduleKey: "invoices", childField: "clientid", parentField: "userid", createDefaults: { clientid: "{id}" } },
      { key: "estimates", title: "Estimates", moduleKey: "estimates", childField: "clientid", parentField: "userid", createDefaults: { clientid: "{id}" } },
      { key: "proposals", title: "Proposals", moduleKey: "proposals", childField: "rel_id", parentField: "userid", fixedFilters: { rel_type: "customer" }, createDefaults: { rel_id: "{id}", rel_type: "customer" } },
      { key: "projects", title: "Projects", moduleKey: "projects", childField: "clientid", parentField: "userid", createDefaults: { clientid: "{id}", rel_type: "customer" } },
      { key: "tasks", title: "Tasks", moduleKey: "tasks", childField: "rel_id", parentField: "userid", fixedFilters: { rel_type: "customer" }, createDefaults: { rel_id: "{id}", rel_type: "customer" } },
      { key: "tickets", title: "Tickets", moduleKey: "tickets", childField: "userid", parentField: "userid", createDefaults: { userid: "{id}" } },
      { key: "contracts", title: "Contracts", moduleKey: "contracts", childField: "client", parentField: "userid", createDefaults: { client: "{id}" } },
      { key: "expenses", title: "Expenses", moduleKey: "expenses", childField: "clientid", parentField: "userid", createDefaults: { clientid: "{id}" } },
      { key: "credit_notes", title: "Credit Notes", moduleKey: "credit_notes", childField: "clientid", parentField: "userid", createDefaults: { clientid: "{id}" } },
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
    customFieldsType: "contacts",
    idKey: "id",
    icon: "person-outline",
    color: "#0F766E",
    titleFields: ["firstname", "lastname", "email"],
    subtitleFields: ["company", "title", "phonenumber"],
    searchFields: ["firstname", "lastname", "email", "company"],
    fields: [
      { key: "customer_id", label: "Customer", section: "Contact", type: "number", relation: "customer", required: true },
      { key: "firstname", label: "First Name", section: "Contact", required: true },
      { key: "lastname", label: "Last Name", section: "Contact", required: true },
      { key: "email", label: "Email", section: "Contact", type: "email", required: true },
      { key: "password", label: "Password", section: "Portal", required: true },
      { key: "title", label: "Title", section: "Contact" },
      { key: "phonenumber", label: "Phone", section: "Contact", type: "phone" },
      { key: "is_primary", label: "Primary", section: "Portal", type: "boolean" },
      { key: "active", label: "Active", section: "Portal", type: "select", options: statusOptions },
      { key: "invoice_emails", label: "Invoice Emails", section: "Notifications", type: "boolean" },
      { key: "estimate_emails", label: "Estimate Emails", section: "Notifications", type: "boolean" },
      { key: "project_emails", label: "Project Emails", section: "Notifications", type: "boolean" },
      { key: "ticket_emails", label: "Ticket Emails", section: "Notifications", type: "boolean" },
      { key: "task_emails", label: "Task Emails", section: "Notifications", type: "boolean" },
    ],
  },
  {
    key: "leads",
    title: "Lead",
    plural: "Leads",
    group: "CRM",
    endpoint: "leads",
    customFieldsType: "leads",
    idKey: "id",
    icon: "people-outline",
    color: "#16A34A",
    titleFields: ["name", "company"],
    subtitleFields: ["email", "phonenumber", "status"],
    searchFields: ["name", "company", "email", "phonenumber"],
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
    ],
    tabs: [
      { key: "tasks", title: "Tasks", moduleKey: "tasks", childField: "rel_id", parentField: "id", fixedFilters: { rel_type: "lead" }, createDefaults: { rel_id: "{id}", rel_type: "lead" } },
      { key: "projects", title: "Projects", moduleKey: "projects", childField: "clientid", parentField: "id", fixedFilters: { rel_type: "lead" }, createDefaults: { clientid: "{id}", rel_type: "lead" } },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "lead" } },
    ],
    actions: [
      { key: "change_status", title: "Change Status…", icon: "swap-vertical-outline", endpointTemplate: "leads/{id}/status", method: "PUT",
        fields: [
          { key: "status", label: "New Status ID", type: "number", required: true, placeholder: "e.g. 4 for Customer" },
        ],
        successMessage: "Lead status updated" },
    ],
  },
  {
    key: "projects",
    title: "Project",
    plural: "Projects",
    group: "Work",
    endpoint: "projects",
    customFieldsType: "projects",
    idKey: "id",
    icon: "folder-outline",
    color: "#2563EB",
    titleFields: ["name"],
    subtitleFields: ["company", "clientid", "status", "deadline"],
    searchFields: ["name", "description"],
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
      { key: "tasks", title: "Tasks", moduleKey: "tasks", childField: "rel_id", parentField: "id", fixedFilters: { rel_type: "project" }, createDefaults: { rel_id: "{id}", rel_type: "project" } },
      { key: "milestones", title: "Milestones", moduleKey: "milestones", childField: "project_id", parentField: "id", createDefaults: { project_id: "{id}" } },
      { key: "invoices", title: "Invoices", moduleKey: "invoices", childField: "project_id", parentField: "id", createDefaults: { project_id: "{id}" } },
      { key: "expenses", title: "Expenses", moduleKey: "expenses", childField: "project_id", parentField: "id", createDefaults: { project_id: "{id}" } },
      { key: "tickets", title: "Tickets", moduleKey: "tickets", childField: "project_id", parentField: "id", createDefaults: { project_id: "{id}" } },
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
    customFieldsType: "tasks",
    idKey: "id",
    icon: "checkbox-outline",
    color: "#F59E0B",
    titleFields: ["name"],
    subtitleFields: ["rel_type", "status", "duedate"],
    searchFields: ["name", "description"],
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
    customFieldsType: "invoice",
    idKey: "id",
    icon: "document-text-outline",
    color: "#DC2626",
    titleFields: ["invoice_number", "number", "prefix"],
    subtitleFields: ["company", "total", "status"],
    searchFields: ["number", "company", "clientid"],
    fields: moneyDocFields,
    tabs: [
      { key: "payments", title: "Payments", moduleKey: "payments", childField: "invoiceid", parentField: "id", createDefaults: { invoiceid: "{id}" } },
      { key: "tasks", title: "Tasks", moduleKey: "tasks", childField: "rel_id", parentField: "id", fixedFilters: { rel_type: "invoice" }, createDefaults: { rel_id: "{id}", rel_type: "invoice" } },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "invoice" } },
    ],
    actions: [
      { key: "send", title: "Send to Client", icon: "paper-plane-outline", endpointTemplate: "invoices/{id}/send", confirm: "Email this invoice to the client?", successMessage: "Invoice sent" },
      { key: "record_payment", title: "Record Payment…", icon: "cash-outline", endpointTemplate: "invoices/{id}/record_payment",
        fields: [
          { key: "amount", label: "Amount", type: "money", required: true },
          { key: "paymentmode", label: "Payment Mode", required: true, placeholder: "e.g. cash, bank_transfer" },
          { key: "date", label: "Date", type: "date" },
          { key: "transactionid", label: "Transaction ID" },
          { key: "note", label: "Note", type: "multiline" },
        ],
        successMessage: "Payment recorded",
      },
      { key: "mark_cancelled", title: "Mark Cancelled", icon: "close-circle-outline", endpointTemplate: "invoices/{id}/mark_cancelled", method: "PUT", confirm: "Cancel this invoice?", successMessage: "Invoice cancelled", destructive: true },
    ],
  },
  {
    key: "estimates",
    title: "Estimate",
    plural: "Estimates",
    group: "Sales",
    endpoint: "estimates",
    customFieldsType: "estimate",
    idKey: "id",
    icon: "reader-outline",
    color: "#7C3AED",
    titleFields: ["estimate_number", "number", "prefix"],
    subtitleFields: ["company", "total", "status"],
    searchFields: ["number", "company", "clientid"],
    fields: moneyDocFields,
    tabs: [
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "estimate" } },
    ],
    actions: [
      { key: "send", title: "Send to Client", icon: "paper-plane-outline", endpointTemplate: "estimates/{id}/send", confirm: "Email this estimate to the client?", successMessage: "Estimate sent" },
      { key: "convert", title: "Convert to Invoice", icon: "swap-horizontal-outline", endpointTemplate: "estimates/{id}/convert_to_invoice", confirm: "Convert this estimate to an invoice?", successMessage: "Converted to invoice" },
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
    customFieldsType: "proposal",
    idKey: "id",
    icon: "newspaper-outline",
    color: "#0891B2",
    titleFields: ["subject", "proposal_number", "id"],
    subtitleFields: ["rel_type", "rel_id", "total"],
    searchFields: ["subject", "proposal_to", "email"],
    fields: [
      { key: "subject", label: "Subject", section: "Proposal", required: true },
      { key: "rel_type", label: "Related Type", section: "Relation", required: true },
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
    idKey: "id",
    icon: "card-outline",
    color: "#059669",
    titleFields: ["amount", "transactionid"],
    subtitleFields: ["invoiceid", "date", "paymentmode"],
    searchFields: ["transactionid", "invoiceid", "amount"],
    fields: [
      { key: "invoiceid", label: "Invoice ID", section: "Payment", type: "number", required: true },
      { key: "amount", label: "Amount", section: "Payment", type: "money", required: true },
      { key: "date", label: "Date", section: "Payment", type: "date", required: true },
      { key: "paymentmode", label: "Payment Mode ID", section: "Payment", type: "number" },
      { key: "paymentmethod", label: "Payment Method", section: "Payment" },
      { key: "transactionid", label: "Transaction ID", section: "Payment" },
      { key: "note", label: "Note", section: "Notes", type: "multiline" },
    ],
  },
  {
    key: "expenses",
    title: "Expense",
    plural: "Expenses",
    group: "Finance",
    endpoint: "expenses",
    customFieldsType: "expenses",
    idKey: "id",
    icon: "receipt-outline",
    color: "#EA580C",
    titleFields: ["expense_name", "category_name", "amount"],
    subtitleFields: ["clientid", "date", "paymentmode"],
    searchFields: ["expense_name", "amount", "clientid"],
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
    customFieldsType: "credit_note",
    idKey: "id",
    icon: "return-down-back-outline",
    color: "#BE123C",
    titleFields: ["credit_note_number", "number", "prefix"],
    subtitleFields: ["clientid", "total", "status"],
    fields: moneyDocFields,
  },
  {
    key: "contracts",
    title: "Contract",
    plural: "Contracts",
    group: "CRM",
    endpoint: "contracts",
    customFieldsType: "contracts",
    idKey: "id",
    icon: "document-lock-outline",
    color: "#475569",
    titleFields: ["subject"],
    subtitleFields: ["company", "datestart", "dateend"],
    searchFields: ["subject", "description", "company"],
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
    ],
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
    ],
  },
  {
    key: "tickets",
    title: "Ticket",
    plural: "Tickets",
    group: "Support",
    endpoint: "tickets",
    customFieldsType: "tickets",
    idKey: "ticketid",
    icon: "help-buoy-outline",
    color: "#DB2777",
    titleFields: ["subject"],
    subtitleFields: ["userid", "status", "priority"],
    searchFields: ["subject", "message", "email"],
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
        fields: [{ key: "status", label: "Status ID", type: "number", required: true, placeholder: "Pick from /api/ticket_statuses" }],
        successMessage: "Status updated",
      },
      { key: "change_priority", title: "Change Priority…", icon: "flag-outline", endpointTemplate: "tickets/{id}/priority", method: "PUT",
        fields: [{ key: "priority", label: "Priority ID", type: "number", required: true, placeholder: "Pick from /api/ticket_priorities" }],
        successMessage: "Priority updated",
      },
      { key: "assign", title: "Assign…", icon: "person-add-outline", endpointTemplate: "tickets/{id}/assign", method: "PUT",
        fields: [{ key: "assigned", label: "Staff ID", type: "number", required: true, placeholder: "Pick from /api/staffs" }],
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
    customFieldsType: "items",
    idKey: "itemid",
    icon: "cube-outline",
    color: "#4F46E5",
    titleFields: ["description", "name"],
    subtitleFields: ["rate", "unit", "group_name"],
    searchFields: ["description", "long_description", "rate"],
    fields: itemFields,
  },
  {
    key: "staff",
    title: "Staff",
    plural: "Staff",
    group: "Admin",
    endpoint: "staffs",
    customFieldsType: "staff",
    idKey: "staffid",
    icon: "people-circle-outline",
    color: "#64748B",
    titleFields: ["firstname", "lastname", "email"],
    subtitleFields: ["role", "phonenumber"],
    searchFields: ["firstname", "lastname", "email"],
    fields: [
      { key: "firstname", label: "First Name", section: "Staff", required: true },
      { key: "lastname", label: "Last Name", section: "Staff", required: true },
      { key: "email", label: "Email", section: "Staff", type: "email", required: true },
      { key: "password", label: "Password", section: "Staff" },
      { key: "phonenumber", label: "Phone", section: "Staff", type: "phone" },
      { key: "role", label: "Role ID", section: "Staff", type: "number" },
      { key: "active", label: "Active", section: "Staff", type: "select", options: statusOptions },
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
    fields: [
      { key: "title", label: "Title", section: "Event", required: true },
      { key: "description", label: "Description", section: "Event", type: "multiline" },
      { key: "start", label: "Start", section: "Dates", type: "datetime", required: true },
      { key: "end", label: "End", section: "Dates", type: "datetime" },
      { key: "public", label: "Public", section: "Event", type: "boolean" },
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
    fields: [
      { key: "name", label: "Name", section: "Milestone", required: true },
      { key: "project_id", label: "Project ID", section: "Milestone", type: "number", required: true },
      { key: "due_date", label: "Due Date", section: "Milestone", type: "date" },
      { key: "description", label: "Description", section: "Milestone", type: "multiline" },
    ],
  },
  {
    key: "technical_inquiries",
    title: "Technical Inquiry",
    plural: "Technical Inquiries",
    group: "PRIZM",
    endpoint: "technical_inquiries",
    idKey: "id",
    icon: "construct-outline",
    color: "#0D9488",
    titleFields: ["name", "subject", "title"],
    subtitleFields: ["customer_id", "status", "dateadded"],
    fields: [
      { key: "name", label: "Name", section: "Inquiry", required: true },
      { key: "customer_id", label: "Customer", section: "Relation", type: "number", relation: "customer" },
      { key: "status", label: "Status", section: "Inquiry" },
      { key: "assigned", label: "Assigned To", section: "Inquiry", type: "number", relation: "staff", hideIfZero: true },
      { key: "description", label: "Description", section: "Inquiry", type: "multiline" },
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
    idKey: "id",
    icon: "layers-outline",
    color: "#0D9488",
    titleFields: ["description", "item_name"],
    subtitleFields: ["qty", "unit", "status"],
    fields: [
      { key: "inquiry_id", label: "Inquiry ID", type: "number", required: true },
      { key: "description", label: "Description", type: "multiline", required: true },
      { key: "qty", label: "Quantity", type: "number" },
      { key: "unit", label: "Unit" },
    ],
  },
  {
    key: "tenders",
    title: "Tender",
    plural: "Tenders",
    group: "PRIZM",
    endpoint: "tenders_api",
    idKey: "id",
    icon: "briefcase-outline",
    color: "#9333EA",
    titleFields: ["title", "name", "tender_number"],
    subtitleFields: ["source", "closing_date", "status"],
    fields: [
      { key: "title", label: "Title", section: "Tender", required: true },
      { key: "tender_number", label: "Tender Number", section: "Tender" },
      { key: "source", label: "Source", section: "Tender" },
      { key: "closing_date", label: "Closing Date", section: "Dates", type: "date" },
      { key: "status", label: "Status", section: "Tender" },
      { key: "description", label: "Description", section: "Tender", type: "multiline" },
    ],
    tabs: [
      { key: "boq", title: "BOQ", moduleKey: "tender_boq", endpointTemplate: "tenders_api/boq/{id}", createDefaults: { tender_id: "{id}" } },
      { key: "requirements", title: "Requirements", moduleKey: "tender_requirements", endpointTemplate: "tenders_api/requirements/{id}", createDefaults: { tender_id: "{id}" } },
      { key: "risks", title: "Risks", moduleKey: "tender_risks", endpointTemplate: "tenders_api/risks/{id}", createDefaults: { tender_id: "{id}" } },
      { key: "files", title: "Files", moduleKey: "files", kind: "files", fixedFilters: { rel_type: "tender" } },
    ],
    actions: [
      {
        key: "mark_won",
        title: "Mark as Won",
        icon: "trophy-outline",
        endpointTemplate: "tenders_api/{id}/mark_won",
        confirm: "Mark this tender as Won?",
        successMessage: "Tender marked Won",
      },
      {
        key: "mark_lost",
        title: "Mark as Lost",
        icon: "close-circle-outline",
        endpointTemplate: "tenders_api/{id}/mark_lost",
        confirm: "Mark this tender as Lost?",
        successMessage: "Tender marked Lost",
        destructive: true,
      },
      {
        key: "set_status",
        title: "Change Status…",
        icon: "swap-horizontal-outline",
        endpointTemplate: "tenders_api/{id}/status",
        method: "PUT",
        fields: [
          { key: "tender_status", label: "Status", required: true, placeholder: "e.g. Submitted, Awarded, Cancelled" },
        ],
        successMessage: "Status updated",
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
    titleFields: ["description", "item"],
    subtitleFields: ["qty", "unit", "rate"],
    fields: [
      { key: "tender_id", label: "Tender ID", type: "number", required: true },
      { key: "description", label: "Description", type: "multiline", required: true },
      { key: "qty", label: "Quantity", type: "number" },
      { key: "unit", label: "Unit" },
      { key: "rate", label: "Rate", type: "money" },
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
    fields: [
      { key: "tender_id", label: "Tender ID", type: "number", required: true },
      { key: "requirement", label: "Requirement", type: "multiline", required: true },
      { key: "status", label: "Status" },
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
    endpoint: "opportunities_api",
    idKey: "id",
    icon: "trending-up-outline",
    color: "#22C55E",
    titleFields: ["name", "subject"],
    subtitleFields: ["customer_id", "stage", "status"],
    fields: [
      { key: "name", label: "Name", section: "Opportunity", required: true },
      { key: "customer_id", label: "Customer", section: "Relation", type: "number", relation: "customer" },
      { key: "stage", label: "Stage", section: "Opportunity" },
      { key: "status", label: "Status", section: "Opportunity" },
      { key: "value", label: "Value", section: "Opportunity", type: "money" },
      { key: "description", label: "Description", section: "Opportunity", type: "multiline" },
    ],
    tabs: [
      { key: "boq", title: "BOQ", moduleKey: "opportunity_boq", endpointTemplate: "opportunities_api/boq/{id}", createDefaults: { opportunity_id: "{id}" } },
      { key: "notes", title: "Notes", moduleKey: "opportunity_notes", endpointTemplate: "opportunities_api/notes/{id}", createDefaults: { opportunity_id: "{id}" } },
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
        key: "set_stage",
        title: "Change Stage…",
        icon: "git-branch-outline",
        endpointTemplate: "opportunities_api/{id}/stage",
        method: "PUT",
        fields: [
          { key: "stage_id", label: "Stage ID", type: "number", required: true, placeholder: "Pick from /api/opportunities_api/stages" },
        ],
        successMessage: "Stage updated",
      },
      {
        key: "set_status",
        title: "Change Status…",
        icon: "swap-horizontal-outline",
        endpointTemplate: "opportunities_api/{id}/status",
        method: "PUT",
        fields: [
          { key: "status_id", label: "Status ID", type: "number", required: true, placeholder: "Pick from /api/opportunities_api/statuses" },
        ],
        successMessage: "Status updated",
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
    titleFields: ["description", "item"],
    subtitleFields: ["qty", "unit", "rate"],
    fields: [
      { key: "opportunity_id", label: "Opportunity ID", type: "number", required: true },
      { key: "description", label: "Description", type: "multiline", required: true },
      { key: "qty", label: "Quantity", type: "number" },
      { key: "unit", label: "Unit" },
      { key: "rate", label: "Rate", type: "money" },
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
    titleFields: ["description", "note"],
    subtitleFields: ["dateadded", "staffid"],
    fields: [
      { key: "opportunity_id", label: "Opportunity ID", type: "number", required: true },
      { key: "description", label: "Note", type: "multiline", required: true },
    ],
  },
  {
    key: "purchase_vendors",
    title: "Vendor",
    plural: "Vendors",
    group: "Purchase",
    endpoint: "purchase_api/vendors",
    idKey: "id",
    icon: "storefront-outline",
    color: "#CA8A04",
    titleFields: ["company", "name"],
    subtitleFields: ["email", "phone"],
    fields: [
      { key: "company", label: "Company", section: "Vendor", required: true },
      { key: "email", label: "Email", section: "Vendor", type: "email" },
      { key: "phone", label: "Phone", section: "Vendor", type: "phone" },
      { key: "website", label: "Website", section: "Vendor", type: "url" },
      ...addressFields,
    ],
    tabs: [
      { key: "contacts", title: "Contacts", moduleKey: "purchase_vendor_contacts", endpointTemplate: "purchase_api/vendor_contacts/{id}", createDefaults: { vendor_id: "{id}" } },
    ],
  },
  {
    key: "purchase_vendor_contacts",
    title: "Vendor Contact",
    plural: "Vendor Contacts",
    group: "Purchase",
    endpoint: "purchase_api/vendor_contacts",
    idKey: "id",
    icon: "person-outline",
    color: "#CA8A04",
    titleFields: ["firstname", "lastname", "email"],
    subtitleFields: ["vendor_id", "phonenumber"],
    fields: [
      { key: "vendor_id", label: "Vendor ID", type: "number", required: true },
      { key: "firstname", label: "First Name", required: true },
      { key: "lastname", label: "Last Name", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phonenumber", label: "Phone", type: "phone" },
      { key: "title", label: "Title" },
    ],
  },
  {
    key: "purchase_requests",
    title: "Purchase Request",
    plural: "Purchase Requests",
    group: "Purchase",
    endpoint: "purchase_api/requests",
    idKey: "id",
    icon: "cart-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "request_title", "title", "sequence_number", "number", "id"],
    subtitleFields: ["project_name", "department_name", "status", "requested_date"],
    fields: [
      { key: "title", label: "Request Title", section: "Request", required: true },
      { key: "vendor_id", label: "Vendor ID", section: "Request", type: "number" },
      { key: "date", label: "Date", section: "Dates", type: "date" },
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
    idKey: "id",
    icon: "bag-check-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "order_number", "title", "sequence_number", "number", "id"],
    subtitleFields: ["supplier_company", "project_name", "status", "requested_date"],
    fields: [
      { key: "title", label: "Order Title", section: "Order", required: true },
      { key: "supplier_id", label: "Supplier ID", section: "Order", type: "number" },
      { key: "requested_date", label: "Date", section: "Dates", type: "date" },
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
    idKey: "id",
    icon: "card-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "sequence_number", "number", "id"],
    subtitleFields: ["po_id", "payment_status", "requested_date", "total"],
    fields: [
      { key: "po_id", label: "Purchase Order ID", section: "Payment", type: "number" },
      { key: "requested_date", label: "Requested Date", section: "Payment", type: "date" },
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
    idKey: "id",
    icon: "receipt-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "sequence_number", "title", "number", "id"],
    subtitleFields: ["project_id", "status", "requested_date", "total"],
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
    idKey: "id",
    icon: "archive-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "sequence_number", "number", "id"],
    subtitleFields: ["po_id", "status", "requested_date", "total"],
    fields: [
      { key: "po_id", label: "Purchase Order ID", section: "Voucher", type: "number" },
      { key: "requested_date", label: "Requested Date", section: "Voucher", type: "date" },
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
    idKey: "id",
    icon: "cube-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "sequence_number", "number", "id"],
    subtitleFields: ["po_id", "delivery_status", "requested_date"],
    fields: [
      { key: "po_id", label: "Purchase Order ID", section: "Delivery", type: "number" },
      { key: "requested_date", label: "Requested Date", section: "Delivery", type: "date" },
      { key: "delivery_status", label: "Delivery Status", section: "Delivery" },
      { key: "notes", label: "Notes", section: "Delivery", type: "multiline" },
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
    idKey: "id",
    icon: "document-text-outline",
    color: "#CA8A04",
    titleFields: ["display_number", "prefix", "quocode", "quotation_number", "id"],
    subtitleFields: ["supplier_id", "pr_id", "date", "total"],
    fields: [
      { key: "supplier_id", label: "Supplier ID", section: "Quotation", type: "number" },
      { key: "pr_id", label: "Purchase Request ID", section: "Quotation", type: "number" },
      { key: "date", label: "Date", section: "Quotation", type: "date" },
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
    idKey: "id",
    icon: "ribbon-outline",
    color: "#CA8A04",
    titleFields: ["certificate_number", "title", "id"],
    subtitleFields: ["project_name", "project_id", "date"],
    fields: [
      { key: "project_id", label: "Project ID", section: "Certificate", type: "number" },
      { key: "date", label: "Date", section: "Certificate", type: "date" },
      { key: "notes", label: "Notes", section: "Certificate", type: "multiline" },
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
    key: "materials",
    title: "Material",
    plural: "Materials",
    group: "Inventory",
    endpoint: "materials_catalog/materials",
    idKey: "id",
    icon: "hardware-chip-outline",
    color: "#0F766E",
    titleFields: ["name", "description"],
    subtitleFields: ["category_id", "uom", "unit_price"],
    fields: [
      { key: "name", label: "Name", section: "Material", required: true },
      { key: "description", label: "Description", section: "Material", type: "multiline" },
      { key: "category_id", label: "Category ID", section: "Material", type: "number" },
      { key: "uom", label: "UOM", section: "Material" },
      { key: "unit_price", label: "Unit Price", section: "Material", type: "money" },
    ],
  },
  {
    key: "budget_items",
    title: "Budget Item",
    plural: "Budget Items",
    group: "Finance",
    endpoint: "budget_api/items",
    idKey: "id",
    icon: "calculator-outline",
    color: "#EA580C",
    titleFields: ["description", "name"],
    subtitleFields: ["category_id", "qty", "rate"],
    fields: [
      { key: "description", label: "Description", section: "Budget", type: "multiline", required: true },
      { key: "category_id", label: "Category ID", section: "Budget", type: "number" },
      { key: "qty", label: "Quantity", section: "Budget", type: "number" },
      { key: "unit", label: "Unit", section: "Budget" },
      { key: "rate", label: "Rate", section: "Budget", type: "money" },
    ],
    actions: [
      { key: "approve", title: "Approve (Classify)", icon: "checkmark-circle-outline", endpointTemplate: "budget_api/items/{id}", method: "POST",
        body: { id: "{id}", ai_classified: 1 },
        confirm: "Approve this budget item?", successMessage: "Approved" },
      { key: "reject", title: "Reject (Unclassify)", icon: "close-circle-outline", endpointTemplate: "budget_api/items/{id}/reject",
        confirm: "Reject this budget item?", successMessage: "Rejected", destructive: true },
    ],
  },
  {
    key: "goals",
    title: "Goal",
    plural: "Goals",
    group: "Work",
    endpoint: "goals_api",
    idKey: "id",
    icon: "trophy-outline",
    color: "#65A30D",
    titleFields: ["subject", "name"],
    subtitleFields: ["achievement", "end_date"],
    fields: [
      { key: "subject", label: "Subject", section: "Goal", required: true },
      { key: "description", label: "Description", section: "Goal", type: "multiline" },
      { key: "start_date", label: "Start Date", section: "Dates", type: "date" },
      { key: "end_date", label: "End Date", section: "Dates", type: "date" },
      { key: "achievement", label: "Achievement", section: "Goal", type: "number" },
    ],
    actions: [
      { key: "mark_complete", title: "Mark as Complete", icon: "trophy", endpointTemplate: "goals_api/{id}/mark_complete", method: "PUT", confirm: "Mark this goal as complete?", successMessage: "Goal marked complete" },
      { key: "reopen", title: "Reopen Goal", icon: "refresh-outline", endpointTemplate: "goals_api/{id}/reopen", method: "PUT", confirm: "Reopen this goal?", successMessage: "Goal reopened" },
    ],
  },
  {
    key: "business_partners",
    title: "Business Partner",
    plural: "Business Partners",
    group: "CRM",
    endpoint: "business_partners_api",
    idKey: "id",
    icon: "git-network-outline",
    color: "#0E7490",
    titleFields: ["company", "name"],
    subtitleFields: ["email", "phone"],
    fields: [
      { key: "company", label: "Company", section: "Partner", required: true },
      { key: "email", label: "Email", section: "Partner", type: "email" },
      { key: "phone", label: "Phone", section: "Partner", type: "phone" },
      { key: "group_id", label: "Group ID", section: "Partner", type: "number" },
      ...addressFields,
    ],
  },
  {
    key: "cost_centers",
    title: "Cost Center",
    plural: "Cost Centers",
    group: "Finance",
    endpoint: "cost_centers_api",
    idKey: "id",
    icon: "analytics-outline",
    color: "#EA580C",
    titleFields: ["name", "code"],
    subtitleFields: ["parent_id", "status"],
    fields: [
      { key: "name", label: "Name", section: "Cost Center", required: true },
      { key: "code", label: "Code", section: "Cost Center" },
      { key: "parent_id", label: "Parent ID", section: "Cost Center", type: "number" },
      { key: "status", label: "Status", section: "Cost Center", type: "select", options: statusOptions },
      { key: "description", label: "Description", section: "Cost Center", type: "multiline" },
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
    titleFields: ["task_id", "staff_id"],
    subtitleFields: ["start_time", "end_time"],
    fields: [
      { key: "task_id", label: "Task ID", section: "Timesheet", type: "number", required: true },
      { key: "staff_id", label: "Staff", section: "Timesheet", type: "number", relation: "staff", required: true },
      { key: "start_time", label: "Start Time", section: "Timesheet", type: "datetime", required: true },
      { key: "end_time", label: "End Time", section: "Timesheet", type: "datetime" },
      { key: "note", label: "Note", section: "Timesheet", type: "multiline" },
    ],
  },
  {
    key: "recruitment_candidates",
    title: "Candidate",
    plural: "Candidates",
    group: "HR",
    endpoint: "recruitment_api/candidates",
    idKey: "id",
    icon: "id-card-outline",
    color: "#7C3AED",
    titleFields: ["candidate_name", "name", "email"],
    subtitleFields: ["position", "status"],
    fields: [
      { key: "candidate_name", label: "Candidate Name", section: "Candidate", required: true },
      { key: "email", label: "Email", section: "Candidate", type: "email" },
      { key: "phone", label: "Phone", section: "Candidate", type: "phone" },
      { key: "position", label: "Position", section: "Candidate" },
      { key: "status", label: "Status", section: "Candidate" },
      { key: "description", label: "Notes", section: "Candidate", type: "multiline" },
    ],
    actions: [
      { key: "hire", title: "Hire", icon: "checkmark-circle-outline", endpointTemplate: "recruitment_api/candidates/{id}/hire", method: "PUT", confirm: "Hire this candidate?", successMessage: "Candidate hired" },
      { key: "reject", title: "Reject", icon: "close-circle-outline", endpointTemplate: "recruitment_api/candidates/{id}/reject", method: "PUT", confirm: "Reject this candidate?", successMessage: "Candidate rejected", destructive: true },
      { key: "change_stage", title: "Change Stage…", icon: "swap-horizontal-outline", endpointTemplate: "recruitment_api/candidates/{id}/change_stage", method: "PUT",
        fields: [{ key: "status", label: "Status (1=new, 2=interviewing, 3=hired, 4=rejected)", type: "number", required: true }],
        successMessage: "Stage updated",
      },
    ],
  },
  {
    key: "recruitment_positions",
    title: "Job Position",
    plural: "Job Positions",
    group: "HR",
    endpoint: "recruitment_api/positions",
    idKey: "id",
    icon: "briefcase-outline",
    color: "#7C3AED",
    titleFields: ["position_name", "name"],
    subtitleFields: ["department", "status"],
    fields: [
      { key: "position_name", label: "Position Name", section: "Position", required: true },
      { key: "department", label: "Department", section: "Position" },
      { key: "status", label: "Status", section: "Position" },
      { key: "description", label: "Description", section: "Position", type: "multiline" },
    ],
  },
  {
    key: "hr_payslips",
    title: "Payslip",
    plural: "Payslips",
    group: "HR",
    endpoint: "hr_payroll_api/payslips",
    idKey: "id",
    icon: "cash-outline",
    color: "#16A34A",
    titleFields: ["staff_id", "month", "year"],
    subtitleFields: ["net_pay", "status"],
    fields: [
      { key: "staff_id", label: "Staff", section: "Payslip", type: "number", relation: "staff", required: true },
      { key: "month", label: "Month", section: "Payslip", required: true },
      { key: "year", label: "Year", section: "Payslip", type: "number", required: true },
      { key: "gross_pay", label: "Gross Pay", section: "Totals", type: "money" },
      { key: "net_pay", label: "Net Pay", section: "Totals", type: "money" },
      { key: "status", label: "Status", section: "Payslip" },
    ],
    actions: [
      { key: "mark_paid", title: "Mark as Paid", icon: "cash-outline", endpointTemplate: "hr_payroll_api/payslips/{id}/mark_paid", method: "PUT", confirm: "Mark this payslip as paid?", successMessage: "Payslip marked paid" },
    ],
  },
  {
    key: "gatepass",
    title: "Gatepass",
    plural: "Gatepasses",
    group: "Operations",
    endpoint: "gatepass_api",
    idKey: "id",
    icon: "log-in-outline",
    color: "#0F766E",
    titleFields: ["subject", "name", "id"],
    subtitleFields: ["status", "date"],
    fields: [
      { key: "subject", label: "Subject", section: "Gatepass", required: true },
      { key: "date", label: "Date", section: "Gatepass", type: "date" },
      { key: "status", label: "Status", section: "Gatepass" },
      { key: "description", label: "Description", section: "Gatepass", type: "multiline" },
    ],
    actions: [
      { key: "approve", title: "Approve", icon: "checkmark-circle-outline", endpointTemplate: "gatepass_api/{id}/approve", method: "PUT", confirm: "Approve this gatepass?", successMessage: "Gatepass approved" },
      { key: "reject", title: "Reject", icon: "close-circle-outline", endpointTemplate: "gatepass_api/{id}/reject", method: "PUT", confirm: "Reject this gatepass?", successMessage: "Gatepass rejected", destructive: true },
      { key: "close", title: "Close (Used)", icon: "lock-closed-outline", endpointTemplate: "gatepass_api/{id}/close", method: "PUT", confirm: "Mark this gatepass as used / closed?", successMessage: "Gatepass closed" },
    ],
  },
  {
    key: "fixed_equipment",
    title: "Asset",
    plural: "Fixed Equipment",
    group: "Operations",
    endpoint: "fixed_equipment_api",
    idKey: "id",
    icon: "build-outline",
    color: "#475569",
    titleFields: ["asset_name", "name", "asset_tag"],
    subtitleFields: ["category_id", "status", "location_id"],
    fields: [
      { key: "asset_name", label: "Asset Name", section: "Asset", required: true },
      { key: "asset_tag", label: "Asset Tag", section: "Asset" },
      { key: "category_id", label: "Category ID", section: "Asset", type: "number" },
      { key: "location_id", label: "Location ID", section: "Asset", type: "number" },
      { key: "status", label: "Status", section: "Asset" },
      { key: "notes", label: "Notes", section: "Asset", type: "multiline" },
    ],
    actions: [
      { key: "allocate", title: "Allocate to Staff…", icon: "person-add-outline", endpointTemplate: "fixed_equipment_api/{id}/allocate", method: "PUT",
        fields: [
          { key: "staff_id", label: "Staff ID", type: "number", required: true, placeholder: "Pick from /api/staffs", relation: "staff" },
          { key: "location_id", label: "Location ID (optional)", type: "number" },
        ],
        successMessage: "Asset allocated",
      },
      { key: "return", title: "Return (Available)", icon: "arrow-undo-outline", endpointTemplate: "fixed_equipment_api/{id}/return", method: "PUT", confirm: "Mark this asset as returned and available?", successMessage: "Asset returned" },
    ],
  },
  {
    key: "knowledge",
    title: "Knowledge Article",
    plural: "Knowledge Base",
    group: "Support",
    endpoint: "knowledge_api",
    idKey: "articleid",
    icon: "book-outline",
    color: "#0369A1",
    titleFields: ["subject", "title"],
    subtitleFields: ["groupid", "datecreated"],
    fields: [
      { key: "subject", label: "Subject", section: "Article", required: true },
      { key: "groupid", label: "Group ID", section: "Article", type: "number" },
      { key: "description", label: "Article", section: "Article", type: "multiline" },
      { key: "active", label: "Active", section: "Article", type: "select", options: statusOptions },
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
    idKey: "surveyid",
    icon: "stats-chart-outline",
    color: "#0369A1",
    titleFields: ["subject", "name"],
    subtitleFields: ["datecreated", "active"],
    fields: [
      { key: "subject", label: "Subject", section: "Survey", required: true },
      { key: "description", label: "Description", section: "Survey", type: "multiline" },
      { key: "active", label: "Active", section: "Survey", type: "select", options: statusOptions },
    ],
    actions: [
      { key: "publish", title: "Publish (Activate)", icon: "play-circle-outline", endpointTemplate: "surveys_api/{id}/publish", method: "PUT", confirm: "Activate this survey for responses?", successMessage: "Survey published" },
      { key: "close", title: "Close (Deactivate)", icon: "stop-circle-outline", endpointTemplate: "surveys_api/{id}/close", method: "PUT", confirm: "Close this survey to new responses?", successMessage: "Survey closed" },
    ],
  },
  {
    key: "automation",
    title: "Automation",
    plural: "Automations",
    group: "Admin",
    endpoint: "automation_api",
    idKey: "id",
    icon: "flash-outline",
    color: "#64748B",
    titleFields: ["name", "title"],
    subtitleFields: ["trigger", "active"],
    fields: [
      { key: "name", label: "Name", section: "Automation", required: true },
      { key: "trigger", label: "Trigger", section: "Automation" },
      { key: "action", label: "Action", section: "Automation", type: "multiline" },
      { key: "active", label: "Active", section: "Automation", type: "select", options: yesNoOptions },
    ],
  },
  {
    key: "otpmanager",
    title: "OTP",
    plural: "OTP Manager",
    group: "Admin",
    endpoint: "otpmanager",
    idKey: "id",
    icon: "keypad-outline",
    color: "#64748B",
    titleFields: ["identifier", "email", "phone"],
    subtitleFields: ["status", "expires_at"],
    fields: [
      { key: "identifier", label: "Identifier", section: "OTP", required: true },
      { key: "email", label: "Email", section: "OTP", type: "email" },
      { key: "phone", label: "Phone", section: "OTP", type: "phone" },
      { key: "status", label: "Status", section: "OTP" },
      { key: "expires_at", label: "Expires At", section: "OTP", type: "datetime" },
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
    "tender_boq",
    "tender_requirements",
    "tender_risks",
    "opportunity_boq",
    "opportunity_notes",
    "purchase_vendor_contacts",
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
    .slice(0, 3)
    .join(" • ");
}

function moduleFieldDisplayValue(module: ModuleDefinition, row: any, key: string): string {
  const value = row?.[key];
  if (isBlankDisplayValue(value)) return "";

  const field = module.fields.find((item) => item.key === key);
  const option = field?.options?.find((item) => String(item.value) === String(value));
  if (option) return option.label;

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

export function isCrudEnabled(module: ModuleDefinition, action: "create" | "update" | "delete"): boolean {
  if (action === "create") return module.canCreate !== false;
  if (action === "update") return module.canUpdate !== false;
  return module.canDelete !== false;
}

export function resolveTemplateValue(value: string | number, row: any, fallbackId: string): string | number {
  if (typeof value !== "string") return value;
  return value.replace(/\{id\}/g, fallbackId).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const next = row?.[key];
    return next === undefined || next === null ? "" : String(next);
  });
}
