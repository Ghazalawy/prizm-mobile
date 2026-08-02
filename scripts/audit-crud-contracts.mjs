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
const ast = ts.createSourceFile(registryFile, registrySource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const declaration = ast.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations])
  .find((item) => ts.isIdentifier(item.name) && item.name.text === "MODULES");
assert.ok(declaration?.initializer && ts.isArrayLiteralExpression(declaration.initializer), "MODULES registry must be an array literal");

function property(object, name) {
  return object.properties.find((item) =>
    ts.isPropertyAssignment(item) && item.name.getText(ast).replace(/["']/g, "") === name
  );
}

function stringProperty(object, name) {
  const item = property(object, name);
  return item && ts.isPropertyAssignment(item) && ts.isStringLiteral(item.initializer)
    ? item.initializer.text
    : undefined;
}

function explicitlyFalse(object, name) {
  const item = property(object, name);
  return Boolean(item && ts.isPropertyAssignment(item) && item.initializer.kind === ts.SyntaxKind.FalseKeyword);
}

const modules = declaration.initializer.elements.flatMap((element) => {
  if (!ts.isObjectLiteralExpression(element)) return [];
  const key = stringProperty(element, "key");
  const endpoint = stringProperty(element, "endpoint");
  if (!key || !endpoint) return [];
  return [{
    key,
    endpoint,
    create: !explicitlyFalse(element, "canCreate"),
    update: !explicitlyFalse(element, "canUpdate"),
    delete: !explicitlyFalse(element, "canDelete"),
  }];
});

const routesSource = fs.readFileSync(path.join(backendWorkspace, "modules/api/config/routes.php"), "utf8");
const exactRoutes = new Map();
const dynamicRoutes = [];
for (const match of routesSource.matchAll(/\$route\['api\/([^']+)'\]\s*=\s*'([^']+)'/g)) {
  const route = match[1].replace(/\/$/, "");
  if (!route.includes("(:")) {
    exactRoutes.set(route, match[2]);
    continue;
  }
  const pattern = route
    .split("/")
    .map((segment) => {
      if (segment === "(:any)") return "([^/]+)";
      if (segment === "(:num)") return "(\\d+)";
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  dynamicRoutes.push({ regex: new RegExp(`^${pattern}$`), target: match[2] });
}

function resolveRoute(endpoint) {
  const exact = exactRoutes.get(endpoint);
  if (exact) return exact;
  for (const route of dynamicRoutes) {
    const match = route.regex.exec(endpoint);
    if (!match) continue;
    return route.target.replace(/\$(\d+)/g, (_, index) => match[Number(index)] ?? "");
  }
  return null;
}

const controllersDir = path.join(backendWorkspace, "modules/api/controllers");
const controllerFiles = new Map(
  fs.readdirSync(controllersDir)
    .filter((name) => name.toLowerCase().endsWith(".php"))
    .map((name) => [name.slice(0, -4).toLowerCase(), path.join(controllersDir, name)])
);

const unresolved = [];
const missing = [];
let checked = 0;

for (const module of modules) {
  if (!module.create && !module.update && !module.delete) continue;
  const endpoint = module.endpoint.replace(/^\/+|\/+$/g, "");
  const explicitTarget = resolveRoute(endpoint);
  let controller;
  let action;
  if (explicitTarget) {
    [controller, action = "data"] = explicitTarget.split("/");
  } else if (!endpoint.includes("/")) {
    controller = endpoint;
    action = "data";
  } else if (endpoint.split("/").length === 2) {
    [controller, action] = endpoint.split("/");
  } else {
    unresolved.push(`${module.key} (${endpoint})`);
    continue;
  }

  for (const [capability, verb] of [["create", "post"], ["update", "put"], ["delete", "delete"]]) {
    if (!module[capability]) continue;
    let capabilityController = controller;
    let capabilityAction = action;
    if (capability !== "create") {
      const detailTarget = resolveRoute(`${endpoint}/0`);
      if (detailTarget) [capabilityController, capabilityAction = "data"] = detailTarget.split("/");
    }
    const controllerFile = controllerFiles.get(capabilityController.toLowerCase());
    if (!controllerFile) {
      unresolved.push(`${module.key} (${endpoint} -> ${capabilityController})`);
      continue;
    }
    const source = fs.readFileSync(controllerFile, "utf8");
    checked += 1;
    const method = `${capabilityAction}_${verb}`;
    if (!new RegExp(`function\\s+${method}\\s*\\(`, "i").test(source)) {
      missing.push(`${module.key}: ${capability} is enabled, but ${path.basename(controllerFile)}::${method}() is missing`);
    }
  }
}

if (missing.length) {
  console.error(`CRUD contract audit failed (${missing.length} mismatches):\n- ${missing.join("\n- ")}`);
  process.exit(1);
}

console.log(`CRUD contract audit passed: ${checked} advertised mutations have backend methods (${unresolved.length} complex subresource endpoints skipped).`);
if (unresolved.length) console.log(`Skipped endpoints:\n- ${unresolved.join("\n- ")}`);
