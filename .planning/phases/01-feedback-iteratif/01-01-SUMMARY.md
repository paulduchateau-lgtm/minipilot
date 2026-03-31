---
phase: 01-feedback-iteratif
plan: 01
subsystem: api
tags: [sqlite, better-sqlite3, express, report-versioning, ai-regeneration]

# Dependency graph
requires: []
provides:
  - report_versions SQLite table with full snapshot storage and idx_rv_report_id index
  - current_version column on reports table via migration
  - POST /api/w/:slug/reports/:id/iterate — AI-driven report regeneration with feedback
  - GET /api/w/:slug/reports/:id/versions — ordered version history list
  - GET /api/w/:slug/reports/:id/versions/:vnum — single version snapshot retrieval
  - iterateReport, getReportVersions, getReportVersion frontend API client methods
affects: [01-02, 01-03, feedback-ui, version-comparison]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "db.transaction() for atomic version insert + reports update (prevents duplicate version_num race condition)"
    - "Lazy v1 baseline: first iterate call auto-creates snapshot before generating v2"
    - "aiMode guard: maxTokens 2000 for local Ollama, 4000 for premium Claude"
    - "extractReportFromResponse reused for iterate response parsing"

key-files:
  created: []
  modified:
    - minipilot/server/index.js
    - minipilot/app/src/lib/api.js

key-decisions:
  - "Store full JSON snapshots in report_versions (not diffs) — simpler, dependency-free, trivially queryable"
  - "Lazy v1 baseline on first iterate call — no backfill migration needed for existing reports"
  - "aiMode === local reduces maxTokens to 2000 to respect Ministral 3B context limits"
  - "Return currentVersion in both deserializeReport and iterate response for frontend consistency"

patterns-established:
  - "Version number atomicity: db.transaction() wrapping MAX(version_num)+1 + INSERT + UPDATE reports"
  - "Baseline snapshot: check versionCount === 0 before iterate, insert v1 if missing"

requirements-completed: [FEED-01, FEED-03, FEED-04]

# Metrics
duration: 8min
completed: 2026-03-22
---

# Phase 01 Plan 01: Backend Versioning Foundation Summary

**report_versions SQLite table + three API endpoints (iterate, versions list, single version) + three frontend api.js client methods for AI-driven iterative report improvement**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-22T20:16:00Z
- **Completed:** 2026-03-22T20:24:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `report_versions` table with full JSON snapshots, `idx_rv_report_id` index, and `current_version` migration to `reports`
- Implemented POST `/api/w/:slug/reports/:id/iterate` — accepts global + section feedback, calls `aiComplete`, stores v1 baseline lazily, atomically inserts new version and updates live report row
- Added GET versions list and single version snapshot endpoints
- Wired `iterateReport`, `getReportVersions`, `getReportVersion` methods into `createWorkspaceApi` factory in api.js

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and API endpoints for versioning and iteration** - `b14f95e` (feat)
2. **Task 2: Frontend API client methods for iterate and versions** - `48d0bd9` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `minipilot/server/index.js` - Added report_versions DDL, current_version migration, deserializeReport update, three new API endpoints
- `minipilot/app/src/lib/api.js` - Added iterateReport, getReportVersions, getReportVersion methods to createWorkspaceApi

## Decisions Made

- Used full JSON snapshots over RFC 6902 patches — no additional dependencies, trivially renderable in comparison view
- Lazy baseline creation (v1 on first iterate call) rather than modifying generate-report endpoint — avoids backfill migration for existing reports
- `aiMode === "local"` reduces `maxTokens` to 2000 — Ministral 3B context limit protection
- Reused `extractReportFromResponse` for iterate parsing — consistent with existing generate-report endpoint

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three backend endpoints are live and callable from the browser
- `report_versions` table is created on server start
- Frontend `createWorkspaceApi` exposes all methods needed by feedback panel and version comparison UI
- Ready for Plan 02 (feedback panel UI) and Plan 03 (version comparison view)

---
*Phase: 01-feedback-iteratif*
*Completed: 2026-03-22*
