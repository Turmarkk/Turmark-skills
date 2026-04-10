---
name: scys-url-to-markdown
description: Use when converting authenticated scys.com pages into Obsidian-ready markdown with local images, videos, or attachments, especially when generic URL fetching returns the site shell, homepage, or incomplete chapter content instead of the real page body.
---

# SCYS URL To Markdown

## Overview

Capture `scys.com` pages into a local note folder, then turn the page into an Obsidian-ready markdown file with downloaded assets.

Prefer this skill over generic page fetching for `scys.com/course/detail/...` pages because the site often serves a homepage shell to headless fetchers even after login.

## Quick Start

1. Open the target page in Chrome with remote debugging enabled.
2. Ask the user to log in if the page requires authentication.
3. Run the orchestrator:

```powershell
node scripts/run-scys-url-to-markdown.mjs "<target-url>" "<output-root>"
```

Example:

```powershell
node scripts/run-scys-url-to-markdown.mjs "https://scys.com/course/detail/160?chapterId=9989" "D:/VibeWriting/url-to-markdown/scys.com"
```

4. Verify the final Obsidian note has the expected title/body and no remote asset links remain.

## Workflow

### 0. Prefer The One-Command Entry Point

Use the orchestrator for normal work:

```powershell
node scripts/run-scys-url-to-markdown.mjs "<target-url>" "<output-root>"
```

It automatically:

- Creates a slug-based note folder
- Extracts the current logged-in tab
- Downloads remote assets with MIME-based file extensions when the source URL has no suffix
- Produces both raw and Obsidian-ready markdown

### 1. Open A Logged-In SCYS Tab

Use a visible Chrome session with a dedicated profile so login persists:

```powershell
Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList @(
  "--remote-debugging-port=9222",
  "--user-data-dir=$env:APPDATA\baoyu-skills\chrome-profile",
  "https://scys.com/course/detail/160?chapterId=9989"
)
```

If the page needs login, ask the user to complete login in the opened browser and confirm when ready.

### 2. Extract The Current Tab

Run:

```powershell
node scripts/extract-current-scys-tab.mjs "<target-url>" "<output-md>"
```

Example:

```powershell
node scripts/extract-current-scys-tab.mjs "https://scys.com/course/detail/160?chapterId=9989" "D:/VibeWriting/url-to-markdown/scys.com/course-detail-160-chapterid-9989/course-detail-160-chapterid-9989.md"
```

This script:

- Reuses the currently open `scys.com` tab from `http://localhost:9222`
- Pulls `document.documentElement.outerHTML` from the live page
- Converts the HTML with the vendored `baoyu-fetch` extractor
- Saves both `.md` and `.html`

### 3. Download Assets To Local Files

Run:

```powershell
node scripts/localize-markdown-assets.mjs "<output-md>"
```

This downloads remote assets into sibling folders:

- `imgs/` for images
- `videos/` for videos
- `files/` for PDFs and other linked attachments

It also rewrites markdown links to local relative paths.

When SCYS asset URLs do not include file extensions, this step infers the extension from the HTTP `Content-Type` header so Obsidian can render images correctly. Re-running the same export also removes stale same-name `.bin` fallbacks when a real extension can be determined.

### 4. Create The Obsidian Version

Run:

```powershell
node scripts/make-obsidian-note.mjs "<raw-md>" "<obsidian-md>"
```

Example:

```powershell
node scripts/make-obsidian-note.mjs "D:/VibeWriting/url-to-markdown/scys.com/course-detail-160-chapterid-9989/course-detail-160-chapterid-9989.md" "D:/VibeWriting/url-to-markdown/scys.com/course-detail-160-chapterid-9989/course-detail-160-chapterid-9989-formatted.md"
```

This script:

- Replaces generic frontmatter with Obsidian-friendly metadata
- Normalizes common broken list markers such as `•` and `◦`
- Preserves local asset links
- Promotes the first heading to `#`
- Falls back to the first body heading or first non-empty body line when the SCYS page title looks like a generic course title rather than the actual chapter title
- Adds a review note when the page title and extracted body title appear inconsistent

## Quality Gate

Reject the run as incomplete if any of these are true:

- The title or summary clearly looks like the `shengcaiyoushu.com` homepage shell
- The body is mostly navigation, footer, login, or marketing copy
- The final note still contains remote asset links
- The raw markdown is suspiciously short for a course page
- The final note title still looks like a generic course shell even though the body starts with a more specific chapter heading

Verify with quick checks such as:

```powershell
Get-Content -Encoding UTF8 -TotalCount 60 "<obsidian-md>"
```

```powershell
$content = Get-Content -Raw -Encoding UTF8 "<obsidian-md>"
([regex]::Matches($content,'!\[[^\]]*\]\(https?://','IgnoreCase')).Count
```

The remote asset count should be `0`.

```powershell
$content = Get-Content -Raw -Encoding UTF8 "<obsidian-md>"
([regex]::Matches($content,'imgs/[^)\\s]+\\.bin','IgnoreCase')).Count
```

The local image `.bin` count should also be `0`.

## Common Mistakes

- Do not trust a successful headless fetch alone. `scys.com` often returns a shell page with a valid exit code.
- Do not re-navigate a logged-in page if the generic fetcher keeps bouncing to the homepage. Reuse the current visible tab instead.
- Do not stop after saving raw markdown. Always localize assets and produce the Obsidian version.
- Do not assume `imgs/*.bin` is acceptable for Obsidian image rendering. If image links end in `.bin`, re-run localization after checking the asset response headers.
- Do not overwrite the raw `.md` if the user may want both the raw extract and the cleaned note. Prefer a second file such as `*-formatted.md`.

## Scripts

- `scripts/run-scys-url-to-markdown.mjs`: Orchestrate extraction, asset download, and Obsidian note creation in one command.
- `scripts/extract-current-scys-tab.mjs`: Extract the currently open SCYS tab into raw markdown and HTML.
- `scripts/localize-markdown-assets.mjs`: Download remote assets and relink markdown.
- `scripts/make-obsidian-note.mjs`: Clean a raw SCYS markdown file into an Obsidian-ready note.
