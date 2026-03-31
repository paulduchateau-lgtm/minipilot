# Minipilot — LiteChange Report Engine

## What This Is

Minipilot is an AI-powered report generation engine for change management observability. Users upload data files (Excel, CSV, JSON), define project context, and get AI-generated analytical reports with KPIs, charts, and insights. Built as a React 19 + Express + SQLite application with dual AI modes (Claude/Mistral cloud or Ollama local).

## Core Value

Transform raw organizational data into actionable change management reports — automatically, iteratively, and on schedule.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — existing features. -->

- ✓ Multi-workspace isolation (slug-based multi-tenancy)
- ✓ File upload & parsing (Excel, CSV, JSON) with auto column detection
- ✓ Data transformation pipeline (normalization, type detection, dedup)
- ✓ AI-powered report suggestions (5-8 per workspace)
- ✓ AI report generation with KPIs + chart sections
- ✓ Multi-turn chat interface with report extraction
- ✓ Report management (star, share, trash/restore, PDF export)
- ✓ Onboarding wizard (5-step: upload, context, verify, suggest, transform)
- ✓ Dual AI mode (premium: Claude/Mistral, local: Ollama/Ministral 3B)
- ✓ Chat session persistence with history
- ✓ Iterative feedback loop with version history and side-by-side comparison — Phase 1 v1.1
- ✓ WYSIWYG report editor with chart palette, rich text, drag & drop — Phase 2 v1.1
- ✓ Import existing Excel/Word reports with AI-powered recreation — Phase 3 v1.1
- ✓ Scheduled report generation with data source refresh — Phase 4 v1.1

### Active

<!-- Current scope — no active features, v1.1 complete. -->

(none — v1.1 milestone complete)

### Out of Scope

- Real-time collaboration — single-user focus for now
- External API connectors (Salesforce, SAP) — manual upload only
- Mobile app — web-first
- User authentication/RBAC — workspace-level isolation sufficient

## Current Milestone: v1.1 Report Studio

**Goal:** Transform Minipilot from an AI-only report generator into a full report studio with import, editing, iteration, and scheduling capabilities.

**Target features:**
- Import existing reports (Excel/Word) for AI-powered recreation
- WYSIWYG report builder with chart palette and free text
- Iterative feedback loop for report refinement
- Scheduled report generation with data refresh and notifications

## Context

- **Tech stack:** React 19 + Vite 8, Express 4, SQLite (better-sqlite3), Recharts, html2canvas/jspdf
- **AI integration:** Anthropic SDK (Claude Sonnet 4), Mistral SDK, Ollama (local fallback)
- **Data model:** workspaces → uploaded_files → data_rows → clean_data → reports
- **Report format:** JSON with title, subtitle, objective, KPIs array, sections array (each with chart type, data, config)
- **Chart types supported:** bar, pie, table, composed, grouped_bar, area_multi
- **No existing scheduler, WYSIWYG editor, or file-based report import**
- **Server is a single 3000+ line index.js** — may need modularization

## Constraints

- **Tech stack:** Must stay React + Express + SQLite — no framework migration
- **AI dependency:** Report intelligence must work in both cloud and local modes
- **File size:** Uploads capped at 50MB
- **Single-process:** No background workers — scheduling needs creative approach (cron-like or client-triggered)
- **Design system:** Must follow LiteChange design tokens (CLAUDE.md)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite over Postgres | Simplicity, portability, zero-config | ✓ Good |
| Dual AI mode | Data sovereignty for institutional clients | ✓ Good |
| JSON report format | Flexible schema for AI generation | ✓ Good |
| Client-side PDF | No server-side rendering dependency | — Pending |

---
*Last updated: 2026-03-22 after Phase 1 (Feedback Itératif) completion*
