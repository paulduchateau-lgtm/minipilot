import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, ComposedChart, Line,
} from "recharts";

// ── Light-theme palette (hardcoded for PDF isolation) ──────────────
const C = {
  bg:        "#F5F4F0",
  surface:   "#FFFFFF",
  text:      "#1C1D1A",
  textSec:   "#4E5444",
  textMuted: "#8C8A82",
  accent:    "#6B8A1A",
  border:    "#E0DDD6",
  borderSub: "#ECEAE4",
  signal:    "#4A90B8",
  warm:      "#C45A32",
  success:   "#3A8A4A",
  warning:   "#D4A03A",
  accentDim: "rgba(107,138,26,0.06)",
};

const CHART_COLORS = ["#6B8A1A", "#4A90B8", "#C45A32", "#D4A03A", "#3A8A4A", "#6B5EB8", "#4A90B8", "#6B8A1A"];

const FONTS = {
  display: "'Source Serif 4', Georgia, serif",
  body:    "'DM Sans', 'Helvetica Neue', sans-serif",
  data:    "'IBM Plex Mono', Menlo, monospace",
};

const remapColor = (color) => {
  const map = {
    "#C8FF3C": C.accent, "#B0D838": C.accent, "#4A90B8": C.signal,
    "#C45A32": C.warm, "#D4A03A": C.warning, "#3A8A4A": C.success,
    "#7AB4D4": C.signal, "#E08A68": C.warm, "#E8C46A": C.warning,
    "#68B474": C.success, "#8B7EC8": "#6B5EB8", "#84A422": C.accent,
    "#6B8A1A": C.accent,
  };
  return map[color] || color;
};

const tooltipStyle = {
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 6, color: C.text, fontSize: 12, fontFamily: FONTS.data,
};
const axisStyle = { fill: "#A8A69E", fontSize: 11, fontFamily: FONTS.data };

// ── Format helpers ─────────────────────────────────────────────────
function formatValue(val, fmt) {
  if (fmt === "money") return typeof val === "number" ? (val >= 1e6 ? `${(val/1e6).toFixed(1)}M €` : val >= 1000 ? `${Math.round(val/1000)}k €` : `${val} €`) : val;
  if (fmt === "eur") return typeof val === "number" ? `${val} €` : val;
  if (fmt === "pct") return typeof val === "number" ? `${val.toFixed(1)}%` : val;
  return val;
}

function getRiskColor(value) {
  if (value === "Élevé" || value === "Critique") return C.warm;
  if (value === "Moyen") return C.warning;
  return C.success;
}

// ── Chart components (static, no animation) ────────────────────────
const CHART_W = 760;
const CHART_H = 280;

function PdfBarChart({ section }) {
  const c = section.config || {};
  if (!section.data?.length || !c.yKeys?.length) return null;
  return (
    <BarChart width={CHART_W} height={CHART_H} data={section.data}>
      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
      <XAxis dataKey={c.xKey} tick={axisStyle} axisLine={{ stroke: C.border }} />
      <YAxis tick={axisStyle} axisLine={{ stroke: C.border }} />
      <Tooltip contentStyle={tooltipStyle} />
      {c.yKeys.map((k, i) => (
        <Bar key={k} dataKey={k} fill={remapColor(c.colors?.[i]) || CHART_COLORS[i]}
          radius={[3,3,0,0]} isAnimationActive={false} />
      ))}
    </BarChart>
  );
}

function PdfGroupedBarChart({ section }) {
  const c = section.config || {};
  if (!section.data?.length || !c.yKeys?.length) return null;
  return (
    <BarChart width={CHART_W} height={CHART_H} data={section.data}>
      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
      <XAxis dataKey={c.xKey} tick={axisStyle} axisLine={{ stroke: C.border }} />
      <YAxis tick={axisStyle} axisLine={{ stroke: C.border }} />
      <Tooltip contentStyle={tooltipStyle} />
      <Legend wrapperStyle={{ fontSize: 11, fontFamily: FONTS.body }} />
      {c.yKeys.map((k, i) => (
        <Bar key={k} dataKey={k} fill={remapColor(c.colors?.[i]) || CHART_COLORS[i]}
          name={c.names?.[i] || k} radius={[3,3,0,0]} isAnimationActive={false} />
      ))}
    </BarChart>
  );
}

