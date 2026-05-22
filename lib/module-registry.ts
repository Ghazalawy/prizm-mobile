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
  defaultValue?: string | number;
  options?: Array<{ label: string; value: string | number }>;
  hideIfZero?: boolean;
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
    titleFields: ["request_name", "subject", "id"],
    subtitleFields: ["vendor_id", "status", "date"],
    fields: [
      { key: "request_name", label: "Request Name", section: "Request", required: true },
      { key: "vendor_id", label: "Vendor ID", section: "Request", type: "number" },
      { key: "date", label: "Date", section: "Dates", type: "date" },
      { key: "status", label: "Status", section: "Request" },
      { key: "notes", label: "Notes", section: "Request", type: "multiline" },
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
    titleFields: ["order_number", "subject", "id"],
    subtitleFields: ["vendor_id", "status", "date"],
    fields: [
      { key: "order_number", label: "Order Number", section: "Order", required: true },
      { key: "vendor_id", label: "Vendor ID", section: "Order", type: "number" },
      { key: "date", label: "Date", section: "Dates", type: "date" },
      { key: "status", label: "Status", section: "Order" },
      { key: "total", label: "Total", section: "Order", type: "money" },
      { key: "notes", label: "Notes", section: "Order", type: "multiline" },
    ],
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
