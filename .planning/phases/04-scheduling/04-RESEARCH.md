# Phase 4: Scheduling - Research

**Researched:** 2026-03-22
**Domain:** In-process cron scheduling + SQLite persistence + React scheduling UI
**Confidence:** HIGH

## Summary

Phase 4 adds recurring report generation to Minipilot. The core challenge is the single-process Node.js constraint: there are no background workers, no Redis, no job queue. The correct approach is node-cron running in the Express process, with all schedule configuration stored in SQLite. On server start, all active schedules are rehydrated from the DB and re-registered with node-cron. Each scheduled execution reuses the existing `generate-report` AI logic (already workspace-aware) and creates a new report edition with a numbered suffix.

The data source refresh for SCHED-03 reuses the existing file-to-clean_data pipeline (the `transform` endpoint already exists per workspace). SCHED-03 means the user pins an uploaded file ID (or a folder path pattern) as the "data source" for the schedule; on each run, that file is re-parsed and re-transformed before generation.

The UI is a multi-step scheduling wizard consistent with the import wizard pattern already established in Phase 3 (integer step state in a single component).

**Primary recommendation:** Use node-cron 4.x for in-process scheduling, SQLite for persistence, rehydrate on startup, reuse existing generate-report logic for each run.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHED-01 | User can schedule report generation with frequency (once, daily, weekly, monthly) | node-cron cron expressions map directly: once (immediate one-shot), daily (`0 H * * *`), weekly (`0 H * * D`), monthly (`0 H DOM * *`) |
| SCHED-02 | User can configure schedule details (time, day of week, day of month, end date) | TaskOptions supports timezone; end date enforced via maxExecutions=1 (once) or DB-stored end_date checked at runtime |
| SCHED-03 | User can select a data source folder/file for automatic data refresh | Existing `uploaded_files` table + transform pipeline reusable; schedule stores a `source_file_id` foreign key; each run re-runs the transform |
| SCHED-04 | Each scheduled execution creates a numbered edition of the report | New `schedule_runs` table tracks edition number; report title gets " #N" suffix; stored as a new report row |
| SCHED-05 | User can choose an existing report or describe a new one for scheduled generation | If existing: store `report_id` as template; if new: store `suggestion` JSON; both feed into `generate-report` logic |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-cron | 4.2.1 (latest as of 2026-03-22) | In-process cron scheduler | Lightest fit for single-process Express; pure JS, no native deps, ESM-native in v4 |
| better-sqlite3 | 11.x (already installed) | Persist schedule config + run history | Already the DB layer; synchronous API fits cron task callbacks |
| React + existing UI patterns | 19.x (already installed) | Scheduling wizard UI | Consistent with Phase 3 import wizard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | 10.x (already installed) | Generate schedule/run IDs | Already used project-wide |
| lucide-react | 0.577.x (already installed) | Clock, Calendar icons in UI | Already used project-wide |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-cron | node-schedule | node-schedule is date-aware (no cron syntax needed), but node-cron is lighter and cron syntax maps cleanly to the 4 frequencies required |
| node-cron | setInterval | setInterval loses drift over long periods; no timezone support; node-cron handles this correctly |
| node-cron | BullMQ/Inngest | BullMQ requires Redis; Inngest requires cloud connectivity — incompatible with local-first / data-sovereignty constraint |
| SQLite persistence | In-memory only | Schedules would not survive server restart — unacceptable for production use |

**Installation:**
```bash
cd /Users/paulduchateau/projects/litechange/minipilot/server
npm install node-cron
```

**Version verification:** Confirmed 4.2.1 via `npm view node-cron version` on 2026-03-22 (published 2025-07-10).

---

## Architecture Patterns

### Recommended Data Model

Two new SQLite tables:

