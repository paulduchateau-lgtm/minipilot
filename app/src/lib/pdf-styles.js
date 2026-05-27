// ── TheFork PDF Template Styles (CSS-in-JS) ─────────────────────
// REF-DS/THEFORK-PDF-STYLES v1.0
//
// All styles use theForkTokens for brand consistency.
// Object syntax is compatible with React inline styles (camelCase).

import { theForkTokens as t } from './thefork-tokens.js'

// ── A4 Page Layout ───────────────────────────────────────────────

export const pdfPageStyle = {
  width: '210mm',
  minHeight: '297mm',
  margin: '0 auto',
  padding: t.scale.space.page,
  backgroundColor: t.color.paper,
  fontFamily: t.typography.body.family,
  fontWeight: t.typography.body.weight,
  fontSize: t.scale.size.body,
  color: t.color.ink[900],
  lineHeight: 1.5,
  fontFeatureSettings: '"tnum" 1',
  fontVariantNumeric: 'tabular-nums',
  boxSizing: 'border-box',
  position: 'relative',
}

// ── Header Bar ───────────────────────────────────────────────────

export const pdfHeaderStyle = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.color.brand.primary,
    padding: '12px 24px',
    marginBottom: t.scale.space.block,
    borderRadius: t.radius,
  },
  logoArea: {
    width: '140px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: '#FFFFFF',
    fontFamily: t.typography.display.family,
    fontWeight: t.typography.display.weight,
    fontSize: '16pt',
    letterSpacing: '0.02em',
  },
  titleArea: {
    flex: 1,
    textAlign: 'right',
    color: '#FFFFFF',
    fontFamily: t.typography.body.family,
    fontWeight: 500,
    fontSize: t.scale.size.h3,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: t.typography.body.family,
    fontWeight: t.typography.body.weight,
    fontSize: t.scale.size.caption,
    marginTop: '2px',
  },
}

// ── KPI Grid (4-column strip) ────────────────────────────────────

export const pdfKpiGridStyle = {
  wrapper: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: t.scale.space.block,
    marginBottom: t.scale.space.block,
  },
  card: {
    padding: '16px',
    backgroundColor: '#FFFFFF',
    border: `1px solid ${t.color.ink[100]}`,
    borderRadius: t.radius,
    textAlign: 'center',
  },
  heroValue: {
    fontFamily: t.typography.display.family,
    fontWeight: t.typography.display.weight,
    fontSize: t.scale.size.kpiHero,
    color: t.color.brand.primary,
    lineHeight: 1.1,
    fontFeatureSettings: '"tnum" 1',
    fontVariantNumeric: 'tabular-nums',
  },
  label: {
    fontFamily: t.typography.body.family,
    fontWeight: 500,
    fontSize: t.scale.size.kpiLabel,
    color: t.color.ink[500],
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginTop: '6px',
  },
  variation: {
    fontFamily: t.typography.mono.family,
    fontWeight: t.typography.mono.weight,
    fontSize: t.scale.size.caption,
    marginTop: '4px',
    fontFeatureSettings: '"tnum" 1',
    fontVariantNumeric: 'tabular-nums',
  },
}

// ── Section Wrapper ──────────────────────────────────────────────

export const pdfSectionStyle = {
  wrapper: {
    marginBottom: t.scale.space.block,
    pageBreakInside: 'avoid',
  },
  title: {
    fontFamily: t.typography.display.family,
    fontWeight: t.typography.display.weight,
    fontSize: t.scale.size.h2,
    color: t.color.ink[900],
    marginBottom: t.scale.space.tight,
    paddingBottom: t.scale.space.tight,
    borderBottom: `2px solid ${t.color.brand.primary}`,
  },
  chartArea: {
    backgroundColor: '#FFFFFF',
    border: `1px solid ${t.color.ink[100]}`,
    borderRadius: t.radius,
    padding: '16px',
    marginTop: t.scale.space.tight,
  },
}

// ── Interpretation Block ─────────────────────────────────────────

export const pdfInterpretationStyle = {
  wrapper: {
    backgroundColor: t.color.brand.primarySoft,
    borderLeft: `4px solid ${t.color.brand.primary}`,
    borderRadius: t.radius,
    padding: '12px 16px',
    marginTop: t.scale.space.tight,
    marginBottom: t.scale.space.block,
  },
  label: {
    fontFamily: t.typography.body.family,
    fontWeight: 500,
    fontSize: t.scale.size.caption,
    color: t.color.brand.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '4px',
  },
  text: {
    fontFamily: t.typography.body.family,
    fontWeight: t.typography.body.weight,
    fontSize: t.scale.size.body,
    color: t.color.ink[700],
    lineHeight: 1.6,
  },
}

// ── Footer ───────────────────────────────────────────────────────

export const pdfFooterStyle = {
  wrapper: {
    position: 'absolute',
    bottom: t.scale.space.page,
    left: t.scale.space.page,
    right: t.scale.space.page,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: `1px solid ${t.color.ink[300]}`,
    paddingTop: '8px',
  },
  text: {
    fontFamily: t.typography.body.family,
    fontWeight: t.typography.body.weight,
    fontSize: t.scale.size.caption,
    color: t.color.ink[500],
  },
  // Template: "The Fork — Rapport interne — Pilot Pilotage Financier — {date}"
  getLabel: (date) =>
    `The Fork — Rapport interne — Pilot Pilotage Financier — ${date}`,
  pageNumber: {
    fontFamily: t.typography.mono.family,
    fontWeight: t.typography.mono.weight,
    fontSize: t.scale.size.caption,
    color: t.color.ink[500],
    fontFeatureSettings: '"tnum" 1',
    fontVariantNumeric: 'tabular-nums',
  },
}

// ── Cover Page ───────────────────────────────────────────────────

export const pdfCoverStyle = {
  wrapper: {
    width: '210mm',
    height: '297mm',
    padding: t.scale.space.page,
    backgroundColor: t.color.paper,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    position: 'relative',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '6px',
    backgroundColor: t.color.brand.primary,
  },
  logoArea: {
    width: '180px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.color.brand.primarySoft,
    color: t.color.brand.primaryDark,
    fontFamily: t.typography.display.family,
    fontWeight: t.typography.display.weight,
    fontSize: '20pt',
    marginBottom: '48px',
  },
  title: {
    fontFamily: t.typography.display.family,
    fontWeight: t.typography.display.weight,
    fontSize: '36pt',
    color: t.color.ink[900],
    lineHeight: 1.15,
    marginBottom: '16px',
    maxWidth: '80%',
  },
  period: {
    fontFamily: t.typography.body.family,
    fontWeight: 500,
    fontSize: t.scale.size.h2,
    color: t.color.brand.primary,
    marginBottom: '8px',
  },
  addressee: {
    fontFamily: t.typography.body.family,
    fontWeight: t.typography.body.weight,
    fontSize: t.scale.size.h3,
    color: t.color.ink[500],
    marginBottom: '32px',
  },
  divider: {
    width: '60px',
    height: '3px',
    backgroundColor: t.color.brand.primary,
    marginBottom: '24px',
  },
  meta: {
    fontFamily: t.typography.mono.family,
    fontWeight: t.typography.mono.weight,
    fontSize: t.scale.size.caption,
    color: t.color.ink[500],
    letterSpacing: '0.06em',
    fontFeatureSettings: '"tnum" 1',
    fontVariantNumeric: 'tabular-nums',
  },
}
