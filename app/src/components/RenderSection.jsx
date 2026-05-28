import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, ComposedChart,
} from "recharts";
import { ChevronDown, ChevronUp, Table as TableIcon, BarChart3, MessageSquare, Database, Download, Eye, Loader2 } from "lucide-react";
import { useChartTheme } from "../data/theme";
import InterpretButton from "./Interpretation/InterpretButton";
import InterpretationPanel from "./Interpretation/InterpretationPanel";

function humanize(key) {
  if (!key) return "";
  if (/^_*(?:empty|unnamed|colonne?|field|champ)_*\d*$/i.test(key)) return "";
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function safeId(str) {
  return String(str).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function formatValue(val, fmt) {
  if (fmt === "money") return typeof val === "number" ? (val >= 1e6 ? `${(val/1e6).toFixed(1)}M €` : val >= 1000 ? `${Math.round(val/1000)}k €` : `${val} €`) : val;
  if (fmt === "eur") return typeof val === "number" ? `${val} €` : val;
  if (fmt === "pct") return typeof val === "number" ? `${val.toFixed(1)}%` : val;
  return val;
}

function getHighlightColor(val) {
  const n = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(n)) {
    if (String(val).includes("Critique")) return "#C45A32";
    if (String(val).includes("Élevé")) return "#C45A32";
    if (String(val).includes("Moyen")) return "#D4A03A";
    return "#3A8A4A";
  }
  if (n > 100) return "#C45A32";
  if (n > 85) return "#D4A03A";
  return "#3A8A4A";
}

function RiskBadge({ value }) {
  const isElevated = value === "Élevé" || value === "Critique";
  const isMedium = value === "Moyen";
  const dotColor = isElevated ? "#C45A32" : isMedium ? "#D4A03A" : "#3A8A4A";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: dotColor + "18", padding: "2px 10px", borderRadius: 9999,
      fontFamily: "var(--font-data)", fontSize: 10, textTransform: "uppercase",
      letterSpacing: "0.1em", color: dotColor,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      {value}
    </span>
  );
}

