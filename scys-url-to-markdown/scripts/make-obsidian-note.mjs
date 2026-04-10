#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function usage() {
  console.error("Usage: node scripts/make-obsidian-note.mjs <input-md> <output-md>");
}

function cleanTitle(value) {
  return value
    .replace(/^#+\s*/, "")
    .replace(/^\d+(?:\.\d+)?[.\s]*/, "")
    .trim();
}

function extractFirstContentLine(lines) {
  const firstContent = lines.find((line) => {
    const text = line.trim();
    return text && !/^[-*]\s*$/.test(text);
  });
  return firstContent || "";
}

function extractBodyLeadTitle(lines) {
  return cleanTitle(extractFirstContentLine(lines));
}

function shouldPreferBodyTitle(pageTitle, bodyTitle) {
  const page = cleanTitle(pageTitle);
  const body = cleanTitle(bodyTitle);
  if (!body) {
    return false;
  }
  if (!page) {
    return true;
  }
  if (page === body) {
    return false;
  }

  const pageLooksLikeCourseShell =
    /大航海|航海|实战手册|课程|训练营|\|/.test(page) ||
    /course/i.test(page);
  const bodyLooksSpecific = body.length > 0 && body.length <= 30;

  return pageLooksLikeCourseShell && bodyLooksSpecific;
}

function readFrontmatterValue(raw, key) {
  const match = raw.match(new RegExp(`^${key}:\\s*"(.*)"$`, "m"));
  return match ? match[1] : "";
}

function combineMarkers(lines) {
  const bullet = "\u2022";
  const sub = "\u25E6";
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === bullet || trimmed === sub) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) {
        j += 1;
      }
      if (j < lines.length) {
        out.push(trimmed === bullet ? `- ${lines[j].trim()}` : `  - ${lines[j].trim()}`);
        i = j;
        continue;
      }
      continue;
    }
    out.push(lines[i]);
  }

  return out;
}

function promoteCommonHeadings(lines) {
  return lines.map((line) => {
    const t = line.trim();
    if (!t) return line;
    if (t === "大纲") return "## 大纲";
    if (t === "原创剧本") return "#### 原创剧本";
    if (t === "IP 改编剧本") return "#### IP 改编剧本";
    if (/^\d+\.\d+\s+.+/.test(t) && t.length <= 40) return `### ${cleanTitle(t)}`;
    if (/^\d+\..+/.test(t) && t.length <= 28 && !/^\d+\.\s+/.test(t)) return `## ${cleanTitle(t)}`;
    return line;
  });
}

async function main() {
  const [, , inputMd, outputMd] = process.argv;
  if (!inputMd || !outputMd) {
    usage();
    process.exit(1);
  }

  const inputPath = path.resolve(inputMd);
  const outputPath = path.resolve(outputMd);
  const raw = await fs.readFile(inputPath, "utf8");
  const match = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  const body = match ? match[1] : raw;
  const rawTitle = readFrontmatterValue(raw, "title");
  const pageTitle = readFrontmatterValue(raw, "page_title");
  const sourceUrl = readFrontmatterValue(raw, "source_url");

  const rawBodyLines = body.split(/\r?\n/);
  const bodyLeadTitle = extractBodyLeadTitle(rawBodyLines);
  let lines = [...rawBodyLines];
  lines = combineMarkers(lines);
  lines = promoteCommonHeadings(lines);

  let firstHeadingIndex = lines.findIndex((line) => /^#{1,6}\s+/.test(line.trim()));
  let title = cleanTitle(pageTitle || rawTitle || "");
  if (shouldPreferBodyTitle(title, bodyLeadTitle)) {
    title = bodyLeadTitle;
  }
  if (firstHeadingIndex === 0) {
    const lineTitle = cleanTitle(lines[firstHeadingIndex]);
    if (!title) {
      title = lineTitle;
    }
    lines[firstHeadingIndex] = `# ${title || lineTitle}`;
  } else {
    title = title || bodyLeadTitle || path.basename(inputPath, path.extname(inputPath));
    if (cleanTitle(lines[0] || "") === title) {
      lines[0] = `# ${title}`;
      lines.splice(1, 0, "");
    } else {
      lines.unshift(`# ${title}`, "");
    }
    firstHeadingIndex = 0;
  }

  const note = [];
  note.push("---");
  note.push(`title: ${JSON.stringify(title)}`);
  if (pageTitle && pageTitle !== title) {
    note.push("aliases:");
    note.push(`  - ${JSON.stringify(pageTitle)}`);
  }
  note.push('source_site: "生财有术"');
  if (sourceUrl) {
    note.push(`source_url: ${JSON.stringify(sourceUrl)}`);
  }
  note.push(`original_file: ${JSON.stringify(path.basename(inputPath))}`);
  note.push("tags:");
  note.push('  - "scys"');
  note.push('  - "obsidian"');
  note.push('  - "课程笔记"');
  note.push('status: "needs-review"');
  note.push(`created: ${JSON.stringify(new Date().toISOString().slice(0, 10))}`);
  note.push("---");
  note.push("");

  if (pageTitle && pageTitle !== title) {
    note.push("> 抓取来源页面标题与正文标题可能不一致，请在归档前复核。");
    note.push("");
  }

  const text = [...note, ...lines].join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, text, "utf8");
  console.log(JSON.stringify({ inputPath, outputPath, title }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
