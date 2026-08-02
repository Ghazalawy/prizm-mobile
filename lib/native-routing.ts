import { Linking } from "react-native";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

import { BASE_URL } from "./config";

type RoutePattern = {
  re: RegExp;
  to: (match: RegExpMatchArray) => string;
};

type ResolveOptions = {
  moduleKey?: string | null;
};

type NavigateOptions = ResolveOptions & {
  fallbackRoute?: string;
};

const EXTERNAL_SCHEME_RE = /^(mailto|tel|sms|geo):/i;
const HTTP_RE = /^https?:\/\//i;
const PRIZM_APP_SCHEME_RE = /^prizmcrm:/i;

const MODULE_DETAIL_ROUTES: Record<string, (id: string) => string> = {
  tasks: (id) => `/(tabs)/tasks/${id}`,
  projects: (id) => `/(tabs)/projects/${id}`,
  customers: (id) => `/(tabs)/customers/${id}`,
  contacts: (id) => `/(tabs)/erp/contacts/${id}`,
  staff: (id) => `/(tabs)/erp/staff/${id}`,
  leads: (id) => `/(tabs)/leads/${id}`,
  advance_leads: (id) => `/(tabs)/erp/advance_leads/${id}`,
  invoices: (id) => `/(tabs)/invoices/${id}`,
  estimates: (id) => `/(tabs)/estimates/${id}`,
  proposals: (id) => `/(tabs)/proposals/${id}`,
  contracts: (id) => `/(tabs)/contracts/${id}`,
  tickets: (id) => `/(tabs)/tickets/${id}`,
  expenses: (id) => `/(tabs)/erp/expenses/${id}`,
  credit_note: (id) => `/(tabs)/erp/credit_notes/${id}`,
  credit_notes: (id) => `/(tabs)/erp/credit_notes/${id}`,
  payments: (id) => `/(tabs)/erp/payments/${id}`,
  subscriptions: (id) => `/(tabs)/erp/subscriptions/${id}`,
  announcements: (id) => `/(tabs)/erp/announcements/${id}`,
  estimate_requests: (id) => `/(tabs)/erp/estimate_requests/${id}`,
  estimate_request_forms: (id) => `/(tabs)/erp/estimate_request_forms/${id}`,
  estimate_request_statuses: (id) => `/(tabs)/erp/estimate_request_statuses/${id}`,
  rfq2: (id) => `/(tabs)/erp/rfq2/${id}`,
  rfq2_items: (id) => `/(tabs)/erp/rfq2_items/${id}`,
  rfq2_suppliers: (id) => `/(tabs)/erp/rfq2_suppliers/${id}`,
  otpmanager: (id) => `/(tabs)/erp/otpmanager/${id}`,
  otp_sources: (id) => `/(tabs)/erp/otp_sources/${id}`,
  automation: (id) => `/(tabs)/erp/automation/${id}`,
  custom_statuses: (id) => `/(tabs)/erp/custom_statuses/${id}`,
  gatepass_vehicles: (id) => `/(tabs)/erp/gatepass_vehicles/${id}`,
  recruitment_candidates: (id) => `/(tabs)/erp/recruitment_candidates/${id}`,
  recruitment_positions: (id) => `/(tabs)/erp/recruitment_positions/${id}`,
  recruitment_proposals: (id) => `/(tabs)/erp/recruitment_proposals/${id}`,
  todos: (id) => `/(tabs)/erp/todos/${id}`,
  tenders: (id) => `/(tabs)/tenders/${id}`,
  opportunities: (id) => `/(tabs)/opportunities/${id}`,
  reports: (id) => `/(tabs)/reports/${id}`,
  knowledge: (id) => `/(tabs)/knowledge/${id}`,
  knowledge_base: (id) => `/(tabs)/knowledge/${id}`,
  purchase_requests: (id) => `/(tabs)/approvals/purchase_request/${id}`,
  purchase_orders: (id) => `/(tabs)/approvals/purchase_order/${id}`,
  purchase_payment_requests: (id) => `/(tabs)/approvals/payment_request/${id}`,
  purchase_expense_requests: (id) => `/(tabs)/approvals/expense_request/${id}`,
  purchase_supplier_invoices: (id) => `/(tabs)/erp/purchase_supplier_invoices/${id}`,
};

