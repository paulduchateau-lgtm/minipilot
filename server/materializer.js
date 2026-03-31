// ── Materialized Analytics Layer ─────────────────────────────────────────────
// Pre-computes 4 analytical views from clean_data at transform time.
// These views replace raw data in AI prompts — zero rows leak to the LLM.
//
// Views:
//   schema    — table structure, column types, cardinalities
//   stats     — distributions, quartiles, correlations
//   dimensions — aggregates per categorical column (GROUP BY)
//   anomalies  — z-score outliers, trends, data quality signals

import { v4 as uuidv4 } from "uuid";

// ── Helpers ──────────────────────────────────────────────────────────────────

function median(sorted) {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ── Schema Fingerprint ───────────────────────────────────────────────────────

function buildSchemaView(tableName, columns, rowCount) {
  const numCols = columns.filter(c => c.type === "number");
  const textCols = columns.filter(c => c.type === "string");
  const dateCols = columns.filter(c => c.type === "date");

  const lines = [`Table "${tableName}" : ${rowCount.toLocaleString("fr-FR")} lignes, ${columns.length} colonnes.`];

  if (numCols.length > 0) {
    lines.push(`  Numeriques (${numCols.length}) : ${numCols.map(c => c.name).join(", ")}`);
  }
  if (textCols.length > 0) {
    lines.push(`  Texte (${textCols.length}) : ${textCols.map(c => c.name).join(", ")}`);
  }
  if (dateCols.length > 0) {
    lines.push(`  Dates (${dateCols.length}) : ${dateCols.map(c => c.name).join(", ")}`);
  }

  return {
    content_text: lines.join("\n"),
    content_json: JSON.stringify({ tableName, rowCount, columns }),
  };
}

// ── Statistical Profile ──────────────────────────────────────────────────────

function buildStatsView(tableName, columns, rows) {
  const lines = [`Profil statistique — "${tableName}" :`];
  const statsJson = {};

  for (const col of columns) {
    const key = col.name;
    const rawValues = rows.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== "");
    const nullCount = rows.length - rawValues.length;
    const fillRate = rows.length > 0 ? round2((rawValues.length / rows.length) * 100) : 0;

    if (col.type === "number") {
      const nums = rawValues.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (nums.length === 0) continue;

      const sum = nums.reduce((a, b) => a + b, 0);
      const avg = round2(sum / nums.length);
      const med = round2(median(nums));
      const min = nums[0];
      const max = nums[nums.length - 1];
      const q1 = round2(percentile(nums, 25));
      const q3 = round2(percentile(nums, 75));
      const stddev = round2(Math.sqrt(nums.reduce((s, n) => s + (n - avg) ** 2, 0) / nums.length));

      lines.push(`  ${key} : moy=${avg}, med=${med}, min=${min}, max=${max}, Q1=${q1}, Q3=${q3}, ecart-type=${stddev}, remplissage=${fillRate}%`);
      statsJson[key] = { type: "number", avg, med, min, max, q1, q3, stddev, nullCount, fillRate, count: nums.length };

    } else if (col.type === "string") {
      const uniqueValues = [...new Set(rawValues)];
      const uniqueCount = uniqueValues.length;
      const top5 = uniqueValues.slice(0, 5);

      lines.push(`  ${key} : ${uniqueCount} valeurs uniques, exemples=[${top5.map(v => `"${v}"`).join(", ")}], remplissage=${fillRate}%`);
      statsJson[key] = { type: "string", uniqueCount, top5, nullCount, fillRate };

    } else if (col.type === "date") {
      const sorted = rawValues.map(String).sort();
      lines.push(`  ${key} : de ${sorted[0]} a ${sorted[sorted.length - 1]}, remplissage=${fillRate}%`);
      statsJson[key] = { type: "date", min: sorted[0], max: sorted[sorted.length - 1], nullCount, fillRate };
    }
  }

  return {
    content_text: lines.join("\n"),
    content_json: JSON.stringify(statsJson),
  };
}

// ── Dimension Summaries ──────────────────────────────────────────────────────

