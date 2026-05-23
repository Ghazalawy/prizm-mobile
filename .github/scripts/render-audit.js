#!/usr/bin/env node
/**
 * Render docs/MODULE_AUDIT.md to _site/audit.html during the Pages deploy.
 *
 * Wraps the markdown in a styled HTML template that matches the landing
 * page palette. Replaces __SHORT_SHA__ / __BUILD_TIME__ placeholders that
 * the workflow sed-substitutes after this script runs.
 */
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

marked.setOptions({ gfm: true, breaks: false });

const md = fs.readFileSync(path.join("docs", "MODULE_AUDIT.md"), "utf8");
const body = marked.parse(md);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Prizm Mobile — Module Audit</title>
  <style>
    :root {
      --bg: #0b1320;
      --bg-2: #111a2e;
      --fg: #e8ecf4;
      --fg-dim: #93a0bd;
      --accent: #4f8cff;
      --accent-2: #2dd4bf;
      --border: #1f2a44;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, system-ui, sans-serif;
      background: radial-gradient(1200px 600px at 80% -10%, #1d2a4d 0%, var(--bg) 60%);
      color: var(--fg);
      min-height: 100vh;
      line-height: 1.6;
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px 80px; }
    .topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .topbar a { color: var(--accent); text-decoration: none; font-size: 14px; }
    .topbar a:hover { text-decoration: underline; }
    h1 { font-size: 28px; margin: 16px 0 8px; letter-spacing: -0.01em; }
    h2 { font-size: 22px; margin: 36px 0 12px; padding-top: 20px; border-top: 1px solid var(--border); }
    h3 { font-size: 17px; margin: 24px 0 8px; color: var(--accent-2); }
    h4 { font-size: 14px; margin: 16px 0 6px; color: var(--fg-dim); }
    p, li { color: var(--fg); font-size: 14px; }
    blockquote {
      border-left: 3px solid var(--accent);
      margin: 16px 0;
      padding: 8px 16px;
      background: rgba(79, 140, 255, 0.06);
      color: var(--fg-dim);
      border-radius: 0 6px 6px 0;
    }
    code {
      background: rgba(255,255,255,0.06);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 12.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: var(--accent-2);
    }
    pre {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 16px;
      overflow-x: auto;
      font-size: 12.5px;
    }
    pre code { background: transparent; padding: 0; color: var(--fg); }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
      font-size: 13px;
      background: var(--bg-2);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    th { background: rgba(255,255,255,0.04); color: var(--fg-dim); font-weight: 600; }
    a { color: var(--accent); }
    hr { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
    @media (max-width: 720px) {
      .wrap { padding: 20px 14px 60px; }
      table { font-size: 12px; }
      th, td { padding: 6px 8px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <a href="./index.html">&larr; Back to install page</a>
      <span style="color: var(--fg-dim); font-size: 12px;">build __SHORT_SHA__ &middot; __BUILD_TIME__</span>
    </div>
    ${body}
  </div>
</body>
</html>
`;

fs.mkdirSync("_site", { recursive: true });
fs.writeFileSync(path.join("_site", "audit.html"), html);
console.log(`Rendered docs/MODULE_AUDIT.md -> _site/audit.html (${html.length} bytes)`);