```sql
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  frequency TEXT NOT NULL,         -- 'once' | 'daily' | 'weekly' | 'monthly'
  cron_expression TEXT NOT NULL,   -- computed from frequency + time params
  hour INTEGER NOT NULL DEFAULT 8,
  minute INTEGER NOT NULL DEFAULT 0,
  day_of_week INTEGER,             -- 0-6, null unless weekly
  day_of_month INTEGER,            -- 1-31, null unless monthly
  end_date TEXT,                   -- ISO date string, null = no end
  source_file_id TEXT REFERENCES uploaded_files(id),
  template_report_id TEXT,         -- existing report to use as template (nullable)
  suggestion TEXT,                 -- JSON, for new reports (nullable)
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'paused' | 'completed' | 'error'
  edition_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TEXT,
  next_run_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedule_runs (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  edition_number INTEGER NOT NULL,
  report_id TEXT REFERENCES reports(id),
  status TEXT NOT NULL,           -- 'success' | 'error'
  error TEXT,
  ran_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_runs_schedule_id ON schedule_runs(schedule_id);
```

### Cron Expression Mapping

| Frequency | Params | Cron Expression |
|-----------|--------|----------------|
| once | immediate | N/A — execute once then set status='completed' |
| daily | hour, minute | `${minute} ${hour} * * *` |
| weekly | hour, minute, day_of_week | `${minute} ${hour} * * ${day_of_week}` |
| monthly | hour, minute, day_of_month | `${minute} ${hour} ${day_of_month} * *` |

### Recommended Project Structure (server additions)

No new files required — add to existing index.js in clearly delimited sections:

```
server/index.js
├── [existing DB schema] → add schedules + schedule_runs tables
├── [new section] ── SCHEDULER INIT ── rehydrate on startup
├── [new section] ── SCHEDULE API endpoints (CRUD)
└── [new section] ── SCHEDULE RUN LOGIC (executeSchedule helper)
```

Given the server is 3265 lines, consider extracting to `server/scheduler.js` (module export) during this phase to avoid making index.js unmanageable. The existing phase precedent is to work within index.js for small additions, but scheduling adds ~200+ lines of logic.

### Pattern 1: Startup Rehydration

All schedules must be re-registered with node-cron when the server starts, because node-cron tasks live in memory only.

```javascript
// Source: node-cron v4 official docs + verified via npm package inspection
import cron from 'node-cron';

// Map of scheduleId → ScheduledTask (in-memory registry)
const activeTasks = new Map();

function buildCronExpression(schedule) {
  const { frequency, minute, hour, day_of_week, day_of_month } = schedule;
  if (frequency === 'daily')   return `${minute} ${hour} * * *`;
  if (frequency === 'weekly')  return `${minute} ${hour} * * ${day_of_week}`;
  if (frequency === 'monthly') return `${minute} ${hour} ${day_of_month} * *`;
  return null; // 'once' handled separately
}

function registerSchedule(schedule) {
  const expr = buildCronExpression(schedule);
  if (!expr) return; // 'once' already ran or runs immediately

  const task = cron.schedule(expr, () => executeSchedule(schedule.id), {
    timezone: 'Europe/Paris',
    name: schedule.id,
  });
  activeTasks.set(schedule.id, task);
}

// On startup: rehydrate all active schedules
{
  const active = db.prepare(
    "SELECT * FROM schedules WHERE status = 'active'"
  ).all();
  for (const s of active) {
    // Check end_date before registering
    if (s.end_date && new Date(s.end_date) < new Date()) {
      db.prepare("UPDATE schedules SET status = 'completed' WHERE id = ?").run(s.id);
      continue;
    }
    registerSchedule(s);
  }
  console.log(`Scheduler: ${active.length} schedule(s) rehydrated`);
}
```

### Pattern 2: executeSchedule Helper

