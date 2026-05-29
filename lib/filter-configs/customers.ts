// ─── Customers Filter Config ──────────────────────────────────────────────
//
// Mirrors prizm331 clients table — standard Perfex customer fields.
// The Web UI uses hooks (PRIZM_CLIENTS_FILTER) + custom fields.

import type { ModuleFilterConfig } from "@/lib/filters";

export const CUSTOMERS_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "clients",
  rules: [
    { id: "company", type: "TextRule", label: "Company" },
    { id: "email", type: "TextRule", label: "Email" },
    { id: "phonenumber", type: "TextRule", label: "Phone" },
    { id: "vat", type: "TextRule", label: "VAT" },
    { id: "city", type: "TextRule", label: "City" },
    { id: "state", type: "TextRule", label: "State" },
    { id: "country", type: "SelectRule", label: "Country" },
    { id: "zip", type: "TextRule", label: "ZIP" },
    { id: "website", type: "TextRule", label: "Website" },
    {
      id: "active",
      type: "SelectRule",
      label: "Status",
      options: [
        { value: "1", label: "Active" },
        { value: "0", label: "Inactive" },
      ],
    },
    { id: "datecreated", type: "DateRule", label: "Date Created" },
    {
      id: "group_id",
      type: "MultiSelectRule",
      label: "Group",
    },
  ],
};
