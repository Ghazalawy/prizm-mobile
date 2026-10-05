import fs from "node:fs";
import path from "node:path";
import { lineOf, readPhpExpression, splitTopLevel, stripPhpComments, walkPhpFiles } from "./php-source.mjs";

/**
 * Distinctive stand-in for every runtime value (record id, staff id, …) in a
 * backend link. Distinctive so the gate can prove the id survived routing:
 * a resolver that grabs the wrong numeric segment produces a route without it.
 */
export const SAMPLE_ID = "48213";
const PLACEHOLDER = "\u0000ID\u0000";
const SITE = "https://ms.prizm-energy.com/MS";

/** define('NAME', 'value') constants used inside link expressions. */
export function collectConstants(files) {
  const constants = new Map();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/define\(\s*['"]([A-Z0-9_]+)['"]\s*,\s*['"]([^'"]*)['"]\s*\)/g)) {
      if (!constants.has(match[1])) constants.set(match[1], match[2]);
    }
  }
  return constants;
}

function unquote(term) {
  const quote = term[0];
  const body = term.slice(1, -1);
  if (quote === "'") return body.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  return body
    .replace(/\{\$[^}]*\}/g, PLACEHOLDER)
    .replace(/\$[A-Za-z_][\w]*(?:->[A-Za-z_]\w*|\[[^\]]*\])*/g, PLACEHOLDER)
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function stripOuterParens(expression) {
  let current = expression.trim();
  while (current.startsWith("(") && current.endsWith(")")) {
    let depth = 0;
    let closesEarly = false;
    for (let index = 0; index < current.length; index += 1) {
      if (current[index] === "(") depth += 1;
      else if (current[index] === ")") depth -= 1;
      if (depth === 0 && index < current.length - 1) { closesEarly = true; break; }
    }
    if (closesEarly) break;
    current = current.slice(1, -1).trim();
  }
  return current;
}

/**
 * Reduce a PHP link expression to concrete sample strings.
 * Returns [] when the value is decided entirely at runtime (`$link`, `_l()`…).
 */