```javascript
async function executeSchedule(scheduleId) {
  const schedule = db.prepare("SELECT * FROM schedules WHERE id = ?").get(scheduleId);
  if (!schedule || schedule.status !== 'active') return;

  // Check end_date
  if (schedule.end_date && new Date(schedule.end_date) < new Date()) {
    db.prepare("UPDATE schedules SET status = 'completed' WHERE id = ?").run(scheduleId);
    const task = activeTasks.get(scheduleId);
    if (task) { task.stop(); activeTasks.delete(scheduleId); }
    return;
  }

  const runId = uuidv4();
  const editionNum = schedule.edition_count + 1;

  try {
    // 1. Refresh data if source_file_id is set
    if (schedule.source_file_id) {
      await refreshDataSource(schedule.workspace_id, schedule.source_file_id);
    }

    // 2. Build suggestion (from template report or stored suggestion JSON)
    let suggestion;
    if (schedule.template_report_id) {
      const templateReport = db.prepare("SELECT * FROM reports WHERE id = ?")
        .get(schedule.template_report_id);
      if (templateReport) {
        suggestion = {
          title: templateReport.title,
          description: templateReport.objective || '',
          type: 'bar',
          columns: [],
          kpis: [],
        };
      }
    } else if (schedule.suggestion) {
      suggestion = JSON.parse(schedule.suggestion);
    }

    if (!suggestion) throw new Error('No suggestion or template configured');

    // 3. Generate the report (reuse existing logic inline)
    const report = await generateReportForSchedule(schedule.workspace_id, suggestion, editionNum);

    // 4. Record run
    db.prepare(`
      INSERT INTO schedule_runs (id, schedule_id, edition_number, report_id, status)
      VALUES (?, ?, ?, ?, 'success')
    `).run(runId, scheduleId, editionNum, report.id);

    db.prepare(`
      UPDATE schedules SET edition_count = ?, last_run_at = datetime('now'), status = ?
      WHERE id = ?
    `).run(editionNum, schedule.frequency === 'once' ? 'completed' : 'active', scheduleId);

    // If 'once', stop the task
    if (schedule.frequency === 'once') {
      const task = activeTasks.get(scheduleId);
      if (task) { task.stop(); activeTasks.delete(scheduleId); }
    }

  } catch (err) {
    db.prepare(`
      INSERT INTO schedule_runs (id, schedule_id, edition_number, report_id, status, error)
      VALUES (?, ?, ?, NULL, 'error', ?)
    `).run(runId, scheduleId, editionNum, err.message);
    db.prepare("UPDATE schedules SET status = 'error' WHERE id = ?").run(scheduleId);
    console.error(`[Schedule ${scheduleId}] Run failed:`, err);
  }
}
```

### Pattern 3: node-cron v4 Task Management

```javascript
// Start a previously stopped task
activeTasks.get(scheduleId)?.start();

// Stop (pause) without destroying — task can be restarted
activeTasks.get(scheduleId)?.stop();

// Validate a cron expression before saving
import cron from 'node-cron';
const valid = cron.validate('0 8 * * 1'); // true

// Get next run time (v4 feature)
const task = activeTasks.get(scheduleId);
const nextRun = task?.getNextRun(); // Date object
```

**IMPORTANT — v4 breaking change:** `scheduled` and `runOnInit` options are removed in v4. Tasks start immediately by default. To create a stopped task, use `cron.createTask()` instead of `cron.schedule()`.

**IMPORTANT — `destroy()` in v3/v4:** `task.destroy()` does NOT exist in v3+. Use `task.stop()` then remove from Map. In v4, confirmed: stop() + delete from Map is the correct teardown pattern.

### Pattern 4: Frontend Scheduling Wizard

Follows the Phase 3 import wizard pattern — integer step state (1/2/3) in a single component.

```
Step 1: Choose template
  - Radio: "Existing report" (dropdown) vs "New report" (text description)
Step 2: Configure schedule
  - Frequency selector: once / daily / weekly / monthly
  - Time picker (hour:minute)
  - Conditional: day of week (if weekly), day of month (if monthly)
  - End date (optional date input)
Step 3: Configure data source
  - File selector from workspace uploaded_files
  - Option: "Use current workspace data (no refresh)"
Step 4: Confirm + Create
  - Summary card, Create button
```

### Pattern 5: API Endpoints Required

