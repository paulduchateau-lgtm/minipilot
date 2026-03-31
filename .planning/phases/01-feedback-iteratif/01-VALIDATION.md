---
phase: 1
slug: feedback-iteratif
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend), manual API tests (backend — no test framework yet) |
| **Config file** | none — Wave 0 installs if needed |
| **Quick run command** | `curl -s http://localhost:3001/api/health` |
| **Full suite command** | `cd app && npx vitest run --reporter=verbose 2>/dev/null || echo "no tests configured"` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick health check
- **After every plan wave:** Manual API verification
- **Before `/gsd:verify-work`:** Full manual verification against success criteria
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FEED-04 | integration | `curl -s localhost:3001/api/w/test/reports/1/versions` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | FEED-01 | integration | `curl -X POST localhost:3001/api/w/test/reports/1/iterate -H 'Content-Type: application/json' -d '{"feedback":"test"}'` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | FEED-02 | integration | `curl -X POST localhost:3001/api/w/test/reports/1/iterate` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | FEED-03 | integration | API returns new version with improved content | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | FEED-05 | manual | Visual comparison of two report versions side by side | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Report versioning table created in SQLite schema
- [ ] API endpoints registered and responding

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Side-by-side comparison view renders correctly | FEED-05 | Visual layout verification | Open FullReport, click compare, verify two versions displayed |
| Feedback panel UX is intuitive | FEED-01, FEED-02 | UX quality assessment | Submit global and section feedback, verify flow |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
