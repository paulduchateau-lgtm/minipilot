---
phase: 01-feedback-iteratif
plan: 03
subsystem: ui
tags: [react, jsx, version-history, diff, compare, dark-theme]

# Dependency graph
requires:
  - phase: 01-feedback-iteratif
    provides: "01-01: report_versions DB table + getReportVersions/getReportVersion API endpoints + frontend api.js client methods"
  - phase: 01-feedback-iteratif
    provides: "01-02: ReportFeedbackPanel component, FullReport with feedback state, RenderSection inline annotations"
provides:
  - "ReportVersionPanel component — version history list with per-version feedback preview and compare trigger"
  - "ReportCompareView component — split-pane comparison with diff detection (MODIFIE/NOUVEAU badges)"
  - "FullReport updated with VERSION badge (IBM Plex Mono pill), version panel toggle, compare mode"
  - "Complete iterative feedback loop: generate -> annotate -> iterate -> compare versions"
affects: [02-editeur-wysiwyg, phase-2]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compare mode as full content replacement — compareMode ternary replaces main content, header persists"
    - "Diff detection via index-aligned section comparison (title + insight equality check)"
    - "Version panel refetch on currentVersion change — ensures history refreshes after each iterate"
    - "isNarrow state via matchMedia for responsive split-pane without CSS modules"

key-files:
  created:
    - minipilot/app/src/components/ReportVersionPanel.jsx
    - minipilot/app/src/components/ReportCompareView.jsx
  modified:
    - minipilot/app/src/components/FullReport.jsx

key-decisions:
  - "Compare mode replaces full content area (not sidebar overlay) — cleaner two-column layout at full width"
  - "Version panel refetches when currentVersion changes — ensures new versions appear immediately after iterate"
  - "matchMedia useEffect for responsive layout — avoids CSS module dependency, consistent with project inline-style pattern"

patterns-established:
  - "Version badge pattern: IBM Plex Mono pill with ChevronDown rotation (180ms ease), aria-expanded"
  - "Diff badge pattern: pill shape, role='status', opacity fade-in staggered 0.05s per section"
  - "Compare exit pattern: onExit callback resets compareMode and compareVersionNum to null"

requirements-completed: [FEED-04, FEED-05]

# Metrics
duration: ~15min
completed: 2026-03-22
---

# Phase 01 Plan 03: Version History Panel and Comparison View Summary

**ReportVersionPanel and ReportCompareView components completing the iterative feedback loop with version history browsing and split-pane diff comparison using MODIFIE/NOUVEAU badges**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-22
- **Completed:** 2026-03-22
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify, approved)
- **Files modified:** 3

## Accomplishments

- Created ReportVersionPanel: fetches version history, renders version rows with feedback preview (60-char truncation), current version highlighted with accent border, "Comparer" ghost button per past version, empty state copy
- Created ReportCompareView: split-pane grid (1fr 1fr, responsive via matchMedia), fetches past version snapshot, detectChangedSections diff logic, MODIFIE/NOUVEAU badges with staggered opacity animation, RenderSection reuse in both panes
- Integrated into FullReport: VERSION N badge (IBM Plex Mono pill, ChevronDown toggle), versionPanelOpen/compareMode/compareVersionNum state, compare mode replaces main content while header persists, handleIterate success resets all version state
- Human verification approved: feedback drawer, VERSION badge, version panel, compare view all confirmed working in browser with no console errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ReportVersionPanel and ReportCompareView components** - `57bb039` (feat)
2. **Task 2: Integrate version panel and compare view into FullReport** - `7f1004f` (feat)
3. **Task 3: Verify complete feedback iteration flow** - checkpoint:human-verify, approved by user

## Files Created/Modified

- `minipilot/app/src/components/ReportVersionPanel.jsx` — Version history list with feedback previews, compare trigger, empty state, aria-label="Historique des versions"
- `minipilot/app/src/components/ReportCompareView.jsx` — Split-pane comparison, detectChangedSections diff, MODIFIE/NOUVEAU badges with stagger animation, aria-label="Comparaison de versions"
- `minipilot/app/src/components/FullReport.jsx` — VERSION badge, versionPanelOpen/compareMode state, ReportVersionPanel and ReportCompareView integration

## Decisions Made

- Compare mode replaces the full content area (objective + KPIs + sections block) while the header (title, action buttons, version badge) stays visible in both normal and compare modes — gives full width for the split-pane grid
- Version panel refetches on both `reportId` and `currentVersion` dependency — ensures the panel updates automatically after each iterate call without user having to close/reopen
- Responsive layout uses `matchMedia('(max-width: 768px)')` in a useEffect to set `isNarrow` state — consistent with the project's inline-style pattern, no extra CSS dependency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 01 (Feedback Iteratif) is fully complete: all 5 success criteria met (global feedback, section annotations, AI iteration, version history, side-by-side comparison)
- Requirements FEED-01 through FEED-05 all satisfied
- Phase 02 (Editeur WYSIWYG) can begin — depends on Phase 01 completion, which is now done
- FullReport component is the main integration surface for any WYSIWYG editing work in Phase 02

---
*Phase: 01-feedback-iteratif*
*Completed: 2026-03-22*
