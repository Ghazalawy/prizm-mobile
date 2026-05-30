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

const MODULE_DETAIL_ROUTES: Record<string, (id: string) => string> = {
  tasks: (id) => `/(tabs)/tasks/${id}`,
  projects: (id) => `/(tabs)/projects/${id}`,
  customers: (id) => `/(tabs)/customers/${id}`,
  contacts: (id) => `/(tabs)/erp/contacts/${id}`,
  leads: (id) => `/(tabs)/leads/${id}`,
  invoices: (id) => `/(tabs)/invoices/${id}`,
  estimates: (id) => `/(tabs)/estimates/${id}`,
  proposals: (id) => `/(tabs)/proposals/${id}`,
  contracts: (id) => `/(tabs)/contracts/${id}`,
  tickets: (id) => `/(tabs)/tickets/${id}`,
  expenses: (id) => `/(tabs)/erp/expenses/${id}`,
  tenders: (id) => `/(tabs)/tenders/${id}`,
  opportunities: (id) => `/(tabs)/opportunities/${id}`,
  reports: (id) => `/(tabs)/reports/${id}`,
  knowledge: (id) => `/(tabs)/knowledge/${id}`,
  knowledge_base: (id) => `/(tabs)/knowledge/${id}`,
  purchase_requests: (id) => `/(tabs)/approvals/purchase_request/${id}`,
  purchase_orders: (id) => `/(tabs)/approvals/purchase_order/${id}`,
  purchase_payment_requests: (id) => `/(tabs)/approvals/payment_request/${id}`,
  purchase_expense_requests: (id) => `/(tabs)/approvals/expense_request/${id}`,
};

const MODULE_LIST_ROUTES: Record<string, string> = {
  tasks: "/(tabs)/tasks",
  projects: "/(tabs)/projects",
  customers: "/(tabs)/customers",
  contacts: "/(tabs)/erp/contacts",
  leads: "/(tabs)/leads",
  invoices: "/(tabs)/invoices",
  estimates: "/(tabs)/estimates",
  proposals: "/(tabs)/proposals",
  contracts: "/(tabs)/contracts",
  tickets: "/(tabs)/tickets",
  expenses: "/(tabs)/erp/expenses",
  tenders: "/(tabs)/tenders",
  opportunities: "/(tabs)/opportunities",
  reports: "/(tabs)/reports",
  knowledge: "/(tabs)/knowledge",
  knowledge_base: "/(tabs)/knowledge",
  approvals: "/(tabs)/approvals",
};

const CONTROLLER_TO_MODULE: Record<string, string> = {
  tasks: "tasks",
  projects: "projects",
  clients: "customers",
  customers: "customers",
  contacts: "contacts",
  leads: "leads",
  invoices: "invoices",
  estimates: "estimates",
  proposals: "proposals",
  contracts: "contracts",
  tickets: "tickets",
  expenses: "expenses",
  tenders: "tenders",
  tenders_api: "tenders",
  opportunities: "opportunities",
  opportunities_api: "opportunities",
  reports: "reports",
  knowledge_base: "knowledge",
  materials: "materials",
  materials_catalog: "materials",
  fixed_equipment: "fixed_equipment",
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
  received_vouchers: "purchase_received_vouchers",
  delivery_notes: "purchase_delivery_notes",
  quotations: "purchase_quotations",
  completion_certificate: "purchase_completion_certificates",
};