```
GET    /api/w/:slug/schedules              — list schedules
POST   /api/w/:slug/schedules              — create schedule
GET    /api/w/:slug/schedules/:id          — get one schedule + runs
PATCH  /api/w/:slug/schedules/:id          — update (pause/resume)
DELETE /api/w/:slug/schedules/:id          — delete + stop task
GET    /api/w/:slug/schedules/:id/runs     — list run history
POST   /api/w/:slug/schedules/:id/run-now — manual trigger
```

### Anti-Patterns to Avoid

- **Storing cron tasks in the DB:** Cron expressions belong in the DB; cron task handles (ScheduledTask objects) stay in the in-memory Map only.
- **Blocking the event loop in cron callback:** The `executeSchedule` function is async — always `await` it inside the cron callback with a try/catch.
- **Recreating all tasks on every schedule CRUD operation:** Only register/deregister the affected task, not all tasks.
- **Using `frequency === 'once'` with a cron expression:** "Once" means execute immediately (or at a specific datetime), then mark completed — not a recurring cron.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron expression parsing | Custom interval calculator | node-cron | DST handling, month-length edge cases, leap years |
| Cron expression validation | Custom regex | `cron.validate()` from node-cron | Already handles all valid cron syntax |
| Timezone-aware scheduling | Manual UTC offset math | node-cron `timezone` option | DST transitions handled automatically |
| Task persistence | Writing cron state to file | SQLite schedules table (existing DB) | Atomic writes, queryable, consistent with rest of app |

**Key insight:** The data refresh logic already exists in the transform pipeline. The schedule executor is a thin orchestration layer that calls existing helpers, not new data processing code.

---

## Common Pitfalls

### Pitfall 1: Lost Tasks on Server Restart
**What goes wrong:** node-cron tasks are in-process. If the server restarts (crash, deploy, nodemon reload), all registered cron tasks disappear. Reports stop being generated silently.
**Why it happens:** In-memory scheduler with no persistence layer for the task handles.
**How to avoid:** Startup rehydration block (Pattern 1 above) that reads all `status='active'` schedules from SQLite and re-registers them.
**Warning signs:** Schedules marked active in DB but no reports being generated after a server restart.

### Pitfall 2: "Once" Frequency Executed Repeatedly
**What goes wrong:** If `frequency === 'once'` is registered as a repeating cron job, it will fire every matching interval indefinitely.
**Why it happens:** Confusion between "run once immediately" and "schedule at a specific future time."
**How to avoid:** For `frequency === 'once'`, do NOT call `cron.schedule()`. Instead, call `executeSchedule()` directly (synchronous-looking but async), then mark status='completed'. Alternatively, use `maxExecutions: 1` option in node-cron v4.

### Pitfall 3: End Date Not Enforced
**What goes wrong:** Schedule keeps running past its configured end date.
**Why it happens:** Cron expressions don't support end dates natively.
**How to avoid:** Check `end_date` at the start of each `executeSchedule()` call. Stop and complete the task if past end date.

### Pitfall 4: Report Edition Collision
**What goes wrong:** Two concurrent schedule runs (if execution takes longer than the cron interval) create duplicate editions.
**Why it happens:** node-cron does not prevent overlapping executions by default in v3; in v4 use `noOverlap: true`.
**How to avoid:** Use `noOverlap: true` in TaskOptions (v4 feature). This skips the run if the previous one is still executing.

```javascript
const task = cron.schedule(expr, async () => {
  await executeSchedule(scheduleId);
}, {
  timezone: 'Europe/Paris',
  noOverlap: true,
  name: scheduleId,
});
```

### Pitfall 5: Data Refresh Leaves Stale Clean Data
**What goes wrong:** Re-uploading a file and running transform appends rows to clean_data instead of replacing them, causing duplicated data in AI prompts.
**Why it happens:** The existing transform endpoint appends to clean_data without clearing old entries for the same source file.
**How to avoid:** In `refreshDataSource()`, DELETE existing clean_data rows WHERE source_file_id matches before re-parsing and re-inserting. Verify the existing transform logic to confirm this is not already handled.