function PdfAreaChart({ section }) {
  const c = section.config || {};
  if (!section.data?.length || !c.yKeys?.length) return null;
  return (
    <AreaChart width={CHART_W} height={CHART_H} data={section.data}>
      <defs>
        {c.yKeys.map((k, i) => (
          <linearGradient key={k} id={`pdf_ag_${k}`} x1="0" y1="0" x2="0" y2="1">
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
          fill={`url(#pdf_ag_${k})`}
          name={c.names?.[i] || k} strokeWidth={2} isAnimationActive={false} />
      ))}
    </AreaChart>
  );
}

function PdfComposedChart({ section }) {
  const c = section.config || {};
  if (!section.data?.length) return null;
  return (
    <ComposedChart width={CHART_W} height={CHART_H} data={section.data}>
      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
      <XAxis dataKey={c.xKey} tick={axisStyle} axisLine={{ stroke: C.border }} />
      <YAxis yAxisId="left" tick={axisStyle} axisLine={{ stroke: C.border }} />
      <YAxis yAxisId="right" orientation="right" tick={axisStyle} axisLine={{ stroke: C.border }} />
      <Tooltip contentStyle={tooltipStyle} />
      <Legend wrapperStyle={{ fontSize: 11, fontFamily: FONTS.body }} />
      {c.bars?.map(b => (
        <Bar key={b.key} yAxisId="left" dataKey={b.key}
          fill={remapColor(b.color)} name={b.name}
          radius={[3,3,0,0]} isAnimationActive={false} />
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

function PdfPieMulti({ section }) {
  if (!section.data_sets?.length) return null;
  return (
    <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
      {section.data_sets.map((ds, di) => {
        const items = ds.data || [];
        return (
          <div key={di} style={{ textAlign: "center", minWidth: 260 }}>
            <span style={{
              fontFamily: FONTS.data, fontSize: 10, textTransform: "uppercase",
              letterSpacing: "0.1em", color: C.textMuted, display: "block", marginBottom: 8,
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
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontFamily: FONTS.data, fontSize: 9, color: C.textMuted }}>
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
  const columns = section.columns || (
    section.data?.length > 0
      ? Object.keys(section.data[0]).map(key => ({ key, label: key, align: typeof section.data[0][key] === "number" ? "right" : "left" }))
      : []
  );
  const data = section.data || [];
  if (!columns.length) return null;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 6 }}>
      <thead>
        <tr style={{ background: C.borderSub }}>
          {columns.map(col => (
            <th key={col.key} style={{
              padding: "8px 12px", textAlign: col.align || "left", color: C.textMuted,
              fontFamily: FONTS.data, fontWeight: 500, fontSize: 9,
              textTransform: "uppercase", letterSpacing: "0.1em",
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
                      background: rColor + "18", padding: "2px 8px", borderRadius: 9999,
                      fontFamily: FONTS.data, fontSize: 9, textTransform: "uppercase",
                      letterSpacing: "0.1em", color: rColor,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: rColor }} />
                      {val}
                    </span>
                  </td>
                );
              }
              val = formatValue(val, col.fmt);
              return (
                <td key={col.key} style={{
                  padding: "8px 12px", textAlign: col.align || "left", color: C.text,
                  fontFamily: (col.fmt || col.align === "right") ? FONTS.data : FONTS.body,
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

// ── Section renderer ───────────────────────────────────────────────
function PdfSection({ section }) {
  const renderChart = () => {
    switch (section.type) {
      case "bar":         return <PdfBarChart section={section} />;
      case "grouped_bar": return <PdfGroupedBarChart section={section} />;
      case "area_multi":  return <PdfAreaChart section={section} />;
      case "composed":    return <PdfComposedChart section={section} />;
      case "pie_multi":   return <PdfPieMulti section={section} />;
      case "table":       return <PdfTable section={section} />;
      default:            return null;
    }
  };

  return (
    <div data-pdf-block="section" className="pdf-section" style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, marginBottom: 16, overflow: "hidden",
    }}>
      {/* Section title */}
      <div style={{
        padding: "12px 20px", borderBottom: `1px solid ${C.borderSub}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 500, color: C.text, fontFamily: FONTS.body,
        }}>{section.title}</span>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* Insight / analysis text */}
        {section.insight && (
          <div style={{
            background: C.accentDim, borderRadius: 6,
            padding: "10px 14px", marginBottom: 14,
            borderLeft: `3px solid ${C.accent}`,
          }}>
            <p style={{
              fontSize: 11, color: C.textSec, lineHeight: 1.7, margin: 0,
              fontFamily: FONTS.body,
            }}>{section.insight}</p>
          </div>
        )}

        {/* Chart or table */}
        {renderChart()}
      </div>
    </div>
  );
}

// ── Main PDF report renderer ───────────────────────────────────────
export default function PdfReportRenderer({ report }) {
  const kpis = typeof report.kpis === "string" ? JSON.parse(report.kpis) : (report.kpis || []);
  const sections = typeof report.sections === "string" ? JSON.parse(report.sections) : (report.sections || []);
  const color = report.color || C.signal;
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{
      width: 800, background: C.bg, color: C.text,
      fontFamily: FONTS.body, padding: "32px 28px",
      lineHeight: 1.5,
    }}>
      {/* ── Header bar ── */}
      <div data-pdf-block="header" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 28, paddingBottom: 16, borderBottom: `2px solid ${C.accent}`,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
          <span style={{
            fontFamily: FONTS.display, fontStyle: "italic", fontWeight: 300,
            fontSize: 20, color: C.accent,
          }}>lite</span>
          <span style={{
            fontFamily: FONTS.display, fontWeight: 400, fontSize: 20, color: C.text,
          }}>Change</span>
        </div>
        <span style={{
          fontFamily: FONTS.data, fontSize: 10, color: C.textMuted,
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>{dateStr}</span>
      </div>

      {/* ── Report title ── */}
      <div data-pdf-block="title" style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: 24, fontWeight: 400, margin: "0 0 6px",
          fontFamily: FONTS.display, letterSpacing: "-0.02em", color: C.text,
        }}>{report.title}</h1>
        {report.subtitle && (
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>{report.subtitle}</p>
        )}
      </div>

      {/* ── Objective ── */}
      {report.objective && (
        <div data-pdf-block="objective" style={{
          background: C.accentDim, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "14px 18px", marginBottom: 20,
          borderLeft: `3px solid ${C.accent}`,
        }}>
          <span style={{
            fontFamily: FONTS.data, fontSize: 9, textTransform: "uppercase",
            letterSpacing: "0.1em", color: C.accent, display: "block", marginBottom: 4,
          }}>Objectif du rapport</span>
          <p style={{ fontSize: 12, color: C.textSec, margin: 0, lineHeight: 1.6 }}>
            {report.objective}
          </p>
        </div>
      )}

      {/* ── KPIs ── */}
      {kpis.length > 0 && (
        <div data-pdf-block="kpis" style={{
          display: "grid", gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
          gap: 12, marginBottom: 24,
        }}>
          {kpis.map((kpi, i) => (
            <div key={i} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "14px 16px",
            }}>
              <span style={{
                fontFamily: FONTS.data, fontSize: 9, textTransform: "uppercase",
                letterSpacing: "0.1em", color: C.textMuted, display: "block", marginBottom: 6,
              }}>{kpi.label}</span>
              <span style={{
                fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
                display: "block", fontFamily: FONTS.body, color: C.text,
              }}>{kpi.value}</span>
              {kpi.trend && (
                <span style={{
                  fontFamily: FONTS.data, fontSize: 10,
                  color: kpi.bad ? C.warm : C.success,
                  display: "block", marginTop: 3,
                }}>
                  {kpi.bad ? "↗" : "↘"} {kpi.trend}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Sections ── */}
      {sections.map((s, i) => <PdfSection key={i} section={s} />)}

      {/* ── Footer ── */}
      <div data-pdf-block="footer" style={{
        marginTop: 32, paddingTop: 12, borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{
          fontFamily: FONTS.data, fontSize: 9, color: C.textMuted,
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>Confidentiel</span>
        <span style={{
          fontFamily: FONTS.data, fontSize: 9, color: C.textMuted,
        }}>Généré par liteChange — {dateStr}</span>
      </div>
    </div>
  );
}