const DIRECT_PATTERNS: RoutePattern[] = [
  { re: /^#taskid=(\d+)/i, to: (m) => routeForModuleRecord("tasks", m[1])! },
  { re: /^#leadid=(\d+)/i, to: (m) => routeForModuleRecord("leads", m[1])! },
  { re: /^#eventid=(\d+)/i, to: (m) => `/(tabs)/calendar/${m[1]}` },
  { re: /^tasks\/view\/(\d+)/i, to: (m) => routeForModuleRecord("tasks", m[1])! },
  { re: /^projects\/view\/(\d+)/i, to: (m) => routeForModuleRecord("projects", m[1])! },
  { re: /^invoices\/(?:list_invoices|invoice)\/(\d+)/i, to: (m) => routeForModuleRecord("invoices", m[1])! },
  { re: /^estimates\/(?:list_estimates|estimate)\/(\d+)/i, to: (m) => routeForModuleRecord("estimates", m[1])! },
  { re: /^proposals\/(?:list_proposals|proposal)\/(\d+)/i, to: (m) => routeForModuleRecord("proposals", m[1])! },
  { re: /^(?:clients|customers)\/client\/(\d+)/i, to: (m) => routeForModuleRecord("customers", m[1])! },
  { re: /^leads\/index\/(\d+)/i, to: (m) => routeForModuleRecord("leads", m[1])! },
  { re: /^contracts\/contract\/(\d+)/i, to: (m) => routeForModuleRecord("contracts", m[1])! },
  { re: /^tickets\/ticket\/(\d+)/i, to: (m) => routeForModuleRecord("tickets", m[1])! },
  { re: /^expenses\/list_expenses\/(\d+)/i, to: (m) => routeForModuleRecord("expenses", m[1])! },
  { re: /^knowledge_base\/article\/(\d+)/i, to: (m) => routeForModuleRecord("knowledge", m[1])! },
  { re: /^(?:utilities\/view_event|calendar\/event)\/(\d+)/i, to: (m) => `/(tabs)/calendar/${m[1]}` },
  { re: /^(?:tenders|tenders_api)\/view\/(\d+)/i, to: (m) => routeForModuleRecord("tenders", m[1])! },
  { re: /^(?:opportunities|opportunities_api)\/view\/(\d+)/i, to: (m) => routeForModuleRecord("opportunities", m[1])! },
  { re: /^reports\/view\/(\d+)/i, to: (m) => routeForModuleRecord("reports", m[1])! },
  { re: /^materials\/(?:view|edit)\/(\d+)/i, to: (m) => routeForModuleRecord("materials", m[1])! },
  { re: /^purchase_api\/requests\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_requests", m[1])! },
  { re: /^purchase_api\/orders\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_orders", m[1])! },
  { re: /^purchase_api\/payment_requests\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_payment_requests", m[1])! },
  { re: /^purchase_api\/expense_requests\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_expense_requests", m[1])! },
  { re: /^purchase_api\/received_vouchers\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_received_vouchers", m[1])! },
  { re: /^purchase_api\/delivery_notes\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_delivery_notes", m[1])! },
  { re: /^purchase_api\/quotations\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_quotations", m[1])! },
  { re: /^purchase_api\/completion_certificates\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_completion_certificates", m[1])! },
  { re: /^przpurchase\/ag_view_purchase_request\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_requests", m[1])! },
  { re: /^przpurchase\/purchase_requests?\/view[^/]*\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_requests", m[1])! },
  { re: /^(?:przpurchase\/)?purorder\/(?:ag_)?view_purchase_order\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_orders", m[1])! },
  { re: /^(?:przpurchase\/)?purchase_order\/(?:ag_)?view_purchase_order\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_orders", m[1])! },
  { re: /^(?:przpurchase\/)?payment_request\/(?:ag_)?view_payment_request\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_payment_requests", m[1])! },
  { re: /^(?:przpurchase\/)?expense_request\/view_expense_request\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_expense_requests", m[1])! },
  { re: /^received_vouchers\/(?:ag_)?view_voucher\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_received_vouchers", m[1])! },
  { re: /^delivery_notes\/view_delivery_note\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_delivery_notes", m[1])! },
  { re: /^quotations\/(?:quotation|ag_quotation|view_quotation)\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_quotations", m[1])! },
  { re: /^completion_certificate\/(?:view|edit)\/(\d+)/i, to: (m) => routeForModuleRecord("purchase_completion_certificates", m[1])! },
  { re: /^hr_payroll\/(?:view_payslip_detail|view_payslip_detail_v2|view_staff_payslip_modal)\/(\d+)/i, to: (m) => `/(tabs)/payslip-detail?id=${m[1]}` },
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
  const raw = cleanLink(rawLink);
  if (!raw) return null;
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
  if (raw.startsWith("/(tabs)/")) return true;
  if (raw.startsWith("#")) return true;
  if (EXTERNAL_SCHEME_RE.test(raw)) return false;

  const parsed = tryParseUrl(raw);
  if (parsed) return isInternalHost(parsed.hostname);

  if (/^[\w.-]+\.prizm-energy\.com(?:\/|$)/i.test(raw)) return true;
  return normalizeInternalPath(raw) !== null;
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
