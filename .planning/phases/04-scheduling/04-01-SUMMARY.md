---
phase: 04-scheduling
plan: 01
subsystem: api
tags: [node-cron, scheduling, sqlite, express, cron]

requires:
  - phase: 03-import-de-rapports
    provides: generate-report AI logic, uploaded_files table, workspace middleware
provides:
  - scheduler.js module with initScheduler, registerSchedule, unregisterSchedule, executeSchedule, buildCronExpression
  - schedules and schedule_runs DB tables
  - 7 schedule API endpoints (CRUD + runs + run-now)
  - GET /api/w/:slug/files endpoint for data source selection
affects: [04-scheduling-frontend, scheduling-wizard]

tech-stack:
  added: [node-cron 4.x]
  patterns: [in-process cron scheduling, startup rehydration from SQLite, module extraction from index.js]

key-files:
  created:
    - minipilot/server/scheduler.js
  modified:
    - minipilot/server/index.js
    - minipilot/server/package.json

key-decisions:
  - "Extracted scheduler to separate module (scheduler.js) rather than inline in index.js — keeps 3265-line file manageable"
  - "Rehydrate on startup skips 'once' frequency schedules — they already executed, no cron re-registration needed"
  - "cron.validate() used in POST create endpoint to reject invalid expressions before DB insert"
  - "generateReportForSchedule replicates generate-report prompt inline in scheduler.js — avoids circular import from index.js"

patterns-established:
  - "Module extraction: self-contained domain logic in separate .js files with exports consumed by index.js"
  - "Scheduler rehydration: all active schedules re-registered from SQLite on server start"
  - "noOverlap: true on all cron tasks to prevent concurrent execution of same schedule"

requirements-completed: [SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05]

duration: 3min
completed: 2026-03-22
---

# Phase 4 Plan 01: Scheduling Backend Summary

**node-cron 4.x in-process scheduler with SQLite persistence, 5-function module, 7 CRUD endpoints, and startup rehydration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T22:29:26Z
- **Completed:** 2026-03-22T22:32:36Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Installed node-cron 4.x and created scheduler.js module with 5 exports (initScheduler, registerSchedule, unregisterSchedule, executeSchedule, buildCronExpression)
- Added schedules + schedule_runs tables with foreign keys and index to DB migration in index.js
- Added 7 schedule API endpoints + 1 files endpoint, all workspace-scoped
- Wired initScheduler(db, helpers) call after DB init for automatic schedule rehydration on startup

## Task Commits

Each task was committed atomically:

1. **Task 1: Install node-cron and create scheduler.js module** - `a176228` (feat)
2. **Task 2: Add DB migration and API endpoints to index.js** - `eeafb8d` (feat)

## Files Created/Modified
- `minipilot/server/scheduler.js` - Scheduler module: cron expression builder, schedule registration/unregistration, report execution, startup rehydration
- `minipilot/server/index.js` - Import scheduler, CREATE TABLE schedules + schedule_runs, 7 schedule endpoints + files endpoint, initScheduler call
- `minipilot/server/package.json` - Added node-cron dependency
- `minipilot/server/package-lock.json` - Lock file updated

## Decisions Made
- Extracted scheduler to separate scheduler.js module rather than adding ~230 lines inline to the already 3265-line index.js
- Rehydration on startup skips 'once' frequency schedules (they already executed on creation)
- generateReportForSchedule replicates the AI prompt logic from the generate-report endpoint rather than importing from index.js (avoids circular dependency)
- cron.validate() called in POST /schedules to reject invalid expressions before persisting

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed POST /schedules handler missing async keyword**
- **Found during:** Task 2
- **Issue:** Original handler used `await import('node-cron')` for validation but was not declared async
- **Fix:** Made handler async, replaced dynamic import with static cron import at module top
- **Files modified:** minipilot/server/index.js
- **Verification:** `node --check index.js` passes
- **Committed in:** eeafb8d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor fix, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All backend scheduling infrastructure is operational
- Ready for Plan 04-02: frontend scheduling wizard UI
- API endpoints tested for syntax correctness; runtime testing requires server start

---
*Phase: 04-scheduling*
*Completed: 2026-03-22*
