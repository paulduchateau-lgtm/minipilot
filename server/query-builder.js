// ── Query Builder : Spec → SQL ───────────────────────────────────────────────
// Translates an AI-generated report spec into real data computed from clean_data.
// The LLM never sees raw rows — it generates a spec, and we execute it.

const JUNK_LABEL_RE = /^_*(?:empty|unnamed|colonne?|field|champ)_*\d*$/i;

function humanizeColumnName(key) {
  if (!key || JUNK_LABEL_RE.test(key)) return null;
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || null;
}

function isJunkKey(key) {
  return !key || JUNK_LABEL_RE.test(key) || /^_+\d*$/.test(key);
}

function validateSection(section) {
  if (section.type === "text") return true;

  if (section.type === "pie_multi") {
    return !!(section.data_sets?.length && section.data_sets.some(ds => ds.data?.length > 0));
  }

  if (!section.data?.length) return false;

  if (section.type === "table") {
    return section.data.length > 0;
  }

  const cfg = section.config || {};
  const yKeys = cfg.yKeys || [];
  if (yKeys.length === 0) return true;

  return section.data.some(row =>
    yKeys.some(k => {
      const v = row[k];
      return v !== null && v !== undefined && v !== "" && v !== 0;
    })
  );
}

/**
 * Execute a report spec against clean_data.
 * The spec describes what to compute; we produce the actual data.
 *
 * @param {Function} dbAll - async DB all helper
 * @param {string} workspaceId
 * @param {object} spec - AI-generated report specification
 * @returns {object} Report with real computed data
 */
export async function executeReportSpec(dbAll, workspaceId, spec) {
  const sections = [];

  for (const sectionSpec of (spec.sections || [])) {
    try {
      const section = await computeSection(dbAll, workspaceId, sectionSpec);
      sections.push(section);
    } catch (err) {
      console.warn(`[QueryBuilder] Failed to compute section "${sectionSpec.title}":`, err.message);
      sections.push({
        ...sectionSpec,
        data: [],
        _error: err.message,
      });
    }
  }

  const validSections = sections.filter(s => {
    if (s._error) return false;
    if (!validateSection(s)) {
      console.warn(`[QueryBuilder] Dropping empty section "${s.title}"`);
      return false;
    }
    return true;
  });

  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.subtitle,
    objective: spec.objective,
    color: spec.color || "#4A90B8",
    icon: spec.icon || "BarChart3",
    kpis: spec.kpis || [],
    sections: validSections,
  };
}

/**
 * Compute a single section from its spec.
 */
async function computeSection(dbAll, workspaceId, spec) {
  const { title, type, table, groupBy, valueColumns, filter, config, insight } = spec;

  if (!table) {
    // If no table specified, return the spec as-is (LLM provided data directly)
    return spec;
  }

  // Load rows from the specified table
  let rows = await loadTableRows(dbAll, workspaceId, table);

  // Apply filter if specified
  if (filter) {
    rows = applyFilter(rows, filter);
  }

  let data = [];

  if (groupBy && valueColumns) {
    // GROUP BY + aggregate
    data = computeGroupBy(rows, groupBy, valueColumns);
  } else if (valueColumns) {
    // Simple aggregation (no groupby)
    data = computeAggregates(rows, valueColumns);
  } else {
    // Table type — return top rows, capped at 15
    data = rows.slice(0, 15);
  }

  // ── Date detection + formatting on groupBy column ──
  if (groupBy && data.length > 0) {
    const dateType = spec.dateGroupBy ? detectDateColumn(rows, groupBy) : detectDateColumn(rows, groupBy);
    if (dateType) {
      const granularity = spec.dateFormat || "month";

      // Format date labels and add sort key
      data = data.map(row => ({
        ...row,
        _ts: toTimestamp(row[groupBy], dateType),
        [groupBy]: formatDateLabel(row[groupBy], dateType, granularity),
      }));

      // Sort chronologically
      data.sort((a, b) => a._ts - b._ts);

      // Remove internal sort key
      data = data.map(({ _ts, ...rest }) => rest);
    }
  }

  // ── Table row cap: max 15 rows unless spec says otherwise ──
  if ((type === "table") && data.length > 15) {
    data = data.slice(0, 15);
  }

  return {
    title,
    type: type || "bar",
    insight: insight || null,
    data,
    config: config || buildDefaultConfig(type, groupBy, valueColumns),
  };
}