// Excel serial date helpers (shared between DataTable and RenderSection)
const EXCEL_EPOCH_TABLE = new Date(1899, 11, 30);
function isExcelDateVal(v) {
  const n = typeof v === "number" ? v : (typeof v === "string" ? Number(v) : NaN);
  return !isNaN(n) && n > 40000 && n < 55000 && Number.isInteger(n);
}
function excelToDateStr(serial) {
  const d = new Date(EXCEL_EPOCH_TABLE.getTime() + Number(serial) * 86400000);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function DataTable({ section }) {
  // Derive columns from data keys if columns not provided by AI
  const rawColumns = section.columns || (
    section.data?.length > 0
      ? Object.keys(section.data[0]).map(key => ({ key, label: key, align: typeof section.data[0][key] === "number" ? "right" : "left" }))
      : []
  );
  // Filter out _count column
  const columns = rawColumns.filter(col => col.key !== "_count");
  const data = section.data || [];

  if (columns.length === 0) return <p style={{ fontSize: 13, color: "var(--mp-text-muted)" }}>Aucune donnée à afficher.</p>;

  return (
    <div style={{ overflow: "auto", borderRadius: "var(--radius-sm)", border: "1px solid var(--mp-border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--mp-bg)" }}>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: "10px 14px",
                textAlign: col.align || "left",
                color: "var(--mp-text-muted)",
                fontFamily: "var(--font-data)",
                fontWeight: 500,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                borderBottom: "1px solid var(--mp-border)",
                whiteSpace: "nowrap",
              }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} style={{
              background: ri % 2 === 0 ? "transparent" : "var(--mp-bg)",
              borderBottom: "1px solid var(--mp-border-subtle)",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--mp-accent-dim)"}
            onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? "transparent" : "var(--mp-bg)"}
            >
              {columns.map(col => {
                let val = row[col.key];
                let color = "var(--mp-text)";

                if (col.key === "risque") {
                  return <td key={col.key} style={{ padding: "10px 14px" }}><RiskBadge value={val} /></td>;
                }

                // Convert Excel serial dates in table cells
                if (isExcelDateVal(val)) val = excelToDateStr(val);

                val = formatValue(val, col.fmt);
                if (col.hl) color = getHighlightColor(row[col.key]);

                return (
                  <td key={col.key} style={{
                    padding: "10px 14px",
                    textAlign: col.align || "left",
                    color,
                    fontFamily: (col.fmt || col.align === "right") ? "var(--font-data)" : "inherit",
                    fontSize: col.align === "right" ? 12 : 13,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}>{val}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Extract flat rows from any section shape (data[], data_sets[], etc.)
 */
function extractSectionRows(section) {
  if (Array.isArray(section.data) && section.data.length > 0) return section.data;
  if (Array.isArray(section.data_sets)) {
    // Flatten pie_multi data_sets into rows with a "dataset" column
    const rows = [];
    for (const ds of section.data_sets) {
      if (Array.isArray(ds.data)) {
        for (const row of ds.data) {
          rows.push({ _groupe: ds.label, ...row });
        }
      }
    }
    return rows;
  }
  return [];
}

function exportCSV(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(";")];
  for (const row of rows) {
    lines.push(keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(";") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(";"));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(rows, filename) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const pillBtn = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "none", border: "1px solid var(--mp-border)",
  borderRadius: 9999, padding: "3px 10px", cursor: "pointer",
  fontFamily: "var(--font-data)", fontSize: 10,
  textTransform: "uppercase", letterSpacing: "0.1em",
  color: "var(--mp-text-muted)",
  transition: "color 150ms ease, border-color 150ms ease",
};

function DataInspector({ section }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);

  const sources = section.data_sources;
  const rows = extractSectionRows(section);
  const hasSources = sources?.length > 0;
  const hasData = rows.length > 0;

  if (!hasSources && !hasData) return null;

  const columns = hasData ? Object.keys(rows[0]) : [];
  const slug = (section.title || "data").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

  const hoverOn = e => { e.currentTarget.style.color = "var(--mp-text)"; e.currentTarget.style.borderColor = "var(--mp-text-muted)"; };
  const hoverOff = e => { e.currentTarget.style.color = "var(--mp-text-muted)"; e.currentTarget.style.borderColor = "var(--mp-border)"; };

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Pill buttons row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {hasSources && (
          <button
            onClick={() => setSourcesOpen(!sourcesOpen)}
            style={pillBtn}
            onMouseEnter={hoverOn} onMouseLeave={hoverOff}
            aria-expanded={sourcesOpen}
            aria-label="Afficher les sources de données"
          >
            <Database size={10} />
            {sources.length} source{sources.length > 1 ? "s" : ""}
            {sourcesOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        )}
        {hasData && (
          <>
            <button
              onClick={() => setDataOpen(!dataOpen)}
              style={pillBtn}
              onMouseEnter={hoverOn} onMouseLeave={hoverOff}
              aria-expanded={dataOpen}
              aria-label="Voir les données utilisées"
            >
              <Eye size={10} />
              {rows.length} ligne{rows.length > 1 ? "s" : ""}
              {dataOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            <button
              onClick={() => exportCSV(rows, `${slug}.csv`)}
              style={pillBtn}
              onMouseEnter={hoverOn} onMouseLeave={hoverOff}
              aria-label="Exporter en CSV"
            >
              <Download size={10} />
              CSV
            </button>
            <button
              onClick={() => exportJSON(rows, `${slug}.json`)}
              style={pillBtn}
              onMouseEnter={hoverOn} onMouseLeave={hoverOff}
              aria-label="Exporter en JSON"
            >
              <Download size={10} />
              JSON
            </button>
          </>
        )}
      </div>

      {/* Sources panel */}
      {sourcesOpen && hasSources && (
        <div style={{
          marginTop: 8, padding: "10px 14px",
          background: "var(--mp-bg)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--mp-border)",
        }}>
          {sources.map((src, i) => (
            <div key={i} style={{ marginBottom: i < sources.length - 1 ? 10 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mp-accent)", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-data)", fontSize: 11, fontWeight: 500, color: "var(--mp-text)" }}>{src.table}</span>
                <span style={{ fontFamily: "var(--font-data)", fontSize: 10, color: "var(--mp-text-muted)" }}>({src.rowCount} lignes)</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingLeft: 12 }}>
                {src.columns.map((col, ci) => (
                  <span key={ci} style={{
                    fontFamily: "var(--font-data)", fontSize: 10,
                    background: "var(--mp-bg-elevated)", border: "1px solid var(--mp-border)",
                    borderRadius: 4, padding: "1px 6px", color: "var(--mp-text-secondary)",
                  }}>{col}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raw data table */}
      {dataOpen && hasData && (
        <div style={{
          marginTop: 8, borderRadius: "var(--radius-sm)",
          border: "1px solid var(--mp-border)", overflow: "auto",
          maxHeight: 320,
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "var(--mp-bg)", position: "sticky", top: 0, zIndex: 1 }}>
                <th style={{
                  padding: "7px 10px", textAlign: "center",
                  fontFamily: "var(--font-data)", fontWeight: 500, fontSize: 9,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: "var(--mp-text-muted)", borderBottom: "1px solid var(--mp-border)",
                  whiteSpace: "nowrap",
                }}>#</th>
                {columns.map(col => (
                  <th key={col} style={{
                    padding: "7px 10px",
                    textAlign: typeof rows[0][col] === "number" ? "right" : "left",
                    fontFamily: "var(--font-data)", fontWeight: 500, fontSize: 9,
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    color: "var(--mp-text-muted)", borderBottom: "1px solid var(--mp-border)",
                    whiteSpace: "nowrap",
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{
                  background: ri % 2 === 0 ? "transparent" : "var(--mp-bg)",
                  borderBottom: "1px solid var(--mp-border-subtle)",
                }}>
                  <td style={{
                    padding: "5px 10px", textAlign: "center",
                    fontFamily: "var(--font-data)", fontSize: 9,
                    color: "var(--mp-text-muted)", fontVariantNumeric: "tabular-nums",
                  }}>{ri + 1}</td>
                  {columns.map(col => (
                    <td key={col} style={{
                      padding: "5px 10px",
                      textAlign: typeof row[col] === "number" ? "right" : "left",
                      fontFamily: "var(--font-data)", fontSize: 11,
                      color: "var(--mp-text)", fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}>{row[col] === null || row[col] === undefined ? "—" : String(row[col])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function RenderSection({ section, feedbackMode, sectionFeedback, onSectionFeedback, sectionIndex, interpretation, interpretLoading, interpretStreamText, interpretError, onInterpret, onCloseInterpretation, hasPersistedInterpretation, onImproveSection, sectionImproving }) {
  const [expanded, setExpanded] = useState(true);
  const [annotating, setAnnotating] = useState(false);
  const [improveFeedback, setImproveFeedback] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const ct = useChartTheme();

  // Timer for section improvement
  useEffect(() => {
    if (!sectionImproving?.loading || !sectionImproving?.startTime) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sectionImproving.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sectionImproving?.loading, sectionImproving?.startTime]);
  const h = 300;

  // ── Excel serial date → readable date ──
  // Excel dates are stored as days since 1900-01-01. Values 40000–55000
  // correspond to ~2009–2050. Convert them to "janv. 2026" style labels.
  const EXCEL_EPOCH = new Date(1899, 11, 30); // Excel day 0
  function isExcelDate(v) {
    return typeof v === "number" && v > 40000 && v < 55000 && Number.isInteger(v);
  }
  function excelToDate(serial) {
    const d = new Date(EXCEL_EPOCH.getTime() + serial * 86400000);
    return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  }
  function isExcelDateStr(v) {
    if (typeof v !== "string") return false;
    const n = Number(v);
    return !isNaN(n) && n > 40000 && n < 55000 && Number.isInteger(n);
  }

  // Convert Excel serial dates in data to readable strings
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

  // ── Auto-infer chart config when AI didn't provide it ──
  // Uses section-level xKey/yKeys as fallback, then infers from data shape.
  const rawConfig = section.config || {};
  const c = { ...rawConfig };
  if (!c.xKey || !c.yKeys?.length) {
    // Try section-level keys first (some reports put them at section root)
    if (section.xKey) c.xKey = section.xKey;
    if (section.yKeys?.length) c.yKeys = section.yKeys;
    if (section.nameKey) c.nameKey = section.nameKey;
    if (section.valueKey) c.valueKey = section.valueKey;
  }
  if ((!c.xKey || !c.yKeys?.length) && section.data?.length > 0) {
    // Infer from data: first string-like key = xKey, numeric keys = yKeys
    const sample = section.data[0];
    const skipKeys = new Set(["_count", "data_sources"]);
    const strKeys = [];
    const numKeys = [];
    for (const [k, v] of Object.entries(sample)) {
      if (skipKeys.has(k)) continue;
      if (typeof v === "string" || (typeof v === "number" && (isExcelDate(v) || isExcelDateStr(String(v))))) {
        strKeys.push(k);
      }
      if (typeof v === "number" && !isExcelDate(v) && !skipKeys.has(k)) {
        numKeys.push(k);
      }
    }
    if (!c.xKey && strKeys.length > 0) c.xKey = strKeys[0];
    if (!c.xKey && numKeys.length > 1) c.xKey = numKeys[0]; // fallback: first numeric as category
    if (!c.yKeys?.length && numKeys.length > 0) {
      c.yKeys = numKeys.filter(k => k !== c.xKey);
    }
  }

  // Apply Excel date conversion to chart data
  const chartData = convertExcelDates(section.data, c.xKey);

  // Remap report colors to current theme
  const remapColor = (color) => {
    const map = { "#C8FF3C": ct.lite, "#4A90B8": ct.signal, "#C45A32": ct.warm, "#D4A03A": ct.warning, "#8B7EC8": ct.purple, "#3A8A4A": ct.success, "#6B8A1A": ct.lite };
    return map[color] || color;
  };

  const noData = <p style={{ fontSize: 13, color: "var(--mp-text-muted)" }}>Aucune donnée à afficher.</p>;

  const renderChart = () => {
    try {
      if (!section.type) return null;

      switch (section.type) {
        case "composed":
          if (!chartData?.length) return noData;
          // For composed charts without explicit bars/line config, auto-generate from yKeys
          if (!c.bars?.length && !c.line && c.yKeys?.length) {
            c.bars = c.yKeys.slice(0, -1).map((k, i) => ({ key: k, color: ct.colors[i], name: c.names?.[i] || humanize(k) }));
            c.line = { key: c.yKeys[c.yKeys.length - 1], color: ct.colors[c.yKeys.length - 1], name: c.names?.[c.yKeys.length - 1] || humanize(c.yKeys[c.yKeys.length - 1]) };
          }
          return (
            <ResponsiveContainer width="100%" height={h}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey={c.xKey} tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <YAxis yAxisId="left" tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <YAxis yAxisId="right" orientation="right" tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <Tooltip contentStyle={ct.tooltip} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans'" }} />
                {c.bars?.map(b => <Bar key={b.key} yAxisId="left" dataKey={b.key} fill={remapColor(b.color)} name={b.name} radius={[3,3,0,0]} />)}
                {c.line && <Line yAxisId="right" type="monotone" dataKey={c.line.key} stroke={remapColor(c.line.color)} name={c.line.name} strokeWidth={2.5} dot={{ r:3, fill:remapColor(c.line.color) }} />}
              </ComposedChart>
            </ResponsiveContainer>
          );

        case "line":
          if (!chartData?.length || !c.yKeys?.length) return noData;
          return (
            <ResponsiveContainer width="100%" height={h}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey={c.xKey} tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <YAxis tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <Tooltip contentStyle={ct.tooltip} />
                {c.yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans'" }} />}
                {c.yKeys.map((k,i) => <Line key={k} type="monotone" dataKey={k} stroke={remapColor(c.colors?.[i]) || ct.colors[i]} name={c.names?.[i] || humanize(k)} strokeWidth={2} dot={{ r: 3, fill: remapColor(c.colors?.[i]) || ct.colors[i] }} />)}
              </LineChart>
            </ResponsiveContainer>
          );

        case "bar":
          if (!chartData?.length || !c.yKeys?.length) return noData;
          return (
            <ResponsiveContainer width="100%" height={h}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey={c.xKey} tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <YAxis tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <Tooltip contentStyle={ct.tooltip} />
                {c.yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans'" }} />}
                {c.yKeys.map((k,i) => <Bar key={k} dataKey={k} fill={remapColor(c.colors?.[i]) || ct.colors[i]} name={c.names?.[i] || humanize(k)} radius={[3,3,0,0]} />)}
              </BarChart>
            </ResponsiveContainer>
          );

        case "grouped_bar":
          if (!chartData?.length || !c.yKeys?.length) return noData;
          return (
            <ResponsiveContainer width="100%" height={h}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey={c.xKey} tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <YAxis tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <Tooltip contentStyle={ct.tooltip} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans'" }} />
                {c.yKeys.map((k,i) => <Bar key={k} dataKey={k} fill={remapColor(c.colors?.[i]) || ct.colors[i]} name={c.names?.[i] || humanize(k)} radius={[3,3,0,0]} />)}
              </BarChart>
            </ResponsiveContainer>
          );

        case "area_multi":
          if (!chartData?.length || !c.yKeys?.length) return noData;
          return (
            <ResponsiveContainer width="100%" height={h}>
              <AreaChart data={chartData}>
                <defs>
                  {c.yKeys.map((k,i) => (
                    <linearGradient key={k} id={`ag_${safeId(k)}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={remapColor(c.colors?.[i]) || ct.colors[i]} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={remapColor(c.colors?.[i]) || ct.colors[i]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis dataKey={c.xKey} tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <YAxis tick={ct.axis} axisLine={{ stroke: ct.grid }} />
                <Tooltip contentStyle={ct.tooltip} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'DM Sans'" }} />
                {c.yKeys.map((k,i) => <Area key={k} type="monotone" dataKey={k} stroke={remapColor(c.colors?.[i]) || ct.colors[i]} fill={`url(#ag_${safeId(k)})`} name={c.names?.[i] || humanize(k)} strokeWidth={2} />)}
              </AreaChart>
            </ResponsiveContainer>
          );

        case "pie_multi": {
          // Support both data_sets format and flat data format
          let pieDataSets = section.data_sets;
          if (!pieDataSets?.length && section.data?.length) {
            // Convert flat data to single pie data_set
            const nameK = c.nameKey || c.xKey || Object.keys(section.data[0]).find(k => typeof section.data[0][k] === "string" && k !== "_count");
            const valK = c.valueKey || (c.yKeys?.[0]) || Object.keys(section.data[0]).find(k => typeof section.data[0][k] === "number" && k !== "_count");
            if (nameK && valK) {
              pieDataSets = [{
                label: section.title || "",
                data: section.data.map(row => ({ name: row[nameK], value: row[valK] })),
              }];
            }
          }
          if (!pieDataSets?.length) return noData;
          return (
            <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap" }}>
              {pieDataSets.map((ds, di) => {
                const items = ds.data || [];
                return (
                  <div key={di} style={{ textAlign: "center", minWidth: 280 }}>
                    <span className="data-label" style={{ display: "block", marginBottom: 8 }}>{ds.label}</span>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={items} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                          label={false}
                          strokeWidth={2} stroke="var(--mp-bg)">
                          {items.map((_, i) => <Cell key={i} fill={ct.colors[i % ct.colors.length]} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={ct.tooltip}
                          formatter={(value, name) => [value, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Legend below */}
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: "6px 14px",
                      justifyContent: "center", marginTop: 4, padding: "0 8px",
                    }}>
                      {items.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                            background: ct.colors[i % ct.colors.length],
                          }} />
                          <span style={{
                            fontFamily: "var(--font-data)", fontSize: 10,
                            color: "var(--mp-text-muted)", whiteSpace: "nowrap",
                          }}>
                            {item.name}: <strong style={{ color: "var(--mp-text)" }}>{item.value}</strong>
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

        case "table":
          return <DataTable section={section} />;

        case "text":
          return section.html
            ? (
              <>
                <style>{`
                  .wysiwyg-preview p { margin: 0 0 8px; }
                  .wysiwyg-preview ul, .wysiwyg-preview ol { padding-left: 20px; margin-bottom: 8px; }
                  .wysiwyg-preview strong { font-weight: 600; }
                  .wysiwyg-preview em { font-style: italic; }
                `}</style>
                <div
                  className="wysiwyg-preview"
                  dangerouslySetInnerHTML={{ __html: section.html }}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "var(--mp-text-secondary)",
                    fontFamily: "var(--font-body)",
                  }}
                />
              </>
            )
            : <p style={{ fontSize: 13, color: "var(--mp-text-muted)", fontStyle: "italic" }}>Aucun contenu texte.</p>;

        default:
          return null;
      }
    } catch (err) {
      console.error("[RenderSection] render error:", err, section);
      return (
        <div style={{
          padding: "12px 16px", background: "var(--mp-bg-elevated)",
          borderRadius: "var(--radius-sm)", border: "1px solid var(--mp-border)",
        }}>
          <p style={{ fontSize: 12, color: "var(--mp-text-muted)", margin: 0 }}>
            Impossible d'afficher cette section ({section.type})
          </p>
        </div>
      );
    }
  };

  return (
    <div style={{
      background: "var(--mp-bg-card)",
      border: "1px solid var(--mp-border)",
      borderRadius: "var(--radius-md)",
      marginBottom: 16,
      overflow: "hidden",
      transition: "background 0.3s, border-color 0.3s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px", background: "none", border: "none", cursor: "pointer",
            color: "var(--mp-text)", fontFamily: "var(--font-body)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {section.type === "table" ? <TableIcon size={14} color="var(--mp-text-muted)" /> : <BarChart3 size={14} color="var(--mp-text-muted)" />}
            <span style={{ fontSize: 14, fontWeight: 500 }}>{section.title}</span>
          </div>
          {expanded ? <ChevronUp size={16} color="var(--mp-text-muted)" /> : <ChevronDown size={16} color="var(--mp-text-muted)" />}
        </button>
        {onInterpret && (
          <div style={{ paddingRight: 4, display: "flex", alignItems: "center" }}>
            <InterpretButton
              onInterpret={() => onInterpret(sectionIndex)}
              loading={interpretLoading}
              hasInterpretation={!!interpretation || !!hasPersistedInterpretation}
            />
          </div>
        )}
        {feedbackMode && (
          <button
            onClick={() => setAnnotating(!annotating)}
            title="Annoter cette section"
            aria-label="Annoter cette section"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "9px 14px", borderRadius: "var(--radius-sm)",
              display: "flex", alignItems: "center",
              flexShrink: 0,
            }}
          >
            <MessageSquare
              size={14}
              color={sectionFeedback ? "var(--mp-accent)" : "var(--mp-text-muted)"}
            />
          </button>
        )}
      </div>
      {expanded && (
        <div style={{ padding: "0 20px 20px" }}>
          <DataInspector section={section} />
          {renderChart()}
          {section.insight && (
            <div style={{
              background: "var(--mp-bg-elevated)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              marginTop: 14,
              borderLeft: "3px solid var(--mp-accent)",
              transition: "background 0.3s, border-color 0.3s",
            }}>
              <p style={{ fontSize: 12, color: "var(--mp-text-secondary)", lineHeight: 1.7, margin: 0 }}>{section.insight}</p>
            </div>
          )}
          {(interpretation || interpretLoading || interpretError) && (
            <InterpretationPanel
              interpretation={interpretation}
              loading={interpretLoading}
              streamingText={interpretStreamText}
              error={interpretError}
              onClose={() => onCloseInterpretation && onCloseInterpretation(sectionIndex)}
            />
          )}
          {feedbackMode && annotating && (
            <textarea
              value={sectionFeedback || ""}
              onChange={e => onSectionFeedback(sectionIndex, e.target.value)}
              placeholder="Feedback spécifique à cette section (optionnel)"
              aria-label={`Feedback pour ${section.title}`}
              style={{
                width: "100%", marginTop: 8, fontSize: 14,
                fontFamily: "var(--font-body)",
                background: "var(--mp-bg)", border: "1px solid var(--mp-border)",
                borderRadius: "var(--radius-sm)", padding: "8px 12px",
                color: "var(--mp-text)", resize: "vertical", minHeight: 72,
                boxSizing: "border-box",
                opacity: 1, transition: "opacity 150ms ease",
              }}
            />
          )}

          {/* Section improvement input + button */}
          {onImproveSection && (
            <div style={{
              marginTop: 14, display: "flex", gap: 8,
              justifyContent: "flex-end", alignItems: "flex-end",
            }}>
              {sectionImproving?.error && (
                <span style={{
                  fontSize: 11, color: "var(--mp-warm)",
                  fontFamily: "var(--font-body)", flex: 1,
                }}>{sectionImproving.error}</span>
              )}
              <input
                type="text"
                value={improveFeedback}
                onChange={e => setImproveFeedback(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !sectionImproving?.loading) {
                    onImproveSection(sectionIndex, improveFeedback);
                    setImproveFeedback("");
                  }
                }}
                placeholder="Instructions (optionnel)"
                disabled={!!sectionImproving?.loading}
                style={{
                  flex: 1, maxWidth: 320, fontSize: 12,
                  fontFamily: "var(--font-body)",
                  background: "var(--mp-bg)", border: "1px solid var(--mp-border)",
                  borderRadius: "var(--radius-sm)", padding: "7px 12px",
                  color: "var(--mp-text)",
                  opacity: sectionImproving?.loading ? 0.5 : 1,
                }}
              />
              <button
                onClick={() => {
                  if (!sectionImproving?.loading) {
                    onImproveSection(sectionIndex, improveFeedback);
                    setImproveFeedback("");
                  }
                }}
                disabled={!!sectionImproving?.loading}
                style={{
                  background: sectionImproving?.loading ? "var(--mp-bg-elevated)" : "var(--mp-accent)",
                  color: sectionImproving?.loading ? "var(--mp-text-muted)" : "var(--mp-accent-on)",
                  border: sectionImproving?.loading ? "1px solid var(--mp-border)" : "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 16px", fontSize: 12, fontWeight: 500,
                  fontFamily: "var(--font-body)",
                  cursor: sectionImproving?.loading ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  whiteSpace: "nowrap",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {sectionImproving?.loading ? (
                  <>
                    <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                    Amélioration en cours… {elapsedSeconds > 0 && (
                      <span style={{
                        fontFamily: "var(--font-data)", fontSize: 10,
                        fontVariantNumeric: "tabular-nums",
                      }}>{elapsedSeconds}s</span>
                    )}
                  </>
                ) : (
                  "Améliorer la section"
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
