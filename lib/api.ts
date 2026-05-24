import { API_URL, ADMIN_URL } from "./config";
import { getAuthToken, getSessionCookie } from "./auth";
import { notifyInvalidToken } from "./auth-events";
import { getCurrentImpersonation } from "./impersonation";

// --- Invalid-token detection ----------------------------------------------
//
// After the JWT signing key rotated on 2026-05-23, every cached token began
// failing server-side validation. Perfex returns this in two flavours:
//   1. HTTP 401 / 403 with empty or short body, OR
//   2. HTTP 404 (REST_Controller default for "missing creds") with body
//      {"status":false,"message":"Signature verification failed"}.
//
// We treat both as token-expiry, but ONLY when the response body's message
// is specific enough to unambiguously point at the JWT layer.
//
// The previous broader pattern list ("Token is not defined", "Token is
// invalid", "invalid token") matched too eagerly — Perfex's REST module
// returns "Token is not defined" from its DEFAULT 404 handler when a route
// doesn't exist at all (not just when the token failed), which falsely
// signed out users hitting a not-yet-deployed endpoint. Only the JWT-
// specific phrases stay in the unambiguous list now.
const UNAMBIGUOUS_JWT_PATTERNS = [
  /signature verification failed/i,
  /token expired/i,
];

export function isInvalidTokenResponse(
  status: number,
  body: any,
  hadToken: boolean
): boolean {
  // No token sent → server's "401 / signature failed" is just the natural
  // unauthenticated state, NOT a session-expiry event.
  if (!hadToken) return false;
  // 401 (Unauthorized) with auth header set = the canonical session-expiry
  // signal. HTTP semantics: 401 means "your credentials are invalid or
  // missing", which on our backend means the JWT couldn't be decoded or
  // the user record behind it can't be resolved.
  if (status === 401) return true;
  // 403 (Forbidden) is NOT session-expiry — it's "you're authenticated
  // fine, you just lack permission for THIS specific action" (e.g. you're
  // not the current approver of a PR). Signing the user out here was the
  // bug behind the "Approve → toast → kicked to login" symptom: the
  // backend was correctly saying "you can't approve this stage, it's
  // someone else's turn" with a 403, and the mobile was interpreting that
  // as "your whole session is dead."
  // 404 with a SPECIFIC JWT-layer message = stale-token edge case (see #2
  // above). Anything else with status 404 is treated as "route not found"
  // and bubbled up as a normal error — the user stays signed in.
  if (
    body &&
    body.status === false &&
    typeof body.message === "string"
  ) {
    for (const re of UNAMBIGUOUS_JWT_PATTERNS) {
      if (re.test(body.message)) return true;
    }
  }
  return false;
}

/**
 * Parse a response once (body is consumed) and detect invalid-token. If
 * detected, fires the global handler (which AuthContext registers — see
 * lib/auth-events.ts).
 *
 * Callers that do their own fetch should use this so every entry point goes
 * through the same detection logic. Returns the parsed body for further use.
 */
export async function parseApiResponse(
  res: Response,
  hadToken: boolean
): Promise<{ body: any; invalidToken: boolean }> {
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Not JSON — leave as text
  }
  const invalidToken = isInvalidTokenResponse(res.status, body, hadToken);
  if (invalidToken) notifyInvalidToken();
  return { body, invalidToken };
}

/**
 * Build the standard JWT-auth headers used by every Perfex API request,
 * including the View-As impersonation header when active.
 *
 * Callers that do their own fetch (file downloads, multi-part uploads,
 * direct mutations) should use this rather than re-deriving the
 * headers — otherwise their requests bypass impersonation and continue
 * acting as the real admin even mid-View-As.
 */
export async function buildAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const impersonation = getCurrentImpersonation();
  const out: Record<string, string> = { "Content-Type": "application/json" };
  if (token) out["authtoken"] = token;
  if (impersonation) out["X-Impersonate-Staff-Id"] = String(impersonation.staffid);
  return out;
}

// --- REST API client (JWT auth) ---

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getAuthToken();
  // View-As: append the impersonation header on every request. Backend
  // silently ignores it if the real caller isn't admin, so this is safe
  // for non-admin users too. See lib/impersonation.ts + modules/api/
  // helpers/api_auth_helper.php on the backend.
  const impersonation = getCurrentImpersonation();

  // Perfex's modules/api expects the JWT in a custom header called `authtoken`,
  // NOT in Authorization: Bearer. See modules/api/config/jwt.php (`token_header`)
  // and Authorization_Token::tokenIsExist().
  const res = await fetch(`${API_URL}/${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { authtoken: token } : {}),
      ...(impersonation ? { "X-Impersonate-Staff-Id": String(impersonation.staffid) } : {}),
      ...(options.headers || {}),
    },
  });

  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) {
    throw new Error("Session expired — please sign in again.");
  }

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && body.message) || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return body;
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
