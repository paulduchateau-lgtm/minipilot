import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, ComposedChart, Line,
} from "recharts";
import {
  theForkTokens as T,
  theForkChartColors as CHART_COLORS,
  formatFinancialValue,
} from "../lib/thefork-tokens";

// ── TheFork palette (flat shortcuts) ─────────────────────────────
const C = {
  bg:         T.color.paper,            // #FAFAF7
  surface:    "#FFFFFF",
  text:       T.color.ink[900],         // #1A1A1A
  textSec:    T.color.ink[700],         // #3D3D3D
  textMuted:  T.color.ink[500],         // #737373
  border:     T.color.ink[300],         // #BFBFBF
  borderSub:  T.color.ink[100],         // #F2F2F2
  brand:      T.color.brand.primary,    // #00A082
  brandDark:  T.color.brand.primaryDark,// #007361
  brandSoft:  T.color.brand.primarySoft,// #E6F5F2
  positive:   T.color.finance.positive, // #1F8A3B
  negative:   T.color.finance.negative, // #C0392B
  neutral:    T.color.finance.neutral,  // #737373
};

const FONTS = {
  display: T.typography.display.family,  // "Outfit", "DM Sans", sans-serif
  body:    T.typography.body.family,     // "Hind", "DM Sans", sans-serif
  mono:    T.typography.mono.family,     // "JetBrains Mono", ...
};

// ── Excel serial date helpers ────────────────────────────────────
const EXCEL_EPOCH = new Date(1899, 11, 30);
function isExcelDate(v) {
  return typeof v === "number" && v > 40000 && v < 55000 && Number.isInteger(v);
}
function isExcelDateStr(v) {
  if (typeof v !== "string") return false;
  const n = Number(v);
  return !isNaN(n) && n > 40000 && n < 55000 && Number.isInteger(n);
}
function excelToDate(serial) {
  const d = new Date(EXCEL_EPOCH.getTime() + Number(serial) * 86400000);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}
function convertExcelDates(data, xKey) {
  if (!data?.length || !xKey) return data;
  const sample = data[0][xKey];
  if (isExcelDate(sample) || isExcelDateStr(sample)) {
    return data.map(row => ({
      ...row,
      [xKey]: isExcelDate(row[xKey]) ? excelToDate(row[xKey])
            : isExcelDateStr(row[xKey]) ? excelToDate(Number(row[xKey]))
            : row[xKey],
    }));
  }
  return data;
}

// ── Auto-infer chart config when AI didn't provide it ────────────
function inferChartConfig(section) {
  const rawConfig = section.config || {};
  const c = { ...rawConfig };
  if (!c.xKey || !c.yKeys?.length) {
    if (section.xKey) c.xKey = section.xKey;
    if (section.yKeys?.length) c.yKeys = section.yKeys;
    if (section.nameKey) c.nameKey = section.nameKey;
    if (section.valueKey) c.valueKey = section.valueKey;
  }
  if ((!c.xKey || !c.yKeys?.length) && section.data?.length > 0) {
    const sample = section.data[0];
    const skipKeys = new Set(["_count", "data_sources"]);
    const strKeys = [];
    const numKeys = [];
    for (const [k, v] of Object.entries(sample)) {
      if (skipKeys.has(k)) continue;
      if (typeof v === "string" || (typeof v === "number" && isExcelDate(v))) {
        strKeys.push(k);
      }
      if (typeof v === "number" && !isExcelDate(v) && !skipKeys.has(k)) {
        numKeys.push(k);
      }
    }
    if (!c.xKey && strKeys.length > 0) c.xKey = strKeys[0];
    if (!c.xKey && numKeys.length > 1) c.xKey = numKeys[0];
    if (!c.yKeys?.length && numKeys.length > 0) {
      c.yKeys = numKeys.filter(k => k !== c.xKey);
    }
  }
  return c;
}

// ── Color remapping (legacy → TheFork) ───────────────────────────
const remapColor = (color) => {
  const map = {
    "#C8FF3C": C.brand, "#B0D838": C.brand, "#6B8A1A": C.brand,
    "#84A422": C.brand, "#4A90B8": C.brand, "#7AB4D4": C.brand,
    "#C45A32": T.color.food.tomato, "#D4A03A": T.color.food.saffron,
    "#3A8A4A": C.positive, "#E08A68": T.color.food.tomato,
    "#E8C46A": T.color.food.saffron, "#68B474": C.positive,
    "#8B7EC8": T.color.food.aubergine, "#6B5EB8": T.color.food.aubergine,
  };
  return map[color] || color;
};