const MODULE_LIST_ROUTES: Record<string, string> = {
  tasks: "/(tabs)/tasks",
  projects: "/(tabs)/projects",
  customers: "/(tabs)/customers",
  contacts: "/(tabs)/erp/contacts",
  staff: "/(tabs)/erp/staff",
  leads: "/(tabs)/leads",
  advance_leads: "/(tabs)/erp/advance_leads",
  invoices: "/(tabs)/invoices",
  estimates: "/(tabs)/estimates",
  proposals: "/(tabs)/proposals",
  contracts: "/(tabs)/contracts",
  tickets: "/(tabs)/tickets",
  expenses: "/(tabs)/erp/expenses",
  credit_note: "/(tabs)/erp/credit_notes",
  credit_notes: "/(tabs)/erp/credit_notes",
  payments: "/(tabs)/erp/payments",
  subscriptions: "/(tabs)/erp/subscriptions",
  announcements: "/(tabs)/erp/announcements",
  estimate_requests: "/(tabs)/erp/estimate_requests",
  estimate_request_forms: "/(tabs)/erp/estimate_request_forms",
  estimate_request_statuses: "/(tabs)/erp/estimate_request_statuses",
  rfq2: "/(tabs)/erp/rfq2",
  rfq2_items: "/(tabs)/erp/rfq2_items",
  rfq2_suppliers: "/(tabs)/erp/rfq2_suppliers",
  otpmanager: "/(tabs)/erp/otpmanager",
  otp_sources: "/(tabs)/erp/otp_sources",
  automation: "/(tabs)/erp/automation",
  custom_statuses: "/(tabs)/erp/custom_statuses",
  gatepass_vehicles: "/(tabs)/erp/gatepass_vehicles",
  recruitment_candidates: "/(tabs)/erp/recruitment_candidates",
  recruitment_positions: "/(tabs)/erp/recruitment_positions",
  recruitment_proposals: "/(tabs)/erp/recruitment_proposals",
  todos: "/(tabs)/erp/todos",
  tenders: "/(tabs)/tenders",
  opportunities: "/(tabs)/opportunities",
  reports: "/(tabs)/reports",
  knowledge: "/(tabs)/knowledge",
  knowledge_base: "/(tabs)/knowledge",
  calendar: "/(tabs)/calendar",
  timesheets: "/(tabs)/timesheets/entries",
  approvals: "/(tabs)/approvals",
};

const CONTROLLER_TO_MODULE: Record<string, string> = {
  tasks: "tasks",
  projects: "projects",
  clients: "customers",
  customers: "customers",
  contacts: "contacts",
  staff: "staff",
  leads: "leads",
  advanceleads: "advance_leads",
  dewa_contacts: "dewa_contacts",
  prizmsubscription: "documents",
  invoices: "invoices",
  estimates: "estimates",
  proposals: "proposals",
  contracts: "contracts",
  tickets: "tickets",
  expenses: "expenses",
  credit_notes: "credit_notes",
  payments: "payments",
  subscriptions: "subscriptions",
  announcements: "announcements",
  estimate_request: "estimate_requests",
  rfq2: "rfq2",
  rfq2_api: "rfq2",
  todo: "todos",
  tenders: "tenders",
  tenders_api: "tenders",
  opportunities: "opportunities",
  opportunities_api: "opportunities",
  reports: "reports",
  knowledge_base: "knowledge",
  technicalinquiries: "technical_inquiries",
  cost_calculation_api: "cost_calculations",
  materials: "materials",
  materials_catalog: "materials",
  fixed_equipment: "fixed_equipment",
  otpmanager: "otpmanager",
  automation_manager: "automation",
  automation_api: "automation",
  si_custom_status: "custom_statuses",
  gatepass: "gatepass",
  prizmbudget: "budget_items",
  budget: "budget_items",
  goals: "goals",
  surveys: "surveys",
  hr_payroll: "hr_payslips",
  recruitment: "recruitment_candidates",
  purorder: "purchase_orders",
  purchase_order: "purchase_orders",
  payment_request: "purchase_payment_requests",
  expense_request: "purchase_expense_requests",
  supplierinvoice: "purchase_supplier_invoices",
  supplier_invoice: "purchase_supplier_invoices",
  received_vouchers: "purchase_received_vouchers",
  delivery_notes: "purchase_delivery_notes",
  quotations: "purchase_quotations",
  completion_certificate: "purchase_completion_certificates",
};

