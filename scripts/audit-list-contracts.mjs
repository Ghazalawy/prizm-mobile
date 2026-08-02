import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const workspace = path.resolve(import.meta.dirname, "..");
const backendWorkspace = process.env.PRIZM_BACKEND_WORKSPACE
  ? path.resolve(process.env.PRIZM_BACKEND_WORKSPACE)
  : path.resolve(workspace, "..", "prizm331-wt-mobile-parity");
const registryFile = path.join(workspace, "lib/module-registry.ts");
const registrySource = fs.readFileSync(registryFile, "utf8");
const transpiledRegistry = ts.transpileModule(registrySource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const registryRuntime = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledRegistry).toString("base64")}`
);
assert.ok(Array.isArray(registryRuntime.MODULES), "MODULES registry must export an array");
const registryModules = registryRuntime.MODULES
  .filter((module) => module?.key && module?.endpoint)
  .map((module) => {
    const filterFields = registryRuntime.getFilterFields(module);
    return {
      key: module.key,
      endpoint: module.endpoint.replace(/^\/+|\/+$/g, ""),
      searchFields: module.searchFields ?? [],
      clientSideSearch: module.clientSideSearch === true,
      searchParam: module.searchParam ?? "search",
      filterableFields: filterFields.map((field) => field.key),
      sortFields: module.sortableFields?.length
        ? module.sortableFields
        : module.defaultSort?.field
          ? [module.defaultSort.field]
          : [],
      filterTypes: Object.fromEntries(
        filterFields.map((field) => [field.key, registryRuntime.getFieldFilterRuleType(module, field)]),
      ),
    };
  });

const registryByKey = new Map(registryModules.map((module) => [module.key, module]));
const dedicatedConfigs = fs.readdirSync(path.join(workspace, "lib/filter-configs"))
  .filter((name) => name.endsWith(".ts") && name !== "index.ts")
  .flatMap((name) => {
    const key = name.slice(0, -3);
    const parent = registryByKey.get(key);
    if (!parent) return [];
    const file = path.join(workspace, "lib/filter-configs", name);
    const source = fs.readFileSync(file, "utf8");
    const configAst = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const filterTypes = {};
    function visit(node) {
      if (ts.isObjectLiteralExpression(node)) {
        const idProperty = node.properties.find(
          (item) => ts.isPropertyAssignment(item) && item.name.getText(configAst).replace(/["']/g, "") === "id",
        );
        const typeProperty = node.properties.find(
          (item) => ts.isPropertyAssignment(item) && item.name.getText(configAst).replace(/["']/g, "") === "type",
        );
        if (
          idProperty &&
          typeProperty &&
          ts.isPropertyAssignment(idProperty) &&
          ts.isPropertyAssignment(typeProperty) &&
          ts.isStringLiteral(idProperty.initializer) &&
          ts.isStringLiteral(typeProperty.initializer)
        ) {
          filterTypes[idProperty.initializer.text] = typeProperty.initializer.text;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(configAst);
    return [{
      key: `${key} dedicated filter sheet`,
      endpoint: parent.endpoint,
      searchFields: [],
      searchParam: "search",
      filterableFields: Object.keys(filterTypes),
      sortFields: [],
      filterTypes,
    }];
  });
const modules = [...registryModules, ...dedicatedConfigs];

const routesSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/config/routes.php"), "utf8");
const exactRoutes = new Map();
const dynamicRoutes = [];
for (const match of routesSource.matchAll(/\$route\['api\/([^']+)'\]\s*=\s*'([^']+)'/g)) {
  const route = match[1].replace(/\/$/, "");
  if (!route.includes("(:")) {
    exactRoutes.set(route, match[2]);
    continue;
  }
  const captures = [];
  let groupIndex = 0;
  const pattern = route
    .split("/")
    .map((segment) => {
      if (segment === "(:any)") {
        groupIndex += 1;
        captures.push(groupIndex);
        return "([^/]+)";
      }
      if (segment === "(:num)") {
        groupIndex += 1;
        captures.push(groupIndex);
        return "(\\d+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  dynamicRoutes.push({ regex: new RegExp(`^${pattern}$`), target: match[2], captures });
}

const controllersDir = path.join(backendWorkspace, "modules/api/controllers");
const controllerFiles = new Map(
  fs.readdirSync(controllersDir)
    .filter((name) => name.toLowerCase().endsWith(".php"))
    .map((name) => [name.slice(0, -4).toLowerCase(), path.join(controllersDir, name)]),
);

function extractMethod(source, method) {
  const match = new RegExp(`function\\s+${method}\\s*\\([^)]*\\)\\s*\\{`, "i").exec(source);
  if (!match) return "";
  const start = match.index;
  const open = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "#") {
      lineComment = true;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

function expandMethodBody(source, method, seen = new Set(), depth = 0) {
  if (seen.has(method) || depth > 5) return "";
  seen.add(method);
  const body = extractMethod(source, method);
  if (!body) return "";
  const calledMethods = [...body.matchAll(/\$this->([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
    .map((match) => match[1])
    .filter((called) => called !== method);
  return [
    body,
    ...calledMethods.map((called) => expandMethodBody(source, called, seen, depth + 1)),
  ].join("\n");
}

function splitTopLevelArguments(source) {
  const args = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "[" || char === "(") depth += 1;
    else if (char === "]" || char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      args.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  args.push(source.slice(start).trim());
  return args;
}

function setupResourceFilterTypes(source, resource) {
  const definitions = extractMethod(source, "definitions");
  const escaped = resource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`['"]${escaped}['"]\\s*=>\\s*\\$this->definition\\s*\\(`).exec(definitions);
  if (!match) return null;
  const open = definitions.indexOf("(", match.index);
  let depth = 0;
  let quote = "";
  let escapedQuote = false;
  let close = -1;
  for (let index = open; index < definitions.length; index += 1) {
    const char = definitions[index];
    if (quote) {
      if (escapedQuote) escapedQuote = false;
      else if (char === "\\") escapedQuote = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        close = index;
        break;
      }
    }
  }
  if (close < 0) return null;
  const args = splitTopLevelArguments(definitions.slice(open + 1, close));
  if (args.length < 3) return null;
  const unquote = (value) => value.trim().replace(/^['"]|['"]$/g, "");
  const stringValues = (value) => [...value.matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
  const pk = unquote(args[1]);
  const fields = stringValues(args[2]);
  const extra = args[4] ?? "";
  const listFor = (key) => {
    const keyMatch = new RegExp(`['"]${key}['"]\\s*=>\\s*\\[([^\\]]*)\\]`, "s").exec(extra);
    return new Set(keyMatch ? stringValues(keyMatch[1]) : []);
  };
  const number = listFor("number");
  const boolean = listFor("boolean");
  const enumsBlock = /['"]enums['"]\s*=>\s*\[([\s\S]*)\]\s*(?:,|$)/.exec(extra)?.[1] ?? "";
  const enums = new Set([...enumsBlock.matchAll(/['"]([^'"]+)['"]\s*=>\s*\[/g)].map((item) => item[1]));
  return new Map(fields.map((field) => [
    field,
    field === pk || number.has(field)
      ? "NumberRule"
      : boolean.has(field) || field === "isdefault"
        ? "BooleanRule"
        : enums.has(field)
          ? "SelectRule"
          : "TextRule",
  ]));
}

function resolve(module) {
  const explicit = exactRoutes.get(module.endpoint);
  if (explicit) {
    const [controller, action = "data"] = explicit.split("/");
    return { controller, action };
  }
  for (const route of dynamicRoutes) {
    const match = route.regex.exec(module.endpoint);
    if (!match) continue;
    const resolved = route.target.replace(/\$(\d+)/g, (_, index) => match[Number(index)] ?? "");
    const [controller, action = "data"] = resolved.split("/");
    return { controller, action };
  }
  if (!module.endpoint.includes("/")) return { controller: module.endpoint, action: "data" };
  const segments = module.endpoint.split("/");
  if (segments.length === 2 && segments.every(Boolean)) {
    return { controller: segments[0], action: segments[1].split("?")[0] };
  }
  return null;
}

const issues = [];
const skipped = [];
let checkedSearch = 0;
let checkedClientSearch = 0;
let checkedFilters = 0;
let checkedSorts = 0;

for (const module of modules) {
  if (!module.searchFields.length && !module.filterableFields.length && !module.sortFields.length) continue;
  const target = resolve(module);
  if (!target) {
    skipped.push(`${module.key} (${module.endpoint})`);
    continue;
  }
  const controllerFile = controllerFiles.get(target.controller.toLowerCase());
  if (!controllerFile) {
    skipped.push(`${module.key} (${module.endpoint} -> ${target.controller})`);
    continue;
  }
  const source = fs.readFileSync(controllerFile, "utf8");
  const body = expandMethodBody(source, `${target.action}_get`);
  if (!body) {
    issues.push(`${module.key}: ${path.basename(controllerFile)}::${target.action}_get() is missing`);
    continue;
  }

  if (module.searchFields.length) {
    if (module.clientSideSearch) {
      checkedClientSearch += 1;
    } else {
    checkedSearch += 1;
    const escapedSearchParam = module.searchParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const acceptsSearch =
      new RegExp(`(?:input->get|get|query)\\(\\s*['"]${escapedSearchParam}['"]`, "i").test(body) ||
      new RegExp(`\\$_GET\\s*\\[\\s*['"]${escapedSearchParam}['"]\\s*\\]`, "i").test(body);
    if (!acceptsSearch) {
      issues.push(`${module.key}: mobile sends ${module.searchParam}, but ${path.basename(controllerFile)}::${target.action}_get() does not read it`);
    }
    }
  }

  if (module.filterableFields.length) {
    checkedFilters += 1;
    const setupResource = target.controller.toLowerCase() === "setup_api" && target.action === "data"
      ? module.endpoint.split("/")[1]
      : null;
    const supported = setupResource ? setupResourceFilterTypes(source, setupResource) ?? new Map() : new Map();
    for (const match of body.matchAll(
      /['"]([^'"]+)['"]\s*=>\s*api_advanced_filter_definition\s*\([^,\n]+,\s*['"]([^'"]+Rule)['"]/g,
    )) {
      supported.set(match[1], match[2]);
    }
    for (const match of body.matchAll(
      /['"]([^'"]+)['"]\s*=>\s*['"]([^'"]+Rule)['"]/g,
    )) {
      supported.set(match[1], match[2]);
    }
    for (const match of body.matchAll(
      /\[\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+Rule)['"]\s*\]/g,
    )) {
      supported.set(match[1], match[2]);
    }
    for (const match of body.matchAll(
      /['"]([^'"]+)['"]\s*=>\s*\$(?:this->)?[A-Za-z_][A-Za-z0-9_]*(?:_filter|Rule)\s*\(/g,
    )) {
      supported.set(match[1], /Rule\s*\(/.test(match[0]) ? "BooleanRule" : "MultiSelectRule");
    }
    for (const match of body.matchAll(
      /\[['"]([^'"]+)['"]\]\s*=\s*api_advanced_filter_definition\s*\([^,\n]+,\s*['"]([^'"]+Rule)['"]/g,
    )) {
      supported.set(match[1], match[2]);
    }
    if (!/api_apply_advanced_filters\s*\(/i.test(body)) {
      issues.push(`${module.key}: mobile advertises advanced filters, but ${path.basename(controllerFile)}::${target.action}_get() does not apply them`);
      continue;
    }
    const unsupported = module.filterableFields.filter((field) => !supported.has(field));
    if (unsupported.length) {
      issues.push(`${module.key}: unsupported advanced filter field(s): ${unsupported.join(", ")}`);
    }
    const wrongTypes = module.filterableFields.flatMap((field) => {
      const mobileType = module.filterTypes?.[field];
      const backendType = supported.get(field);
      const normalizedMobileType = mobileType === "BooleanRule" ? "SelectRule" : mobileType;
      const normalizedBackendType = backendType === "BooleanRule" ? "SelectRule" : backendType;
      return normalizedMobileType && normalizedBackendType && normalizedMobileType !== normalizedBackendType
        ? [`${field} (${mobileType} → ${backendType})`]
        : [];
    });
    if (wrongTypes.length) {
      issues.push(`${module.key}: advanced filter type mismatch(es): ${wrongTypes.join(", ")}`);
    }
  }

  if (module.sortFields.length) {
    checkedSorts += 1;
    const acceptsSort = /(?:input->get|get|query)\(\s*['"]sort['"]/i.test(body);
    const acceptsDirection = /(?:input->get|get|query)\(\s*['"]sort_dir['"]/i.test(body);
    if (!acceptsSort || !acceptsDirection) {
      issues.push(
        `${module.key}: mobile advertises sorting, but ${path.basename(controllerFile)}::${target.action}_get() does not read sort and sort_dir`,
      );
    }
  }
}

if (issues.length) {
  console.error(`List contract audit failed (${issues.length} mismatches):\n- ${issues.join("\n- ")}`);
  if (skipped.length) console.error(`Skipped ${skipped.length} unresolved complex endpoints.`);
  process.exit(1);
}

console.log(
  `List contract audit passed: ${checkedSearch} server-searchable + ${checkedClientSearch} client-searchable, ${checkedFilters} filterable, and ${checkedSorts} sortable module endpoints match their backend contracts (${skipped.length} complex endpoints skipped).`,
);