export function evaluateLinkExpression(expression, constants) {
  const expr = stripOuterParens(expression.replace(/^\((?:string|int)\)\s*/i, ""));
  if (!expr) return [];

  const coalesce = splitTopLevel(expr, "?");
  if (coalesce.length > 1) {
    // `cond ? a : b` — every branch is a link the user can receive.
    const branches = splitTopLevel(coalesce.slice(1).join("?"), ":");
    return branches.flatMap((branch) => evaluateLinkExpression(branch, constants));
  }

  const terms = splitTopLevel(expr, ".");
  let output = "";
  for (const raw of terms) {
    const term = stripOuterParens(raw.replace(/^\((?:string|int)\)\s*/i, ""));
    if (!term) continue;
    if ((term.startsWith("'") && term.endsWith("'")) || (term.startsWith('"') && term.endsWith('"'))) {
      output += unquote(term);
      continue;
    }
    const helper = term.match(/^(admin_url|site_url|base_url)\s*\(([\s\S]*)\)$/i);
    if (helper) {
      const inner = helper[2].trim() ? evaluateLinkExpression(helper[2], constants) : [""];
      if (!inner.length) return [];
      const prefix = helper[1].toLowerCase() === "admin_url" ? `${SITE}/admin/` : `${SITE}/`;
      // Several branches inside a helper are rare; keep the first for concatenation.
      output += prefix + inner[0].replace(/^\/+/, "");
      continue;
    }
    if (/^[A-Z][A-Z0-9_]+$/.test(term)) {
      if (!constants.has(term)) return [];
      output += constants.get(term);
      continue;
    }
    if (/^\d+$/.test(term)) { output += term; continue; }
    if (/^_l\s*\(|^str_replace\s*\(|^isset\s*\(|^sprintf\s*\(|^false$|^null$|^true$/i.test(term)) return [];
    // Any other runtime value: variable, property, array access, function call.
    output += PLACEHOLDER;
  }
  if (!output || output.startsWith(PLACEHOLDER)) return [];
  return [output];
}

function looksLikeNotificationArray(source, offset) {
  // Look across the enclosing array literal for the keys a notification or
  // approval row always carries. Bounded window keeps this linear.
  const window = source.slice(Math.max(0, offset - 1400), offset + 900);
  return /['"](touserid|fromuserid|is_action_taken|from_fullname)['"]\s*(?:=>|\]\s*=)|add_notification\s*\(|approvals['"]/.test(window);
}

/**
 * Link templates found in one PHP source. Used by the full-tree extractor and
 * by the weekly diff, which reads two revisions of a file via `git show`.
 */
export function linkTemplatesInSource(raw, constants = new Map()) {
  if (!/['"]link['"]\s*(?:=>|\]\s*=)/.test(raw)) return [];
  const source = stripPhpComments(raw);
  const templates = new Set();
  for (const match of source.matchAll(/['"]link['"]\s*=>\s*|\$\w+\[['"]link['"]\]\s*=(?!=)\s*/g)) {
    if (!looksLikeNotificationArray(source, match.index)) continue;
    for (const sample of evaluateLinkExpression(readPhpExpression(source, match.index + match[0].length), constants)) {
      const template = sample.split(PLACEHOLDER).join("{id}").trim();
      if (template && template !== "#" && !/[<>]/.test(template)) templates.add(template);
    }
  }
  return [...templates];
}

/**
 * Every statically knowable link the backend stores in tblnotifications /
 * tblapprovals (or hands to add_notification).
 */
export function extractBackendLinks(backendWorkspace) {
  const files = walkPhpFiles(backendWorkspace);
  const constants = collectConstants(files);
  const seen = new Map();
  let dynamicCount = 0;
  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    if (!/['"]link['"]\s*(?:=>|\]\s*=)/.test(raw)) continue;
    const source = stripPhpComments(raw);
    const relative = path.relative(backendWorkspace, file).replaceAll("\\", "/");
    // Both idioms the backend uses to build a notification row:
    //   ['link' => EXPR, …]   and   $row['link'] = EXPR;
    for (const match of source.matchAll(/['"]link['"]\s*=>\s*|\$\w+\[['"]link['"]\]\s*=(?!=)\s*/g)) {
      const start = match.index + match[0].length;
      if (!looksLikeNotificationArray(source, match.index)) continue;
      const expression = readPhpExpression(source, start);
      const samples = evaluateLinkExpression(expression, constants);
      if (!samples.length) { dynamicCount += 1; continue; }
      for (const sample of samples) {
        const value = sample.split(PLACEHOLDER).join(SAMPLE_ID).trim();
        // HTML fragments are e-mail bodies built from a link, not stored links.
        if (!value || value === "#" || /[<>]/.test(value)) continue;
        const key = value.toLowerCase();
        const where = `${relative}:${lineOf(source, match.index)}`;
        if (!seen.has(key)) {
          seen.set(key, {
            sample: value,
            template: sample.split(PLACEHOLDER).join("{id}").trim(),
            isRecord: sample.includes(PLACEHOLDER),
            sources: [where],
          });
        } else if (seen.get(key).sources.length < 5) {
          seen.get(key).sources.push(where);
        }
      }
    }
  }
  return { links: [...seen.values()].sort((a, b) => a.template.localeCompare(b.template)), dynamicCount };
}

/** Is this an off-platform URL (Teams, external sites) rather than an ERP page? */
export function isExternalLink(sample) {
  const match = sample.match(/^https?:\/\/([^/]+)/i);
  if (!match) return false;
  const host = match[1].toLowerCase();
  return !(host === "prizm-energy.com" || host.endsWith(".prizm-energy.com"));
}

/**
 * Port of Inbox_api::_perfex_link_to_mobile_deeplink, rebuilt from the PHP
 * source each run so the gate can never drift from what production emits.
 */
export function loadInboxTranslator(backendWorkspace) {
  const file = path.join(backendWorkspace, "modules/api/controllers/Inbox_api.php");
  const source = stripPhpComments(fs.readFileSync(file, "utf8"));
  const fnStart = source.indexOf("function _perfex_link_to_mobile_deeplink");
  if (fnStart < 0) throw new Error("Inbox_api::_perfex_link_to_mobile_deeplink not found — inbox contract changed.");
  const body = source.slice(fnStart, source.indexOf("\n    }\n", fnStart));
  const patterns = [];
  for (const match of body.matchAll(/'#((?:[^'\\]|\\.)*)#([a-z]*)'\s*=>\s*'([^']*)'/g)) {
    patterns.push({ re: new RegExp(match[1].replace(/\\'/g, "'"), match[2].replace(/[^imsu]/g, "")), replacement: match[3] });
  }
  if (!patterns.length) throw new Error("Inbox_api deeplink pattern table is empty — parser out of date.");

  const literalDeeplinks = [];
  for (const match of source.matchAll(/'deeplink'\s*=>\s*/g)) {
    const expression = readPhpExpression(source, match.index + match[0].length);
    if (expression.includes("_perfex_link_to_mobile_deeplink")) continue;
    const samples = evaluateLinkExpression(expression, new Map());
    for (const sample of samples) {
      literalDeeplinks.push({
        sample: sample.split(PLACEHOLDER).join(SAMPLE_ID),
        template: sample.split(PLACEHOLDER).join("{id}"),
        isRecord: sample.includes(PLACEHOLDER),
        sources: [`modules/api/controllers/Inbox_api.php:${lineOf(source, match.index)}`],
      });
    }
  }

  // Inbox item types the aggregator emits without any deeplink at all —
  // tapping them does nothing on mobile.
  const typesWithoutDeeplink = [];
  for (const match of source.matchAll(/\$out\[\]\s*=\s*\[/g)) {
    const block = source.slice(match.index, source.indexOf("];", match.index));
    const type = block.match(/'type'\s*=>\s*'([^']+)'/)?.[1];
    if (type && !/'deeplink'\s*=>/.test(block)) {
      typesWithoutDeeplink.push({ type, source: `modules/api/controllers/Inbox_api.php:${lineOf(source, match.index)}` });
    }
  }

  const translate = (link) => {
    if (!link) return null;
    for (const { re, replacement } of patterns) {
      if (re.test(link)) return link.replace(re, replacement);
    }
    if (!link.includes("://")) {
      if (link.startsWith("#")) return `${SITE}/admin/${link.replace(/^\/+/, "")}`;
      return link.replace(/^\/+/, "");
    }
    return link;
  };

  return { translate, patterns, literalDeeplinks, typesWithoutDeeplink };
}