/**
 * Load and parse rows from clean_data for a specific table.
 */
async function loadTableRows(dbAll, workspaceId, tableName) {
  const rawRows = await dbAll(
    "SELECT row_data FROM clean_data WHERE table_name = ? AND workspace_id = ?",
    tableName, workspaceId
  );
  // Strip junk columns (e.g. __EMPTY_5) from each row at read time
  // so existing data ingested before the upload-level filter still works.
  return rawRows.map(r => {
    const parsed = JSON.parse(r.row_data);
    const clean = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (k.startsWith("__EMPTY") || JUNK_LABEL_RE.test(k)) continue;
      clean[k] = v;
    }
    return clean;
  });
}

/**
 * Apply a filter object to rows.
 * filter: { column: "type_contrat", value: "collectif" }
 * or: { column: "cotisation", operator: ">", value: 200 }
 */
function applyFilter(rows, filter) {
  if (!filter || !filter.column) return rows;

  return rows.filter(row => {
    const val = row[filter.column];
    if (val === null || val === undefined) return false;

    const op = filter.operator || "=";
    const target = filter.value;

    switch (op) {
      case "=": return String(val).toLowerCase() === String(target).toLowerCase();
      case "!=": return String(val).toLowerCase() !== String(target).toLowerCase();
      case ">": return Number(val) > Number(target);
      case "<": return Number(val) < Number(target);
      case ">=": return Number(val) >= Number(target);
      case "<=": return Number(val) <= Number(target);
      case "contains": return String(val).toLowerCase().includes(String(target).toLowerCase());
      default: return true;
    }
  });
}

/**
 * Group rows by a column and compute aggregates.
 */
