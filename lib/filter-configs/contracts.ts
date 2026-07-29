// ─── Contracts Filter Config ─────────────────────────────────────────────
//
// Mirrors prizm331 application/views/admin/tables/contracts.php
// + PRIZM_CONTRACTS_FILTER hook.

import type { ModuleFilterConfig } from "@/lib/filters";

export const CONTRACTS_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "contracts",
  rules: [
    { id: "subject", type: "TextRule", label: "Subject" },
    { id: "datestart", type: "DateRule", label: "Start Date" },
    { id: "dateend", type: "DateRule", label: "End Date" },
    {
      id: "contract_type",
      type: "MultiSelectRule",
      label: "Type",
    },
    {
      id: "client",
      type: "SelectRule",
      label: "Client",
    },
  ],
};
