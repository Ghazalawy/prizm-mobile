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
        { value: "draft", label: "Draft" },
        { value: "submitted", label: "Submitted" },
        { value: "approved", label: "Approved" },
        { value: "dismissed", label: "Dismissed" },
        { value: "archived", label: "Archived" },
      ],
    },
    { id: "start_date", type: "DateRule", label: "Start Date" },
    { id: "end_date", type: "DateRule", label: "End Date" },
    { id: "expiry_date", type: "DateRule", label: "Expiry Date" },
    {
      id: "approval_status",
      type: "MultiSelectRule",
      label: "Approval Status",
      // Web values are composite "stageID-statusID" identifiers.
    },
    {
      id: "responsible_employee",
      type: "MultiSelectRule",
      label: "Responsible Employee",
    },
    {
      id: "opportunity_field",
      type: "MultiSelectRule",
      label: "Field",
      options: [
        { value: "0", label: "Civil" },
        { value: "1", label: "Mechanical" },
        { value: "2", label: "Electrical" },
      ],
    },
    {
      id: "opportunity_job_type",
      type: "MultiSelectRule",
      label: "Job Type",
      options: [
        { value: "0", label: "Install" },
        { value: "1", label: "Supply & Install" },
        { value: "2", label: "Supply" },
      ],
    },
  ],
};
