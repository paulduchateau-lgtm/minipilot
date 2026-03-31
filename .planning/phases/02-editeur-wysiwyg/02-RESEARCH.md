# Phase 2: Editeur WYSIWYG - Research

**Researched:** 2026-03-22
**Domain:** React drag-and-drop, rich text editing, live preview, visual report composition
**Confidence:** HIGH

---

## Summary

Phase 2 adds a visual report editor so users can build reports without AI. Two distinct capabilities must be composed together: drag-and-drop reordering of sections (structural editing) and rich text authoring within a "text" section type (content editing). Both capabilities require new third-party libraries — the project currently has neither a DnD library nor a rich text editor.

The stack is mature and well-matched: **@dnd-kit** for sortable drag-and-drop (React 19 compatible, no deprecated warnings, actively maintained), **Tiptap 3** for rich text (ProseMirror-based, React 19 peer-deps satisfied, minimal footprint with starter-kit). Live preview is already solved — `RenderSection` renders every chart type. The editor panel and the preview panel share the same `sections` state array; the editor writes, the preview reads. No new rendering logic needed.

The critical architectural constraint is that the existing JSON format — `sections: [{ title, type, insight, data[], config }]` — is the integration surface. The WYSIWYG editor must produce objects in exactly this shape. Chart sections require a data entry sub-form (xKey, yKeys, data rows); text sections store their rich-text as an HTML string in a new `html` field consumed only in the editor's preview. The existing `saveReport` and `updateReport` API endpoints handle persistence with no server changes required.

**Primary recommendation:** Build a dedicated `ReportEditorPage` component with a two-column split (palette + editor list on left, live preview on right). Use @dnd-kit/sortable for section reordering. Use Tiptap with StarterKit for the text editor. Reuse `RenderSection` verbatim in the preview column.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WYSI-01 | User can add chart sections (bar, pie, line, table) from a visual palette | Section palette component renders chart type tiles; clicking appends a new skeleton section to `sections[]` state; chart types map directly to existing RenderSection types |
| WYSI-02 | User can add rich text sections with basic formatting (bold, italic, lists) | Add a `type: "text"` section; Tiptap StarterKit provides Bold, Italic, BulletList, OrderedList; content stored as `html` string in section |
| WYSI-03 | User can reorder report sections via drag & drop | @dnd-kit/sortable wraps the section list; `arrayMove` on `onDragEnd`; no touch-action conflicts because sections are vertically stacked cards |
| WYSI-04 | User sees a live preview of the final report while editing | Right-column renders current `sections[]` state using existing `RenderSection` with no changes; two-column layout, editor left / preview right |
| WYSI-05 | User can create a new report entirely from the WYSIWYG editor | New route `/:slug/editor/new` + `/:slug/editor/:id`; on save, call `api.saveReport()` with the constructed JSON; redirect to report view |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 (2024-12-05) | Drag context, sensors, collision detection | Maintained, React 19 compatible, replaces deprecated react-beautiful-dnd |
| @dnd-kit/sortable | 10.0.0 (2024-12-04) | Vertical list reordering, `arrayMove` helper | Peer-requires `@dnd-kit/core ^6.3.0` — versions align |
| @dnd-kit/utilities | 3.2.2 | CSS transform helper `CSS.Transform.toString()` | Required for `useSortable` style transform |
| @tiptap/react | 3.20.4 (2026-03-17) | Headless rich text React wrapper | Active, React 19 peer deps satisfied |
| @tiptap/starter-kit | 3.20.4 | Bold, Italic, BulletList, OrderedList, Heading, Paragraph bundled | Covers all WYSI-02 requirements in one install |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.577.0 (already installed) | Section type icons in palette | Use existing install, no new dep |
| recharts | ^3.8.0 (already installed) | Chart rendering in live preview | Already renders via RenderSection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | react-beautiful-dnd is unmaintained (last release Oct 2024, no React 18/19 support officially) |
| @dnd-kit | @hello-pangea/dnd | @hello-pangea/dnd is a maintained fork but still Atlassian API style — more verbose than dnd-kit for simple vertical lists |
| Tiptap | Slate + slate-react | Slate is more customizable but requires significantly more custom code; version 0.123.0 lacks built-in toolbar |
| Tiptap | Lexical (@lexical/react) | Meta's library, excellent but larger surface area; overkill for bold/italic/lists only |
| Tiptap | ContentEditable div with `document.execCommand` | execCommand is deprecated; formatting state unpredictable across browsers |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @tiptap/react @tiptap/starter-kit
```

**Version verification:** All versions above confirmed via `npm view [package] version` on 2026-03-22.

---

## Architecture Patterns

### Recommended Project Structure
```
src/components/
├── ReportEditorPage.jsx      # Main editor page (route handler)
├── EditorSectionPalette.jsx  # Left panel: chart type tiles + "Add text" button
├── EditorSectionList.jsx     # DnD sortable list of section editor cards
├── EditorSectionCard.jsx     # Single section: header, edit fields, delete
├── EditorTextSection.jsx     # Tiptap editor for type="text" sections
├── EditorChartSection.jsx    # Data entry form for chart sections (xKey, yKey, rows)
└── RenderSection.jsx         # UNCHANGED — reused in preview column
```

### Pattern 1: Two-Column Split Editor Layout
**What:** Left column (400px fixed) = palette + editable section list. Right column (flex: 1) = live preview using `RenderSection`.
**When to use:** WYSI-04 requires simultaneous editing and preview. Full-screen toggling adds complexity with no real benefit.
**Example:**
```jsx
// ReportEditorPage.jsx — layout skeleton
<div style={{ display: "flex", height: "100%", gap: 0 }}>
  <div style={{ width: 400, borderRight: "1px solid var(--mp-border)", overflow: "auto" }}>
    <EditorSectionPalette onAdd={addSection} />
    <EditorSectionList
      sections={sections}
      onReorder={setSections}
      onChange={updateSection}
      onDelete={deleteSection}
    />
  </div>
  <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
    {/* Live preview */}
    {sections.map((s, i) => <RenderSection key={s.id} section={s} />)}
  </div>
