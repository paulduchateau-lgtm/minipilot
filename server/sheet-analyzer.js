// ── Sheet Relationship Analyzer ──────────────────────────────────────────────
// Detects structural patterns across Excel sheets: scenarios, time series,
// segments (BU/geo), or unrelated. Produces context blocks for LLM injection.

const YEAR_RE = /\b(20\d{2})\b/;
const QUARTER_RE = /\b[QqTt][1-4]\b/;
const MONTH_RE = /\b(janv|févr|mars|avri|mai|juin|juil|août|sept|octo|nove|déce|january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
const SEMESTER_RE = /\b[Ss][12]\b/;
const SCENARIO_MARKERS = /\b(scen|budget|hypo|optim|pessim|base|defensi|conserv|agressif|ambitieu|new\s*biz|extra|plan\s*[abc]|variant)\b/i;
const NUMBERED_PREFIX_RE = /^(.+?)\s*[#\-_]\s*\d+\s*[#\-_:]\s*(.+)$/;

function jaccardSimilarity(setA, setB) {
  const a = new Set(setA.map(s => s.toLowerCase()));
  const b = new Set(setB.map(s => s.toLowerCase()));
  const intersection = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function extractCommonPrefix(names) {
  if (names.length < 2) return null;
  const match = names[0].match(NUMBERED_PREFIX_RE);
  if (!match) return null;
  const prefix = match[1].trim().toLowerCase();
  const allMatch = names.every(n => n.toLowerCase().startsWith(prefix));
  return allMatch ? match[1].trim() : null;
}

function classifyGroup(sheetNames) {
  const hasYear = sheetNames.some(n => YEAR_RE.test(n));
  const hasQuarter = sheetNames.some(n => QUARTER_RE.test(n));
  const hasMonth = sheetNames.some(n => MONTH_RE.test(n));
  const hasSemester = sheetNames.some(n => SEMESTER_RE.test(n));
  const hasScenarioMarker = sheetNames.some(n => SCENARIO_MARKERS.test(n));
  const hasNumberedPrefix = extractCommonPrefix(sheetNames) !== null;

  const temporalSignals = [hasYear, hasQuarter, hasMonth, hasSemester].filter(Boolean).length;

  if (hasScenarioMarker || hasNumberedPrefix) {
    const uniqueYears = new Set(sheetNames.map(n => n.match(YEAR_RE)?.[1]).filter(Boolean));
    if (uniqueYears.size > 1) return "time_series";
    return "scenarios";
  }

  if (temporalSignals >= 1) {
    const uniqueYears = new Set(sheetNames.map(n => n.match(YEAR_RE)?.[1]).filter(Boolean));
    if (uniqueYears.size > 1) return "time_series";
    if (hasQuarter || hasMonth || hasSemester) return "time_series";
  }

  return "segments";
}

function buildGroupDescription(type, sheetNames, commonPrefix) {
  const listed = sheetNames.map(n => `"${n}"`).join(", ");
  switch (type) {
    case "scenarios":
      return `${sheetNames.length} scénarios détectés${commonPrefix ? ` (famille "${commonPrefix}")` : ""} : ${listed}.\nCes feuilles représentent des variantes du même jeu de données avec des hypothèses différentes.`;
    case "time_series":
      return `${sheetNames.length} périodes détectées : ${listed}.\nCes feuilles représentent une évolution temporelle du même jeu de données.`;
    case "segments":
      return `${sheetNames.length} segments détectés : ${listed}.\nCes feuilles représentent des découpages du même jeu de données (business units, géographies, équipes...).`;
    default:
      return `${sheetNames.length} feuilles : ${listed}.`;
  }
}

/**
 * Analyze relationships between sheets in uploaded files.
 *
 * @param {Array<{name: string, columns: string[], rowCount: number}>} sheets
 * @returns {{ groups: Array<{type: string, sheets: string[], description: string, label: string}>, hasMultiSheetPatterns: boolean }}
 */
export function analyzeSheetRelationships(sheets) {
  if (!sheets || sheets.length < 2) {
    return { groups: [], hasMultiSheetPatterns: false };
  }

  const groups = [];
  const assigned = new Set();

  for (let i = 0; i < sheets.length; i++) {
    if (assigned.has(i)) continue;
    const cluster = [i];

    for (let j = i + 1; j < sheets.length; j++) {
      if (assigned.has(j)) continue;
      const sim = jaccardSimilarity(sheets[i].columns, sheets[j].columns);
      if (sim >= 0.6) cluster.push(j);
    }

    if (cluster.length >= 2) {
      const clusterSheets = cluster.map(idx => sheets[idx]);
      const names = clusterSheets.map(s => s.name);
      const type = classifyGroup(names);
      const commonPrefix = extractCommonPrefix(names);

      const typeLabels = {
        scenarios: "Scénarios",
        time_series: "Évolution temporelle",
        segments: "Segments",
      };

      groups.push({
        type,
        sheets: names,
        label: typeLabels[type] || "Groupe",
        description: buildGroupDescription(type, names, commonPrefix),
        commonPrefix,
        columnOverlap: jaccardSimilarity(
          clusterSheets[0].columns,
          clusterSheets[clusterSheets.length - 1].columns
        ),
      });

      cluster.forEach(idx => assigned.add(idx));
    }
  }

  return { groups, hasMultiSheetPatterns: groups.length > 0 };
}

/**
 * Build a text block describing sheet relationships for LLM prompt injection.
 */
export function buildSheetContextBlock(analysis) {
  if (!analysis.hasMultiSheetPatterns) return "";

  const lines = ["STRUCTURE MULTI-FEUILLES DÉTECTÉE :"];

  for (const group of analysis.groups) {
    lines.push("");
    lines.push(`▶ ${group.label}`);
    lines.push(group.description);
  }

  lines.push("");
  lines.push(`La colonne "_sheet" dans les données indique la feuille source de chaque ligne.`);
  lines.push("");
  lines.push("INSTRUCTIONS MULTI-FEUILLES :");
  lines.push("1. Identifie et nomme explicitement chaque feuille/variante dans tes analyses.");
  lines.push("2. Propose TOUJOURS au moins un rapport comparatif mettant en regard les différentes feuilles.");
  lines.push("3. Utilise la colonne \"_sheet\" pour regrouper (groupBy) ou filtrer par feuille.");
  lines.push("4. Pour les KPIs, montre la valeur de chaque variante côte à côte.");
  lines.push("5. Identifie les écarts significatifs entre variantes et commente-les.");

  return lines.join("\n");
}

/**
 * Build a compact summary for the expertise prompt enrichment.
 */
export function buildSheetSummary(analysis) {
  if (!analysis.hasMultiSheetPatterns) return null;
  return analysis.groups.map(g => {
    const names = g.sheets.map(n => `"${n}"`).join(", ");
    return `${g.label} : ${names}`;
  }).join(" | ");
}
