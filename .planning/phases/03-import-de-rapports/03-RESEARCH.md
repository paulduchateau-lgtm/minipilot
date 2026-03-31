# Phase 3: Import de Rapports - Research

**Researched:** 2026-03-22
**Domain:** File parsing (XLSX + DOCX), AI-driven template analysis, column mapping UI
**Confidence:** HIGH (stack), MEDIUM (AI prompting patterns), HIGH (architecture)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMP-01 | User can upload an Excel file (.xlsx) as a report template | multer already handles .xlsx; XLSX package already installed; mime type extension needed |
| IMP-02 | User can upload a Word file (.docx) as a report template | mammoth 1.12.0 identified as the right parser; multer fileFilter needs .docx extension |
| IMP-03 | AI automatically detects KPIs and key metrics from the uploaded template | Same aiComplete() pattern as generate-report; structured extraction prompt with JSON output |
| IMP-04 | AI analyzes structure (sheets, charts, tables, sections) to recreate equivalent report | Two-phase AI pipeline: extract structure → generate report JSON; chart detection from XLSX data shapes |
| IMP-05 | User can map workspace data columns to fields detected in the imported template | Custom field-mapper UI using select dropdowns; no new library needed (dnd-kit already installed) |
</phase_requirements>

---

## Summary

Phase 3 builds a pipeline that lets a user upload an existing Excel or Word document as a "template" and get back a Minipilot report JSON they can further edit. The pipeline has three sequential steps: (1) parse the file server-side to extract its structural content, (2) run an AI prompt to convert that content into a Minipilot report schema, and (3) present a column-mapping UI so the user can connect workspace data columns to the placeholder fields the AI detected.

For Excel, the project already has the `xlsx` package (v0.18.5, SheetJS Community Edition). Its `sheet_to_json` output already gives sheet names, column headers, and row data — enough for the AI to infer structure. However, SheetJS Community Edition cannot extract embedded chart definitions; charts must be inferred from data shapes (column names, value ranges, sheet names) and passed to the AI as descriptive hints. For Word, `mammoth` (v1.12.0, published 2026-03-12) converts `.docx` to HTML, which the AI can then parse for headings, tables, and paragraph structure. The server already uses `"type": "module"` (ESM), and mammoth is CommonJS — ESM can import CJS via default import without `createRequire`.

The column mapping UI (IMP-05) is a custom step in the import wizard: the AI returns detected field labels, and the user maps each to a column available in the workspace. This does not require a new library — the existing React + `@dnd-kit` stack is sufficient for a simple select-based mapper.

**Primary recommendation:** Install `mammoth` for .docx parsing. Implement a 3-screen import wizard: upload → AI analysis (loading) → field mapping → report created. All AI calls reuse the existing `aiComplete()` helper.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xlsx` (SheetJS) | 0.18.5 (already installed) | Parse .xlsx: sheets, headers, rows | Already used in server for data upload; no additional install |
| `mammoth` | 1.12.0 | Parse .docx → HTML string | The de-facto Node.js docx-to-HTML library; actively maintained (last published 2026-03-12); accepts Buffer input natively |
| `multer` | 1.4.5-lts.1 (already installed) | Handle file upload of .docx | Already used for data uploads; just needs mime filter extension |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `officeparser` | 6.0.4 | Alternative docx/office parser with AST output | Only if mammoth HTML output is insufficient for table structure extraction (likely overkill here since AI interprets HTML) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mammoth | officeparser v6 | officeparser gives a typed AST (better for programmatic table extraction) but adds 6x the complexity; mammoth HTML is sufficient since Claude interprets it |
| Custom field-mapper with dnd-kit | react-csv-importer | react-csv-importer is designed for CSV column mapping but is opinionated UI; a simple select-based mapper fits the LiteChange aesthetic better |

**Installation (new dependency only):**
```bash
cd /Users/paulduchateau/projects/litechange/minipilot/server && npm install mammoth
```

**Version verification:** mammoth 1.12.0 confirmed via `npm view mammoth version` on 2026-03-22. xlsx 0.18.5 already installed.

---

## Architecture Patterns

### Recommended Project Structure

New server endpoint and new frontend page:

```
server/
└── index.js              # Add: POST /api/w/:slug/reports/import-template
                           # multer fileFilter extended to accept .docx
                           # parseDocxTemplate() helper function
                           # analyzeTemplate() AI helper function

