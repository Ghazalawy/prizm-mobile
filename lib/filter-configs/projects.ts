// ─── Projects Filter Config ──────────────────────────────────────────────
//
// Mirrors prizm331 application/views/admin/tables/projects.php
// + PRIZM_PROJECTS_FILTER hook integration.

import type { ModuleFilterConfig } from "@/lib/filters";

export const PROJECTS_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "projects",
  rules: [
    { id: "name", type: "TextRule", label: "Project Name" },
    { id: "id", type: "NumberRule", label: "Project ID" },
    {
      id: "status",
      type: "MultiSelectRule",
      label: "Status",
      options: [
        { value: "1", label: "Not Started" },
        { value: "2", label: "In Progress" },
        { value: "3", label: "On Hold" },
        { value: "4", label: "Finished" },
        { value: "5", label: "Cancelled" },
      ],
    },
    { id: "start_date", type: "DateRule", label: "Start Date" },
    { id: "deadline", type: "DateRule", label: "Deadline" },
    {
      id: "billing_type",
      type: "SelectRule",
      label: "Billing Type",
      options: [
        { value: "1", label: "Fixed Rate" },
        { value: "2", label: "Project Hours" },
        { value: "3", label: "Task Hours" },
      ],
    },
    {
      id: "clientid",
      type: "SelectRule",
      label: "Client",
    },
    {
      id: "projectmanager",
      type: "SelectRule",
      label: "Project Manager",
    },
    { id: "date_finished", type: "DateRule", label: "Date Finished" },
  ],
};