### Pitfall 6: AI Timeout in Cron Callback
**What goes wrong:** Claude/Mistral API takes 30-60 seconds; if the cron interval is shorter, tasks pile up.
**Why it happens:** No overlap protection + slow AI response.
**How to avoid:** `noOverlap: true` (see Pitfall 4). Also set reasonable minimum intervals in the UI (no less than hourly for daily/weekly/monthly cadences is already the spec).

---

## Code Examples

Verified patterns from node-cron v4 (confirmed via npm package inspection and GitHub source):

### ESM Import (matches server's "type": "module")
```javascript
import cron from 'node-cron';
```

### Schedule with timezone and noOverlap
```javascript
// Source: node-cron v4 TaskOptions interface (verified via npm package source)
const task = cron.schedule('0 8 * * 1', async () => {
  await executeSchedule(scheduleId);
}, {
  timezone: 'Europe/Paris',
  noOverlap: true,
  name: scheduleId,       // used for getTasks() lookup
});
```

### Validate before save
```javascript
// Source: node-cron v4 exports (cron.validate confirmed in node-cron.ts)
const isValid = cron.validate('0 8 * * 1'); // true
const isBad   = cron.validate('99 8 * * 1'); // false
```

### Stop and remove a task
```javascript
// Note: destroy() does NOT exist in v3/v4 — use stop() + delete from Map
const task = activeTasks.get(scheduleId);
if (task) {
  task.stop();
  activeTasks.delete(scheduleId);
}
db.prepare("UPDATE schedules SET status = 'paused' WHERE id = ?").run(scheduleId);
```

### Get next run time (v4 feature)
```javascript
const task = activeTasks.get(scheduleId);
const nextRun = task?.getNextRun(); // Returns Date object or null
```