app/src/components/
├── ImportReportPage.jsx  # 3-step wizard: upload → analyzing → map fields
├── TemplateFieldMapper.jsx  # Step 3: column mapping UI (select-based)
└── ReportsPage.jsx       # Add "Importer un modèle" button (alongside "Nouveau rapport")
```

### Pattern 1: Two-Phase AI Analysis Pipeline

**What:** File parsing produces a text/HTML representation of the template, then a first AI call extracts a "template fingerprint" (field labels, KPIs, section structure). A second AI call uses that fingerprint + workspace data to generate the final report JSON.

**When to use:** When the source document is arbitrary (user-supplied template), not when starting from scratch.

**Phase A — Extract structure from file:**
```javascript
// Source: mammoth docs (buffer input) + existing server pattern
import mammoth from "mammoth"; // ESM default import of CJS package — works in Node.js

async function parseDocxTemplate(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.convertToHtml({ buffer });
  // result.value = HTML string; result.messages = warnings
  return result.value; // Pass this to AI
}

function parseXlsxTemplate(filePath) {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, header: 1 });
    const headers = rows[0] || [];
    const sampleRows = rows.slice(1, 4); // first 3 data rows
    return { name, headers, sampleRows };
  });
  return sheets; // Pass as JSON to AI
}
```

**Phase B — AI fingerprint extraction:**
```javascript
// Source: existing aiComplete() pattern in server/index.js
const fingerprint = await aiComplete("", `
Analyse ce contenu de document (Excel/Word) utilisé comme modèle de rapport.
Identifie :
1. Les KPIs : labels de métriques clés avec leurs unités si présentes
2. Les sections : titres de sections, type probable (graphe barre/ligne/camembert/tableau/texte)
3. Les champs de données : colonnes ou variables attendues (ex: "taux d'adoption", "département")

Réponds UNIQUEMENT en JSON valide :
{
  "title": "Titre probable du rapport",
  "kpis": [{ "label": "...", "sourceHint": "..." }],
  "sections": [{ "title": "...", "type": "bar|pie|table|text", "fields": ["..."] }],
  "detectedFields": ["liste des colonnes/variables détectées"]
}

CONTENU DU MODELE :
${templateContent}
`, { maxTokens: 2000 });
```

**Phase C — Regenerate report with workspace data (reuses existing generate-report logic):**

The fingerprint + column mapping (from IMP-05) become a `suggestion` object passed to the existing `POST /api/w/:slug/ai/generate-report` endpoint. No new AI endpoint needed for the final generation step.

### Pattern 2: Import Wizard (3 Steps)

```
Step 1: Upload
  - FileUpload drop zone (accept=".xlsx,.docx")
  - POST /api/w/:slug/reports/import-template
  - Server: parse file, run AI fingerprint extraction, return { fingerprint, columns }

Step 2: Analyzing (auto-advance after server response)
  - Loading spinner + "Analyse du modèle en cours..."

Step 3: Field Mapping
  - Show detected fields (from fingerprint.detectedFields)
  - For each detected field: a <select> of workspace data columns
  - User confirms mapping → POST to generate-report with enriched suggestion
  - On success: navigate to FullReport