</div>
```

### Pattern 2: @dnd-kit Sortable Vertical List
**What:** Wrap section list in `DndContext`, each card in `SortableContext`. On drag end, call `arrayMove`.
**When to use:** WYSI-03. The sections array is the single source of truth.
**Example:**
```jsx
// Source: @dnd-kit/sortable docs
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function EditorSectionList({ sections, onReorder, onChange, onDelete }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      onReorder(arrayMove(sections, oldIndex, newIndex));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {sections.map(s => (
          <EditorSectionCard key={s.id} section={s} onChange={onChange} onDelete={onDelete} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

// Inside EditorSectionCard:
function EditorSectionCard({ section, onChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {/* drag handle: spread listeners only on the handle icon, not the entire card */}
      <button {...attributes} {...listeners} style={{ cursor: "grab", touchAction: "none" }}>
        <GripVertical size={14} />
      </button>
      {/* ... section edit fields */}
    </div>
  );
}
```

### Pattern 3: Tiptap Rich Text Editor (WYSI-02)
**What:** Headless editor instance in `EditorTextSection`, stores content as HTML string on blur.
**When to use:** For `type: "text"` sections only. HTML string stored in `section.html`.
**Example:**
```jsx
// EditorTextSection.jsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function EditorTextSection({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    onBlur: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div style={{
      border: "1px solid var(--mp-border)",
      borderRadius: "var(--radius-sm)",
      background: "var(--mp-bg-input)",
    }}>
      {/* Toolbar */}
      <div style={{ borderBottom: "1px solid var(--mp-border)", padding: "6px 10px", display: "flex", gap: 4 }}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={{ fontWeight: editor?.isActive("bold") ? 700 : 400 }}
        >B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}>•</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</button>
      </div>
      <EditorContent editor={editor} style={{ padding: "10px 14px", minHeight: 80 }} />
    </div>
  );
}
```

### Pattern 4: Section Skeleton Factory
**What:** A `createSection(type)` function returns a valid section object with a stable `id` for DnD.
**When to use:** Every time the user clicks a palette tile (WYSI-01, WYSI-05).
```jsx
// Use crypto.randomUUID() — available in all modern browsers
function createSection(type) {
  const id = crypto.randomUUID();
  if (type === "text") {
    return { id, title: "Section texte", type: "text", html: "" };
  }
  // Chart skeleton — data and config left empty for user to fill
  return {
    id,
    title: "Nouvelle section",
    type,                          // "bar", "pie", "table", etc.
    insight: "",
    data: [],
    config: { xKey: "", yKeys: [], colors: [], names: [] },
  };
}
```

### Pattern 5: "text" Section Rendering in RenderSection
**What:** The live preview must render `type: "text"` sections. `RenderSection` currently has no `case "text"`. Add one switch case.
**When to use:** WYSI-04 — the preview must handle the new section type.
```jsx
// Add inside renderChart() switch in RenderSection.jsx
case "text":
  return section.html
    ? <div
        className="wysiwyg-preview"
        dangerouslySetInnerHTML={{ __html: section.html }}
        style={{ fontSize: 14, lineHeight: 1.7, color: "var(--mp-text-secondary)" }}
      />
    : null;
