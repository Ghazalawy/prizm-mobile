import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const mobileWorkspace = path.resolve(import.meta.dirname, "..");
const backendWorkspace = path.resolve(
  process.env.PRIZM_BACKEND_WORKSPACE ||
    process.env.PRIZM331_SOURCE_ROOT ||
    path.join(mobileWorkspace, "..", "prizm331-wt-full-native-parity"),
);

function transpileModule(file, prelude = "") {
  const source = `${prelude}\n${fs.readFileSync(file, "utf8").replace(/^import\s+[\s\S]*?;\s*$/gm, "")}`;
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

async function importSource(source) {
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

const registry = await importSource(transpileModule(path.join(mobileWorkspace, "lib", "module-registry.ts")));
const registryKeys = new Set(registry.MODULES.map((module) => module.key));
const routing = await importSource(transpileModule(
  path.join(mobileWorkspace, "lib", "native-routing.ts"),
  `const Linking = {}; const router = {}; const Toast = {}; const BASE_URL = "https://ms.prizm-energy.com";`,
));

function phpMenuFiles() {
  const files = [path.join(backendWorkspace, "application", "helpers", "menu_helper.php")];
  const modulesDir = path.join(backendWorkspace, "modules");
  for (const moduleName of fs.readdirSync(modulesDir)) {
    const moduleDir = path.join(modulesDir, moduleName);
    if (!fs.statSync(moduleDir).isDirectory()) continue;
    for (const name of fs.readdirSync(moduleDir)) {
      const file = path.join(moduleDir, name);
      if (fs.statSync(file).isFile() && name.toLowerCase().endsWith(".php")) files.push(file);
    }
  }
  return files;
}

function stripPhpComments(source) {
  let output = "";
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") { lineComment = false; output += "\n"; }
      else output += " ";
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") { blockComment = false; output += "  "; index += 1; }
      else output += char === "\n" ? "\n" : " ";
      continue;
    }
    if (quote) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"') { quote = char; output += char; continue; }
    if (char === "/" && next === "/") { lineComment = true; output += "  "; index += 1; continue; }
    if (char === "#") { lineComment = true; output += " "; continue; }
    if (char === "/" && next === "*") { blockComment = true; output += "  "; index += 1; continue; }
    output += char;
  }
  return output;
}

function extractCall(source, start) {
  const open = source.indexOf("(", start);
  if (open < 0) return "";
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (char === "(") depth += 1;
    if (char === ")" && --depth === 0) return source.slice(start, index + 1);
  }
  return "";
}

function propertyString(call, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const localized = call.match(new RegExp(`["']${escaped}["']\\s*=>\\s*_l\\(\\s*["']([^"']+)["']`, "i"));
  if (localized) return localized[1];
  return call.match(new RegExp(`["']${escaped}["']\\s*=>\\s*["']([^"']*)["']`, "i"))?.[1] || "";
}

function hrefFromCall(call) {
  const helper = call.match(/["']href["']\s*=>\s*(admin_url|site_url|base_url)\(\s*(?:["']([^"']*)["'])?/i);
  if (helper) {
    const [, kind, value = ""] = helper;
    if (kind.toLowerCase() === "admin_url") return `https://ms.prizm-energy.com/MS/admin/${value}`;
    return `https://ms.prizm-energy.com/MS/${value}`;
  }
  const literal = propertyString(call, "href");
  if (!literal || literal === "#" || /^javascript:/i.test(literal)) return "";
  if (/^https?:\/\//i.test(literal)) return literal;
  return `https://ms.prizm-energy.com/MS/${literal.replace(/^\/+/, "")}`;
}

function menuEntries() {
  const entries = [];
  const unresolved = [];
  const callPattern = /->add_(?:sidebar|setup)_(?:menu|children)_item\s*\(/gi;
  for (const file of phpMenuFiles()) {
    const source = stripPhpComments(fs.readFileSync(file, "utf8"));
    for (const match of source.matchAll(callPattern)) {
      const call = extractCall(source, match.index);
      if (!call) continue;
      const href = hrefFromCall(call);
      const hasHref = /["']href["']\s*=>/i.test(call);
      const line = source.slice(0, match.index).split("\n").length;
      const entry = {
        file: path.relative(backendWorkspace, file).replaceAll("\\", "/"),
        line,
        label: propertyString(call, "name") || propertyString(call, "slug") || "unnamed",
        href,
      };
      if (href) entries.push(entry);
      else if (hasHref && !/["']href["']\s*=>\s*["']#["']/i.test(call)) unresolved.push(entry);
    }
  }
  return { entries, unresolved };
}

function registryKeyFromRoute(route) {
  const match = route?.match(/^\/\(tabs\)\/erp\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

const { entries, unresolved } = menuEntries();
const unique = [...new Map(entries.map((entry) => [entry.href.toLowerCase(), entry])).values()];
const results = unique.map((entry) => {
  const route = routing.resolveNativeRoute(entry.href);
  const moduleKey = registryKeyFromRoute(route);
  const missingRegistry = Boolean(moduleKey && !registryKeys.has(moduleKey));
  return { ...entry, route, moduleKey, missingRegistry };
});
const missing = results.filter((entry) => !entry.route || entry.missingRegistry);
const covered = results.filter((entry) => entry.route && !entry.missingRegistry);

console.log(`Web menu parity audit: ${covered.length}/${results.length} unique static web destinations resolve to an existing native screen.`);
console.log(`Missing native destinations: ${missing.length}; dynamic/unresolved href expressions: ${unresolved.length}.`);
if (missing.length) {
  console.log("\nMissing destinations:");
  for (const item of missing) {
    const reason = item.missingRegistry ? `route references absent registry key ${item.moduleKey}` : "no native route";
    console.log(`- ${item.label}: ${item.href} (${reason}) [${item.file}:${item.line}]`);
  }
}
if (unresolved.length) {
  console.log("\nUnresolved dynamic destinations:");
  for (const item of unresolved) console.log(`- ${item.label} [${item.file}:${item.line}]`);
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ covered, missing, unresolved }, null, 2));
}
if (process.argv.includes("--strict") && (missing.length || unresolved.length)) process.exit(1);
