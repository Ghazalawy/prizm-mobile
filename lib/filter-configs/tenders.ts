// ─── Tenders Filter Config ──────────────────────────────────────────────
//
// Mirrors prizm331 modules/tenders/views/table_tenders.php
// Table id: tenders

import type { ModuleFilterConfig } from "@/lib/filters";

export const TENDERS_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "tenders",
  rules: [
    { id: "tender_number", type: "TextRule", label: "Tender #" },
    { id: "tender_description", type: "TextRule", label: "Description" },
    { id: "client", type: "MultiSelectRule", label: "Client" },
    { id: "floating_date", type: "DateRule", label: "Floating Date" },
    { id: "closing_date", type: "DateRule", label: "Closing Date" },
    { id: "tenderer_name", type: "MultiSelectRule", label: "Tenderer" },
    { id: "tenderActivityName", type: "MultiSelectRule", label: "Activity Name" },
    {
      id: "status",
      type: "MultiSelectRule",
      label: "Status",
      options: [
        { value: "1", label: "Active" },
        { value: "2", label: "Pending" },
        { value: "3", label: "Announced" },
        { value: "4", label: "Archived" },
        { value: "6", label: "Canceled" },
      ],
    },
    {
      id: "source",
      type: "MultiSelectRule",
      label: "Source",
      options: [
        { value: "Etimad", label: "Etimad" },
        { value: "DEWA", label: "DEWA" },
        { value: "NWC", label: "NWC" },
        { value: "AbuDhabi", label: "Abu Dhabi" },
        { value: "Drydocks", label: "Drydocks" },
        { value: "esupply", label: "eSupply" },
        { value: "7x", label: "7x" },
      ],
    },
  ],
};
