// ─── Opportunities Filter Config ─────────────────────────────────────────
//
// Mirrors prizm331 modules/opportunities/views/tables/opportunities.php
// Rules: opportunity_code, partner_reference, opportunity_name,
//   client, opportunity_status, start_date, end_date, expiry_date,
//   approval_status, priority, stage, opportunity_type, staff

import type { ModuleFilterConfig } from "@/lib/filters";

export const OPPORTUNITIES_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "opportunities",
  rules: [
    {
      id: "opportunity_code",
      type: "MultiSelectRule",
      label: "Opportunity Code",
    },
    { id: "partner_reference", type: "TextRule", label: "Partner Reference" },
    { id: "opportunity_name", type: "TextRule", label: "Opportunity Name" },
    {
      id: "client",
      type: "MultiSelectRule",
      label: "Client",
    },
    {
      id: "opportunity_status",
      type: "MultiSelectRule",
      label: "Status",
      options: [
        { value: "open", label: "Open" },
        { value: "won", label: "Won" },
        { value: "lost", label: "Lost" },
        { value: "closed", label: "Closed" },
        { value: "on_hold", label: "On Hold" },
        { value: "abandoned", label: "Abandoned" },
      ],
    },
    { id: "start_date", type: "DateRule", label: "Start Date" },
    { id: "end_date", type: "DateRule", label: "End Date" },
    { id: "expiry_date", type: "DateRule", label: "Expiry Date" },
    {
      id: "approval_status",
      type: "MultiSelectRule",
      label: "Approval Status",
      options: [
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ],
    },
    {
      id: "priority",
      type: "SelectRule",
      label: "Priority",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "critical", label: "Critical" },
      ],
    },
    {
      id: "stage",
      type: "SelectRule",
      label: "Stage",
    },
    {
      id: "opportunity_type",
      type: "SelectRule",
      label: "Type",
    },
    {
      id: "staff",
      type: "SelectRule",
      label: "Assigned Staff",
    },
  ],
};