### Frontend: Frequency to Cron Label Mapping
```jsx
// Display human-readable next run — compute on frontend from schedule config
function describeSchedule(schedule) {
  const pad = n => String(n).padStart(2, '0');
  const time = `${pad(schedule.hour)}h${pad(schedule.minute)}`;
  if (schedule.frequency === 'daily')   return `Tous les jours à ${time}`;
  if (schedule.frequency === 'weekly')  return `Chaque semaine (${DAYS_FR[schedule.day_of_week]}) à ${time}`;
  if (schedule.frequency === 'monthly') return `Chaque mois le ${schedule.day_of_month} à ${time}`;
  if (schedule.frequency === 'once')    return 'Une seule fois (immédiatement)';
  return schedule.frequency;
}

const DAYS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| node-cron v3 `scheduled: false` option | v4 removed `scheduled`; use `createTask()` instead | v4.0.0 (2025-05-10) | Must NOT use `scheduled: false` in new code |
| node-cron v3 `runOnInit` option | v4 removed `runOnInit` | v4.0.0 (2025-05-10) | Immediate execution: call `task.execute()` after scheduling |
| `task.destroy()` | Does not exist in v3+; use `task.stop()` | v3.0.0 (2021) | Any `.destroy()` call will throw TypeError |

**Deprecated/outdated:**
- `scheduled: false` option: removed in v4 — causes silent failure or error
- `runOnInit: true` option: removed in v4
- `task.destroy()`: removed in v3, still removed in v4 — use `stop()` + Map.delete()

---

## Open Questions

1. **Data source refresh granularity**
   - What we know: The transform pipeline (`/api/w/:slug/transform`) clears and rebuilds clean_data from all uploaded files in the workspace.
   - What's unclear: SCHED-03 says "select a data source folder/file" — does refreshing one file mean re-running transform for just that file, or the whole workspace? The current transform endpoint processes all workspace files.
   - Recommendation: For simplicity, re-run the full workspace transform (not file-scoped). Store `source_file_id` for display only (to show the user what data the schedule monitors). Revisit file-scoped refresh in v2.

2. **"Once" timing — immediate vs. scheduled future datetime**
   - What we know: SCHED-01 says "once" is a frequency option; SCHED-02 says time/date are configurable.
   - What's unclear: Should "once" mean "execute right now" or "execute at a specific future date+time"?
   - Recommendation: Implement as "execute right now on create" for v1.1 (simplest, avoids one-shot future scheduling complexity). If users need future scheduling, defer to v2.

3. **Modularizing index.js**
   - What we know: index.js is 3265 lines; STATE.md flagged this as a concern.
   - What's unclear: The team has accepted working in index.js through Phase 3. Adding ~200-300 lines for scheduling may push it to ~3500.
   - Recommendation: Extract scheduler to `server/scheduler.js` (module) in Plan 04-01 as a separate task. This is the natural time to do it since scheduling is a self-contained domain.

---

## Validation Architecture

nyquist_validation key is absent from `.planning/config.json` — treating as enabled.

### Test Framework

No test infrastructure currently exists in this project. Minipilot has no test config, no test directory, and no test scripts in package.json (server or app). Scheduling logic is critical enough to warrant at least smoke tests.

| Property | Value |
|----------|-------|
| Framework | None detected — Wave 0 must install |
| Config file | None — Wave 0 creates |
| Quick run command | `node --test server/tests/schedule.test.js` (Node built-in test runner, no install) |
| Full suite command | `node --test server/tests/*.test.js` |

Using Node.js built-in `node:test` module (available since Node 18, stable in Node 20+) avoids adding dependencies.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHED-01 | `buildCronExpression()` returns correct expression for each frequency | unit | `node --test server/tests/schedule.test.js` | ❌ Wave 0 |
| SCHED-02 | Schedule with end_date in the past is skipped at execution time | unit | `node --test server/tests/schedule.test.js` | ❌ Wave 0 |
| SCHED-03 | `refreshDataSource()` clears old clean_data and repopulates | unit | `node --test server/tests/schedule.test.js` | ❌ Wave 0 |
| SCHED-04 | edition_count increments on each successful run | unit | `node --test server/tests/schedule.test.js` | ❌ Wave 0 |
| SCHED-05 | Suggestion JSON and template_report_id produce valid generate-report payload | unit | `node --test server/tests/schedule.test.js` | ❌ Wave 0 |

Full UI scheduling wizard flows are manual-only (no E2E framework installed).

### Sampling Rate
- **Per task commit:** `node --test server/tests/schedule.test.js`
- **Per wave merge:** `node --test server/tests/*.test.js`
- **Phase gate:** All unit tests green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `server/tests/schedule.test.js` — covers SCHED-01 through SCHED-05 (helper function tests using in-memory DB)
- [ ] Node built-in test runner requires Node 18+ — verify with `node --version` before writing tests

---

## Sources

### Primary (HIGH confidence)
- `npm view node-cron` — version 4.2.1 confirmed, published 2025-07-10; ESM export structure confirmed
- node-cron GitHub source (`src/node-cron.ts`, `src/tasks/scheduled-task.ts`) — schedule(), TaskOptions, ScheduledTask methods
- Existing `server/index.js` (lines 645-698, 2465-2559, 2964-3044) — generate-report and iterate logic reviewed directly
- Existing `server/package.json` — confirmed dependency set

### Secondary (MEDIUM confidence)
- node-cron GitHub issue #288 — confirmed `task.destroy()` removed in v3+
- WebSearch result: node-cron v4 breaking changes (`scheduled`, `runOnInit` removed; `noOverlap`, `maxExecutions`, `name` added) — verified consistent with npm package exports

### Tertiary (LOW confidence)
- pkgpulse.com comparison article (2026) — general guidance on in-process vs. external schedulers for persistence; consistent with official docs position

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — node-cron 4.2.1 confirmed via npm registry; all other deps pre-installed
- Architecture: HIGH — cron expression mapping, rehydration pattern, and data model are straightforward given existing code
- Pitfalls: HIGH — destroy() removal verified via GitHub issue; noOverlap confirmed in v4 API; end_date enforcement is a standard cron limitation
- v4 breaking changes: MEDIUM — confirmed from multiple sources, but nodecron.com docs site was unreachable; GitHub source inspection supports the findings

**Research date:** 2026-03-22
**Valid until:** 2026-06-22 (node-cron v4 is stable; unlikely to change in 90 days)
