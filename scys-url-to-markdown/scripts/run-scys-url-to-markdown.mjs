#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

function usage() {
  console.error("Usage: node scripts/run-scys-url-to-markdown.mjs <target-url> <output-root> [cdp-url]");
}

function slugifyUrl(targetUrl) {
  const url = new URL(targetUrl);
  const joined = `${url.pathname.replace(/^\/+|\/+$/g, "")}-${url.search.replace(/^\?/, "")}`;
  return joined
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "scys-note";
}

function runNode(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  const [, , targetUrl, outputRoot, cdpUrl = "http://localhost:9222"] = process.argv;
  if (!targetUrl || !outputRoot) {
    usage();
    process.exit(1);
  }

  const slug = slugifyUrl(targetUrl);
  const noteDir = path.resolve(outputRoot, slug);
  const rawMd = path.join(noteDir, `${slug}.md`);
  const obsidianMd = path.join(noteDir, `${slug}-formatted.md`);

  await fs.mkdir(noteDir, { recursive: true });

  const here = path.dirname(fileURLToPath(import.meta.url));
  const extractScript = path.join(here, "extract-current-scys-tab.mjs");
  const localizeScript = path.join(here, "localize-markdown-assets.mjs");
  const obsidianScript = path.join(here, "make-obsidian-note.mjs");

  runNode(extractScript, [targetUrl, rawMd, cdpUrl]);
  runNode(localizeScript, [rawMd]);
  runNode(obsidianScript, [rawMd, obsidianMd]);

  console.log(
    JSON.stringify(
      {
        targetUrl,
        outputDir: noteDir,
        rawMarkdown: rawMd,
        obsidianMarkdown: obsidianMd,
        rawHtml: rawMd.replace(/\.md$/i, ".html"),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
