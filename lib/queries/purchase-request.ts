import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { getAuthToken } from "../auth";
import { parseApiResponse } from "../api";

/**
 * Hooks for the Purchase Request native approval screen.
 *
 * Endpoint: GET /api/purchase_api/requests/{id}/approval
 * Returns: request header + line items + workflow stages + audit history
 * + viewer context (am I the current approver?).
 *
 * Defined here (not in lib/queries/dashboard or lib/queries/inbox) because
 * the shape is approval-specific and the screen will grow with future
 * mutations (approve / reject / add comment).
 */

export type PRLineItem = {
  id: number;
  name: string | null;
  item_long_name: string | null;
  spec: string | null;
  item_unit: string | null;
  qty: string | number | null;
  rate: string | number | null;
  subtotal: string | number | null;
  status: string | null;
  approved_qty: string | number | null;
  approved_price: string | number | null;
};

export type PRStage = {
  id: number;
  status_name: string;
  color: string | null;
  order_in_list: number;
  stageID: number;
  is_optional: number | boolean;
  is_final: number | boolean;
  approvers: Array<{ staffid: number; name: string }>;
};

export type PRHistoryItem = {
  id: number;
  statusID: number;
  is_current_status: number | boolean | null;
  approver: number;
  approver_name: string | null;
  requester?: number;
  status: string;
  addeddate: string | null;
  updateddate: string | null;
};

export type PRHeader = {
  id: number;
  staff_id: number;
  title: string | null;
  number: number | null;
  prefix: string | null;
  status: number | null;
  total_amount: string | null;
  requested_date: string | null;
  department_id: number | null;
  notes: string | null;
  rel_type: string | null;
  rel_id: number | null;
  project_id: number | null;
  requester_name: string | null;
};

export type PRApproval = {
  request: PRHeader;
  line_items: PRLineItem[];
  stages: PRStage[];
  history: PRHistoryItem[];
  viewer: {
    staffid: number;
    is_current_approver: boolean;
    is_submitter: boolean;
    current_status: number;
  };
};

async function fetchPRApproval(id: number): Promise<PRApproval> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/purchase_api/requests/${id}/approval`, {
    headers: { ...(token ? { authtoken: token } : {}) },
  });
  const { body, invalidToken } = await parseApiResponse(res, !!token);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) throw new Error((body && (body as any).message) || `HTTP ${res.status}`);
  if (!body?.status) throw new Error((body && (body as any).message) || "Request failed");
  return (body as any).data as PRApproval;
}

export function usePRApproval(id: number | null | undefined) {
  return useQuery({
    queryKey: ["purchase_request_approval", id],
    queryFn: () => fetchPRApproval(id as number),
    enabled: typeof id === "number" && id > 0,
    staleTime: 30 * 1000,
  });
}
