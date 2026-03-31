# Phase 1: Feedback Itératif — Research

**Researched:** 2026-03-22
**Domain:** Report versioning, section-level annotations, AI-driven re-generation, diff/comparison UI
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FEED-01 | User can provide global feedback on a report explaining what works and what doesn't | AI re-generation endpoint with global `feedback` string; no new DB schema needed beyond version table |
| FEED-02 | User can annotate individual sections with feedback | Section-level feedback stored as metadata alongside section index; UI overlay on each RenderSection card |
| FEED-03 | AI regenerates improved report content based on user feedback | New `/api/w/:slug/reports/:id/iterate` POST endpoint; reuses existing `aiComplete` pattern and JSON report format |
| FEED-04 | System keeps a history of report iterations (versions) | New `report_versions` table: `(id, report_id, version_num, snapshot TEXT, feedback TEXT, section_feedback TEXT, created_at)` |
| FEED-05 | User can compare previous and current versions side by side | Split-pane component in frontend using existing `FullReport`/`RenderSection` with visual diff badges |
</phase_requirements>

---

## Summary

Phase 1 adds an iterative feedback loop on top of the existing report system. The current architecture already supports everything needed: reports are JSON blobs stored in SQLite, AI generation works through a single `aiComplete` function, and the frontend renders sections through a reusable `RenderSection` component.

The central design choice is where to store version history. The cleanest approach is a dedicated `report_versions` table that stores a full JSON snapshot of the report at each iteration, plus the feedback that drove the change. This avoids mutating the live `reports` row and keeps the history append-only. The `reports` table gains only two columns: `current_version` (integer) and a soft link to the latest version.

The AI re-generation flow reuses the existing `generate-report` prompt structure. The feedback (global + per-section) is injected as an additional constraint block in the prompt: "Here is the current report JSON, here is the user's feedback, produce an improved version." The AI returns the same JSON format, making the existing `extractReportFromResponse` parser reusable.

The comparison UI is a split-pane rendered inside the existing `FullReport` route — no new page or route needed. A version selector (dropdown or breadcrumb) lets the user pick "Version N vs. Version N+1" and a diff mode highlights what changed section by section.

**Primary recommendation:** Implement version history as a new `report_versions` table (full snapshots, not diffs). Reuse the existing AI completion pipeline for re-generation. Keep the comparison UI as an overlay inside the existing report view.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^11.0.0 | Version table DDL and queries | Already in project; synchronous API matches existing pattern |
| React 19 | ^19.2.4 | Comparison UI state | Already in project |
| Recharts | ^3.8.0 | Charts in both version panes | Already in project; `RenderSection` wraps it |
| Anthropic SDK | ^0.39.0 | AI re-generation call | Already in project; `aiComplete` abstraction covers all modes |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | ^10.0.0 | Version ID generation | Already imported as `uuidv4` in server |
| lucide-react | ^0.577.0 | Diff/annotation icons (MessageSquare, GitCompare, ChevronRight) | Already in project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Full JSON snapshots | JSON patch (RFC 6902) | Patches are cheaper to store but require a patch-apply library; full snapshots stay dependency-free and are trivially queryable |
| New `report_versions` table | Versioning column on `reports` table | Separate table is cleaner — no schema mutation to live `reports` row; easier pagination |
| In-memory diff | `diff` npm package | diff npm is useful for text; for structured JSON sections a manual field-by-field comparison is simpler and produces the UI output directly |

**Installation:** No new packages required. All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure

The server remains a single `index.js` file (consistent with existing pattern — no modularization required for this phase). New additions:

```
server/
└── index.js           # Add: report_versions DDL migration, POST iterate endpoint, GET versions endpoint

app/src/components/
├── FullReport.jsx     # Add: version selector bar, "Améliorer" feedback panel, comparison toggle
├── RenderSection.jsx  # Add: section annotation overlay (pencil icon + textarea per section)
└── ReportFeedbackPanel.jsx   # NEW: global feedback textarea + per-section feedback list
    ReportCompareView.jsx     # NEW: split-pane version comparison

app/src/lib/
└── api.js             # Add: iterateReport(), getReportVersions() workspace API methods
```

### Pattern 1: Version Table with Full Snapshots

**What:** Each iteration of a report is stored as a complete JSON snapshot in `report_versions`. The live `reports` row always reflects the latest iteration.

**When to use:** Whenever the user submits feedback and triggers AI re-generation.

