// ─── Tasks Filter Config ─────────────────────────────────────────────────
//
// Mirrors prizm331 application/views/admin/tables/tasks.php
// + PRIZM_TASKSCOLUMNS_FILTER hook + task_status_* filters.

import type { ModuleFilterConfig } from "@/lib/filters";

export const TASKS_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "tasks",
  rules: [
    { id: "name", type: "TextRule", label: "Task Name" },
    { id: "id", type: "NumberRule", label: "Task ID" },
    {
      id: "status",
      type: "MultiSelectRule",
      label: "Status",
      options: [
        { value: "1", label: "Not Started" },
        { value: "2", label: "Feedback" },
        { value: "3", label: "Testing" },
        { value: "4", label: "In Progress" },
        { value: "5", label: "Complete" },
      ],
    },
    {
      id: "priority",
      type: "SelectRule",
      label: "Priority",
      options: [
        { value: "1", label: "Low" },
        { value: "2", label: "Medium" },
        { value: "3", label: "High" },
        { value: "4", label: "Urgent" },
      ],
    },
    { id: "startdate", type: "DateRule", label: "Start Date" },
    { id: "duedate", type: "DateRule", label: "Due Date" },
    { id: "datefinished", type: "DateRule", label: "Date Finished" },
    { id: "dateadded", type: "DateRule", label: "Date Created" },
    {
      id: "billable",
      type: "SelectRule",
      label: "Billable",
      options: [
        { value: "1", label: "Billable" },
        { value: "0", label: "Not Billable" },
      ],
    },
    {
      id: "rel_type",
      type: "SelectRule",
      label: "Related To",
      options: [
        { value: "project", label: "Project" },
        { value: "lead", label: "Lead" },
        { value: "customer", label: "Customer" },
        { value: "invoice", label: "Invoice" },
        { value: "estimate", label: "Estimate" },
        { value: "contract", label: "Contract" },
        { value: "ticket", label: "Ticket" },
        { value: "proposal", label: "Proposal" },
      ],
    },
    {
      id: "assigned",
      type: "SelectRule",
      label: "Assigned To",
      withEmptyOperators: true,
      emptyOperatorValue: "0",
    },
    {
      id: "milestone",
      type: "SelectRule",
      label: "Milestone",
    },
  ],
};
