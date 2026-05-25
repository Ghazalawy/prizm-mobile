import { useQuery } from "@tanstack/react-query";
import { API_URL } from "../config";
import { buildAuthHeaders } from "../api";

/**
 * Perfex custom fields per entity. Each ERP install can define arbitrary
 * fields per module via /admin/custom_fields (name, type, required, options,
 * options, etc.) — they appear on the web detail/edit pages and must show in
 * mobile too, otherwise an admin's domain-specific fields are invisible.
 *
 * Backend: GET /api/custom_fields/{type}[/{id}]
 *
 * Returns rows like:
 *   {
 *     field_name: "custom_fields[invoice][1]",
 *     custom_field_id: "1",
 *     label: "Input 1",
 *     required: "0",
 *     type: "input" | "textarea" | "number" | "select" | "multiselect"
 *         | "checkbox" | "date_picker" | "date_picker_time" | "colorpicker" | "link",
 *     value: string,            // present when :id was provided
 *     options?: string,         // JSON string when type has options (select/multiselect/radio/checkbox)
 *   }
 *
 * Note Perfex's URL types are mixed singular/plural:
 *   plural:    customers, leads, projects, tasks, contracts, tickets, expenses, items
 *   singular:  invoice, estimate, credit_note, proposal, contract
 *   as-is:     company, contacts, staff
 *
 * Module registry maps its module key → this Perfex type via
 * `customFieldsType` on the ModuleDefinition.
 */

export type CustomFieldType =
  | "input"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "date_picker"
  | "date_picker_time"
  | "colorpicker"
  | "link";

export type CustomFieldRow = {
  field_name: string;
  custom_field_id: string;
  label: string;
  required: string | number;
  type: CustomFieldType | string;
  value: any;
  options?: string;
};

async function fetchCustomFields(perfexType: string, id?: string | number): Promise<CustomFieldRow[]> {
  const headers = await buildAuthHeaders();
  const url = id
    ? `${API_URL}/custom_fields/${encodeURIComponent(perfexType)}/${encodeURIComponent(String(id))}`
    : `${API_URL}/custom_fields/${encodeURIComponent(perfexType)}`;
  const res = await fetch(url, {
    headers,
  });
  if (!res.ok) {
    // 404 here usually means "no custom fields defined for this type" —
    // that's not an error, just an empty result.
    if (res.status === 404) return [];
    throw new Error(`HTTP ${res.status}`);
  }
  const j = await res.json();
  // Perfex returns the array directly OR wrapped in { status, data }
  if (Array.isArray(j)) return j;
  if (j && Array.isArray(j.data)) return j.data;
  return [];
}

/**
 * Returns the custom fields for an entity (with values if `id` is given,
 * empty values otherwise — used for create forms).
 *
 * Cached for 10 minutes per (type, id) pair. The field DEFINITIONS rarely
 * change; the VALUES are queried freshly per detail open via React Query's
 * usual invalidation flow.
 */
export function useCustomFields(perfexType: string | undefined, id?: string | number) {
  return useQuery<CustomFieldRow[]>({
    queryKey: ["custom_fields", perfexType, id ?? null],
    queryFn: () => (perfexType ? fetchCustomFields(perfexType, id) : Promise.resolve([])),
    enabled: !!perfexType,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Parse a custom field value to its display form.
 * Multi-value fields (select with options, multiselect) come back as JSON
 * arrays; render comma-separated.
 */
export function decodeCustomFieldValue(row: CustomFieldRow): string {
  const v = row.value;
  if (v === null || v === undefined || v === "") return "";
  if (row.type === "multiselect" || (row.type === "select" && row.options)) {
    try {
      const parsed = typeof v === "string" ? JSON.parse(v) : v;
      if (Array.isArray(parsed)) return parsed.filter(Boolean).join(", ");
    } catch {}
  }
  return String(v);
}

export function parseCustomFieldOptions(row: CustomFieldRow): string[] {
  if (!row.options) return [];
  try {
    const parsed = typeof row.options === "string" ? JSON.parse(row.options) : row.options;
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {}
  return [];
}
