---
phase: 03-import-de-rapports
plan: "01"
subsystem: server + api-client
tags: [file-upload, mammoth, xlsx, ai-fingerprint, multer, backend, api-client]
one_liner: "Backend import-template pipeline: mammoth .docx parsing, XLSX sheet extraction, AI fingerprint extraction endpoint, and frontend API client method"

dependency_graph:
  requires: []
  provides:
    - "POST /api/w/:slug/reports/import-template (server)"
    - "importTemplate(file) in createWorkspaceApi (frontend)"
  affects:
    - "03-02-PLAN.md (import wizard consumes importTemplate and fingerprint shape)"

tech_stack:
  added:
    - "mammoth 1.12.0 — .docx to HTML parsing (CJS default import in ESM server)"
  patterns:
    - "uploadTemplate multer instance — separate from data upload, accepts .xlsx/.xls/.docx/.doc"
    - "parseDocxTemplate — buffer → mammoth HTML, truncated (8000 chars / 3000 in local mode)"
    - "parseXlsxTemplate — buffer → XLSX sheet_to_json, filter empty headers, return sheet descriptors"
    - "buildFingerprintPrompt — AI prompt for structured JSON fingerprint extraction"
    - "aiComplete pattern with JSON fence stripping — same as generate-report endpoint"
    - "FormData upload pattern — same as uploadFiles in api.js"

key_files:
  created: []
  modified:
    - "server/index.js — mammoth import, uploadTemplate multer, helper functions, import-template endpoint"
    - "server/package.json — mammoth dependency added"
    - "server/package-lock.json — lockfile updated"
    - "app/src/lib/api.js — importTemplate method added to createWorkspaceApi"

decisions:
  - "mammoth default import (not named) — CJS named exports unreliable in ESM; default import gives full API object"
  - "Separate uploadTemplate multer instance — avoids polluting data upload fileFilter with .docx mime types"
  - "Truncation 8000/3000 chars — prevents AI token overflow; 3000 in local mode for Ministral 3B cap"
  - "aiMode guard in parseDocxTemplate — consistent with existing aiMode === 'local' truncation pattern"
  - "Preserve original field label names in prompt — multi-language templates should not be auto-translated"

metrics:
  duration: "90s"
  tasks_completed: 2
  files_modified: 4
  completed_date: "2026-03-22"
---

# Phase 03 Plan 01: Backend Import-Template Pipeline Summary

Backend pipeline for template import: mammoth .docx parsing, XLSX sheet extraction, AI fingerprint extraction endpoint, and frontend API client method.

## What Was Built

### Task 1: Server-side parsing and AI fingerprint endpoint

- Installed **mammoth 1.12.0** (`npm install mammoth`) — the de-facto .docx → HTML library
- Added `import mammoth from "mammoth"` (ESM default import of CJS package) to server/index.js
- Created `uploadTemplate` multer instance reusing existing `storage`, accepting `.xlsx/.xls/.docx/.doc` via both mimetype and extension check (handles browser MIME variation)
- Added three helper functions:
  - `parseDocxTemplate(filePath)` — reads buffer, calls `mammoth.convertToHtml`, truncates to 8000 chars (3000 in local AI mode), logs warnings
  - `parseXlsxTemplate(filePath)` — reads buffer via XLSX.read, maps SheetNames to `{ name, headers, sampleRows }`, filters empty-header sheets
  - `buildFingerprintPrompt(templateContent)` — returns structured AI prompt for JSON fingerprint extraction with instruction to preserve original field label names
- Added `POST /api/w/:slug/reports/import-template` endpoint in `// ── TEMPLATE IMPORT ──` section:
  - Returns 400 if no file
  - Dispatches to parseDocxTemplate or parseXlsxTemplate by extension
  - Calls `aiComplete("", buildFingerprintPrompt(templateContent), { maxTokens: 2000 })`
  - Strips markdown fences from AI response (same pattern as generate-report)
  - Queries workspace `uploaded_files` for column deduplication
  - Returns `{ fingerprint, availableColumns }`
  - try/catch with `[POST import-template]` prefix logging

### Task 2: Frontend API client method

- Added `importTemplate(file)` method to `createWorkspaceApi(slug)` factory (after `restoreReport`)
- Uses `FormData` with `append("file", file)` — same pattern as `uploadFiles`
- Throws `Error` with extracted message on non-OK response (wizard can catch and display)
- Returns `{ fingerprint, availableColumns }` on success

## Verification Results

All acceptance criteria passed:
- mammoth installed and importable: `mammoth.convertToHtml` is a function
- `import mammoth` in server/index.js: 1 match
- `uploadTemplate` declarations + usage: 2 matches
- `parseDocxTemplate` declarations + calls: 3 matches
- `parseXlsxTemplate` declarations + calls: 2 matches
- `buildFingerprintPrompt` declarations + calls: 2 matches
- `import-template` endpoint: 2 matches (route + error log)
- Helper/multer function total matches: 9 (>= 8 required)
- Server syntax check: PASSED (`node --check index.js`)
- `importTemplate` in api.js: 1 match
- `import-template` URL in api.js: 1 match
- FormData usage count: 2 (uploadFiles + importTemplate)

## Deviations from Plan

None — plan executed exactly as written.

The RESEARCH.md provided complete, ready-to-use code patterns for all helpers and the endpoint. Implementation followed RESEARCH.md Code Examples section verbatim with no surprises.

## Self-Check: PASSED

All files verified present. Both task commits (109d13b, 54f60d2) confirmed in git history.
