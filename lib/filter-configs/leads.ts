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
    { id: "state", type: "TextRule", label: "State" },
    { id: "zip", type: "TextRule", label: "ZIP" },
    {
      id: "is_public",
      type: "BooleanRule",
      label: "Public",
      options: [
        { value: "1", label: "Public" },
        { value: "0", label: "Private" },
      ],
    },
    {
      id: "lost",
      type: "BooleanRule",
      label: "Lost",
      options: [
        { value: "1", label: "Lost" },
        { value: "0", label: "Not Lost" },
      ],
    },
    {
      id: "junk",
      type: "BooleanRule",
      label: "Junk",
      options: [
        { value: "1", label: "Junk" },
        { value: "0", label: "Not Junk" },
      ],
    },
    { id: "lastcontact", type: "DateRule", label: "Last Contact" },
    { id: "dateadded", type: "DateRule", label: "Date Created" },
    { id: "dateassigned", type: "DateRule", label: "Date Assigned" },
    { id: "lead_value", type: "NumberRule", label: "Lead Value" },
    {
      id: "status",
      type: "MultiSelectRule",
      label: "Status",
    },
    {
      id: "source",
      type: "MultiSelectRule",
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