function buildDimensionView(tableName, columns, rows) {
  // Find categorical columns with useful cardinality (2-50 unique values)
  const textCols = columns.filter(c => c.type === "string");
  const numCols = columns.filter(c => c.type === "number");

  const dimensionResults = [];
  const dimensionJson = {};

  for (const dimCol of textCols) {
    const values = rows.map(r => r[dimCol.name]).filter(v => v !== null && v !== undefined && v !== "");
    const uniqueValues = [...new Set(values)];

    // Skip if too few or too many unique values
    if (uniqueValues.length < 2 || uniqueValues.length > 50) continue;

    // Group rows by this dimension
    const groups = {};
    for (const row of rows) {
      const key = row[dimCol.name];
      if (key === null || key === undefined || key === "") continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }

    const groupSummaries = [];
    const lines = [`Par ${dimCol.name} (${uniqueValues.length} modalites) :`];

    // Sort groups by count descending, take top 10
    const sortedGroups = Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    for (const [groupKey, groupRows] of sortedGroups) {
      const parts = [`  ${groupKey} : ${groupRows.length} lignes (${round2((groupRows.length / rows.length) * 100)}%)`];
      const groupStats = {};

      // Compute aggregates for each numeric column
      for (const numCol of numCols.slice(0, 5)) { // limit to 5 numeric cols to keep concise
        const nums = groupRows
          .map(r => r[numCol.name])
          .filter(v => v !== null && v !== undefined && v !== "")
          .map(Number)
          .filter(n => !isNaN(n));

        if (nums.length > 0) {
          const avg = round2(nums.reduce((a, b) => a + b, 0) / nums.length);
          parts.push(`${numCol.name} moy=${avg}`);
          groupStats[numCol.name] = { avg, count: nums.length };
        }
      }

      lines.push(parts.join(", "));
      groupSummaries.push({ key: groupKey, count: groupRows.length, pct: round2((groupRows.length / rows.length) * 100), stats: groupStats });
    }

    if (uniqueValues.length > 10) {
      lines.push(`  ... et ${uniqueValues.length - 10} autres modalites.`);
    }

    dimensionResults.push(lines.join("\n"));
    dimensionJson[dimCol.name] = { uniqueCount: uniqueValues.length, groups: groupSummaries };
  }

  if (dimensionResults.length === 0) {
    return {
      content_text: `Dimensions — "${tableName}" : aucune colonne categorique exploitable.`,
      content_json: "{}",
    };
  }

  return {
    content_text: `Dimensions — "${tableName}" :\n${dimensionResults.join("\n\n")}`,
    content_json: JSON.stringify(dimensionJson),
  };
}

// ── Anomaly Signals ──────────────────────────────────────────────────────────

function buildAnomalyView(tableName, columns, rows) {
  const anomalies = [];
  const numCols = columns.filter(c => c.type === "number");

  for (const col of numCols) {
    const nums = rows
      .map(r => r[col.name])
      .filter(v => v !== null && v !== undefined && v !== "")
      .map(Number)
      .filter(n => !isNaN(n));

    if (nums.length < 10) continue;

    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    const stddev = Math.sqrt(nums.reduce((s, n) => s + (n - avg) ** 2, 0) / nums.length);

    if (stddev === 0) continue;

    // Count outliers (|z| > 2)
    const outlierCount = nums.filter(n => Math.abs((n - avg) / stddev) > 2).length;
    if (outlierCount > 0) {
      const pct = round2((outlierCount / nums.length) * 100);
      anomalies.push({
        type: "outlier",
        column: col.name,
        text: `[OUTLIER] ${col.name} : ${outlierCount} valeurs extremes (${pct}% des lignes, z-score > 2). Moyenne=${round2(avg)}, ecart-type=${round2(stddev)}.`,
      });
    }

    // High null rate
    const nullCount = rows.length - nums.length;
    const nullRate = nullCount / rows.length;
    if (nullRate > 0.1) {
      anomalies.push({
        type: "quality",
        column: col.name,
        text: `[QUALITE] ${col.name} : ${round2(nullRate * 100)}% de valeurs manquantes (${nullCount}/${rows.length}).`,
      });
    }
  }

  // Check for text columns with very low cardinality (potential boolean/enum misclassified)
  const textCols = columns.filter(c => c.type === "string");
  for (const col of textCols) {
    const values = rows.map(r => r[col.name]).filter(v => v !== null && v !== undefined && v !== "");
    const unique = new Set(values);
    if (unique.size === 1 && values.length > 10) {
      anomalies.push({
        type: "quality",
        column: col.name,
        text: `[QUALITE] ${col.name} : colonne constante (une seule valeur "${[...unique][0]}" sur ${values.length} lignes). Potentiellement inutile.`,
      });
    }
  }

  if (anomalies.length === 0) {
    return {
      content_text: `Signaux — "${tableName}" : aucune anomalie significative detectee.`,
      content_json: "[]",
    };
  }

  // Sort: outliers first, then quality
  anomalies.sort((a, b) => (a.type === "outlier" ? 0 : 1) - (b.type === "outlier" ? 0 : 1));

  return {
    content_text: `Signaux — "${tableName}" (${anomalies.length} detectes) :\n${anomalies.map(a => `  ${a.text}`).join("\n")}`,
    content_json: JSON.stringify(anomalies),
  };
}

