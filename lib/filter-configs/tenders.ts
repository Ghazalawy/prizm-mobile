// ─── Tenders Filter Config ──────────────────────────────────────────────
//
// Mirrors prizm331 modules/tenders/views/tenders_dynamic_filter.php
// Table id: tenders

import type { ModuleFilterConfig } from "@/lib/filters";

export const TENDERS_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "tenders",
  rules: [
    { id: "tender_number", type: "TextRule", label: "Tender #" },
    { id: "tender_description", type: "TextRule", label: "Description" },
    { id: "tenderer_name", type: "TextRule", label: "Tenderer" },
    {
      id: "tender_status",
      type: "MultiSelectRule",
      label: "Status",
      options: [
        { value: "submitted", label: "Submitted" },
        { value: "under_review", label: "Under Review" },
        { value: "awarded", label: "Awarded" },
        { value: "lost", label: "Lost" },
        { value: "cancelled", label: "Cancelled" },
        { value: "draft", label: "Draft" },
        { value: "pending", label: "Pending" },
      ],
    },
    {
      id: "source",
      type: "SelectRule",
      label: "Source",
      options: [
        { value: "etimad", label: "Etimad" },
        { value: "direct", label: "Direct" },
        { value: "portal", label: "Portal" },
        { value: "referral", label: "Referral" },
      ],
    },
    { id: "closing_date", type: "DateRule", label: "Closing Date" },
    { id: "opening_date", type: "DateRule", label: "Opening Date" },
    { id: "created_at", type: "DateRule", label: "Date Created" },
    {
      id: "client_id",
      type: "SelectRule",
      label: "Client",
    },
    {
      id: "staff_id",
      type: "SelectRule",
      label: "Assigned To",
    },
  ],
};