**Database schema:**
```sql
-- Migration (try/catch style, consistent with existing migrations)
CREATE TABLE IF NOT EXISTS report_versions (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  version_num INTEGER NOT NULL,
  snapshot TEXT NOT NULL,          -- full report JSON (title, kpis, sections, etc.)
  feedback TEXT,                   -- global feedback text submitted by user
  section_feedback TEXT,           -- JSON: [{section_index, text}]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rv_report_id ON report_versions(report_id);
```

The `reports` table gets one migration-safe addition:
```sql
ALTER TABLE reports ADD COLUMN current_version INTEGER DEFAULT 1;
```

### Pattern 2: AI Re-generation Prompt

**What:** The iterate endpoint builds a prompt that includes the full current report JSON and all user feedback, then calls `aiComplete` (the existing abstraction that handles Claude/Mistral/Ollama).

**When to use:** `POST /api/w/:slug/reports/:id/iterate`

**Example prompt structure:**
```javascript
// Source: derived from existing generate-report endpoint pattern (server/index.js ~L1388)
const prompt = `Tu es un expert analytique. Voici un rapport existant au format JSON :

RAPPORT ACTUEL :
${JSON.stringify(currentReport, null, 2)}

FEEDBACK GLOBAL DE L'UTILISATEUR :
${globalFeedback || "Aucun feedback global."}

FEEDBACK PAR SECTION :
${sectionFeedbackText || "Aucun feedback par section."}

DONNÉES DISPONIBLES :
${dataText}

Génère une version améliorée du rapport en tenant compte de ce feedback.
Conserve la même structure JSON. Améliore uniquement ce qui est mentionné dans le feedback.
Réponds UNIQUEMENT avec le JSON valide du rapport amélioré, sans markdown.`;

const aiResult = await aiComplete("", prompt, { maxTokens: 4000 });
```

### Pattern 3: Feedback UI Overlay on Sections

**What:** Each `RenderSection` card gets an annotation trigger — a small icon button in the header that opens an inline textarea. Collected feedback is stored in React state as `{ [sectionIndex]: "feedback text" }` before submission.

**When to use:** FEED-02 — section-level annotation.

**Example:**
```jsx
// Inside RenderSection header, conditional on feedbackMode prop
{feedbackMode && (
  <button
    onClick={() => setAnnotating(!annotating)}
    style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
    title="Annoter cette section"
  >
    <MessageSquare size={14} color={sectionFeedback ? "var(--mp-accent)" : "var(--mp-text-muted)"} />
  </button>
)}
{annotating && (
  <textarea
    value={sectionFeedback}
    onChange={e => onSectionFeedback(sectionIndex, e.target.value)}
    placeholder="Que faut-il améliorer dans cette section ?"
    style={{ width: "100%", marginTop: 8, fontSize: 13, fontFamily: "var(--font-body)",
             background: "var(--mp-bg-elevated)", border: "1px solid var(--mp-border)",
             borderRadius: "var(--radius-sm)", padding: "8px 12px", color: "var(--mp-text)",
             resize: "vertical", minHeight: 72 }}
  />
)}
```

### Pattern 4: Version Comparison Split Pane

**What:** Two `FullReport` instances rendered side by side (or stacked on narrow viewports), with changed sections highlighted using a subtle colored left-border.

**When to use:** FEED-05 — side-by-side version diff.

**Diff detection approach:**
```javascript
// Compare sections by index. "Changed" = title differs OR sections.length differs
// OR insight differs OR data length differs. No deep equality needed for visual diff.
function detectChangedSections(versionA, versionB) {
  const sectA = versionA.sections || [];
  const sectB = versionB.sections || [];
  return sectB.map((s, i) => ({
    ...s,
    _changed: !sectA[i] || sectA[i].title !== s.title || sectA[i].insight !== s.insight,
    _new: !sectA[i],
  }));
}
```

### Anti-Patterns to Avoid

