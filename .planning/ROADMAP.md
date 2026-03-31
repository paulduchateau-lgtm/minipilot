# Roadmap: Minipilot — v1.1 Report Studio

## Overview

Milestone v1.1 transforms Minipilot from an AI-only report generator into a full report studio. Four phases build on each other: iteration feedback grounds report quality, the WYSIWYG editor enables manual authoring, report import leverages both to recreate existing documents, and scheduling automates recurring delivery. Every v1.1 requirement maps to exactly one phase.

## Milestones

- ✅ **v1.1 Report Studio** — Phases 1-4 (complete)

## Phases

### ✅ v1.1 Report Studio (Complete)

**Milestone Goal:** Users can import existing reports, edit them visually, refine them iteratively, and schedule automated generation with data refresh.

- [x] **Phase 1: Feedback Itératif** — Users can annotate and iterate on AI-generated reports with version history (completed 2026-03-22)
- [x] **Phase 2: Editeur WYSIWYG** — Users can build and edit reports manually with a visual chart and text palette (completed 2026-03-22)
- [x] **Phase 3: Import de Rapports** — Users can upload existing Excel/Word reports and recreate them with their workspace data (completed 2026-03-22)
- [x] **Phase 4: Scheduling** — Users can schedule automated report generation with data source refresh (completed 2026-03-22)

## Phase Details

### Phase 1: Feedback Itératif
**Goal**: Users can improve any report through structured feedback and track what changed between iterations
**Depends on**: Nothing (builds on existing report system)
**Requirements**: FEED-01, FEED-02, FEED-03, FEED-04, FEED-05
**Success Criteria** (what must be TRUE):
  1. User can submit global feedback on a report explaining what works and what needs improvement
  2. User can annotate individual report sections with targeted comments
  3. AI generates a new improved version of the report incorporating the feedback
  4. System preserves the version history so previous iterations are never lost
  5. User can view two versions side by side to confirm what improved
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — Backend: DB migration (report_versions table), iterate/versions API endpoints, frontend API client
- [x] 01-02-PLAN.md — Frontend: Feedback panel (global + section annotations), FullReport integration, AI iteration flow
- [x] 01-03-PLAN.md — Frontend: Version history panel, side-by-side comparison view with diff badges

### Phase 2: Editeur WYSIWYG
**Goal**: Users can create and edit reports from scratch using a visual editor without writing any code
**Depends on**: Phase 1
**Requirements**: WYSI-01, WYSI-02, WYSI-03, WYSI-04, WYSI-05
**Success Criteria** (what must be TRUE):
  1. User can add chart sections (bar, pie, line, table) by selecting from a visual palette
  2. User can add and format rich text sections with bold, italic, and list styles
  3. User can reorder sections by dragging and dropping them into a new position
  4. User sees the final report layout update live as they make edits
  5. User can save a complete report built entirely from the WYSIWYG editor without AI generation
**Plans**: 2 plans
Plans:
- [ ] 02-01-PLAN.md — Install deps, create editor primitives (palette, text editor, chart form, section card), add "text" to RenderSection
- [ ] 02-02-PLAN.md — Wire editor page (DnD list, two-column layout, live preview, routing, sidebar, save)

### Phase 3: Import de Rapports
**Goal**: Users can upload an existing Excel or Word report and get a recreated version populated with their workspace data
**Depends on**: Phase 2
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05
**Success Criteria** (what must be TRUE):
  1. User can upload an .xlsx file as a report template and have it accepted by the system
  2. User can upload a .docx file as a report template and have it accepted by the system
  3. AI identifies KPIs and key metrics present in the uploaded template
  4. AI reconstructs a report matching the structure (sheets, charts, tables, sections) of the original
  5. User can map columns from their workspace data to the fields detected in the imported template
**Plans**: 2 plans
Plans:
- [ ] 03-01-PLAN.md — Backend: install mammoth, parsing helpers (docx/xlsx), AI fingerprint extraction endpoint, API client method
- [ ] 03-02-PLAN.md — Frontend: 3-step import wizard (upload, AI analysis, field mapping), routing, ReportsPage button

### Phase 4: Scheduling
**Goal**: Users can configure recurring report generation that automatically refreshes data and produces new editions
**Depends on**: Phase 3
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05
**Success Criteria** (what must be TRUE):
  1. User can set a report to generate on a recurring schedule (once, daily, weekly, monthly)
  2. User can configure the exact timing parameters — time of day, day of week or month, and end date
  3. User can designate a data source file or folder so each run uses fresh data
  4. Each scheduled execution creates a numbered edition traceable to its run date
  5. User can select an existing report template or describe a new one as the basis for scheduled generation
**Plans**: 2 plans
Plans:
- [x] 04-01-PLAN.md — Backend: install node-cron, create scheduler.js module, DB migration (schedules + schedule_runs), API endpoints, startup rehydration
- [x] 04-02-PLAN.md — Frontend: API client methods, 4-step scheduling wizard, schedule list page, sidebar nav, routing

## Progress

**Execution Order:** 1 → 2 → 3 → 4

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Feedback Itératif | 3/3 | Complete   | 2026-03-22 | - |
| 2. Editeur WYSIWYG | 2/2 | Complete   | 2026-03-22 | - |
| 3. Import de Rapports | 2/2 | Complete   | 2026-03-22 | - |
| 4. Scheduling | 2/2 | Complete   | 2026-03-22 | - |

---
*Roadmap created: 2026-03-22*
*Coverage: 20/20 v1.1 requirements mapped*
