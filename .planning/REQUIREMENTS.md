# Requirements: Minipilot

**Defined:** 2026-03-22
**Core Value:** Transform raw organizational data into actionable change management reports — automatically, iteratively, and on schedule.

## v1.1 Requirements

Requirements for milestone v1.1 — Report Studio. Each maps to roadmap phases.

### Import de rapports

- [x] **IMP-01**: User can upload an Excel file (.xlsx) as a report template
- [x] **IMP-02**: User can upload a Word file (.docx) as a report template
- [x] **IMP-03**: AI automatically detects KPIs and key metrics from the uploaded template
- [x] **IMP-04**: AI analyzes the structure (sheets, charts, tables, sections) to recreate an equivalent report
- [x] **IMP-05**: User can map workspace data columns to the fields detected in the imported template

### Editeur WYSIWYG

- [x] **WYSI-01**: User can add chart sections (bar, pie, line, table) from a visual palette
- [x] **WYSI-02**: User can add rich text sections with basic formatting (bold, italic, lists)
- [x] **WYSI-03**: User can reorder report sections via drag & drop
- [x] **WYSI-04**: User sees a live preview of the final report while editing
- [x] **WYSI-05**: User can create a new report entirely from the WYSIWYG editor

### Feedback itératif

- [x] **FEED-01**: User can provide global feedback on a report explaining what works and what doesn't
- [x] **FEED-02**: User can annotate individual sections with feedback
- [x] **FEED-03**: AI regenerates improved report content based on user feedback
- [x] **FEED-04**: System keeps a history of report iterations (versions)
- [x] **FEED-05**: User can compare previous and current versions side by side

### Scheduling

- [x] **SCHED-01**: User can schedule report generation with frequency (once, daily, weekly, monthly)
- [x] **SCHED-02**: User can configure schedule details (time, day of week, day of month, end date)
- [x] **SCHED-03**: User can select a data source folder/file for automatic data refresh
- [x] **SCHED-04**: Each scheduled execution creates a numbered edition of the report
- [x] **SCHED-05**: User can choose an existing report or describe a new one for scheduled generation

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTIF-01**: User receives in-app notification when a scheduled report is ready
- **NOTIF-02**: User receives email notification when a scheduled report is ready
- **NOTIF-03**: User receives SMS notification when a scheduled report is ready
- **NOTIF-04**: User can configure notification channel preferences per schedule

### Collaboration

- **COLLAB-01**: Multiple users can view the same report simultaneously
- **COLLAB-02**: Users can comment on shared reports

## Out of Scope

| Feature | Reason |
|---------|--------|
| External API connectors (Salesforce, SAP) | Manual upload only for now |
| Real-time collaboration editing | Single-user focus for v1.1 |
| Mobile app | Web-first |
| PowerPoint export | PDF export sufficient for v1.1 |
| OAuth/SSO authentication | Workspace-level isolation sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FEED-01 | Phase 1 — Feedback Itératif | Complete |
| FEED-02 | Phase 1 — Feedback Itératif | Complete |
| FEED-03 | Phase 1 — Feedback Itératif | Complete |
| FEED-04 | Phase 1 — Feedback Itératif | Complete |
| FEED-05 | Phase 1 — Feedback Itératif | Complete |
| WYSI-01 | Phase 2 — Editeur WYSIWYG | Complete |
| WYSI-02 | Phase 2 — Editeur WYSIWYG | Complete |
| WYSI-03 | Phase 2 — Editeur WYSIWYG | Complete |
| WYSI-04 | Phase 2 — Editeur WYSIWYG | Complete |
| WYSI-05 | Phase 2 — Editeur WYSIWYG | Complete |
| IMP-01 | Phase 3 — Import de Rapports | Complete |
| IMP-02 | Phase 3 — Import de Rapports | Complete |
| IMP-03 | Phase 3 — Import de Rapports | Complete |
| IMP-04 | Phase 3 — Import de Rapports | Complete |
| IMP-05 | Phase 3 — Import de Rapports | Complete |
| SCHED-01 | Phase 4 — Scheduling | Complete |
| SCHED-02 | Phase 4 — Scheduling | Complete |
| SCHED-03 | Phase 4 — Scheduling | Complete |
| SCHED-04 | Phase 4 — Scheduling | Complete |
| SCHED-05 | Phase 4 — Scheduling | Complete |

**Coverage:**
- v1.1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 — traceability populated after roadmap creation*
