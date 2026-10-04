import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export const mobileWorkspace = path.resolve(import.meta.dirname, "..", "..");

function transpile(relativePath, prelude = "") {
  const file = path.join(mobileWorkspace, relativePath);
  const source = `${prelude}\n${fs.readFileSync(file, "utf8").replace(/^import\s+[\s\S]*?;\s*$/gm, "")}`;
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

async function importSource(source) {
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

/** The real lib/native-routing.ts with React Native side effects stubbed. */
export async function loadRouting() {
  return importSource(transpile(
    "lib/native-routing.ts",
    `const Linking = {}; const router = {}; const Toast = {}; const BASE_URL = "https://ms.prizm-energy.com";`,
  ));
}

/** The real MODULES registry from lib/module-registry.ts. */
export async function loadRegistry() {
  const registry = await importSource(transpile("lib/module-registry.ts"));
  return new Map(registry.MODULES.map((module) => [module.key, module]));
}

/**
 * Expo-router route table built from the files under app/. Each entry knows
 * its file and a matcher; static segments outrank dynamic ones exactly like
 * expo-router's own resolution.
 */
export function loadRouteTable() {
  const appDir = path.join(mobileWorkspace, "app");
  const routes = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { visit(full); continue; }
      if (!/\.(tsx|ts)$/.test(entry.name)) continue;
      if (/^(_layout|\+native-intent|\+not-found|\+html)\./.test(entry.name)) continue;
      const relative = path.relative(appDir, full).replaceAll("\\", "/").replace(/\.(tsx|ts)$/, "");
      const segments = relative.split("/").filter((segment) => !/^\(.*\)$/.test(segment));
      if (segments.at(-1) === "index") segments.pop();
      routes.push({
        file: `app/${relative}`,
        segments,
        score: segments.reduce((sum, segment) => sum + (segment.startsWith("[") ? 1 : 10), 0),
      });
    }
  };
  visit(appDir);
  routes.sort((a, b) => b.score - a.score || b.segments.length - a.segments.length);
  return routes;
}

/** Match a pushed route ("/(tabs)/erp/tasks/12?x=1") to a screen file. */
export function matchRoute(routeTable, route) {
  const pathname = String(route).split(/[?#]/)[0];
  const segments = pathname.split("/").filter(Boolean).filter((segment) => !/^\(.*\)$/.test(segment));
  for (const candidate of routeTable) {
    if (candidate.segments.length !== segments.length) continue;
    const params = {};
    let ok = true;
    for (let index = 0; index < segments.length; index += 1) {
      const expected = candidate.segments[index];
      const actual = decodeURIComponent(segments[index]);
      if (expected.startsWith("[") && expected.endsWith("]")) {
        params[expected.slice(1, -1).replace(/^\.\.\./, "")] = actual;
      } else if (expected !== actual) {
        ok = false;
        break;
      }
    }
    if (ok) return { file: candidate.file, params };
  }
  return null;
}

/** `module === "x"` branches of a generic route file — modules with bespoke screens. */
export function dedicatedModules(relativeFile) {
  const source = fs.readFileSync(path.join(mobileWorkspace, relativeFile), "utf8");
  return new Set([...source.matchAll(/module === "([^"]+)"/g)].map((match) => match[1]));
}

export const GENERIC_DETAIL_FILE = "app/(tabs)/erp/[module]/[id]";
export const GENERIC_LIST_FILE = "app/(tabs)/erp/[module]/index";
export const ERP_HOME_FILE = "app/(tabs)/erp/index";

/**
 * Decide what a user actually sees when the app pushes `route`.
 * Returns `{ file, moduleKey, recordId, problems[] }`.
 */
export function inspectRoute(context, route) {
  const { routeTable, registry, routing, detailDedicated, listDedicated } = context;
  const problems = [];
  const match = matchRoute(routeTable, route);
  if (!match) {
    return { file: null, problems: [{ code: "NO_SCREEN", detail: `no file under app/ renders ${route}` }] };
  }
  const query = new URLSearchParams(String(route).split("?")[1]?.split("#")[0] ?? "");
  const recordId = match.params.id ?? query.get("id") ?? null;
  const moduleKey = match.params.module ?? null;

  if (match.file === ERP_HOME_FILE) {
    problems.push({ code: "ERP_HOME_FALLBACK", detail: "lands on the ERP home grid, not the record or list" });
  }

  if (match.file === GENERIC_DETAIL_FILE || match.file === `${GENERIC_DETAIL_FILE}/edit`) {
    const module = registry.get(moduleKey);
    if (!detailDedicated.has(moduleKey)) {
      if (!module) problems.push({ code: "UNKNOWN_MODULE", detail: `module key "${moduleKey}" is not in MODULES; screen shows "Module not found"` });
      else if (module.canOpenDetail === false) problems.push({ code: "NO_DETAIL_VIEW", detail: `module "${moduleKey}" declares canOpenDetail: false` });
    }
    const canonical = routing.routeForModuleRecord(moduleKey, recordId);
    if (canonical && match.file === GENERIC_DETAIL_FILE && canonical.split("?")[0] !== String(route).split("?")[0]) {
      problems.push({ code: "NON_CANONICAL", detail: `bypasses the dedicated screen ${canonical}` });
    }
  }

  if (match.file === GENERIC_LIST_FILE || match.file === "app/(tabs)/erp/[module]/new") {
    if (!listDedicated.has(moduleKey) && !registry.has(moduleKey)) {
      problems.push({ code: "UNKNOWN_MODULE", detail: `module key "${moduleKey}" is not in MODULES; screen shows "Module not found"` });
    }
    const canonical = routing.routeForModuleList(moduleKey);
    if (canonical && match.file === GENERIC_LIST_FILE && canonical.split("?")[0] !== String(route).split("?")[0]) {
      problems.push({ code: "NON_CANONICAL", detail: `bypasses the dedicated list ${canonical}` });
    }
  }

  return { file: match.file, moduleKey, recordId, problems };
}

export async function loadMobileContext() {
  return {
    routing: await loadRouting(),
    registry: await loadRegistry(),
    routeTable: loadRouteTable(),
    detailDedicated: dedicatedModules("app/(tabs)/erp/[module]/[id].tsx"),
    listDedicated: dedicatedModules("app/(tabs)/erp/[module]/index.tsx"),
  };
}