// ── Chart styling ────────────────────────────────────────────────
const tooltipStyle = {
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 0, color: C.text, fontSize: 12, fontFamily: FONTS.mono,
};
const axisStyle = { fill: C.textMuted, fontSize: 11, fontFamily: FONTS.mono };

const CHART_W = 760;
const CHART_H = 280;

// ── Number formatting (fr-FR) ────────────────────────────────────
const frFR = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});

function formatValue(val, fmt) {
  if (fmt === "money") return formatFinancialValue(val, "eur");
  if (fmt === "eur") return typeof val === "number" ? `${frFR.format(val)} €` : val;
  if (fmt === "pct") return typeof val === "number" ? `${frFR.format(val)} %` : val;
  if (typeof val === "number") return frFR.format(val);
  return val;
}

function getRiskColor(value) {
  if (value === "Élevé" || value === "Critique") return C.negative;
  if (value === "Moyen") return T.color.food.saffron;
  return C.positive;
}

// ── Trend helpers ────────────────────────────────────────────────
function trendArrow(kpi) {
  const t = (kpi.trend || "").toLowerCase();
  if (kpi.bad || t.includes("neg") || t.includes("baiss")) return { arrow: "↓", color: C.negative };
  if (t.includes("neutr") || t.includes("stabl")) return { arrow: "→", color: C.neutral };
  return { arrow: "↑", color: C.positive };
}

// ── Chart sub-components (static, no animation) ──────────────────

function PdfBarChart({ section, config }) {
  const c = config;
  const chartData = convertExcelDates(section.data, c.xKey);
  if (!chartData?.length || !c.yKeys?.length) return null;
  return (
    <BarChart width={CHART_W} height={CHART_H} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
      <XAxis dataKey={c.xKey} tick={axisStyle} axisLine={{ stroke: C.border }} />
      <YAxis tick={axisStyle} axisLine={{ stroke: C.border }} />
      <Tooltip contentStyle={tooltipStyle} />
      {c.yKeys.map((k, i) => (
        <Bar key={k} dataKey={k} fill={remapColor(c.colors?.[i]) || CHART_COLORS[i]}
          radius={0} isAnimationActive={false} />
      ))}
    </BarChart>
  );
}

function PdfGroupedBarChart({ section, config }) {
  const c = config;
  const chartData = convertExcelDates(section.data, c.xKey);
  if (!chartData?.length || !c.yKeys?.length) return null;
  return (
    <BarChart width={CHART_W} height={CHART_H} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
      <XAxis dataKey={c.xKey} tick={axisStyle} axisLine={{ stroke: C.border }} />
      <YAxis tick={axisStyle} axisLine={{ stroke: C.border }} />
      <Tooltip contentStyle={tooltipStyle} />
      <Legend wrapperStyle={{ fontSize: 11, fontFamily: FONTS.body }} />
      {c.yKeys.map((k, i) => (
        <Bar key={k} dataKey={k} fill={remapColor(c.colors?.[i]) || CHART_COLORS[i]}
          name={c.names?.[i] || k} radius={0} isAnimationActive={false} />
      ))}
    </BarChart>
  );
}