```

### Pattern 6: Routing — New vs Edit
**What:** The editor page needs two route modes: create new report and edit existing.
**When to use:** WYSI-05 requires creating from scratch. Editing existing AI reports is a natural extension.
```jsx
// In WorkspaceShell.jsx — add to routes and handleSetPage
// Route: /:slug/editor/new  → empty sections array
// Route: /:slug/editor/:id  → pre-load report sections
```

### Anti-Patterns to Avoid
- **Drag listeners on entire card:** Spreads `listeners` on the full section card, making text inputs inside unclickable/unfocused. Use a dedicated drag handle icon that receives `attributes + listeners`.
- **Tiptap `onUpdate` for every keystroke:** Calling `onChange` on every keystroke triggers re-render of the live preview on every character. Use `onBlur` instead, or debounce with 300ms.
- **Storing sections without a stable `id`:** Using array index as DnD identifier breaks when items reorder. Always attach a `crypto.randomUUID()` id at section creation time.
- **Mutating sections array directly:** DnD `arrayMove` returns a new array — always replace state, never `.splice()`.
- **Inline Tiptap CSS class conflicts:** Tiptap adds `.ProseMirror` class styles. They may conflict with global CSS reset. Scope Tiptap styles to the editor container.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vertical list reordering with mouse | Custom mouse event tracking with position math | @dnd-kit/sortable | Auto-scrolling, keyboard accessibility, touch support, ghost element, animation — all included |
| Rich text toolbar with formatting state | `document.execCommand`, manual `getSelection` | Tiptap + StarterKit | execCommand deprecated; selection state management is complex; Tiptap handles undo/redo, cursor position, format detection |
| Unique section IDs | Sequential counter (`sections.length + 1`) | `crypto.randomUUID()` | Counter breaks on delete + reorder; UUID is collision-free and stable |
| HTML sanitization | Manual regex strip | DOMPurify or trust Tiptap output | Tiptap StarterKit output is safe (no script injection); if rendering user HTML, DOMPurify sanitizes — but for self-authored content, Tiptap's output is sufficient |

**Key insight:** The DnD and rich-text domains each have non-obvious edge cases (auto-scroll boundaries, touch events, undo history, selection collapse on blur) that take weeks to get right. Libraries amortize that cost.

---

## Common Pitfalls

### Pitfall 1: @dnd-kit touchAction conflict
**What goes wrong:** On touch devices, vertical dragging conflicts with native scroll. The drag never activates.
**Why it happens:** Browser intercepts touchmove for scroll before dnd-kit can claim it.
**How to avoid:** Add `style={{ touchAction: "none" }}` to drag handle element (not the container). Only the handle needs it.
**Warning signs:** Drag works on desktop mouse, fails silently on mobile touch.

### Pitfall 2: Tiptap editor instance not destroyed on unmount
**What goes wrong:** Memory leak and "Cannot read property of null" errors after navigating away from the editor.
**Why it happens:** Tiptap's `useEditor` manages the ProseMirror instance internally. If the parent component re-renders and destroys the editor without cleanup, the instance keeps a reference to the DOM.
**How to avoid:** Always set `immediatelyRender: false` for SSR-safe environments. Vite is CSR, but it's good practice. Tiptap's `useEditor` runs cleanup automatically when component unmounts — don't store the editor in external state.

### Pitfall 3: sections[] state mutation during drag
**What goes wrong:** UI flickers or section order reverts unexpectedly.
**Why it happens:** `arrayMove` returns a new array, but if state is updated with a mutation (`.push`, `.splice`) instead of a new reference, React batching may produce stale renders.
**How to avoid:** Always: `setSections(prev => arrayMove(prev, oldIndex, newIndex))`. Never mutate the array directly.

### Pitfall 4: Live preview width too narrow for chart rendering
**What goes wrong:** Recharts `ResponsiveContainer` renders at 0px width inside a flexbox column that hasn't been explicitly sized.
**Why it happens:** Flexbox does not give a width to children until layout is resolved. `ResponsiveContainer width="100%"` needs a sized parent.
**How to avoid:** Ensure the preview column has `minWidth: 0` and an explicit flex shrink/grow. Add `overflow: hidden` to the preview container.

### Pitfall 5: Chart section "empty state" in preview causes RenderSection crash
**What goes wrong:** A newly added chart section has `data: []` and `config.yKeys: []`. `RenderSection` returns `noData` instead of crashing — this is already handled. But table sections with no columns also return gracefully. The only fragile path is `composed` type with undefined `config.bars`.
**How to avoid:** The new `createSection()` factory must always initialize `config` with all expected keys (bars, line, yKeys, xKey, etc.) as empty arrays/strings, not undefined.

### Pitfall 6: Tiptap StarterKit includes History extension (undo/redo) by default
**What goes wrong:** User presses Ctrl+Z, expects to undo a section deletion (structural undo), but instead undoes text changes inside the Tiptap editor.
**Why it happens:** Tiptap captures keyboard events within its editor focus scope. Structural undo is separate from text undo.
**How to avoid:** Do not implement structural undo in Phase 2 (it is out of scope). Document this boundary: Ctrl+Z inside the text editor undoes text edits only. Section deletion should show a confirmation or be reversible via a "restore" button.

---

## Code Examples

### Section Palette Tile
```jsx
// EditorSectionPalette.jsx — tile for adding a section type
const SECTION_TYPES = [
  { type: "bar",   label: "Barres",    icon: BarChart3 },
  { type: "pie",   label: "Camembert", icon: PieChart },
  { type: "table", label: "Tableau",   icon: Table2 },
  { type: "area_multi", label: "Aires", icon: TrendingUp },
  { type: "text",  label: "Texte",     icon: Type },
];

