import fs from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set([".git", "node_modules", "vendor", "temp", "_artifacts", "assets", "resources", "docs"]);

/** Every .php file under the given roots (relative to the backend workspace). */
export function walkPhpFiles(backendWorkspace, roots = ["application", "modules"]) {
  const files = [];
  const visit = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(path.join(dir, entry.name));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".php")) {
        files.push(path.join(dir, entry.name));
      }
    }
  };
  for (const root of roots) visit(path.join(backendWorkspace, root));
  return files.sort();
}

/** Blank out PHP comments while keeping offsets and line numbers stable. */
export function stripPhpComments(source) {
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
      else if (char === "?" && next === ">") { lineComment = false; output += char; }
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
    if (char === "#" && next !== "[") { lineComment = true; output += " "; continue; }
    if (char === "/" && next === "*") { blockComment = true; output += "  "; index += 1; continue; }
    output += char;
  }
  return output;
}

/**
 * Read one PHP expression starting at `start`, stopping at the first
 * top-level `,` `;` `]` `)` or `=>`. Quotes and nested brackets are honoured.
 */
export function readPhpExpression(source, start) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (char === "(" || char === "[" || char === "{") { depth += 1; continue; }
    if (char === ")" || char === "]" || char === "}") {
      if (depth === 0) return source.slice(start, index).trim();
      depth -= 1;
      continue;
    }
    if (depth === 0 && (char === "," || char === ";")) return source.slice(start, index).trim();
    if (depth === 0 && char === "=" && source[index + 1] === ">") return source.slice(start, index).trim();
  }
  return source.slice(start).trim();
}

/** Split a PHP expression on a top-level operator token (".", "?", ":"). */
export function splitTopLevel(expression, separator) {
  const parts = [];
  let depth = 0;
  let quote = "";
  let escaped = false;
  let last = 0;
  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (char === "(" || char === "[" || char === "{") depth += 1;
    else if (char === ")" || char === "]" || char === "}") depth -= 1;
    else if (depth === 0 && char === separator) {
      // "?:" / "??" / "::" and "->" are not the separators we are splitting on.
      const prev = expression[index - 1];
      const next = expression[index + 1];
      if (separator === "." && (/\d/.test(prev ?? "") && /\d/.test(next ?? ""))) continue;
      if (separator === "?" && (next === "?" || next === ":" || next === "-" || next === ">")) { index += 1; continue; }
      if (separator === ":" && (next === ":" || prev === ":")) continue;
      parts.push(expression.slice(last, index));
      last = index + 1;
    }
  }
  parts.push(expression.slice(last));
  return parts.map((part) => part.trim());
}

/** 1-based line number of an offset. */
export function lineOf(source, offset) {
  let line = 1;
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}
