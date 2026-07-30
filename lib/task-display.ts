/** User-facing labels for Perfex task relation keys. */
const TASK_RELATION_LABELS: Record<string, string> = {
  project: "Project",
  customer: "Customer",
  lead: "Lead",
  invoice: "Invoice",
  estimate: "Estimate",
  proposal: "Proposal",
  contract: "Contract",
  ticket: "Ticket",
  expense: "Expense",
  quotation: "Quotation",
  tender: "Tender",
  opportunity: "Opportunity",
  purchase_request: "Purchase Request",
  purchase_order: "Purchase Order",
  payment_request: "Payment Request",
  expense_request: "Expense Request",
  erp_dev: "ERP Development Module",
  internal: "Internal",
};

export function taskRelationTypeLabel(relType: unknown): string {
  const key = String(relType ?? "").trim().toLowerCase();
  if (!key) return "";
  return TASK_RELATION_LABELS[key] || humanizeRelationKey(key);
}

export function taskRelationSummary(task: {
  rel_type?: unknown;
  rel_id?: unknown;
  rel_name?: unknown;
}): string | undefined {
  const typeLabel = taskRelationTypeLabel(task.rel_type);
  const rawName = String(task.rel_name ?? "").trim();
  const relName = isUsefulRelationName(rawName, task.rel_type, task.rel_id) ? rawName : "";
  const relId = String(task.rel_id ?? "").trim();

  if (typeLabel && relName) return `${typeLabel} · ${relName}`;
  if (typeLabel && relId && relId !== "0") return `${typeLabel} · #${relId}`;
  return typeLabel || relName || undefined;
}

function isUsefulRelationName(name: string, relType: unknown, relId: unknown): boolean {
  if (!name || /^\d+$/.test(name)) return false;
  const normalized = name.toLowerCase();
  return normalized !== String(relType ?? "").trim().toLowerCase()
    && normalized !== String(relId ?? "").trim().toLowerCase();
}

function humanizeRelationKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
