#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

function usage() {
  console.error("Usage: node scripts/extract-current-scys-tab.mjs <target-url> <output-md> [cdp-url]");
}

function extractHeading(markdown) {
  const match = markdown.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function normalizeMarkdown(markdown) {
  return markdown.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function convertHtmlToMarkdownWithVendoredDeps(html, pageUrl) {
  const vendoredRoot = path.join(
    os.homedir(),
    ".codex",
    "skills",
    "baoyu-url-to-markdown",
    "scripts",
    "vendor",
    "baoyu-fetch",
  );
  const require = createRequire(path.join(vendoredRoot, "package.json"));
  const { JSDOM } = require("jsdom");
  const { Readability } = require("@mozilla/readability");
  const TurndownService = require("turndown");
  const { gfm } = require("turndown-plugin-gfm");

  const dom = new JSDOM(html, { url: pageUrl });
  const document = dom.window.document;
  const article = new Readability(document).parse();
  const contentHtml =
    article?.content?.trim() ||
    document.querySelector("main")?.innerHTML?.trim() ||
    document.body?.innerHTML?.trim() ||
    "";

  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });
  turndown.use(gfm);

  const markdown = normalizeMarkdown(contentHtml ? turndown.turndown(contentHtml) : document.body?.textContent || "");
  return {
    markdown,
    metadata: {
      title: article?.title?.trim() || document.title.trim() || "",
      siteName:
        document.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim() ||
        document.querySelector('meta[name="application-name"]')?.getAttribute("content")?.trim() ||
        "scys.com",
      capturedAt: new Date().toISOString(),
    },
    conversionMethod: article?.content ? "readability-turndown" : "body-text",
  };
}

async function getPagePayload(targetUrl, cdpUrl) {
  const list = await fetch(`${cdpUrl}/json`).then((r) => r.json());
  const tabs = Array.isArray(list) ? list : [list];
  const page =
    tabs.find((item) => item.url === targetUrl) ||
    tabs.find((item) => typeof item.url === "string" && item.url.includes(targetUrl)) ||
    tabs.find((item) => typeof item.url === "string" && item.url.includes("scys.com"));

  if (!page?.webSocketDebuggerUrl) {
    throw new Error(`No matching DevTools tab found for ${targetUrl}`);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const responses = new Map();
  const send = (id, method, params = {}) => ws.send(JSON.stringify({ id, method, params }));

  const payload = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for DevTools response")), 20000);

    ws.onopen = () => {
      send(1, "Runtime.enable");
      send(2, "Runtime.evaluate", {
        expression: "JSON.stringify({url: location.href, title: document.title, html: document.documentElement.outerHTML})",
        returnByValue: true,
      });
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id) {
        responses.set(msg.id, msg);
      }
      if (responses.has(2)) {
        clearTimeout(timer);
        resolve(responses.get(2).result.result.value);
      }
    };

    ws.onerror = (event) => reject(event.error || new Error("WebSocket error"));
  });

  ws.close();
  return JSON.parse(payload);
}

async function main() {
  const [, , targetUrl, outputMd, cdpUrl = "http://localhost:9222"] = process.argv;
  if (!targetUrl || !outputMd) {
    usage();
    process.exit(1);
  }

  const page = await getPagePayload(targetUrl, cdpUrl);
  const result = convertHtmlToMarkdownWithVendoredDeps(page.html, page.url);

  const title = page.title?.trim() || extractHeading(result.markdown) || result.metadata.title || "SCYS Note";
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `page_title: ${JSON.stringify(page.title || title)}`,
    `source_site: ${JSON.stringify(result.metadata.siteName || "scys.com")}`,
    `source_url: ${JSON.stringify(page.url)}`,
    `capturedAt: ${JSON.stringify(result.metadata.capturedAt)}`,
    `conversionMethod: ${JSON.stringify(result.conversionMethod)}`,
    "---",
    "",
  ].join("\n");

  const mdPath = path.resolve(outputMd);
  const htmlPath = mdPath.replace(/\.md$/i, ".html");
  await fs.mkdir(path.dirname(mdPath), { recursive: true });
  await fs.writeFile(mdPath, `${frontmatter}${result.markdown.trim()}\n`, "utf8");
  await fs.writeFile(htmlPath, page.html, "utf8");

  console.log(
    JSON.stringify(
      {
        title,
        pageTitle: page.title,
        sourceUrl: page.url,
        markdownPath: mdPath,
        htmlPath,
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
