import { API_URL, ADMIN_URL } from "./config";
import { getAuthToken, getSessionCookie } from "./auth";

// --- REST API client (JWT auth) ---

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getAuthToken();

  // Perfex's modules/api expects the JWT in a custom header called `authtoken`,
  // NOT in Authorization: Bearer. See modules/api/config/jwt.php (`token_header`)
  // and Authorization_Token::tokenIsExist().
  const res = await fetch(`${API_URL}/${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { authtoken: token } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(body);
      message = json.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

// Some endpoints return a plain array, others return { status, data, total, limit, offset }.
// This helper normalizes both shapes.
export type ListResult<T = any> = {
  items: T[];
  total: number;
};

export function normalizeList(response: any): ListResult {
  if (Array.isArray(response)) {
    return { items: response, total: response.length };
  }
  if (response && Array.isArray(response.data)) {
    return {
      items: response.data,
      total: typeof response.total === "number" ? response.total : response.data.length,
    };
  }
  return { items: [], total: 0 };
}

// --- Admin AJAX client (session auth) ---

async function adminRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const cookie = await getSessionCookie();

  const res = await fetch(`${ADMIN_URL}/${endpoint}`, {
    ...options,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

// =====================================================
// Per-entity getters. All accept optional ?search / ?limit / ?offset and
// return RAW response shape (paginated object or plain array). React Query
// hooks normalize via normalizeList.
// =====================================================

export function buildQS(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export type ListParams = {
  search?: string;
  limit?: number;
  offset?: number;
};

// Tasks
export const getTasks    = (p?: ListParams) => apiRequest(`tasks${buildQS(p)}`);
export const getTask     = (id: number)     => apiRequest(`tasks/${id}`);

// Projects
export const getProjects = (p?: ListParams) => apiRequest(`projects${buildQS(p)}`);
export const getProject  = (id: number)     => apiRequest(`projects/${id}`);

// Customers (Perfex names them "customers" in API)
export const getCustomers = (p?: ListParams) => apiRequest(`customers${buildQS(p)}`);
export const getCustomer  = (id: number)     => apiRequest(`customers/${id}`);

// Leads
export const getLeads = (p?: ListParams) => apiRequest(`leads${buildQS(p)}`);
export const getLead  = (id: number)     => apiRequest(`leads/${id}`);

// Invoices
export const getInvoices = (p?: ListParams) => apiRequest(`invoices${buildQS(p)}`);
export const getInvoice  = (id: number)     => apiRequest(`invoices/${id}`);

// Estimates
export const getEstimates = (p?: ListParams) => apiRequest(`estimates${buildQS(p)}`);
export const getEstimate  = (id: number)     => apiRequest(`estimates/${id}`);

// Contracts
export const getContracts = (p?: ListParams) => apiRequest(`contracts${buildQS(p)}`);
export const getContract  = (id: number)     => apiRequest(`contracts/${id}`);

// Expenses
export const getExpenses = (p?: ListParams) => apiRequest(`expenses${buildQS(p)}`);
export const getExpense  = (id: number)     => apiRequest(`expenses/${id}`);

// Tickets
export const getTickets = (p?: ListParams) => apiRequest(`tickets${buildQS(p)}`);
export const getTicket  = (id: number)     => apiRequest(`tickets/${id}`);

// Staff
export const getStaff       = (p?: ListParams) => apiRequest(`staffs${buildQS(p)}`);
export const getStaffMember = (id: number)     => apiRequest(`staffs/${id}`);

// Calendar
export const getCalendarEvents = () => apiRequest("calendar");

// Dashboard data (admin AJAX, session cookie auth) — superseded by per-entity
// counts but kept for completeness.
export const getDashboardData = () => adminRequest("dashboard");
export const getNotifications = () => adminRequest("misc/get_notifications");

// --- Generic native ERP CRUD client ---

export type CrudEndpoint = {
  endpoint: string;
  detailEndpoint?: string;
  deleteEndpoint?: string;
};

export const listEntities = (
  endpoint: string,
  p?: ListParams
) => apiRequest(`${endpoint}${buildQS(p)}`);

export const getEntity = (
  endpoint: string,
  id: string | number,
  detailEndpoint?: string
) => apiRequest(`${detailEndpoint || endpoint}/${encodeURIComponent(String(id))}`);

export const createEntity = (
  endpoint: string,
  payload: Record<string, any>
) => apiRequest(endpoint, {
  method: "POST",
  body: JSON.stringify(payload),
});

export const updateEntity = (
  endpoint: string,
  id: string | number,
  payload: Record<string, any>
) => apiRequest(`${endpoint}/${encodeURIComponent(String(id))}`, {
  method: "PUT",
  body: JSON.stringify(payload),
});

export const deleteEntity = (
  endpoint: string,
  id: string | number,
  deleteEndpoint?: string
) => apiRequest(`${deleteEndpoint || endpoint}/${encodeURIComponent(String(id))}`, {
  method: "DELETE",
});