function computeGroupBy(rows, groupByCol, valueColumns) {
  const groups = {};

  for (const row of rows) {
    const key = row[groupByCol];
    if (key === null || key === undefined || key === "") continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  return Object.entries(groups)
    .map(([key, groupRows]) => {
      const result = { [groupByCol]: key };

      for (const vc of valueColumns) {
        const col = typeof vc === "string" ? vc : vc.column;
        const agg = typeof vc === "string" ? "avg" : (vc.aggregate || "avg");

        // "first" aggregate: return the first non-empty value (useful for text columns)
        if (agg === "first") {
          const first = groupRows.find(r => r[col] !== null && r[col] !== undefined && r[col] !== "");
          result[col] = first ? first[col] : "";
          continue;
        }

        const rawValues = groupRows
          .map(r => r[col])
          .filter(v => v !== null && v !== undefined && v !== "");

        const nums = rawValues.map(Number).filter(n => !isNaN(n));

        // If most values are non-numeric, treat as text → return the first value
        if (nums.length === 0 || (nums.length < rawValues.length * 0.5)) {
          result[col] = rawValues.length > 0 ? rawValues[0] : "";
          continue;
        }

        switch (agg) {
          case "sum": result[col] = round2(nums.reduce((a, b) => a + b, 0)); break;
          case "avg": result[col] = round2(nums.reduce((a, b) => a + b, 0) / nums.length); break;
          case "count": result[col] = nums.length; break;
          case "min": result[col] = Math.min(...nums); break;
          case "max": result[col] = Math.max(...nums); break;
          default: result[col] = round2(nums.reduce((a, b) => a + b, 0) / nums.length);
        }
      }

      result._count = groupRows.length;
      return result;
    })
    .sort((a, b) => b._count - a._count);
}

/**
 * Compute simple aggregates (no groupby).
 */
function computeAggregates(rows, valueColumns) {
  const result = {};

  for (const vc of valueColumns) {
    const col = typeof vc === "string" ? vc : vc.column;
    const nums = rows
      .map(r => r[col])
      .filter(v => v !== null && v !== undefined && v !== "")
      .map(Number)
      .filter(n => !isNaN(n));

    if (nums.length === 0) {
      result[col] = { sum: 0, avg: 0, min: 0, max: 0, count: 0 };
      continue;
    }

    result[col] = {
      sum: round2(nums.reduce((a, b) => a + b, 0)),
      avg: round2(nums.reduce((a, b) => a + b, 0) / nums.length),
      min: Math.min(...nums),
      max: Math.max(...nums),
      count: nums.length,
    };
  }

  return [result];
}

/**
 * Build a default chart config from spec params.
 */
function buildDefaultConfig(type, groupBy, valueColumns) {
  const rawCols = (valueColumns || []).map(vc => typeof vc === "string" ? vc : vc.column);
  const cols = rawCols.filter(c => !isJunkKey(c));
  const names = cols.map(c => humanizeColumnName(c) || c);
  const COLORS = ["#C8FF3C", "#4A90B8", "#C45A32", "#D4A03A", "#3A8A4A"];
  const groupLabel = humanizeColumnName(groupBy) || groupBy;

  switch (type) {
    case "bar":
    case "grouped_bar":
      return { xKey: groupBy, yKeys: cols, colors: COLORS.slice(0, cols.length), names };
    case "line":
      return { xKey: groupBy, yKeys: cols, colors: COLORS.slice(0, cols.length), names };
    case "composed":
      return {
        xKey: groupBy,
        bars: cols.slice(0, -1).map((c, i) => ({ key: c, color: COLORS[i], name: names[i] })),
        line: cols.length > 1 ? { key: cols[cols.length - 1], color: COLORS[cols.length - 1], name: names[cols.length - 1] } : undefined,
      };
    case "area_multi":
      return { xKey: groupBy, yKeys: cols, colors: COLORS.slice(0, cols.length), names };
    case "pie_multi":
      return {};
    case "table":
      return {
        columns: [
          { key: groupBy, label: groupLabel },
          ...cols.map((c, i) => ({ key: c, label: names[i], align: "right", fmt: "num" })),
          { key: "_count", label: "Lignes", align: "right" },
        ],
      };
    default:
      return { xKey: groupBy, yKeys: cols, colors: COLORS.slice(0, cols.length), names };
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ── Date detection and formatting ─────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const EPOCH_THRESHOLD = 946684800000; // 2000-01-01 in ms — anything above this that looks numeric is likely epoch

/**
 * Detect if a column's values look like dates.
 * Returns "iso" | "epoch_s" | "epoch_ms" | null
 */
function detectDateColumn(rows, colName) {
  const sample = rows.slice(0, 20).map(r => r[colName]).filter(v => v != null && v !== "");
  if (sample.length === 0) return null;

  // Check ISO date strings
  const isoCount = sample.filter(v => typeof v === "string" && ISO_DATE_RE.test(v)).length;
  if (isoCount > sample.length * 0.7) return "iso";

  // Check numeric epochs
  const nums = sample.map(Number).filter(n => !isNaN(n));
  if (nums.length > sample.length * 0.7) {
    if (nums.every(n => n > EPOCH_THRESHOLD)) return "epoch_ms";
    if (nums.every(n => n > EPOCH_THRESHOLD / 1000)) return "epoch_s";
  }
  return null;
}

const MONTH_NAMES_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

/**
 * Format a date value to a human-readable label.
 */
function formatDateLabel(value, dateType, granularity) {
  let d;
  if (dateType === "epoch_ms") d = new Date(Number(value));
  else if (dateType === "epoch_s") d = new Date(Number(value) * 1000);
  else d = new Date(value);

  if (isNaN(d.getTime())) return String(value);

  switch (granularity) {
    case "year": return String(d.getFullYear());
    case "quarter": return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
    case "day": return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
    case "month":
    default:
      return `${MONTH_NAMES_FR[d.getMonth()]} ${d.getFullYear()}`;
  }
}

/**
 * Get a sortable timestamp from a value for chronological ordering.
 */
function toTimestamp(value, dateType) {
  if (dateType === "epoch_ms") return Number(value);
  if (dateType === "epoch_s") return Number(value) * 1000;
  const d = new Date(value);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
