import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { buildAuthHeaders, parseApiResponse } from "../api";

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

/**
 * One row from tblprzpurcahse_req_statusdetail — the canonical
 * "this approver's seat at this PR's stage" record. Each PR has one of
 * these per (approver × stage) combination. The viewer's actionable
 * row is the one with approver=me, is_current_status=1, status not
 * yet 'Approved'/'Rejected'.
 */
export type PRApprovalRow = {
  statusDetailID: number;
  statusID: number;
  approver: number;
  approver_name: string | null;
  requester: number | null;
  requester_name: string | null;
  status: string;            // 'Submitted', 'Approved', 'Rejected', ...
  is_current_status: number;
  is_optional: number;
  is_final: number;
  stageID: number;
  stageLevel: number | null;
  order_in_list: number;
  status_name: string | null;
  color: string | null;
  rejection_reason: string | null;
  addeddate: string | null;
  updateddate: string | null;
  /** True only for the row the viewer should act on (server-computed). */
  can_act_now: boolean;
};

export type PRHeader = {
  id: number;
  staff_id: number;
  title: string | null;
  /** Internal counter (not user-facing). */
  number: number | null;
  prefix: string | null;
  /** User-facing PR number — what the web shows as "PR-26050023". */
  sequence_number: number | null;
  /** Server-formatted "PR-{sequence_number}" — preferred display. */
  display_code: string | null;
  status: number | null;
  total_amount: string | null;
  requested_date: string | null;
  department_id: number | null;
  department_name: string | null;
  currency_id: number | null;
  currency_symbol: string | null;
  currency_name: string | null;
  cost_centers: Array<{ id: number; code: string; title: string }>;
  notes: string | null;
  rel_type: string | null;
  rel_id: number | null;
  project_id: number | null;
  requester_name: string | null;
  requester_profile_image: string | null;
};

export type PRAttachment = {
  id: number;
  file_name: string;
  filetype: string;
  dateadded: string;
  staffid: number;
};

export type PRActivityLogItem = {
  id: number;
  log_details: string;
  add_date: string;
  staff_id: number;
  staff_name: string;
  profile_image: string | null;
};

export type PRQuotationSummaryRow = {
  supplier_id: number;
  supplier_name: string;
  currency_id: number;
  supplier_total: number;
  items_quoted: number;
};

export type PRApproval = {
  request: PRHeader;
  line_items: PRLineItem[];
  /** All approval-row records for this PR (per-approver-per-stage). */
  approval_rows: PRApprovalRow[];
  attachments: PRAttachment[];
  activity_log: PRActivityLogItem[];
  quotation_summary: PRQuotationSummaryRow[];
  viewer: {
    staffid: number;
    is_current_approver: boolean;
    is_submitter: boolean;
    current_status: number;
    /** The specific statusDetailID this viewer should pass to the
     *  approve/reject endpoint. 0 if no actionable row exists. */
    actionable_status_detail_id: number;
  };
};

async function fetchPRApproval(id: number): Promise<PRApproval> {
  const headers = await buildAuthHeaders();
  const res = await fetch(`${API_URL}/purchase_api/requests/${id}/approval`, { headers });
  const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"]);
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
