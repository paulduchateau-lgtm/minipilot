// ── TheFork Brand Tokens for PDF Export ──────────────────────────
// REF-DS/THEFORK-PDF v1.0

export const theForkTokens = {
  color: {
    brand: {
      primary: '#00A082',      // Hero green
      primaryDark: '#007361',
      primaryLight: '#33B59B',
      primarySoft: '#E6F5F2',  // Background for interpretation blocks
    },
    secondary: {
      lime: '#9BCB3C',
      forest: '#1F5E3A',
      mint: '#7FE6C2',
    },
    food: {
      tomato: '#E94E3A',
      saffron: '#F5B82E',
      paprika: '#D9542B',
      aubergine: '#5A2A4D',
      olive: '#7A8C3F',
    },
    ink: {
      900: '#1A1A1A',
      700: '#3D3D3D',
      500: '#737373',
      300: '#BFBFBF',
      100: '#F2F2F2',
    },
    paper: '#FAFAF7',
    finance: {
      positive: '#1F8A3B',
      negative: '#C0392B',
      neutral: '#737373',
      forecast: '#9B8AA8',
    },
  },
  typography: {
    display: { family: '"Outfit", "DM Sans", sans-serif', weight: 600 },
    body: { family: '"Hind", "DM Sans", -apple-system, sans-serif', weight: 400 },
    mono: { family: '"JetBrains Mono", "SF Mono", Consolas, monospace', weight: 400 },
  },
  scale: {
    size: {
      h1: '28pt',
      h2: '20pt',
      h3: '14pt',
      body: '11pt',
      caption: '9pt',
      kpiHero: '48pt',
      kpiLabel: '10pt',
    },
    space: {
      page: '20mm',
      block: '8mm',
      tight: '3mm',
    },
  },
  radius: '0',
}

// ── Financial formatting ─────────────────────────────────────────

const frFR = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const frFRCompact = new Intl.NumberFormat('fr-FR', {
  notation: 'compact',
  compactDisplay: 'short',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

/**
 * Format a financial value with fr-FR locale.
 * @param {number} value
 * @param {'eur'|'usd'|'pct'|'number'} type
 * @returns {string}
 */
export function formatFinancialValue(value, type = 'number') {
  if (value == null || isNaN(value)) return '—'

  const formatted = Math.abs(value) >= 1_000_000
    ? frFRCompact.format(value)
    : frFR.format(value)

  switch (type) {
    case 'eur':
      return `${formatted} €`
    case 'usd':
      return `$${formatted}`
    case 'pct':
      return `${frFR.format(value)} %`
    case 'number':
    default:
      return formatted
  }
}

// ── Variation formatting ─────────────────────────────────────────

const ARROWS = [
  { min: 5, arrow: '↑' },
  { min: 1, arrow: '↗' },
  { min: -1, arrow: '→' },
  { min: -5, arrow: '↘' },
  { min: -Infinity, arrow: '↓' },
]

function pickArrow(pct) {
  for (const { min, arrow } of ARROWS) {
    if (pct >= min) return arrow
  }
  return '→'
}

function pickColor(pct) {
  if (pct > 1) return theForkTokens.color.finance.positive
  if (pct < -1) return theForkTokens.color.finance.negative
  return theForkTokens.color.finance.neutral
}

/**
 * Format a variation with arrow, absolute value and percentage.
 * @param {number} value  — absolute delta (e.g. 1_200_000)
 * @param {number} pct    — percentage delta (e.g. 8.4)
 * @returns {{ text: string, color: string }}
 */
export function formatVariation(value, pct) {
  if (value == null || pct == null) return { text: '—', color: theForkTokens.color.finance.neutral }

  const arrow = pickArrow(pct)
  const sign = value >= 0 ? '+' : '-'
  const absText = formatFinancialValue(Math.abs(value), 'eur')
  const pctSign = pct >= 0 ? '+' : '-'
  const pctText = frFR.format(Math.abs(pct))

  return {
    text: `${arrow} ${sign}${absText} (${pctSign}${pctText} %)`,
    color: pickColor(pct),
  }
}

// ── Chart color palette ──────────────────────────────────────────

/**
 * 8-color palette for Recharts, derived from brand + food tokens.
 */
export const theForkChartColors = [
  '#00645A',                              // TheFork deep teal — couleur de base
  theForkTokens.color.food.saffron,       // #F5B82E — saffron
  theForkTokens.color.food.tomato,        // #E94E3A — tomato
  theForkTokens.color.brand.primary,      // #00A082 — hero green
  theForkTokens.color.secondary.lime,     // #9BCB3C — lime
  theForkTokens.color.food.aubergine,     // #5A2A4D — aubergine
  theForkTokens.color.food.olive,         // #7A8C3F — olive
  theForkTokens.color.food.paprika,       // #D9542B — paprika
]