export default function EditorSectionPalette({ onAdd }) {
  return (
    <div style={{ padding: 16, borderBottom: "1px solid var(--mp-border)" }}>
      <span className="data-label" style={{ display: "block", marginBottom: 10 }}>
        Ajouter une section
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SECTION_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => onAdd(type)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px",
              background: "var(--mp-bg-elevated)",
              border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              color: "var(--mp-text-secondary)",
              fontSize: 12,
              fontFamily: "var(--font-body)",
              transition: "border-color 150ms ease, color 150ms ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--mp-accent)"; e.currentTarget.style.color = "var(--mp-accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mp-border)"; e.currentTarget.style.color = "var(--mp-text-secondary)"; }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Save New Report (WYSI-05)
```jsx
// In ReportEditorPage.jsx
const handleSave = async () => {
  setSaving(true);
  try {
    // Strip internal `id` fields from sections before saving (not in DB schema)
    const sectionsForApi = sections.map(({ id, ...rest }) => rest);
    const payload = {
      title,
      subtitle,
      objective,
      kpis: [],
      sections: sectionsForApi,
      isPrivate: 1,
    };
    if (reportId) {
      await api.updateReport(reportId, payload);
    } else {
      const saved = await api.saveReport(payload);
      navigate(`/${slug}/report/${saved.id}`);
    }
  } finally {
    setSaving(false);
  }
};
```

### Tiptap CSS reset for LiteChange dark theme
```css
/* Add to tokens.css or a new editor.css */
.ProseMirror {
  outline: none;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--mp-text);
  line-height: 1.7;
}
.ProseMirror p { margin: 0 0 8px; }
.ProseMirror ul, .ProseMirror ol { padding-left: 20px; margin-bottom: 8px; }
.ProseMirror strong { font-weight: 600; }
.ProseMirror em { font-style: italic; }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd (Atlassian) | @dnd-kit | 2022-2023 | react-beautiful-dnd officially unmaintained; dnd-kit is community standard |
| `document.execCommand` for rich text | ProseMirror-based editors (Tiptap, Slate, Lexical) | 2020+ | execCommand deprecated in modern browsers |
| Quill.js for rich text | Tiptap | 2021+ | Quill has no React 18/19 official support; Tiptap is headless and composable |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Last real release 2022; community fork `@hello-pangea/dnd` exists but API is identical and verbose.
- `document.execCommand`: Removed from spec; still works in some browsers but unreliable.
- `Quill` v1: No React 19 support.

---

## Open Questions

1. **Chart data entry UX for WYSI-01**
   - What we know: Chart sections need `data[]` (array of row objects) and `config.xKey/yKeys`. Users unfamiliar with data structure cannot fill a raw JSON array.
   - What's unclear: How much UI do we build for data entry? Options range from a simple key-value grid to a spreadsheet-like table editor.
   - Recommendation: Plan 1 builds a simple "Add row" table editor (column headers = keys, rows = values). This is sufficient for MVP. Full spreadsheet behavior is out of scope.

2. **Edit mode for existing AI-generated reports**
   - What we know: WYSI-05 specifies creating new reports. The roadmap says "build and edit reports."
   - What's unclear: Should the editor also open existing AI-generated reports for editing?
   - Recommendation: Route `/:slug/editor/:id` pre-loads existing report sections. Add an "Edit" button alongside the existing report action buttons. This reuses the same editor component.

3. **`type: "text"` section in PDF export**
   - What we know: `generatePdf.js` renders sections via canvas. It currently uses `RenderSection` HTML output. A `dangerouslySetInnerHTML` text section may not render correctly in the PDF capture.
   - What's unclear: Will `html2canvas` capture the ProseMirror-generated HTML correctly?
   - Recommendation: Defer PDF compatibility for text sections to a later task. Flag in the implementation plan.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test files, no test config |
| Config file | None — Wave 0 must create |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WYSI-01 | Clicking palette tile appends a section of correct type | unit (component) | `npm test -- EditorSectionPalette` | Wave 0 |
| WYSI-02 | Tiptap editor renders and returns HTML on blur | unit (component) | `npm test -- EditorTextSection` | Wave 0 |
| WYSI-03 | Section reorder via DnD produces correct array order | unit (state logic) | `npm test -- arrayMove` | Wave 0 |
| WYSI-04 | Live preview renders sections matching editor state | integration | manual-only (visual) | Manual |
| WYSI-05 | Save button calls api.saveReport with correct payload | unit (mock) | `npm test -- ReportEditorPage` | Wave 0 |

**Note:** This is a JSX-only frontend project with no existing test infrastructure. Testing React components without TypeScript typically uses Vitest + @testing-library/react. Given that no tests exist anywhere in the project and the codebase is small and iterating fast, the practical approach is: unit tests for pure state logic (arrayMove, createSection), smoke tests for critical save path, manual QA for visual DnD and preview fidelity.

### Sampling Rate
- **Per task commit:** Manual browser verification (no automated framework yet)
- **Per wave merge:** Full manual walkthrough of editor flow
- **Phase gate:** All 5 requirements demonstrable before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No test framework detected. If adding: `npm install -D vitest @testing-library/react @testing-library/user-event jsdom` — but given project velocity and zero existing tests, treat as optional for Phase 2.

---

## Sources

### Primary (HIGH confidence)
- `npm view @dnd-kit/core version` — version 6.3.1, modified 2024-12-05
- `npm view @dnd-kit/sortable version` — version 10.0.0, modified 2024-12-04; peer deps confirmed `@dnd-kit/core ^6.3.0`
- `npm view @tiptap/react version` — version 3.20.4, modified 2026-03-17; peer deps confirmed React 17/18/19
- `npm view @tiptap/starter-kit version` — version 3.20.4
- Direct code inspection: `RenderSection.jsx`, `FullReport.jsx`, `api.js`, `tokens.css`, `theme.jsx`
- `package.json` — confirmed React 19.2.4, Vite 8, Recharts 3.8.0, no DnD or rich text libs

### Secondary (MEDIUM confidence)
- @dnd-kit documentation patterns (vertical list, sortable, handle): based on widely documented API consistent with package structure
- Tiptap v3 `useEditor` + `onBlur` pattern: consistent with package peer deps and StarterKit extension list confirmed via npm

### Tertiary (LOW confidence)
- Tiptap CSS scoping for dark theme: based on general ProseMirror `.ProseMirror` class knowledge; verify exact class names match Tiptap v3 output at implementation time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry on 2026-03-22
- Architecture: HIGH — based on direct codebase inspection; integration points clearly identified
- Pitfalls: HIGH — known DnD and ProseMirror edge cases documented in primary library docs
- Test infrastructure: LOW — no existing tests; recommendations are suggestions only

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable libraries; Tiptap releases frequently but StarterKit API is stable)