- **Mutating the live `reports` row in place** during iteration: the current content is overwritten without saving history. Always insert into `report_versions` before updating the live row.
- **Returning the full version list from GET /reports**: versions are on-demand, loaded only when the user opens the version panel. Don't bundle them with the reports list response.
- **Streaming AI output for iterate**: the current codebase uses non-streaming `aiComplete`. Keep it non-streaming — the full JSON response must be parsed atomically.
- **Storing diffs instead of snapshots**: a diff library adds complexity and makes the comparison view harder to render. Full snapshots are cheap at ~5–20 KB per report.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON diff for display | Custom recursive diff algorithm | Simple field-by-field comparison (title, insight, data.length) | Structural diff of recharts data is unreliable; visual "changed" badge is sufficient |
| Section annotation storage | Separate DB table per section | JSON column `section_feedback TEXT` in `report_versions` | Low cardinality — max ~10 sections per report, no need for a join table |
| AI prompt templating | Template engine (handlebars, etc.) | Template literal strings | Existing codebase uses template literals throughout; consistent |
| Version numbering | Timestamp-based versioning | Auto-incrementing integer (`MAX(version_num) + 1` per report) | Integer versions display cleanly in UI ("Version 1", "Version 2") |

**Key insight:** The entire iterative feedback system can be built by composing what already exists: the AI pipeline, the JSON report format, the section renderer, and SQLite. No new dependencies needed.

---

## Common Pitfalls

### Pitfall 1: Race Condition on Version Number
**What goes wrong:** Two concurrent requests on the same report both read `MAX(version_num) = 2` and both insert `version_num = 3`, violating uniqueness.
**Why it happens:** SQLite WAL mode allows concurrent reads; the read-increment-write is not atomic by default.
**How to avoid:** Wrap the version insert in a `db.transaction()` block. better-sqlite3 transactions are synchronous and provide isolation.
**Warning signs:** Duplicate version numbers in the table; INSERT constraint errors.

