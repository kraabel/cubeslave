// Bundles the app into one self-contained HTML page for previewing without a
// server. The /api/verdict call fails there, so the offline narration is used.
// Usage: node preview/build.mjs <out.html>
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? path.join(root, "preview", "the-cabin.html");

const result = await build({
  entryPoints: [path.join(root, "preview/entry.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  write: false,
  alias: { "next/dynamic": path.join(root, "preview/next-dynamic-shim.tsx"), "@": root },
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".css": "empty" },
  logLevel: "warning",
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync(path.join(root, "app/globals.css"), "utf8");

const html = `<title>The Ted Test</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600&display=swap">
<style>
:root { color-scheme: dark; --font-ui: "Urbanist"; }
${css}
#root { height: 100%; }
</style>
<div id="root"></div>
<script>${js}</script>
`;
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