// ── Main materializer ────────────────────────────────────────────────────────

/**
 * Materialize all 4 views for a workspace.
 * Called at the end of POST /transform.
 *
 * @param {Function} dbGet - async DB get helper
 * @param {Function} dbAll - async DB all helper
 * @param {Function} dbRun - async DB run helper
 * @param {Function} dbBatch - async DB batch helper
 * @param {string} workspaceId
 */
export async function materialize(dbGet, dbAll, dbRun, dbBatch, workspaceId) {
  // Clear previous views
  await dbRun("DELETE FROM materialized_views WHERE workspace_id = ?", workspaceId);

  // Get all tables in this workspace
  const tables = (await dbAll("SELECT DISTINCT table_name FROM clean_data WHERE workspace_id = ?", workspaceId))
    .map(r => r.table_name);

  if (tables.length === 0) return;

  const stmts = [];

  for (const tableName of tables) {
    // Load columns metadata
    const colRow = await dbGet("SELECT columns FROM clean_data WHERE table_name = ? AND workspace_id = ? LIMIT 1", tableName, workspaceId);
    const columns = colRow ? JSON.parse(colRow.columns) : [];

    // Load row count + sample rows (cap at 500 for performance over network)
    const countRow = await dbGet("SELECT COUNT(*) AS cnt FROM clean_data WHERE table_name = ? AND workspace_id = ?", tableName, workspaceId);
    const rowCount = countRow?.cnt || 0;
    const rawRows = await dbAll("SELECT row_data FROM clean_data WHERE table_name = ? AND workspace_id = ? LIMIT 500", tableName, workspaceId);
    const rows = rawRows.map(r => JSON.parse(r.row_data));

    // Build 4 views
    const schema = buildSchemaView(tableName, columns, rowCount);
    const stats = buildStatsView(tableName, columns, rows);
    const dimensions = buildDimensionView(tableName, columns, rows);
    const anomalies = buildAnomalyView(tableName, columns, rows);

    for (const [viewType, view] of [["schema", schema], ["stats", stats], ["dimensions", dimensions], ["anomalies", anomalies]]) {
      stmts.push({
        sql: "INSERT INTO materialized_views (id, workspace_id, table_name, view_type, content_text, content_json) VALUES (?, ?, ?, ?, ?, ?)",
        args: [uuidv4(), workspaceId, tableName, viewType, view.content_text, view.content_json],
      });
    }
  }

  if (stmts.length > 0) await dbBatch(stmts);

  console.log(`[Materializer] ${tables.length} table(s), ${stmts.length} views materialized for workspace ${workspaceId}`);
}

// ── Context builder for AI prompts ───────────────────────────────────────────

/**
 * Build a compact AI-ready context from materialized views.
 * Replaces buildDataSummary() + buildColumnStats() in the prompt pipeline.
 *
 * @returns {{ schemaText, statsText, dimensionsText, anomaliesText, hasViews }}
 */
export async function getMaterializedContext(dbAll, workspaceId) {
  const views = await dbAll(
    "SELECT view_type, table_name, content_text FROM materialized_views WHERE workspace_id = ? ORDER BY table_name, view_type",
    workspaceId
  );

  if (views.length === 0) {
    return { schemaText: "", statsText: "", dimensionsText: "", anomaliesText: "", hasViews: false };
  }

  const byType = { schema: [], stats: [], dimensions: [], anomalies: [] };
  for (const v of views) {
    if (byType[v.view_type]) byType[v.view_type].push(v.content_text);
  }

  return {
    schemaText: byType.schema.join("\n\n"),
    statsText: byType.stats.join("\n\n"),
    dimensionsText: byType.dimensions.join("\n\n"),
    anomaliesText: byType.anomalies.join("\n\n"),
    hasViews: true,
  };
}
