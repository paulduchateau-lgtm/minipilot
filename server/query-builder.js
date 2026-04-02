// ── Query Builder : Spec → SQL ───────────────────────────────────────────────
// Translates an AI-generated report spec into real data computed from clean_data.
// The LLM never sees raw rows — it generates a spec, and we execute it.

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
      // Keep the section but mark it as failed
      sections.push({
        ...sectionSpec,
        data: [],
        _error: err.message,
      });
    }
  }

  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.subtitle,
    objective: spec.objective,
    color: spec.color || "#4A90B8",
    icon: spec.icon || "BarChart3",
    kpis: spec.kpis || [],
    sections,
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
    // Table type — return top rows
    data = rows.slice(0, 50);
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
  return rawRows.map(r => JSON.parse(r.row_data));
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
  const cols = (valueColumns || []).map(vc => typeof vc === "string" ? vc : vc.column);
  const COLORS = ["#C8FF3C", "#4A90B8", "#C45A32", "#D4A03A", "#3A8A4A"];

  switch (type) {
    case "bar":
    case "grouped_bar":
      return { xKey: groupBy, yKeys: cols, colors: COLORS.slice(0, cols.length), names: cols };
    case "composed":
      return {
        xKey: groupBy,
        bars: cols.slice(0, -1).map((c, i) => ({ key: c, color: COLORS[i], name: c })),
        line: cols.length > 1 ? { key: cols[cols.length - 1], color: COLORS[cols.length - 1], name: cols[cols.length - 1] } : undefined,
      };
    case "area_multi":
      return { xKey: groupBy, yKeys: cols, colors: COLORS.slice(0, cols.length), names: cols };
    case "pie_multi":
      return {};
    case "table":
      return {
        columns: [
          { key: groupBy, label: groupBy },
          ...cols.map(c => ({ key: c, label: c, align: "right", fmt: "num" })),
          { key: "_count", label: "Lignes", align: "right" },
        ],
      };
    default:
      return { xKey: groupBy, yKeys: cols, colors: COLORS.slice(0, cols.length) };
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