```

### Pattern 3: multer Extension for .docx

The existing `upload` multer instance only allows `.xlsx/.xls/.csv/.json`. A second multer instance (or an extended fileFilter) is needed for template imports:

```javascript
// In server/index.js — add alongside existing `upload` instance
const uploadTemplate = multer({
  storage, // reuse existing diskStorage
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB cap for templates
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (allowedMimes.includes(file.mimetype) || [".xlsx", ".xls", ".docx", ".doc"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers .xlsx et .docx sont acceptés comme modèles."));
    }
  },
});
```

### Anti-Patterns to Avoid

- **Sending raw file bytes to AI:** Never send binary content to Claude/Mistral. Always parse to text (HTML or JSON) first.
- **Trying to extract chart visuals from XLSX:** SheetJS Community Edition cannot read embedded chart objects. Infer chart type from column data shape instead (e.g., columns named "mois"/"valeur" → likely bar/line).
- **Building a separate report format for imported templates:** The fingerprint must be converted into the same `{ title, kpis[], sections[] }` JSON format used throughout. No new schema — just use the existing generate-report output shape.
- **Blocking on AI analysis in multer middleware:** Run the AI analysis after the file is saved and return it as part of the HTTP response body (same pattern as generate-report endpoint).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| .docx text extraction | Custom XML parser over OOXML | mammoth | OOXML is a ZIP of ~20 XML files; word/document.xml alone is complex; mammoth handles relationships, numbering, tables correctly |
| .docx table extraction | Manual XML traversal | mammoth HTML output + AI | AI reads HTML tables trivially; saves ~200 lines of custom code |
| Column mapping UI | Complex drag-drop field mapper | Simple `<select>` per field | Users map 3-6 fields; a select per row is clearer than drag-drop for this domain |
| Template fingerprint JSON schema validation | Custom validator | Trust AI output, add try/catch + fallback | Same pattern used in existing generate-report endpoint (parse JSON, fallback to error) |

**Key insight:** The AI (Claude/Mistral) is the intelligence layer. The server's job is to feed it clean text, not to build a structural parser. Give the AI the HTML or JSON representation and let it extract KPIs and sections.

---

## Common Pitfalls

### Pitfall 1: mammoth is CommonJS but server is ESM
**What goes wrong:** `import mammoth from "mammoth"` works fine in ESM when mammoth has no `"type": "module"` field — Node.js allows ESM to import CJS via default import. BUT named exports from CJS are NOT reliably available.
**Why it happens:** mammoth exports a single object (`module.exports = mammoth`), so the default import is the full API object.
**How to avoid:** Use `import mammoth from "mammoth"` (default import). Then call `mammoth.convertToHtml(...)` and `mammoth.extractRawText(...)`. Do NOT use `import { convertToHtml } from "mammoth"` (named exports from CJS are unreliable in ESM).
**Warning signs:** `TypeError: mammoth.convertToHtml is not a function` → you used a named import.

### Pitfall 2: AI fingerprint returns malformed JSON
**What goes wrong:** The AI wraps its JSON in markdown fences or adds prose before/after. The `JSON.parse()` call throws.
**Why it happens:** Same issue already solved in `extractReportFromResponse()` helper in server/index.js.
**How to avoid:** Reuse the existing `extractReportFromResponse()` helper, or apply the same `.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")` strip before parsing.
**Warning signs:** `SyntaxError: Unexpected token` in the import-template route.

### Pitfall 3: .docx uploaded with wrong MIME type from browser
**What goes wrong:** Windows browsers sometimes send `application/octet-stream` for .docx files. The multer fileFilter rejects the file.
**Why it happens:** MIME type detection varies by OS and browser.
**How to avoid:** Always check BOTH `file.mimetype` AND `path.extname(file.originalname)` in the fileFilter (already the pattern used for xlsx).
**Warning signs:** "Type de fichier non supporté" error from multer even for a valid .docx.

### Pitfall 4: XLSX sheets with empty/merged cells confuse AI
**What goes wrong:** `sheet_to_json` with `header: 1` gives `null` for merged cells. Column names come out as `undefined`.
**Why it happens:** Excel reports often use merged header cells for visual layout, not data structure.
**How to avoid:** Filter out `null`/`undefined` headers. Use `defval: ""` option. Include only sheets with > 2 rows of data.
**Warning signs:** AI returns `detectedFields: [null, null, "Mois"]` — nulls in the fields array.

### Pitfall 5: Large .docx files → mammoth HTML too long for AI context
**What goes wrong:** A 50-page Word document produces 100KB+ of HTML, exceeding token limits (especially Ollama local mode cap of 2000 tokens).
**Why it happens:** mammoth converts every paragraph; no truncation.
**How to avoid:** Truncate the HTML to first 8000 characters (covers titles, headings, first tables — sufficient for structure detection). In local Ollama mode, truncate to 3000 characters.
**Warning signs:** AI response is truncated mid-JSON (same symptom as existing Ministral 3B truncation issue documented in STATE.md).

---

## Code Examples

Verified patterns from existing codebase and official sources:

### Mammoth .docx parsing (server-side)
```javascript
// Source: mammoth 1.12.0 docs (buffer input) — confirmed via GitHub README
import mammoth from "mammoth"; // default import of CJS — works in ESM

async function parseDocxTemplate(filePath) {
  const buffer = fs.readFileSync(filePath);
  const { value: html, messages } = await mammoth.convertToHtml({ buffer });
  if (messages.some(m => m.type === "error")) {
    console.warn("[parseDocxTemplate] warnings:", messages);
  }
  // Truncate to avoid exceeding AI token limit
  return html.slice(0, 8000);
}
```

### XLSX template parsing (server-side)
```javascript
// Source: existing server/index.js pattern (lines 881-895)
function parseXlsxTemplate(filePath) {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });
    const headers = (rows[0] || []).filter(Boolean);
    const sampleRows = rows.slice(1, 4);
    return { name, headers, sampleRows };
  }).filter(s => s.headers.length > 0);
}
```

### New import-template endpoint (server)
```javascript
// POST /api/w/:slug/reports/import-template
app.post("/api/w/:slug/reports/import-template", uploadTemplate.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });
    const ext = path.extname(req.file.originalname).toLowerCase();
    let templateContent;
    if (ext === ".docx" || ext === ".doc") {
      templateContent = await parseDocxTemplate(req.file.path);
    } else if (ext === ".xlsx" || ext === ".xls") {
      const sheets = parseXlsxTemplate(req.file.path);
      templateContent = JSON.stringify(sheets, null, 2);
    } else {
      return res.status(400).json({ error: "Format non supporté." });
    }

    // Fingerprint extraction via AI
    const aiResult = await aiComplete("", buildFingerprintPrompt(templateContent), { maxTokens: 2000 });
    const raw = aiResult.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const fingerprint = JSON.parse(raw);

    // Get workspace columns for mapping step
    const workspaceId = req.workspace.id;
    const files = db.prepare("SELECT columns FROM uploaded_files WHERE workspace_id = ?").all(workspaceId);
    const allColumns = [...new Set(files.flatMap(f => JSON.parse(f.columns || "[]")))];

    res.json({ fingerprint, availableColumns: allColumns });
  } catch (err) {
    console.error("[POST import-template]", err);
    res.status(500).json({ error: err.message });
  }
});
```

### Field Mapper UI component (React)
```jsx
// TemplateFieldMapper.jsx — simple select-based mapper, no new libraries
export default function TemplateFieldMapper({ detectedFields, availableColumns, onConfirm }) {
  const [mapping, setMapping] = useState(
    Object.fromEntries(detectedFields.map(f => [f, ""]))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {detectedFields.map(field => (
        <div key={field} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "var(--font-body)" }}>{field}</span>
          <select
            value={mapping[field]}
            onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
            style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--mp-border)" }}
          >
            <option value="">-- ignorer --</option>
            {availableColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
      ))}
      <button onClick={() => onConfirm(mapping)}>
        Générer le rapport
      </button>
    </div>
  );
}
```

### AI fingerprint prompt
```javascript
function buildFingerprintPrompt(templateContent) {
  return `Tu analyses un document utilisé comme modèle de rapport (Excel ou Word).
Identifie sa structure pour permettre de recréer un rapport équivalent.

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "title": "Titre probable du rapport",
  "objective": "Objectif ou description du rapport",
  "kpis": [{ "label": "Nom du KPI", "unit": "% ou nombre ou..." }],
  "sections": [
    {
      "title": "Titre de la section",
      "type": "bar|line|pie|table|text",
      "fields": ["colonne1", "colonne2"]
    }
  ],
  "detectedFields": ["liste de toutes les variables/colonnes détectées"]
}

