// ─── Tasks Filter Config ─────────────────────────────────────────────────
//
// Mirrors prizm331 application/views/admin/tables/tasks.php
// + PRIZM_TASKSCOLUMNS_FILTER hook + task_status_* filters.

import type { ModuleFilterConfig } from "@/lib/filters";

export const TASKS_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "tasks",
  rules: [
    { id: "name", type: "TextRule", label: "Task Name" },
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
      type: "MultiSelectRule",
      label: "Priority",
      options: [
        { value: "1", label: "Low" },
        { value: "2", label: "Medium" },
        { value: "3", label: "High" },
        { value: "4", label: "Urgent" },
      ],
    },
    { id: "startdate", type: "DateRule", label: "Start Date" },
    { id: "duedate", type: "DateRule", label: "Due Date", withEmptyOperators: true },
    {
      id: "todays_tasks",
      type: "BooleanRule",
      label: "Today's Tasks",
      options: [{ value: "1", label: "Yes" }, { value: "0", label: "No" }],
    },
    {
      id: "duedate_passed",
      type: "BooleanRule",
      label: "Due Date Passed",
      options: [{ value: "1", label: "Yes" }, { value: "0", label: "No" }],
    },
    {
      id: "not_assigned",
      type: "BooleanRule",
      label: "Not Assigned",
      options: [{ value: "1", label: "Yes" }, { value: "0", label: "No" }],
    },
    {
      id: "my_tasks",
      type: "BooleanRule",
      label: "Assigned to Me",
      options: [{ value: "1", label: "Yes" }, { value: "0", label: "No" }],
    },
    {
      id: "my_following_tasks",
      type: "BooleanRule",
      label: "Tasks I Follow",
      options: [{ value: "1", label: "Yes" }, { value: "0", label: "No" }],
    },
    {
      id: "upcoming_tasks",
      type: "BooleanRule",
      label: "Upcoming Tasks",
      options: [{ value: "1", label: "Yes" }, { value: "0", label: "No" }],
    },
    {
      id: "recurring",
      type: "BooleanRule",
      label: "Recurring",
      options: [{ value: "1", label: "Yes" }, { value: "0", label: "No" }],
    },
    {
      id: "billable",
      type: "BooleanRule",
      label: "Billable",
      options: [
        { value: "1", label: "Billable" },
        { value: "0", label: "Not Billable" },
      ],
    },
    {
      id: "billed",
      type: "BooleanRule",
      label: "Billed",
      options: [{ value: "1", label: "Yes" }, { value: "0", label: "No" }],
    },
    {
      id: "assigned",
      type: "MultiSelectRule",
      label: "Assigned To",
      withEmptyOperators: true,
      emptyOperatorValue: "0",
    },
  ],
};