function PdfAreaChart({ section, config }) {
  const c = config;
  const chartData = convertExcelDates(section.data, c.xKey);
  if (!chartData?.length || !c.yKeys?.length) return null;
  return (
    <AreaChart width={CHART_W} height={CHART_H} data={chartData}>
      <defs>
        {c.yKeys.map((k, i) => (
          <linearGradient key={k} id={`tf_ag_${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={remapColor(c.colors?.[i]) || CHART_COLORS[i]} stopOpacity={0.25} />
            <stop offset="95%" stopColor={remapColor(c.colors?.[i]) || CHART_COLORS[i]} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
      <XAxis dataKey={c.xKey} tick={axisStyle} axisLine={{ stroke: C.border }} />
      <YAxis tick={axisStyle} axisLine={{ stroke: C.border }} />
      <Tooltip contentStyle={tooltipStyle} />
      <Legend wrapperStyle={{ fontSize: 11, fontFamily: FONTS.body }} />
      {c.yKeys.map((k, i) => (
        <Area key={k} type="monotone" dataKey={k}
          stroke={remapColor(c.colors?.[i]) || CHART_COLORS[i]}
          fill={`url(#tf_ag_${k})`}
          name={c.names?.[i] || k} strokeWidth={2} isAnimationActive={false} />
      ))}
    </AreaChart>
  );
}

function PdfComposedChart({ section, config }) {
  const c = { ...config };
  const chartData = convertExcelDates(section.data, c.xKey);
  if (!chartData?.length) return null;
  // Auto-generate bars/line from yKeys when explicit config is missing
  if (!c.bars?.length && !c.line && c.yKeys?.length) {
    c.bars = c.yKeys.slice(0, -1).map((k, i) => ({ key: k, color: CHART_COLORS[i], name: k }));
    c.line = { key: c.yKeys[c.yKeys.length - 1], color: CHART_COLORS[c.yKeys.length - 1], name: c.yKeys[c.yKeys.length - 1] };
  }
  return (
    <ComposedChart width={CHART_W} height={CHART_H} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
      <XAxis dataKey={c.xKey} tick={axisStyle} axisLine={{ stroke: C.border }} />
      <YAxis yAxisId="left" tick={axisStyle} axisLine={{ stroke: C.border }} />
      <YAxis yAxisId="right" orientation="right" tick={axisStyle} axisLine={{ stroke: C.border }} />
      <Tooltip contentStyle={tooltipStyle} />
      <Legend wrapperStyle={{ fontSize: 11, fontFamily: FONTS.body }} />
      {c.bars?.map(b => (
        <Bar key={b.key} yAxisId="left" dataKey={b.key}
          fill={remapColor(b.color)} name={b.name}
          radius={0} isAnimationActive={false} />
      ))}
      {c.line && (
        <Line yAxisId="right" type="monotone" dataKey={c.line.key}
          stroke={remapColor(c.line.color)} name={c.line.name}
          strokeWidth={2.5} dot={{ r: 3, fill: remapColor(c.line.color) }}
          isAnimationActive={false} />
      )}
    </ComposedChart>
  );
}

function PdfPieMulti({ section, config }) {
  const c = config;
  // Support both data_sets format and flat data format
  let pieDataSets = section.data_sets;
  if (!pieDataSets?.length && section.data?.length) {
    const nameK = c.nameKey || c.xKey || Object.keys(section.data[0]).find(k => typeof section.data[0][k] === "string" && k !== "_count");
    const valK = c.valueKey || (c.yKeys?.[0]) || Object.keys(section.data[0]).find(k => typeof section.data[0][k] === "number" && k !== "_count");
    if (nameK && valK) {
      pieDataSets = [{
        label: section.title || "",
        data: section.data.map(row => ({ name: row[nameK], value: row[valK] })),
      }];
    }
  }
  if (!pieDataSets?.length) return null;
  return (
    <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
      {pieDataSets.map((ds, di) => {
        const items = ds.data || [];
        return (
          <div key={di} style={{ textAlign: "center", minWidth: 260 }}>
            <span style={{
              fontFamily: FONTS.mono, fontSize: 10, textTransform: "uppercase",
              letterSpacing: "0.15em", color: C.textMuted, display: "block", marginBottom: 8,
            }}>{ds.label}</span>
            <PieChart width={280} height={200}>
              <Pie data={items} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={75} label={false} strokeWidth={2} stroke={C.surface}
                isAnimationActive={false}>
                {items.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, name]} />
            </PieChart>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", justifyContent: "center", marginTop: 4 }}>
              {items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.textMuted }}>
                    {item.name}: <strong style={{ color: C.text }}>{item.value}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PdfTable({ section }) {
  const rawColumns = section.columns || (
    section.data?.length > 0
      ? Object.keys(section.data[0]).map(key => ({
          key, label: key,
          align: typeof section.data[0][key] === "number" ? "right" : "left",
        }))
      : []
  );
  // Filter out _count and data_sources columns
  const columns = rawColumns.filter(col => col.key !== "_count" && col.key !== "data_sources");
  const data = section.data || [];
  if (!columns.length) return null;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: `1px solid ${C.border}` }}>
      <thead>
        <tr style={{ background: C.borderSub }}>
          {columns.map(col => (
            <th key={col.key} style={{
              padding: "8px 12px", textAlign: col.align || "left", color: C.textMuted,
              fontFamily: FONTS.mono, fontWeight: 400, fontSize: 9,
              textTransform: "uppercase", letterSpacing: "0.12em",
              borderBottom: `1px solid ${C.border}`,
            }}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, ri) => (
          <tr key={ri} style={{
            background: ri % 2 === 0 ? "transparent" : C.borderSub,
            borderBottom: `1px solid ${C.borderSub}`,
          }}>
            {columns.map(col => {
              let val = row[col.key];
              if (col.key === "risque") {
                const rColor = getRiskColor(val);
                return (
                  <td key={col.key} style={{ padding: "8px 12px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      background: rColor + "18", padding: "2px 8px",
                      fontFamily: FONTS.mono, fontSize: 9, textTransform: "uppercase",
                      letterSpacing: "0.12em", color: rColor,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: rColor }} />
                      {val}
                    </span>
                  </td>
                );
              }
              // Convert Excel serial dates in table cells
              if (isExcelDate(val)) val = excelToDate(val);
              else if (isExcelDateStr(val)) val = excelToDate(Number(val));
              val = formatValue(val, col.fmt);
              return (
                <td key={col.key} style={{
                  padding: "8px 12px", textAlign: col.align || "left", color: C.text,
                  fontFamily: (col.fmt || col.align === "right") ? FONTS.mono : FONTS.body,
                  fontSize: col.align === "right" ? 10 : 11,
                  fontVariantNumeric: "tabular-nums",
                }}>{val}</td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Interpretation block ─────────────────────────────────────────
const INTERPRETATION_HEADERS = [
  { key: "faits",    label: "Faits clés" },
  { key: "alertes",  label: "Alertes" },
  { key: "actions",  label: "Actions" },
];

function InterpretationBlock({ interpretation }) {
  if (!interpretation) return null;
  const entries = INTERPRETATION_HEADERS.filter(h => interpretation[h.key]);
  if (!entries.length) return null;

  return (
    <div style={{
      background: C.brandSoft, borderLeft: `4px solid ${C.brand}`,
      padding: "14px 18px", marginTop: 14,
    }}>
      {entries.map(({ key, label }) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <span style={{
            fontFamily: FONTS.mono, fontSize: 9, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: C.brandDark, display: "block", marginBottom: 3,
          }}>{label}</span>
          <p style={{
            fontSize: 11, color: C.textSec, lineHeight: 1.7, margin: 0,
            fontFamily: FONTS.body,
          }}>{interpretation[key]}</p>
        </div>
      ))}
    </div>
  );
}

// ── Section renderer ─────────────────────────────────────────────
function PdfSection({ section, interpretation }) {
  const config = inferChartConfig(section);

  const renderChart = () => {
    switch (section.type) {
      case "bar":         return <PdfBarChart section={section} config={config} />;
      case "grouped_bar": return <PdfGroupedBarChart section={section} config={config} />;
      case "area_multi":  return <PdfAreaChart section={section} config={config} />;
      case "composed":    return <PdfComposedChart section={section} config={config} />;
      case "pie_multi":   return <PdfPieMulti section={section} config={config} />;
      case "table":       return <PdfTable section={section} />;
      default:            return null;
    }
  };

  return (
    <div data-pdf-block="section" style={{
      background: C.surface, border: `1px solid ${C.border}`,
      marginBottom: 16, overflow: "hidden",
    }}>
      {/* Section title bar */}
      <div style={{
        padding: "12px 20px", borderBottom: `1px solid ${C.borderSub}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 600, color: C.text, fontFamily: FONTS.display,
        }}>{section.title}</span>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* Chart or table */}
        {renderChart()}

        {/* Insight callout (below chart) */}
        {section.insight && (
          <div style={{
            background: C.brandSoft, padding: "10px 14px", marginTop: 14,
            borderLeft: `3px solid ${C.brand}`,
          }}>
            <p style={{
              fontSize: 11, color: C.textSec, lineHeight: 1.7, margin: 0,
              fontFamily: FONTS.body,
            }}>{section.insight}</p>
          </div>
        )}

        {/* Interpretation */}
        <InterpretationBlock interpretation={interpretation} />
      </div>
    </div>
  );
}

// ── Main TheFork PDF renderer ────────────────────────────────────
export default function TheForkPdfRenderer({ report, interpretations }) {
  const kpis = typeof report.kpis === "string" ? JSON.parse(report.kpis) : (report.kpis || []);
  const sections = typeof report.sections === "string" ? JSON.parse(report.sections) : (report.sections || []);
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const interps = interpretations || {};

  return (
    <div style={{
      width: 800, background: C.bg, color: C.text,
      fontFamily: FONTS.body, padding: 0, lineHeight: 1.5,
    }}>

      {/* ── Cover page ── */}
      <div data-pdf-block="cover" style={{ padding: "0 28px 32px" }}>
        {/* Top green bar */}
        <div style={{ height: 8, background: C.brand, margin: "0 -28px 32px" }} />

        {/* TheFork logo */}
        <div style={{ marginBottom: 40 }}>
          <img
            src="/logo_thefork.png"
            alt="TheFork"
            style={{ height: 32, width: "auto", display: "block" }}
            crossOrigin="anonymous"
          />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 28, fontWeight: 600, margin: "0 0 8px",
          fontFamily: FONTS.display, letterSpacing: "-0.02em", color: C.text,
          lineHeight: 1.2,
        }}>{report.title}</h1>

        {/* Subtitle */}
        {report.subtitle && (
          <p style={{
            fontSize: 15, color: C.textMuted, margin: "0 0 24px",
            fontFamily: FONTS.body,
          }}>{report.subtitle}</p>
        )}

        {/* Meta line */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 16,
        }}>
          <span style={{
            fontFamily: FONTS.body, fontSize: 12, color: C.textSec,
          }}>Préparé pour : Direction Financière</span>
          <span style={{
            fontFamily: FONTS.mono, fontSize: 10, color: C.textMuted,
            textTransform: "uppercase", letterSpacing: "0.12em",
          }}>{dateStr}</span>
        </div>

        {/* Bottom credit */}
        <div style={{ marginTop: 32 }}>
          <span style={{
            fontFamily: FONTS.mono, fontSize: 9, color: C.textMuted,
            textTransform: "uppercase", letterSpacing: "0.12em",
          }}>Pilot — Pilotage Financier</span>
        </div>
      </div>

      {/* ── KPI strip ── */}
      {kpis.length > 0 && (
        <div data-pdf-block="kpis" style={{
          display: "grid", gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
          gap: 0, margin: "0 28px 24px", border: `1px solid ${C.border}`,
        }}>
          {kpis.map((kpi, i) => {
            const { arrow, color: tColor } = trendArrow(kpi);
            return (
              <div key={i} style={{
                background: C.surface, padding: "16px 18px",
                borderRight: i < Math.min(kpis.length, 4) - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <span style={{
                  fontFamily: FONTS.mono, fontSize: 9, textTransform: "uppercase",
                  letterSpacing: "0.12em", color: C.textMuted, display: "block", marginBottom: 8,
                }}>{kpi.label}</span>
                <span style={{
                  fontSize: 48, fontWeight: 600, letterSpacing: "-0.02em",
                  display: "block", fontFamily: FONTS.display, color: C.text,
                  fontVariantNumeric: "tabular-nums", lineHeight: 1,
                }}>{kpi.value}</span>
                {kpi.trend && (
                  <span style={{
                    fontFamily: FONTS.mono, fontSize: 11,
                    color: tColor, display: "block", marginTop: 6,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {arrow} {kpi.trend}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Objective ── */}
      {report.objective && (
        <div data-pdf-block="objective" style={{
          background: C.brandSoft, border: `1px solid ${C.border}`,
          padding: "14px 18px", margin: "0 28px 20px",
          borderLeft: `4px solid ${C.brand}`,
        }}>
          <span style={{
            fontFamily: FONTS.mono, fontSize: 9, textTransform: "uppercase",
            letterSpacing: "0.12em", color: C.brandDark, display: "block", marginBottom: 4,
          }}>Objectif du rapport</span>
          <p style={{ fontSize: 12, color: C.textSec, margin: 0, lineHeight: 1.6, fontFamily: FONTS.body }}>
            {report.objective}
          </p>
        </div>
      )}

      {/* ── Sections ── */}
      <div style={{ padding: "0 28px" }}>
        {sections.map((s, i) => (
          <PdfSection key={i} section={s} interpretation={interps[i]} />
        ))}
      </div>

      {/* ── Footer ── */}
      <div data-pdf-block="footer" style={{
        margin: "32px 28px 0", paddingTop: 12, borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingBottom: 20,
      }}>
        <span style={{
          fontFamily: FONTS.mono, fontSize: 9, color: C.textMuted,
        }}>The Fork — Rapport interne — Pilot Pilotage Financier — {dateStr}</span>
        <span style={{
          fontFamily: FONTS.mono, fontSize: 9, color: C.textMuted,
          textTransform: "uppercase", letterSpacing: "0.12em",
        }}>Confidentiel</span>
      </div>
    </div>
  );
}
