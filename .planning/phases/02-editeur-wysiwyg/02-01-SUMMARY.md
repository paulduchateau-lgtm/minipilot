---
phase: 02-editeur-wysiwyg
plan: "01"
subsystem: editor-components
tags: [wysiwyg, dnd-kit, tiptap, components, editor]
dependency_graph:
  requires: []
  provides: [EditorSectionPalette, EditorTextSection, EditorChartSection, EditorSectionCard, RenderSection-text]
  affects: [RenderSection.jsx]
tech_stack:
  added: ["@dnd-kit/core@6.3.1", "@dnd-kit/sortable@10.0.0", "@dnd-kit/utilities@3.2.2", "@tiptap/react@3.20.4", "@tiptap/starter-kit@3.20.4"]
  patterns: [section-factory-pattern, tiptap-on-blur, dnd-kit-drag-handle]
key_files:
  created:
    - app/src/components/EditorSectionPalette.jsx
    - app/src/components/EditorTextSection.jsx
    - app/src/components/EditorChartSection.jsx
    - app/src/components/EditorSectionCard.jsx
  modified:
    - app/src/components/RenderSection.jsx
    - app/package.json
decisions:
  - "createSection() factory uses crypto.randomUUID() for stable DnD IDs — prevents ordering bugs on delete+reorder"
  - "Tiptap onBlur (not onUpdate) for onChange — avoids live-preview re-render on every keystroke"
  - "dragHandleProps as prop (not useSortable inside card) — Plan 02 will wire DnD context and pass handle props"
  - "Inline <style> tag for ProseMirror CSS reset in EditorTextSection — avoids global CSS module dependency"
  - "wysiwyg-preview scoped styles via <style> block in RenderSection case 'text' — contains style impact"
metrics:
  duration_seconds: 137
  completed_date: "2026-03-22T21:46:00Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 2
---

# Phase 02 Plan 01: Editor Components — Summary

**One-liner:** Tiptap + @dnd-kit editor building blocks — palette with createSection factory, rich-text editor, chart data form, section card wrapper, and RenderSection text case.

## What Was Built

5 npm packages installed, 4 new components created, 1 component extended.

**EditorSectionPalette.jsx** — Visual grid of 5 section-type tiles (bar, pie, table, area_multi, text). Exports named `createSection(type)` factory that returns valid section skeletons with `crypto.randomUUID()` IDs. Each tile calls `onAdd(createSection(type))` on click. Styled with IBM Plex Mono label, DM Sans tile text, accent hover borders.

**EditorTextSection.jsx** — Tiptap `useEditor` with `StarterKit`, `immediatelyRender: false`. Renders a 4-button toolbar (Bold, Italic, Bullet list, Ordered list) with active-state highlighting. Stores content via `onBlur` callback returning `editor.getHTML()`. Includes ProseMirror CSS reset scoped via inline `<style>` tag.

**EditorChartSection.jsx** — Data entry form for chart sections: title, insight textarea, xKey input, yKeys (comma-separated), and a dynamic data-row table with add/delete row functionality. Numeric cells auto-parsed with `parseFloat`. All labels use IBM Plex Mono 10px uppercase pattern.

**EditorSectionCard.jsx** — Wrapper card rendering either `EditorTextSection` (for type="text") or `EditorChartSection` (all other types). Header row has: `GripVertical` drag handle with `touchAction: "none"` accepting `dragHandleProps` from parent, type badge (pill, IBM Plex Mono), and `Trash2` delete button with warm-500 hover color.

**RenderSection.jsx** — Added `case "text"` to `renderChart()` switch: renders `section.html` via `dangerouslySetInnerHTML` in a `.wysiwyg-preview` div with scoped styles (p, ul, ol, strong, em). Fallback italic message when html is empty.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install deps + EditorSectionPalette | 4a891f7 | app/package.json, EditorSectionPalette.jsx |
| 2 | EditorTextSection, EditorChartSection, EditorSectionCard | c4b03a5 | EditorTextSection.jsx, EditorChartSection.jsx, EditorSectionCard.jsx |
| 3 | Add "text" case to RenderSection | c337215 | RenderSection.jsx |

## Decisions Made

1. **`createSection()` as named export** — Plan 02 (editor page) imports it directly alongside the palette component. Keeps factory logic collocated with palette.

2. **`dragHandleProps` as prop (not internal `useSortable`)** — The DnD context (`DndContext`, `SortableContext`) lives at the list level, not the card level. `EditorSectionCard` stays dumb about DnD; Plan 02 will wire the `useSortable` hook and pass `{ attributes, listeners }` as `dragHandleProps`.

3. **`onBlur` for Tiptap onChange** — Avoids triggering live preview re-render on every keystroke. Research (Pitfall 1) confirmed this is the correct approach.

4. **No structural undo** — `Ctrl+Z` inside Tiptap undoes text edits only (Tiptap captures keyboard within its focus scope). Section deletion is irreversible in Phase 2; Plan 02 can add confirmation if needed.

## Deviations from Plan

None — plan executed exactly as written. The verify command in Task 1 (dynamic ESM import of JSX) was not runnable in Node directly, but all 5 acceptance criteria passed via grep checks and Vite build validation.

## Self-Check: PASSED

All 4 created files exist on disk. All 3 task commits verified in git log (4a891f7, c4b03a5, c337215).
