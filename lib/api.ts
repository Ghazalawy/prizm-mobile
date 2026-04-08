import { API_URL, ADMIN_URL } from "./config";
import { getAuthToken, getSessionCookie } from "./auth";

// --- REST API client (JWT auth) ---

async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getAuthToken();

  const res = await fetch(`${API_URL}/${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ========================
// Leads
// ========================

export async function getLeads() {
  return apiRequest("leads");
}

export async function getLead(id: number) {
  return apiRequest(`leads/${id}`);
}

// ========================
// Clients / Customers
// ========================

export async function getClients() {
  return apiRequest("customers");
}

export async function getClient(id: number) {
  return apiRequest(`customers/${id}`);
}

// ========================
// Tasks
// ========================

export async function getTasks() {
  return apiRequest("tasks");
}

export async function getTask(id: number) {
  return apiRequest(`tasks/${id}`);
}

// ========================
// Projects
// ========================

export async function getProjects() {
  return apiRequest("projects");
}

export async function getProject(id: number) {
  return apiRequest(`projects/${id}`);
}

// ========================
// Invoices
// ========================

export async function getInvoices() {
  return apiRequest("invoices");
}

export async function getInvoice(id: number) {
  return apiRequest(`invoices/${id}`);
}

// ========================
// Estimates
// ========================

export async function getEstimates() {
  return apiRequest("estimates");
}

export async function getEstimate(id: number) {
  return apiRequest(`estimates/${id}`);
}

// ========================
// Contracts
// ========================

export async function getContracts() {
  return apiRequest("contracts");
}

export async function getContract(id: number) {
  return apiRequest(`contracts/${id}`);
}

// ========================
// Expenses
// ========================

export async function getExpenses() {
  return apiRequest("expenses");
}

export async function getExpense(id: number) {
  return apiRequest(`expenses/${id}`);
}

// ========================
// Tickets
// ========================

export async function getTickets() {
  return apiRequest("tickets");
}

export async function getTicket(id: number) {
  return apiRequest(`tickets/${id}`);
}

// ========================
// Staff
// ========================

export async function getStaff() {
  return apiRequest("staffs");
}

export async function getStaffMember(id: number) {
  return apiRequest(`staffs/${id}`);
}

// ========================
// Calendar
// ========================

export async function getCalendarEvents() {
  return apiRequest("calendar");
}

// ========================
// Dashboard (admin AJAX)
// ========================

export async function getDashboardData() {
  return adminRequest("dashboard");
}

// ========================
// Notifications (admin AJAX)
// ========================

export async function getNotifications() {
  return adminRequest("misc/get_notifications");
}
