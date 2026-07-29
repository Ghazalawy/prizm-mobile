import type { ModuleFilterConfig } from "@/lib/filters";

/** Fields accepted by Calendar's advanced-filter allowlist. */
export const CALENDAR_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "calendar",
  rules: [
    { id: "title", type: "TextRule", label: "Title" },
    { id: "start", type: "DateRule", label: "Start" },
    { id: "end", type: "DateRule", label: "End" },
    {
      id: "public",
      type: "BooleanRule",
      label: "Visibility",
      options: [
        { value: "1", label: "Public" },
        { value: "0", label: "Private" },
      ],
    },
  ],
};
