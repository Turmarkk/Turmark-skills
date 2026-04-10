#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

function usage() {
  console.error("Usage: node scripts/localize-markdown-assets.mjs <markdown-path>");
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = path.extname(pathname);
    return ext || "";
  } catch {
    return "";
  }
}

function extFromContentType(contentType) {
  const type = (contentType || "").toLowerCase().split(";")[0].trim();
  const typeToExt = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.ms-powerpoint": ".ppt",
  };
  return typeToExt[type] || "";
}

function classify(url, contentType) {
  const type = (contentType || "").toLowerCase().split(";")[0].trim();
  const ext = extFromUrl(url) || extFromContentType(contentType);

  if (type.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"].includes(ext)) {
    return { dir: "imgs", ext: ext || ".bin" };
  }
  if (type.startsWith("video/") || [".mp4", ".webm", ".mov", ".m4v"].includes(ext)) {
    return { dir: "videos", ext: ext || ".bin" };
  }
  if (type === "application/pdf" || [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip"].includes(ext)) {
    return { dir: "files", ext: ext || ".bin" };
  }
  return { dir: "files", ext: ext || ".bin" };
}

function makeName(url, index, ext) {
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
  return `asset-${String(index + 1).padStart(2, "0")}-${hash}${ext}`;
}

async function main() {
  const [, , markdownPath] = process.argv;
  if (!markdownPath) {
    usage();
    process.exit(1);
  }

  const mdPath = path.resolve(markdownPath);
  let markdown = await fs.readFile(mdPath, "utf8");
  const bodyOnly = markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const imageUrls = [...bodyOnly.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
  const linkUrls = [...bodyOnly.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((url) => /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip)(\?|$)/i.test(url));
  const allUrls = [...new Set([...imageUrls, ...linkUrls])];

  const replacements = [];
  for (let index = 0; index < allUrls.length; index += 1) {
    const url = allUrls[index];
    try {
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }
      const contentType = response.headers.get("content-type") || "";
      const asset = classify(url, contentType);
      const filename = makeName(url, index, asset.ext);
      const targetDir = path.join(path.dirname(mdPath), asset.dir);
      await fs.mkdir(targetDir, { recursive: true });
      const targetPath = path.join(targetDir, filename);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(targetPath, buffer);
      if (asset.ext !== ".bin") {
        const staleBinPath = path.join(targetDir, makeName(url, index, ".bin"));
        if (staleBinPath !== targetPath) {
          await fs.rm(staleBinPath, { force: true });
        }
      }
      const relative = `${asset.dir}/${filename}`.replace(/\\/g, "/");
      markdown = markdown.split(url).join(relative);
      replacements.push({ url, relative, bytes: buffer.length });
    } catch {
      // Keep the remote link if download fails.
    }
  }

  await fs.writeFile(mdPath, markdown, "utf8");
  console.log(JSON.stringify({ markdownPath: mdPath, downloaded: replacements.length, replacements }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