CONTENU DU MODELE :
${templateContent}`;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| docx parsing via raw XML unzip | mammoth.js HTML conversion | ~2014 (mammoth v0.1) | No custom XML parsing needed |
| mammoth for table data extraction | officeparser v6 AST (for structural use) | 2025 (officeparser v6) | AST gives typed nodes; but mammoth + AI is simpler for this use case |
| SheetJS Pro for chart extraction | Infer chart type from data shape via AI | N/A (Pro cost not justified) | AI inference covers ~90% of chart types from column names |

**Deprecated/outdated:**
- `node-docx-tables`: Last updated 2017, no maintenance, incompatible with modern OOXML features.
- `docx4js`: No active maintenance since 2020.

---

## Open Questions

1. **Chart type inference accuracy**
   - What we know: SheetJS Community Edition cannot read embedded chart objects from XLSX; AI can infer chart type from column names and data values
   - What's unclear: How accurately will the AI infer chart types for reports with unusual column naming conventions
   - Recommendation: Have the AI return its best guess for chart type, with the user able to override in the editor (Phase 2 editor is already built for this)

2. **Server modularization**
   - What we know: server/index.js is 3152 lines (noted as concern in STATE.md); adding a new import route adds ~100 lines
   - What's unclear: Whether the route should be added inline or if this phase should extract helpers into a separate module
   - Recommendation: Add inline for now; Phase 3 can add a `// ── TEMPLATE IMPORT ──` section boundary; full modularization is a separate concern

3. **Handling multi-language documents**
   - What we know: The AI prompt is in French; templates may be in French or English
   - What's unclear: Whether field labels in English will be returned in English or French by the AI
   - Recommendation: Instruct the AI in the fingerprint prompt to preserve original field label names (do not translate), only translate titles/descriptions

---

## Validation Architecture

> `workflow.nyquist_validation` not explicitly set in config.json — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in project |
| Config file | None |
| Quick run command | N/A — manual smoke test via curl |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMP-01 | .xlsx upload accepted, fingerprint returned | manual smoke | `curl -X POST .../import-template -F "file=@test.xlsx"` | ❌ Wave 0 |
| IMP-02 | .docx upload accepted, fingerprint returned | manual smoke | `curl -X POST .../import-template -F "file=@test.docx"` | ❌ Wave 0 |
| IMP-03 | fingerprint.kpis populated with labels | manual verification | inspect API response JSON | ❌ Wave 0 |
| IMP-04 | fingerprint.sections matches document structure | manual verification | inspect API response JSON | ❌ Wave 0 |
| IMP-05 | field mapping UI shows availableColumns from workspace | manual UI test | navigate to import page in browser | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Manual curl smoke test against running server
- **Per wave merge:** Full import flow in browser (upload → analyze → map → report created)
- **Phase gate:** All 5 requirements verified manually before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `test-data/sample-report-template.xlsx` — simple 2-sheet Excel for smoke testing
- [ ] `test-data/sample-report-template.docx` — minimal Word doc with a heading, table, and KPI labels

*(No automated test framework — same as existing project posture. Manual smoke tests with real files are the primary validation.)*

---

## Sources

### Primary (HIGH confidence)
- `npm view mammoth version` — mammoth 1.12.0, published 2026-03-12 (confirmed current)
- `npm view officeparser version` — officeparser 6.0.4, published 2026-01-10 (confirmed current)
- `npm view xlsx version` — xlsx 0.18.5, published 2024-10-22 (already installed, confirmed)
- mammoth GitHub README (via WebFetch) — buffer input API, convertToHtml return shape, extractRawText
- officeparser GitHub README (via WebFetch) — AST structure, table extraction example
- server/index.js lines 350-376 — existing multer fileFilter pattern
- server/index.js lines 881-935 — existing XLSX parsing pattern
- server/index.js lines 2388-2482 — existing AI generate-report prompt pattern

### Secondary (MEDIUM confidence)
- WebSearch: mammoth table support (confirmed via GitHub issues — tables converted to HTML `<table>`)
- WebSearch: SheetJS Community Edition chart limitation (confirmed — charts only in SheetJS Pro)
- WebSearch: officeparser v6 AST capabilities (verified via GitHub README fetch)

### Tertiary (LOW confidence)
- mammoth CJS/ESM compatibility: no `"type"` field in package.json (checked via `npm view mammoth type` returning empty) — implies CJS; ESM default import pattern inferred from Node.js spec

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — mammoth version verified via npm registry; xlsx already installed and confirmed in use
- Architecture: HIGH — all patterns derived from reading existing server/index.js code directly
- AI prompting: MEDIUM — fingerprint prompt structure is new but follows established generate-report patterns in codebase
- Pitfalls: HIGH — mammoth/ESM issue verified via package type inspection; XLSX chart limitation confirmed via SheetJS docs

**Research date:** 2026-03-22
**Valid until:** 2026-06-22 (mammoth is stable; xlsx is stable; AI prompt patterns are project-specific)