```javascript
const doIterate = db.transaction((reportId, snapshot, feedback, sectionFeedback) => {
  const maxVersion = db.prepare(
    "SELECT COALESCE(MAX(version_num), 0) AS v FROM report_versions WHERE report_id = ?"
  ).get(reportId).v;
  const nextVersion = maxVersion + 1;
  db.prepare(`
    INSERT INTO report_versions (id, report_id, version_num, snapshot, feedback, section_feedback)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), reportId, nextVersion, JSON.stringify(snapshot), feedback, JSON.stringify(sectionFeedback));
  db.prepare("UPDATE reports SET current_version = ? WHERE id = ?").run(nextVersion, reportId);
  return nextVersion;
});
```

### Pitfall 2: Large Context Window for Small Local Models
**What goes wrong:** When `aiMode === "local"` (Ollama/Ministral 3B), the iterate prompt includes the full current report JSON (~3–8 KB) plus data summary (~5 KB). Total prompt may exceed 2000 tokens, causing truncated or garbled output.
**Why it happens:** Ministral 3B has a much smaller effective context than Claude Sonnet.
**How to avoid:** In local mode, strip the `data_rows` sample from the iterate prompt and send only the report JSON + feedback. The AI has enough context from the existing report to improve it without raw data.
**Warning signs:** Truncated JSON response; partial sections in output; `aiMode === "local"` with large reports.

```javascript
const iterateMaxTokens = aiMode === "local" ? 2000 : 4000;
const dataContext = aiMode === "local" ? "" : `\nDONNÉES :\n${dataText}`;
```

### Pitfall 3: First-Version Snapshot Missing
**What goes wrong:** User generates a report, immediately clicks "Améliorer" — but no baseline version exists in `report_versions` to compare against.
**Why it happens:** The existing `generate-report` and `chat` endpoints do not write to `report_versions`.
**How to avoid:** On the first call to the iterate endpoint, check if `version_num = 0` snapshot exists. If not, write the current `reports` row as version 1 before generating version 2. Alternatively, write version 1 in the generate-report endpoint when first creating the report.
**Warning signs:** Comparison view shows "Version 1" as empty; no baseline for diff.

### Pitfall 4: Broken JSON from AI on Iterate
**What goes wrong:** The improved report JSON returned by the AI is malformed (missing closing brace, extra markdown, etc.), crashing the persist step.
**Why it happens:** The iterate prompt includes the original JSON as context — the AI sometimes echoes parts of it or adds extra text.
**How to avoid:** Reuse the existing `extractReportFromResponse` utility, which already handles markdown fences, `<REPORT_DATA>` tags, and bare JSON. Wrap the parse step in try/catch and return a 422 error with the raw AI text so the frontend can display a friendly message.

### Pitfall 5: Feedback Panel State Lost on Navigation
**What goes wrong:** User types section annotations, navigates away (e.g., to chat), returns — all feedback text is gone.
**Why it happens:** Feedback state lives in the `FullReport` or `WorkspaceShell` component and is reset on unmount.
**How to avoid:** Lift the `sectionFeedback` and `globalFeedback` state to `WorkspaceShell` or persist it in `sessionStorage` keyed by `reportId`. Since no auth system exists, `sessionStorage` is sufficient (survives navigation, clears on tab close).

---

## Code Examples

### New API Endpoint: POST iterate

```javascript
// Source: pattern derived from existing /api/w/:slug/ai/generate-report (server/index.js ~L1360)
app.post("/api/w/:slug/reports/:id/iterate", async (req, res) => {
  try {
    const { slug, id } = req.params;
    const ws = db.prepare("SELECT * FROM workspaces WHERE slug = ?").get(slug);
    if (!ws) return res.status(404).json({ error: "Workspace introuvable." });

    const { globalFeedback = "", sectionFeedback = [] } = req.body;
    const existing = db.prepare("SELECT * FROM reports WHERE id = ? AND workspace_id = ?").get(id, ws.id);
    if (!existing) return res.status(404).json({ error: "Rapport introuvable." });

    const currentReport = deserializeReport(existing);

    // Ensure baseline version exists
    const versionCount = db.prepare(
      "SELECT COUNT(*) AS cnt FROM report_versions WHERE report_id = ?"
    ).get(id).cnt;
    if (versionCount === 0) {
      db.prepare(`
        INSERT INTO report_versions (id, report_id, version_num, snapshot, feedback, section_feedback)
        VALUES (?, ?, 1, ?, NULL, NULL)
      `).run(uuidv4(), id, JSON.stringify(currentReport));
      db.prepare("UPDATE reports SET current_version = 1 WHERE id = ?").run(id);
    }

    const sectionFeedbackText = sectionFeedback
      .filter(sf => sf.text?.trim())
      .map(sf => `Section ${sf.index + 1} ("${currentReport.sections[sf.index]?.title || '?'}"): ${sf.text}`)
      .join("\n");

    const dataSummary = buildDataSummaryForWorkspace(ws.id, 10);
    const dataText = aiMode === "local" ? "" : dataSummary.map(t =>
      `Table "${t.name}" (${t.rowCount} lignes) : ${t.columns.map(c => c.name).join(", ")}`
    ).join("\n");

    const prompt = `Tu es un expert analytique. Voici un rapport existant :

RAPPORT ACTUEL (JSON) :
${JSON.stringify(currentReport, null, 2)}

FEEDBACK GLOBAL :
${globalFeedback || "Aucun feedback global."}

FEEDBACK PAR SECTION :
${sectionFeedbackText || "Aucun feedback par section."}
${dataText ? `\nDONNÉES DISPONIBLES :\n${dataText}` : ""}

Génère une version améliorée. Conserve la structure JSON exacte. Réponds UNIQUEMENT avec le JSON valide.`;

    const iterateMaxTokens = aiMode === "local" ? 2000 : 4000;
    const aiResult = await aiComplete("", prompt, { maxTokens: iterateMaxTokens });

    const extracted = extractReportFromResponse(aiResult.text.trim());
    if (!extracted) return res.status(422).json({ error: "L'IA n'a pas retourné un JSON valide.", raw: aiResult.text });

    const improved = { ...extracted.json, id: currentReport.id };

    const doIterate = db.transaction(() => {
      const maxV = db.prepare(
        "SELECT COALESCE(MAX(version_num), 1) AS v FROM report_versions WHERE report_id = ?"
      ).get(id).v;
      const nextV = maxV + 1;
      db.prepare(`
        INSERT INTO report_versions (id, report_id, version_num, snapshot, feedback, section_feedback)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), id, nextV, JSON.stringify(improved), globalFeedback, JSON.stringify(sectionFeedback));
      db.prepare(`
        UPDATE reports SET title=?, subtitle=?, objective=?, kpis=?, sections=?, current_version=?
        WHERE id=?
      `).run(
        improved.title, improved.subtitle || null, improved.objective || null,
        JSON.stringify(improved.kpis || []), JSON.stringify(improved.sections || []),
        nextV, id
      );
      return nextV;
    });

    const newVersion = doIterate();
    res.json({ report: { ...improved, current_version: newVersion }, version: newVersion });
  } catch (err) {
    console.error("[POST iterate]", err);
    res.status(500).json({ error: err.message });
  }
});
```

### New API Endpoint: GET report versions

```javascript
app.get("/api/w/:slug/reports/:id/versions", (req, res) => {
  try {
    const { slug, id } = req.params;
    const ws = db.prepare("SELECT * FROM workspaces WHERE slug = ?").get(slug);
    if (!ws) return res.status(404).json({ error: "Workspace introuvable." });

    const versions = db.prepare(`
      SELECT id, report_id, version_num, feedback, section_feedback, created_at
      FROM report_versions WHERE report_id = ? ORDER BY version_num ASC
    `).all(id);

    res.json({ versions: versions.map(v => ({
      ...v,
      sectionFeedback: v.section_feedback ? JSON.parse(v.section_feedback) : [],
    })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/w/:slug/reports/:id/versions/:vnum", (req, res) => {
  try {
    const { slug, id, vnum } = req.params;
    const ws = db.prepare("SELECT * FROM workspaces WHERE slug = ?").get(slug);
    if (!ws) return res.status(404).json({ error: "Workspace introuvable." });

    const version = db.prepare(
      "SELECT * FROM report_versions WHERE report_id = ? AND version_num = ?"
    ).get(id, parseInt(vnum));
    if (!version) return res.status(404).json({ error: "Version introuvable." });

    res.json({ version: { ...version, snapshot: JSON.parse(version.snapshot) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Frontend: Feedback Panel Component structure

```jsx
// ReportFeedbackPanel.jsx — integrates into FullReport view
// Props: report, onSubmit(globalFeedback, sectionFeedback), loading
export default function ReportFeedbackPanel({ report, onSubmit, loading }) {
  const [globalFeedback, setGlobalFeedback] = useState("");
  const [sectionFeedbacks, setSectionFeedbacks] = useState({});
  const sections = report.sections || [];

  const handleSubmit = () => {
    const sf = Object.entries(sectionFeedbacks)
      .filter(([, text]) => text.trim())
      .map(([index, text]) => ({ index: parseInt(index), text }));
    onSubmit(globalFeedback, sf);
  };

  return (
    <div style={{
      background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
      borderRadius: "var(--radius-md)", padding: "20px 24px",
    }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 16, marginBottom: 16 }}>
        Améliorer ce rapport
      </h3>
      {/* Global feedback */}
      <label className="data-label" style={{ display: "block", marginBottom: 6 }}>
        Feedback global
      </label>
      <textarea
        value={globalFeedback}
        onChange={e => setGlobalFeedback(e.target.value)}
        placeholder="Qu'est-ce qui fonctionne bien ? Qu'est-ce qui doit changer ?"
        style={{ width: "100%", minHeight: 88, fontSize: 13, fontFamily: "var(--font-body)",
                 background: "var(--mp-bg)", border: "1px solid var(--mp-border)",
                 borderRadius: "var(--radius-sm)", padding: "10px 14px", color: "var(--mp-text)",
                 resize: "vertical", boxSizing: "border-box" }}
      />
      {/* Per-section feedback */}
      {sections.map((section, i) => (
        <div key={i} style={{ marginTop: 16 }}>
          <label className="data-label" style={{ display: "block", marginBottom: 4 }}>
            {section.title}
          </label>
          <textarea
            value={sectionFeedbacks[i] || ""}
            onChange={e => setSectionFeedbacks(p => ({ ...p, [i]: e.target.value }))}
            placeholder="Feedback spécifique à cette section (optionnel)"
            style={{ width: "100%", minHeight: 56, fontSize: 12, fontFamily: "var(--font-body)",
                     background: "var(--mp-bg)", border: "1px solid var(--mp-border)",
                     borderRadius: "var(--radius-sm)", padding: "8px 12px", color: "var(--mp-text)",
                     resize: "vertical", boxSizing: "border-box" }}
          />
        </div>
      ))}
      <button
        onClick={handleSubmit}
        disabled={loading || (!globalFeedback.trim() && Object.values(sectionFeedbacks).every(t => !t.trim()))}
        style={{
          marginTop: 20, background: "var(--mp-accent)", border: "none",
          borderRadius: "var(--radius-md)", padding: "10px 24px",
          color: "var(--mp-accent-on)", cursor: loading ? "wait" : "pointer",
          fontSize: 14, fontWeight: 500, fontFamily: "var(--font-body)",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Génération en cours…" : "Générer la version améliorée"}
      </button>
    </div>
  );
}
```

### Frontend: api.js additions

```javascript
// Add to createWorkspaceApi() in app/src/lib/api.js
iterateReport: async (id, globalFeedback, sectionFeedback) => {
  const res = await fetch(`${BASE}/reports/${id}/iterate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ globalFeedback, sectionFeedback }),
  });
  return res.json();
},

getReportVersions: async (id) => {
  const res = await fetch(`${BASE}/reports/${id}/versions`);
  return res.json();
},

getReportVersion: async (id, vnum) => {
  const res = await fetch(`${BASE}/reports/${id}/versions/${vnum}`);
  return res.json();
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Chat-only report iteration (multi-turn chat) | Dedicated iterate endpoint with structured feedback | This phase | Faster, structured, keeps report history separate from chat history |
| In-place report mutation | Append-only version table | This phase | History is never lost; baseline always available for comparison |

**No deprecated patterns involved in this phase.** The existing `extractReportFromResponse` + `aiComplete` pipeline is stable and correct.

---

## Open Questions

1. **Saving the first version (v1 baseline)**
   - What we know: The existing `generate-report` and chat endpoints do not write to `report_versions`.
   - What's unclear: Whether to backfill existing reports (those already in DB before this phase) with a v1 snapshot on first iterate call, or to modify `generate-report` to always write v1.
   - Recommendation: Backfill lazily — on the first `iterate` call, if no version row exists, snapshot the current `reports` row as v1 before generating v2. This avoids a data migration and keeps `generate-report` unchanged.

2. **UX entry point for "Améliorer"**
   - What we know: The report is currently viewed at `/:slug/report/:id` using `FullReport` inside `WorkspaceShell`.
   - What's unclear: Whether the feedback panel should be a collapsible drawer inside `FullReport`, a separate sub-route (`/:slug/report/:id/feedback`), or a modal.
   - Recommendation: Collapsible drawer at the bottom of `FullReport`. Avoids new route, keeps the report visible while typing feedback. Toggle button ("Améliorer ce rapport") in the existing header action bar alongside the PDF button.

3. **Version limit**
   - What we know: No practical constraint from SQLite. Each snapshot is ~5–20 KB.
   - What's unclear: Whether to cap versions at N (e.g., 20) per report to prevent unbounded growth.
   - Recommendation: No cap for v1.1. Add a `LIMIT 20 ORDER BY version_num DESC` on the versions list endpoint to keep the UI manageable without deleting data.

---

## Validation Architecture

No test framework is configured in this project (no `jest.config.*`, `vitest.config.*`, `pytest.ini`, or test directories detected). Validation is manual for this phase.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Verification Method |
|--------|----------|-----------|---------------------|
| FEED-01 | Global feedback triggers AI re-generation | manual | Submit feedback via UI, verify new version appears |
| FEED-02 | Per-section annotation captured and sent to AI | manual | Type section feedback, verify it appears in iterate request body |
| FEED-03 | Improved report saved to DB and returned | manual | Check `report_versions` table and report content post-iterate |
| FEED-04 | Version history persists across page reload | manual | Reload report page, open version panel, verify history visible |
| FEED-05 | Side-by-side comparison renders both versions | manual | Select v1 and v2 in comparison UI, verify two panes render |

### Wave 0 Gaps

- No automated test infrastructure exists. All verification is manual smoke testing via the browser UI and direct SQLite inspection (`sqlite3 minipilot.db "SELECT * FROM report_versions LIMIT 5;"`).

---

## Sources

### Primary (HIGH confidence)
- Direct code read of `server/index.js` (3013 lines) — DB schema, AI patterns, existing report CRUD
- Direct code read of `app/src/components/FullReport.jsx` — current report view structure
- Direct code read of `app/src/components/RenderSection.jsx` — section rendering, chart types
- Direct code read of `app/src/lib/api.js` — workspace API factory pattern
- Direct code read of `app/src/components/WorkspaceShell.jsx` — routing and report state management
- `server/package.json` and `app/package.json` — exact dependency versions

### Secondary (MEDIUM confidence)
- better-sqlite3 transaction API: synchronous `.transaction()` wraps are the standard approach for atomic multi-statement operations (consistent with library documentation behavior)
- Anthropic SDK `aiComplete` abstraction in `server/index.js` ~L300+: wraps all three providers; confirmed by reading the implementation

### Tertiary (LOW confidence)
- None — all findings are grounded in direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries directly observed in package.json
- Architecture: HIGH — derived directly from reading existing code patterns
- Pitfalls: HIGH (race condition, local model limits) / MEDIUM (navigation state) — derived from code analysis and known SQLite/small-LLM behavior
- Code examples: HIGH — follow exact patterns already present in codebase

**Research date:** 2026-03-22
**Valid until:** 2026-06-22 (stable stack, no fast-moving dependencies for this phase)
