// ─── Contracts Filter Config ─────────────────────────────────────────────
//
// Mirrors prizm331 application/views/admin/tables/contracts.php
// + PRIZM_CONTRACTS_FILTER hook.

import type { ModuleFilterConfig } from "@/lib/filters";

export const CONTRACTS_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "contracts",
  rules: [
    { id: "subject", type: "TextRule", label: "Subject" },
    { id: "id", type: "NumberRule", label: "Contract ID" },
    { id: "datestart", type: "DateRule", label: "Start Date" },
    { id: "dateend", type: "DateRule", label: "End Date" },
    {
      id: "contract_type",
      type: "SelectRule",
      label: "Type",
    },
    { id: "contract_value", type: "NumberRule", label: "Value" },
    {
      id: "signed",
      type: "SelectRule",
      label: "Status",
      options: [
        { value: "0", label: "Not Signed" },
        { value: "1", label: "Signed" },
      ],
    },
    {
      id: "trash",
      type: "SelectRule",
      label: "Trash",
      options: [
        { value: "0", label: "Active" },
        { value: "1", label: "Trashed" },
      ],
    },
    {
      id: "client",
      type: "SelectRule",
      label: "Client",
    },
    {
      id: "project_id",
      type: "SelectRule",
      label: "Project",
    },
  ],
};
