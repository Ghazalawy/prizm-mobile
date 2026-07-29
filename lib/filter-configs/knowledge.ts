import type { ModuleFilterConfig } from "@/lib/filters";

/** Fields accepted by Knowledge_api's advanced-filter allowlist. */
export const KNOWLEDGE_FILTER_CONFIG: ModuleFilterConfig = {
  tableId: "knowledge",
  rules: [
    { id: "subject", type: "TextRule", label: "Subject" },
    { id: "description", type: "TextRule", label: "Article text" },
    { id: "articlegroup", type: "MultiSelectRule", label: "Group" },
    {
      id: "active",
      type: "SelectRule",
      label: "Publication status",
      options: [
        { value: "1", label: "Published" },
        { value: "0", label: "Unpublished" },
      ],
    },
    { id: "datecreated", type: "DateRule", label: "Created date" },
    { id: "staff_article", type: "MultiSelectRule", label: "Staff article" },
    { id: "curator", type: "TextRule", label: "Curator" },
    { id: "benchmark", type: "NumberRule", label: "Benchmark" },
    { id: "score", type: "NumberRule", label: "Score" },
  ],
};
