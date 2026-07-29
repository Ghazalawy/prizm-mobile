// ─── Leads Filter Config ─────────────────────────────────────────────────
//
// Mirrors prizm331 application/views/admin/tables/leads.php rules:
//   name (TextRule), phonenumber (TextRule), country (SelectRule),
//   city (TextRule), state (TextRule), zip (TextRule),
//   is_public (BooleanRule), lost (BooleanRule), junk (BooleanRule),
//   lastcontact (DateRule), dateadded (DateRule), dateassigned (DateRule),
//   lead_value (NumberRule), status (MultiSelectRule), source (MultiSelectRule),
//   assigned (SelectRule with empty operators)

import type { ModuleFilterConfig } from "@/lib/filters";

export const LEADS_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "leads",
  rules: [
    { id: "name", type: "TextRule", label: "Name" },
    { id: "phonenumber", type: "TextRule", label: "Phone" },
    { id: "country", type: "SelectRule", label: "Country" },
    { id: "city", type: "TextRule", label: "City" },
    { id: "dateadded", type: "DateRule", label: "Date Created" },
    { id: "company", type: "TextRule", label: "Company" },
    { id: "email", type: "TextRule", label: "Email" },
    {
      id: "status",
      type: "MultiSelectRule",
      label: "Status",
    },
    {
      id: "source",
      type: "SelectRule",
      label: "Source",
    },
    {
      id: "assigned",
      type: "SelectRule",
      label: "Assigned",
      withEmptyOperators: true,
    },
  ],
};
