import fs from "node:fs";
import path from "node:path";

/**
 * Resolve the prizm331 checkout every backend-aware gate reads.
 *
 * Fails loudly instead of skipping: a contract gate that silently passes when
 * the backend source is missing is a rubber stamp (CI-LESSONS-LEARNED Trap 3).
 */
export function resolveBackendWorkspace({ required = true } = {}) {
  const mobileWorkspace = path.resolve(import.meta.dirname, "..", "..");
  const candidates = [
    process.env.PRIZM_BACKEND_WORKSPACE,
    process.env.PRIZM331_SOURCE_ROOT,
    path.join(mobileWorkspace, "..", "prizm331"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(path.join(resolved, "modules", "api", "controllers"))) return resolved;
  }
  if (!required) return null;
  console.error(
    "Backend workspace not found. Set PRIZM_BACKEND_WORKSPACE to a PrizmIT/prizm331 checkout.\n" +
      `Tried: ${candidates.map((item) => path.resolve(item)).join(", ")}`,
  );
  process.exit(2);
}
