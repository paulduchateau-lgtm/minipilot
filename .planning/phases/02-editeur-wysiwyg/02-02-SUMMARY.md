---
phase: 02-editeur-wysiwyg
plan: "02"
subsystem: editor-page
tags: [wysiwyg, dnd-kit, editor-routing, live-preview, sidebar]
dependency_graph:
  requires: [EditorSectionPalette, EditorSectionCard, EditorSectionList, RenderSection, api.saveReport, api.updateReport, api.getReport]
  provides: [EditorSectionList, ReportEditorPage, WorkspaceShell-editor-route, Sidebar-editor-nav]
  affects: [WorkspaceShell.jsx, Sidebar.jsx]
tech_stack:
  added: []
  patterns: [dnd-kit-sortable-context, two-column-editor-layout, section-strip-ids-before-save]
key_files:
  created:
    - app/src/components/EditorSectionList.jsx
    - app/src/components/ReportEditorPage.jsx
  modified:
    - app/src/components/WorkspaceShell.jsx
    - app/src/components/Sidebar.jsx
decisions:
  - "reportId=null for /editor/new, reportId=string for /editor/:id — derived from subPath in WorkspaceShell"
  - "Strip DnD id fields before api.saveReport/updateReport — ids are runtime-only, not persisted"
  - "Active state for editor/new item uses OR condition (page==='editor' || item.id==='editor/new') — subpath 'new' is not the page key"
  - "Editer button only shown when viewingReport is truthy — avoids stale null reference during load"
metrics:
  duration_seconds: 133
  completed_date: "2026-03-22T21:50:17Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 2
---

# Phase 02 Plan 02: Editor Page — Summary

**One-liner:** DnD sortable section list + two-column editor page with live preview, save-to-database, sidebar nav, and /editor/new + /editor/:id routing.

## What Was Built

2 new components created, 2 existing components modified to complete the full WYSIWYG editor flow.

**EditorSectionList.jsx** — DndContext wrapping SortableContext with verticalListSortingStrategy. Inner SortableItem component uses useSortable() to get transform/transition/isDragging state and passes { attributes, listeners } as dragHandleProps to EditorSectionCard. handleDragEnd finds old/new indices and calls onReorder(arrayMove(...)). Empty-state message shown when sections array is empty.

**ReportEditorPage.jsx** — Two-column flex layout. Left column (420px fixed width): title input + save button header, EditorSectionPalette, EditorSectionList with onReorder/onChange/onDelete handlers. Right column (flex 1): APERCU label + mapped RenderSection previews (live, updates on section state change). On mount: if reportId truthy, fetches getReport() and parses sections JSON, adding crypto.randomUUID() IDs to any that lack them. handleSave strips DnD ids before calling api.saveReport (new) or api.updateReport (edit), then navigates to report view. Save button disabled when saving or sections.length === 0.

**WorkspaceShell.jsx** — Added ReportEditorPage import. Added editor routing block (currentPage === "editor") passing api, slug, reportId derived from subPath. Added "Editer dans l'editeur visuel" button in the report view header (shown only when viewingReport is truthy), linking to /${slug}/editor/${viewingReport.id}.

**Sidebar.jsx** — Added FilePenLine import from lucide-react. Inserted { id: "editor/new", Icon: FilePenLine, label: "Editeur" } between dashboard and chat in NAV_ITEMS. Updated isActive check to handle page === "editor" mapping to item.id === "editor/new".

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | EditorSectionList + ReportEditorPage | 0425dac | EditorSectionList.jsx, ReportEditorPage.jsx |
| 2 | Editor routing + Sidebar nav | 67205a6 | WorkspaceShell.jsx, Sidebar.jsx |
| 3 | Verify complete WYSIWYG flow | auto-approved | — |

## Decisions Made

1. **reportId derived from subPath** — WorkspaceShell already derives `subPath` from location. `subPath.split("/")[1] === "new" ? null : subPath.split("/")[1] || null` cleanly handles both `/editor/new` and `/editor/:id` without additional routing logic.

2. **Strip DnD ids before save** — Runtime ids (`crypto.randomUUID()`) added for DnD stability should not be persisted in the database. `sections.map(({ id, ...rest }) => rest)` strips them cleanly before the API call.

3. **Active state OR condition in Sidebar** — `page` from WorkspaceShell is `currentPage` which is "editor" (the first path segment), but the nav item id is "editor/new". Added explicit OR to isActive check so the Editeur item highlights correctly when editing any report or creating a new one.

4. **Editer button only shown when viewingReport is truthy** — The button navigates to `/${slug}/editor/${viewingReport.id}`. Showing it during load (when viewingReport is null) would produce broken navigation.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria passed. Vite build succeeded with no errors (only expected chunk-size warnings from existing dependencies).

## Self-Check: PASSED