const DIRECT_PATTERNS: RoutePattern[] = [
  { re: /^#taskid=(\d+)/i, to: (m) => routeForModuleRecord("tasks", m[1])! },
  { re: /^#leadid=(\d+)/i, to: (m) => routeForModuleRecord("leads", m[1])! },
  { re: /^#eventid=(\d+)/i, to: (m) => `/(tabs)/calendar/${m[1]}` },
  { re: /^clients\/groups\/?$/i, to: () => routeForModuleList("setup_customer_groups")! },
  { re: /^tickets\/priorities\/?$/i, to: () => routeForModuleList("setup_ticket_priorities")! },
  { re: /^tickets\/predefined_replies\/?$/i, to: () => routeForModuleList("setup_ticket_replies")! },
  { re: /^tickets\/statuses\/?$/i, to: () => routeForModuleList("setup_ticket_statuses")! },
  { re: /^tickets\/services\/?$/i, to: () => routeForModuleList("setup_ticket_services")! },
  { re: /^leads\/sources\/?$/i, to: () => routeForModuleList("setup_lead_sources")! },
  { re: /^leads\/statuses\/?$/i, to: () => routeForModuleList("setup_lead_statuses")! },
  { re: /^taxes\/?$/i, to: () => routeForModuleList("setup_taxes")! },
  { re: /^currencies\/?$/i, to: () => routeForModuleList("setup_currencies")! },
  { re: /^paymentmodes\/?$/i, to: () => routeForModuleList("setup_payment_modes")! },
  { re: /^expenses\/categories\/?$/i, to: () => routeForModuleList("setup_expense_categories")! },
  { re: /^contracts\/types\/?$/i, to: () => routeForModuleList("setup_contract_types")! },
  { re: /^departments\/?$/i, to: () => routeForModuleList("setup_departments")! },
  { re: /^emails\/email_template\/(\d+)/i, to: (m) => routeForModuleRecord("setup_email_templates", m[1])! },
  { re: /^emails\/?$/i, to: () => routeForModuleList("setup_email_templates")! },
  { re: /^roles\/role\/(\d+)/i, to: (m) => routeForModuleRecord("setup_roles", m[1])! },
  { re: /^roles\/?$/i, to: () => routeForModuleList("setup_roles")! },
  { re: /^custom_fields\/field\/(\d+)/i, to: (m) => routeForModuleRecord("setup_custom_fields", m[1])! },
  { re: /^custom_fields\/?$/i, to: () => routeForModuleList("setup_custom_fields")! },
  { re: /^tasks\/view\/(\d+)/i, to: (m) => routeForModuleRecord("tasks", m[1])! },
  { re: /^projects\/view\/(\d+)/i, to: (m) => routeForModuleRecord("projects", m[1])! },
  { re: /^invoices\/(?:list_invoices|invoice)\/(\d+)/i, to: (m) => routeForModuleRecord("invoices", m[1])! },
  { re: /^estimates\/(?:list_estimates|estimate)\/(\d+)/i, to: (m) => routeForModuleRecord("estimates", m[1])! },
  { re: /^proposals\/(?:list_proposals|proposal)\/(\d+)/i, to: (m) => routeForModuleRecord("proposals", m[1])! },
  { re: /^(?:clients|customers)\/client\/(\d+)/i, to: (m) => routeForModuleRecord("customers", m[1])! },
  { re: /^leads\/index\/(\d+)/i, to: (m) => routeForModuleRecord("leads", m[1])! },
  { re: /^advanceleads\/advanceleads\/view\/(\d+)/i, to: (m) => routeForModuleRecord("advance_leads", m[1])! },
  { re: /^advanceleads\/(?:advanceleads|advanceleads_grid|dashboard)(?:\/|$)/i, to: () => routeForModuleList("advance_leads")! },
  { re: /^dewa_contacts\/(?:add_dewa_contact|index)\/(\d+)/i, to: (m) => routeForModuleRecord("dewa_contacts", m[1])! },
  { re: /^dewa_contacts\/(?:dewa_contacts|index)(?:\/|$)/i, to: () => routeForModuleList("dewa_contacts")! },
  { re: /^prizmsubscription\/prizmsubscription\/edit_subscription\/(\d+)/i, to: (m) => routeForModuleRecord("documents", m[1])! },
  { re: /^prizmsubscription\/(?:prizmsubscription|index)(?:\/|$)/i, to: () => routeForModuleList("documents")! },
  { re: /^contracts\/contract\/(\d+)/i, to: (m) => routeForModuleRecord("contracts", m[1])! },
  { re: /^tickets\/ticket\/(\d+)/i, to: (m) => routeForModuleRecord("tickets", m[1])! },
  { re: /^expenses\/list_expenses\/(\d+)/i, to: (m) => routeForModuleRecord("expenses", m[1])! },
  { re: /^credit_notes\/(?:list_credit_notes|credit_note)\/(\d+)/i, to: (m) => routeForModuleRecord("credit_notes", m[1])! },
  { re: /^contacts\/contact\/(\d+)/i, to: (m) => routeForModuleRecord("contacts", m[1])! },
  { re: /^staff\/member\/(\d+)/i, to: (m) => routeForModuleRecord("staff", m[1])! },
  { re: /^invoice_items\/?$/i, to: () => routeForModuleList("items")! },
  { re: /^utilities\/calendar\/?$/i, to: () => routeForModuleList("calendar")! },
  { re: /^utilities\/activity_log\/?$/i, to: () => "/(tabs)/activity" },
  { re: /^staff\/timesheets\/?$/i, to: () => routeForModuleList("timesheets")! },
  { re: /^payments\/payment\/(\d+)/i, to: (m) => routeForModuleRecord("payments", m[1])! },
  { re: /^subscriptions\/(?:edit|view)\/(\d+)/i, to: (m) => routeForModuleRecord("subscriptions", m[1])! },
  { re: /^announcements\/(?:announcement|view)\/(\d+)/i, to: (m) => routeForModuleRecord("announcements", m[1])! },
  { re: /^estimate_request\/view\/(\d+)/i, to: (m) => routeForModuleRecord("estimate_requests", m[1])! },
  { re: /^estimate_request\/form\/(\d+)/i, to: (m) => routeForModuleRecord("estimate_request_forms", m[1])! },
  { re: /^estimate_request\/forms(?:\/|$)/i, to: () => routeForModuleList("estimate_request_forms")! },
  { re: /^estimate_request\/statuses(?:\/|$)/i, to: () => routeForModuleList("estimate_request_statuses")! },
  { re: /^rfq2\/pipeline\/view\/(\d+)/i, to: (m) => routeForModuleRecord("rfq2", m[1])! },
  { re: /^rfq2\/pipeline(?:\/|$)/i, to: () => routeForModuleList("rfq2")! },
  { re: /^rfq2_api\/(\d+)(?:\/|$)/i, to: (m) => routeForModuleRecord("rfq2", m[1])! },
  { re: /^otpmanager\/(?:view\/)?(\d+)(?:\/|$)/i, to: (m) => routeForModuleRecord("otpmanager", m[1])! },
  { re: /^otpmanager\/(?:manage|index)?(?:\/|$)/i, to: () => routeForModuleList("otpmanager")! },
  { re: /^otpmanager\/settings(?:\?group=sources)?/i, to: () => routeForModuleList("otp_sources")! },
  { re: /^automation_manager\/(?:edit\/)?(\d+)(?:\/|$)/i, to: (m) => routeForModuleRecord("automation", m[1])! },
  { re: /^automation_manager(?:\/|$)/i, to: () => routeForModuleList("automation")! },
  { re: /^costcenters(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("cost_centers")! },
  { re: /^gatepass\/gatepass(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("gatepass")! },
  { re: /^si_custom_status\/statuses\/(?:projects|tasks)(?:\/|$)/i, to: () => routeForModuleList("custom_statuses")! },
  { re: /^gatepass\/vehicles\/manage\/(\d+)/i, to: (m) => routeForModuleRecord("gatepass_vehicles", m[1])! },
  { re: /^gatepass\/vehicles(?:\/|$)/i, to: () => routeForModuleList("gatepass_vehicles")! },
  { re: /^recruitment\/candidate\/(\d+)/i, to: (m) => routeForModuleRecord("recruitment_candidates", m[1])! },
  { re: /^recruitment\/candidate_profile(?:\/|$)/i, to: () => routeForModuleList("recruitment_candidates")! },
  { re: /^recruitment\/recruitment_proposal\/(\d+)/i, to: (m) => routeForModuleRecord("recruitment_proposals", m[1])! },
  { re: /^recruitment\/recruitment_proposal(?:\/|$)/i, to: () => routeForModuleList("recruitment_proposals")! },
  { re: /^recruitment\/setting\?group=job_position/i, to: () => routeForModuleList("recruitment_positions")! },
  { re: /^todo\/(?:get_by_id|view)\/(\d+)/i, to: (m) => routeForModuleRecord("todos", m[1])! },
  { re: /^knowledge_base\/view\/(\d+)/i, to: (m) => routeForModuleRecord("knowledge", m[1])! },
  { re: /^knowledge_base\/article\/(\d+)/i, to: (m) => routeForModuleRecord("knowledge", m[1])! },
  { re: /^(?:utilities\/view_event|calendar\/event)\/(\d+)/i, to: (m) => `/(tabs)/calendar/${m[1]}` },
  { re: /^(?:tenders|tenders_api)\/view\/(\d+)/i, to: (m) => routeForModuleRecord("tenders", m[1])! },
  { re: /^(?:opportunities|opportunities_api)\/view\/(\d+)/i, to: (m) => routeForModuleRecord("opportunities", m[1])! },
  { re: /^opportunities\/(?:dashboard|opportunities)\/?$/i, to: () => routeForModuleList("opportunities")! },
  { re: /^reports\/view\/(\d+)/i, to: (m) => routeForModuleRecord("reports", m[1])! },
  { re: /^prizm_reports\/?$/i, to: () => routeForModuleList("reports")! },
  { re: /^technicalinquiries\/boq_management\/boq_tree_(?:view|edit)\/(\d+)/i, to: (m) => routeForModuleRecord("cost_calculations", m[1])! },
  { re: /^technicalinquiries\/boq_management\/boq_tree_builder(?:\/|$)/i, to: () => "/(tabs)/erp/cost_calculations/new" },
  { re: /^technicalinquiries\/boq_management\/boq_tree(?:\/|$)/i, to: () => routeForModuleList("cost_calculations")! },
  { re: /^materials\/material_categories(?:\/|$)/i, to: () => routeForModuleList("material_categories")! },
  { re: /^materials\/(?:materials|items)\/?$/i, to: () => routeForModuleList("materials")! },
  { re: /^materials\/itemclassification\/manage_commodity\/(\d+)/i, to: (m) => routeForModuleRecord("unspsc_commodities", m[1])! },
  { re: /^materials\/itemclassification(?:\/|$)/i, to: () => routeForModuleList("unspsc_commodities")! },
  { re: /^materials\/kits\/items\/(\d+)/i, to: (m) => routeForModuleRecord("material_kits", m[1])! },
  { re: /^materials\/kits(?:\/|$)/i, to: () => routeForModuleList("material_kits")! },
  { re: /^materials\/(?:view|edit)\/(\d+)/i, to: (m) => routeForModuleRecord("materials", m[1])! },
  { re: /^fixed_equipment\/detail_asset\/(\d+)/i, to: (m) => routeForModuleRecord("fixed_equipment", m[1])! },
  { re: /^fixed_equipment\/settings\?tab=categories/i, to: () => routeForModuleList("fixed_equipment_categories")! },
  { re: /^fixed_equipment\/settings\?tab=asset_manufacturers/i, to: () => routeForModuleList("fixed_equipment_manufacturers")! },
  { re: /^fixed_equipment\/settings\?tab=models/i, to: () => routeForModuleList("fixed_equipment_models")! },
  { re: /^fixed_equipment\/settings\?tab=suppliers/i, to: () => routeForModuleList("fixed_equipment_suppliers")! },
  { re: /^fixed_equipment\/settings\?tab=status_labels/i, to: () => routeForModuleList("fixed_equipment_statuses")! },
  { re: /^fixed_equipment\/settings\?tab=depreciations/i, to: () => routeForModuleList("fixed_equipment_depreciations")! },
  { re: /^fixed_equipment\/assets(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment")! },
  { re: /^fixed_equipment\/detail_locations\/(\d+)/i, to: (m) => routeForModuleRecord("fixed_equipment_locations", m[1])! },
  { re: /^fixed_equipment\/locations(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_locations")! },
  { re: /^fixed_equipment\/detail_licenses\/(\d+)/i, to: (m) => routeForModuleRecord("fixed_equipment_licenses", m[1])! },
  { re: /^fixed_equipment\/licenses(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_licenses")! },
  { re: /^fixed_equipment\/detail_predefined_kits\/(\d+)/i, to: (m) => routeForModuleRecord("fixed_equipment_predefined_kits", m[1])! },
  { re: /^fixed_equipment\/predefined_kits(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_predefined_kits")! },
  { re: /^fixed_equipment\/assets_maintenances(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_maintenances")! },
  { re: /^fixed_equipment\/detail_request\/(\d+)/i, to: (m) => routeForModuleRecord("fixed_equipment_requests", m[1])! },
  { re: /^fixed_equipment\/requested(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_requests")! },
  { re: /^fixed_equipment\/checkout_managements(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_checkout_history")! },
  { re: /^fixed_equipment\/(?:view_audit_request|audit)\/(\d+)/i, to: (m) => routeForModuleRecord("fixed_equipment_audits", m[1])! },
  { re: /^fixed_equipment\/audit_managements(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_audits")! },
  { re: /^fixed_equipment\/dashboard(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_dashboard")! },
  { re: /^fixed_equipment\/report(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_activity")! },
  { re: /^fixed_equipment\/depreciations(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_depreciation_schedule")! },
  { re: /^fixed_equipment\/detail_accessories\/(\d+)/i, to: (m) => routeForModuleRecord("fixed_equipment_accessories", m[1])! },
  { re: /^fixed_equipment\/accessories(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_accessories")! },
  { re: /^fixed_equipment\/detail_consumables\/(\d+)/i, to: (m) => routeForModuleRecord("fixed_equipment_consumables", m[1])! },
  { re: /^fixed_equipment\/consumables(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_consumables")! },
  { re: /^fixed_equipment\/detail_components\/(\d+)/i, to: (m) => routeForModuleRecord("fixed_equipment_components", m[1])! },
  { re: /^fixed_equipment\/components(?:\/|$)/i, to: () => routeForModuleList("fixed_equipment_components")! },
  { re: /^purchase_api\/requests\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_requests", m[1])! },
  { re: /^purchase_api\/orders\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_orders", m[1])! },
  { re: /^purchase_api\/payment_requests\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_payment_requests", m[1])! },
  { re: /^purchase_api\/supplier_invoices\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_supplier_invoices", m[1])! },
  { re: /^purchase_api\/expense_requests\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_expense_requests", m[1])! },
  { re: /^purchase_api\/received_vouchers\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_received_vouchers", m[1])! },
  { re: /^purchase_api\/delivery_notes\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_delivery_notes", m[1])! },
  { re: /^purchase_api\/quotations\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_quotations", m[1])! },
  { re: /^purchase_api\/completion_certificates\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_completion_certificates", m[1])! },
  { re: /^przpurchase\/ag_view_purchase_request\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_requests", m[1])! },
  { re: /^przpurchase\/przpurchase(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("purchase_requests")! },
  { re: /^przpurchase\/purorder(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("purchase_orders")! },
  { re: /^przpurchase\/expense_request(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("purchase_expense_requests")! },
  { re: /^przpurchase\/payment_request(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("purchase_payment_requests")! },
  { re: /^przpurchase\/supplierinvoice(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("purchase_supplier_invoices")! },
  { re: /^przpurchase\/received_vouchers(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("purchase_received_vouchers")! },
  { re: /^przpurchase\/delivery_notes(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("purchase_delivery_notes")! },
  { re: /^przpurchase\/quotations(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("purchase_quotations")! },
  { re: /^przpurchase\/suppliers(?:\/ag_index)?\/?$/i, to: () => routeForModuleList("purchase_vendors")! },
  { re: /^przpurchase\/purchase_requests?\/view[^/]*\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_requests", m[1])! },
  { re: /^(?:przpurchase\/)?purorder\/(?:ag_)?view_purchase_order\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_orders", m[1])! },
  { re: /^(?:przpurchase\/)?purchase_order\/(?:ag_)?view_purchase_order\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_orders", m[1])! },
  { re: /^(?:przpurchase\/)?payment_request\/(?:ag_)?view_payment_request\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_payment_requests", m[1])! },
  { re: /^(?:przpurchase\/)?supplierinvoice\/(?:view_supplier_invoice|view|add_edit)\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_supplier_invoices", m[1])! },
  { re: /^(?:przpurchase\/)?expense_request\/view_expense_request\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_expense_requests", m[1])! },
  { re: /^received_vouchers\/(?:ag_)?view_voucher\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_received_vouchers", m[1])! },
  { re: /^delivery_notes\/view_delivery_note\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_delivery_notes", m[1])! },
  { re: /^quotations\/(?:quotation|ag_quotation|view_quotation)\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_quotations", m[1])! },
  { re: /^completion_certificate\/(?:view|edit)\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_completion_certificates", m[1])! },
  { re: /^hr_payroll\/(?:view_payslip_detail|view_payslip_detail_v2|view_staff_payslip_modal)\/(\d+)/i, to: (m) => `/(tabs)/payslip-detail?id=${m[1]}` },
  { re: /^hr_payroll\/payslip_manage\/?$/i, to: () => routeForModuleList("hr_payslips")! },
  { re: /^hr_payroll\/payslip_templates_manage\/?$/i, to: () => routeForModuleList("hr_payroll_templates")! },
  { re: /^hr_payroll\/manage_commissions\/?$/i, to: () => routeForModuleList("hr_payroll_commissions")! },
  { re: /^hr_profile\/contracts\/?$/i, to: () => routeForModuleList("hr_contracts")! },
  { re: /^hr_profile\/job_positions\/?$/i, to: () => routeForModuleList("hr_job_positions")! },
  { re: /^hr_profile\/dependent_persons\/?$/i, to: () => routeForModuleList("hr_dependents")! },
  { re: /^hr_profile\/resignation_procedures\/?$/i, to: () => routeForModuleList("hr_resignations")! },
  { re: /^hr_profile\/training\?group=training_program/i, to: () => routeForModuleList("hr_training_programs")! },
  { re: /^rfq2\/rfq\/?$/i, to: () => routeForModuleList("rfq2")! },
  { re: /^technicalinquiries(?:\/technicalinquiries)?\/?$/i, to: () => routeForModuleList("technical_inquiries")! },
  { re: /^tenders\/triage\/?$/i, to: () => "/(tabs)/tenders/triage" },
  { re: /^tenders\/tender\/?$/i, to: () => routeForModuleList("tenders")! },
  { re: /^prizmbudget\/manage_budget\/?$/i, to: () => routeForModuleList("budget_items")! },
  { re: /^prizmbusinesspartners\/prizmbusinesspartners\/?$/i, to: () => routeForModuleList("business_partners")! },
  { re: /^surveys\/?$/i, to: () => routeForModuleList("surveys")! },
  { re: /^timesheets\/requisition_manage\/?$/i, to: () => "/(tabs)/leave" },
  { re: /^timesheets\/requisition_detail\/(\d+)/i, to: (m) => `/(tabs)/approvals/leave/${m[1]}` },
];

export function routeForModuleRecord(
  moduleKey: string | null | undefined,
  id: string | number | null | undefined,
): string | null {
  if (!moduleKey || id === null || id === undefined) return null;
  const cleanId = encodeURIComponent(String(id).trim());
  if (!cleanId) return null;
  const detail = MODULE_DETAIL_ROUTES[moduleKey];
  if (detail) return detail(cleanId);
  return `/(tabs)/erp/${encodeURIComponent(moduleKey)}/${cleanId}`;
}

export function routeForModuleList(moduleKey: string | null | undefined): string | null {
  if (!moduleKey) return null;
  return MODULE_LIST_ROUTES[moduleKey] ?? `/(tabs)/erp/${encodeURIComponent(moduleKey)}`;
}

export function routeForModuleEdit(
  moduleKey: string | null | undefined,
  id: string | number | null | undefined,
): string | null {
  if (!moduleKey || id === null || id === undefined) return null;
  const cleanId = encodeURIComponent(String(id).trim());
  if (!cleanId) return null;
  return `/(tabs)/erp/${encodeURIComponent(moduleKey)}/${cleanId}/edit`;
}

export function resolveNativeRoute(rawLink: string | null | undefined, opts: ResolveOptions = {}): string | null {
  const incoming = cleanLink(rawLink);
  if (!incoming) return null;
  const bridged = unwrapPrizmAppLink(incoming);
  if (PRIZM_APP_SCHEME_RE.test(incoming) && !bridged) return null;
  const raw = bridged || incoming;
  if (raw.startsWith("/(tabs)/") || raw.startsWith("/settings")) return raw;

  const normalized = normalizeInternalPath(raw);
  if (!normalized) {
    return routeFromModuleHint(raw, opts.moduleKey);
  }

  const candidates = [
    normalized.hash,
    normalized.path,
    `${normalized.path}${normalized.search ? `?${normalized.search}` : ""}`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    for (const { re, to } of DIRECT_PATTERNS) {
      const match = candidate.match(re);
      if (match) return to(match);
    }
  }

  const generic = routeFromGenericPerfexPath(normalized.path, normalized.search);
  if (generic) return generic;

  return routeFromModuleHint(raw, opts.moduleKey);
}

export function isCompanyInternalLink(rawLink: string | null | undefined): boolean {
  const raw = cleanLink(rawLink);
  if (!raw) return false;
  if (PRIZM_APP_SCHEME_RE.test(raw)) return unwrapPrizmAppLink(raw) !== null;
  if (raw.startsWith("/(tabs)/")) return true;
  if (raw.startsWith("#")) return true;
  if (EXTERNAL_SCHEME_RE.test(raw)) return false;

  const parsed = tryParseUrl(raw);
  if (parsed) return isInternalHost(parsed.hostname);

  if (/^[\w.-]+\.prizm-energy\.com(?:\/|$)/i.test(raw)) return true;
  return normalizeInternalPath(raw) !== null;
}

export function resolveIncomingAppLink(rawLink: string): string {
  const route = resolveNativeRoute(rawLink);
  if (route) return route;
  if (PRIZM_APP_SCHEME_RE.test(cleanLink(rawLink))) return "/(tabs)/erp";
  if (isCompanyInternalLink(rawLink)) return "/(tabs)/erp";
  return rawLink;
}

export async function navigateInAppOrExternalLink(
  rawLink: string | null | undefined,
  opts: NavigateOptions = {},
): Promise<boolean> {
  const raw = cleanLink(rawLink);
  if (!raw) return false;

  const route = resolveNativeRoute(raw, opts);
  if (route) {
    router.push(route as any);
    return true;
  }

  if (isCompanyInternalLink(raw)) {
    router.push((opts.fallbackRoute || "/(tabs)/erp") as any);
    Toast.show({
      type: "info",
      text1: "Opened inside mobile",
      text2: "This ERP link has no exact native screen yet.",
    });
    return true;
  }

  const externalUrl = ensureExternalUrl(raw);
  if (!externalUrl) return false;
  await Linking.openURL(externalUrl);
  return true;
}

function routeFromModuleHint(raw: string, moduleKey?: string | null): string | null {
  if (!moduleKey) return null;
  const id = raw.match(/(?:^|\/|=)(\d+)(?:$|[/?&#])/i)?.[1];
  if (id) return routeForModuleRecord(moduleKey, id);
  return routeForModuleList(moduleKey);
}

function routeFromGenericPerfexPath(path: string, search: string): string | null {
  const parts = path.split("/").filter(Boolean);
  const controller = (parts[0] || "").toLowerCase();
  const action = (parts[1] || "").toLowerCase();
  if (!controller) return null;

  const listRoute = listRouteForController(controller, action);
  const id = firstId(parts.slice(1)) || idFromSearch(search);
  const moduleKey = CONTROLLER_TO_MODULE[controller];

  if (id && moduleKey) return routeForModuleRecord(moduleKey, id);
  return listRoute;
}

function listRouteForController(controller: string, action: string): string | null {
  const moduleKey = CONTROLLER_TO_MODULE[controller];
  if (!moduleKey) return null;
  if (!action || /^(index|table|list|dt_index|ag_index|pipeline)$/i.test(action)) {
    return routeForModuleList(moduleKey);
  }
  return null;
}

function normalizeInternalPath(raw: string): { path: string; search: string; hash: string } | null {
  if (!raw || EXTERNAL_SCHEME_RE.test(raw)) return null;

  const parsed = tryParseUrl(raw);
  if (parsed) {
    if (!isInternalHost(parsed.hostname)) return null;
    return {
      path: stripAdminPrefix(parsed.pathname),
      search: parsed.search.replace(/^\?/, ""),
      hash: parsed.hash || "",
    };
  }

  const noHash = raw.split("#")[0];
  const hash = raw.includes("#") ? `#${raw.split("#").slice(1).join("#")}` : "";
  const [pathPart, searchPart = ""] = noHash.split("?");
  const explicitInternalPrefix = /^\/*(?:MS\/)?(?:admin|api)\//i.test(pathPart);
  const path = stripAdminPrefix(pathPart);
  if (!path && !hash) return null;
  if (path && !explicitInternalPrefix && !looksLikeInternalPath(path) && !hash) return null;
  return { path, search: searchPart, hash };
}

function stripAdminPrefix(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^MS\/admin\/?/i, "")
    .replace(/^MS\/api\/?/i, "")
    .replace(/^admin\/?/i, "")
    .replace(/^api\/?/i, "")
    .replace(/^MS\/?/i, "")
    .replace(/^\/+/, "");
}

function looksLikeInternalPath(path: string): boolean {
  const controller = path.split("/").filter(Boolean)[0]?.toLowerCase();
  return Boolean(controller && (CONTROLLER_TO_MODULE[controller] || controller === "przpurchase" || controller === "purchase_api"));
}

function firstId(parts: string[]): string | null {
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const match = String(parts[i]).match(/^(\d+)$/);
    if (match) return match[1];
  }
  return null;
}

function idFromSearch(search: string): string | null {
  if (!search) return null;
  const params = new URLSearchParams(search);
  for (const key of ["id", "taskid", "leadid", "eventid", "rel_id", "project_id"]) {
    const value = params.get(key);
    if (value && /^\d+$/.test(value)) return value;
  }
  return null;
}

function cleanLink(rawLink: string | null | undefined): string {
  return String(rawLink ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .trim();
}

/**
 * Unwrap the explicit browser bridge used when an OEM/browser bypasses
 * Android's verified HTTPS App Link resolver. Only production/internal ERP
 * targets are accepted so a crafted custom-scheme URL cannot become an open
 * redirect into an external site.
 */
function unwrapPrizmAppLink(raw: string): string | null {
  if (!PRIZM_APP_SCHEME_RE.test(raw)) return null;

  try {
    const parsed = new URL(raw);
    const encodedTarget = parsed.searchParams.get("url");
    if (encodedTarget) {
      const target = cleanLink(encodedTarget);
      const targetUrl = tryParseUrl(target);
      return targetUrl && isInternalHost(targetUrl.hostname) ? target : null;
    }

    if (parsed.hostname && parsed.hostname.toLowerCase() !== "open") {
      if (!isInternalHost(parsed.hostname)) return null;
      return `https://${parsed.hostname}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    const path = parsed.pathname || "";
    return normalizeInternalPath(path) ? path : null;
  } catch {
    return null;
  }
}

function ensureExternalUrl(raw: string): string | null {
  if (EXTERNAL_SCHEME_RE.test(raw) || HTTP_RE.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(raw)) return `https://${raw}`;
  return null;
}

function tryParseUrl(raw: string): URL | null {
  try {
    if (HTTP_RE.test(raw)) return new URL(raw);
    if (/^\/\//.test(raw)) return new URL(`https:${raw}`);
    if (/^[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(raw)) return new URL(`https://${raw}`);
  } catch {
    return null;
  }
  return null;
}

function isInternalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const baseHost = tryParseUrl(BASE_URL)?.hostname.toLowerCase();
  return (
    host === baseHost ||
    host === "prizm-energy.com" ||
    host.endsWith(".prizm-energy.com") ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1"
  );
}
