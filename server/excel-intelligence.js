// ── Excel Intelligence ───────────────────────────────────────────────────────
// Uses LLM to understand the structure of complex Excel sheets (multi-row
// headers, merged cells, hierarchical layouts like Business Plans).
//
// Financial Excel files often have:
//   Row 0: S1 2026 (merged across 6 month columns)
//   Row 1: 1,554,166 (semester total, also merged)
//   Row 2: T1 26 (merged across 3 months) | T2 26 (merged across 3) | ...
//   Row 5: Janvier | Février | Mars | Avril | Mai | ...
//   Row 6+: Actual data with row labels in first cols
//
// XLSX.sheet_to_json takes row 0 as headers → produces __EMPTY_N for unlabeled
// columns. This module re-reads the raw grid and asks the LLM to produce a
// proper column mapping before ingestion.

/**
 * Build a text representation of the first N rows of a sheet, including
 * merge information, for LLM analysis.
 *
 * @param {object} sheet - XLSX sheet object
 * @param {object} XLSX - XLSX library reference
 * @param {number} maxRows - Max rows to include (default 12)
 * @returns {string} Human-readable grid with merge annotations
 */
function buildSheetGrid(sheet, XLSX, maxRows = 12) {
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const merges = sheet["!merges"] || [];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const totalCols = range.e.c + 1;
  const totalRows = aoa.length;

  // Build merge map: for each cell, note if it's a merge start
  const mergeMap = {};
  for (const m of merges) {
    if (m.s.r < maxRows) {
      const span = m.e.c - m.s.c + 1;
      const key = `${m.s.r},${m.s.c}`;
      mergeMap[key] = { colSpan: span, rowSpan: m.e.r - m.s.r + 1 };
    }
  }

  // Limit columns to something readable (max 20, focus on first and data cols)
  const maxCols = Math.min(totalCols, 22);

  let grid = "";
  grid += `Feuille: ${totalRows} lignes × ${totalCols} colonnes\n`;
  grid += `Cellules fusionnées dans les ${maxRows} premières lignes:\n`;

  const topMerges = merges.filter(m => m.s.r < maxRows);
  if (topMerges.length > 0) {
    for (const m of topMerges) {
      const addr = XLSX.utils.encode_cell(m.s);
      const cell = sheet[addr];
      const val = cell ? cell.v : null;
      if (val !== null && val !== undefined) {
        const span = m.e.c - m.s.c + 1;
        grid += `  ${addr} "${val}" → fusionnée sur ${span} colonnes (col ${m.s.c} à ${m.e.c})\n`;
      }
    }
  } else {
    grid += "  Aucune\n";
  }

  grid += `\nGrille (${Math.min(maxRows, aoa.length)} premières lignes, ${maxCols} premières colonnes):\n`;
  grid += "Col:  " + Array.from({ length: maxCols }, (_, i) => String(i).padStart(4)).join(" ") + "\n";

  for (let r = 0; r < Math.min(maxRows, aoa.length); r++) {
    const row = aoa[r] || [];
    const cells = [];
    for (let c = 0; c < maxCols; c++) {
      const v = row[c];
      if (v === null || v === undefined) {
        cells.push("   ·");
      } else {
        let s = String(v);
        if (s.length > 12) s = s.substring(0, 11) + "…";
        cells.push(s.padStart(4));
      }
    }
    const merge = mergeMap[`${r},0`] ? " [merged]" : "";
    grid += `R${String(r).padStart(2)}: ${cells.join(" ")}${merge}\n`;
  }

  return grid;
}

/**
 * Ask the LLM to analyze the structure of a complex Excel sheet and produce
 * a column mapping.
 *
 * @param {object} sheet - XLSX sheet object
 * @param {object} XLSX - XLSX library reference
 * @param {string} sheetName - Name of the sheet
 * @param {Array} jsonRows - Rows as parsed by XLSX.sheet_to_json (with __EMPTY keys)
 * @param {Function} aiComplete - AI completion function(system, user, opts)
 * @returns {object|null} { columnMap, dataStartRow, businessContext, headerRows }
 */
export async function analyzeSheetStructure(sheet, XLSX, sheetName, jsonRows, aiComplete) {
  if (!jsonRows.length) return null;

  const originalKeys = Object.keys(jsonRows[0]);
  const emptyKeys = originalKeys.filter(k => k.startsWith("__EMPTY"));

  // Only trigger for complex sheets (>= 30% __EMPTY columns)
  if (emptyKeys.length < 5 || emptyKeys.length < originalKeys.length * 0.3) {
    return null;
  }

  const grid = buildSheetGrid(sheet, XLSX);

  // Build the list of current XLSX-assigned column names
  const colList = originalKeys.map((k, i) => `  [${i}] ${k}`).join("\n");

  const prompt = `Tu es un expert en analyse de fichiers Excel financiers (Business Plans, P&L, budgets, trésorerie).

Voici la structure brute de la feuille "${sheetName}".
Les colonnes "__EMPTY", "__EMPTY_1", etc. sont des colonnes dont l'en-tête est vide dans le fichier original (cellules fusionnées ou en-têtes multi-lignes).

${grid}

Colonnes actuelles (assignées par le parser XLSX depuis la ligne 0) :
${colList}

ANALYSE DEMANDÉE :
1. Quel est le type de document ? (Business Plan, P&L, Budget, Trésorerie, etc.)
2. Quelles lignes sont des en-têtes/metadata (pas des données) ?
3. À quelle ligne commencent les vraies données ?
4. Pour chaque colonne __EMPTY_N : quel est son vrai nom basé sur le contexte ?
   - Si c'est un mois : utilise janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre
   - Si c'est un trimestre : total_t1, total_t2, total_t3, total_t4
   - Si c'est un semestre : total_s1, total_s2
   - Si c'est un libellé de ligne : libelle, categorie, sous_categorie, detail
   - Si c'est un taux : taux, pourcentage
5. Pour les colonnes déjà nommées (non __EMPTY) : faut-il les renommer ?
   Ex: "S1 26" qui est un semestre fusionné sur 6 colonnes de mois → la colonne S1 26 correspond en fait à "janvier" (premier mois du semestre)

IMPORTANT :
- Une cellule fusionnée "S1 26" sur 6 colonnes signifie que la colonne de départ correspond au 1er mois (janvier) et les 5 colonnes suivantes (__EMPTY) aux mois suivants.
- Ne confonds pas les totaux (semestriels/trimestriels) qui sont sur des lignes de données avec les en-têtes fusionnés.

Réponds UNIQUEMENT avec un JSON valide :
{
  "businessContext": "Type de document et description courte",
  "dataStartRow": <index de la première ligne de données (0-based dans le JSON, pas dans le fichier)>,
  "headerRows": [<indices des lignes qui sont des en-têtes à exclure>],
  "columnMap": {
    "__EMPTY": "nouveau_nom_ou_null_si_inutile",
    "__EMPTY_1": "nouveau_nom",
    "S1 26": "janvier",
    ...
  }
}

Règles pour columnMap :
- Inclus TOUTES les colonnes (y compris les non-__EMPTY si tu veux les renommer)
- Noms en snake_case sans accents
- Si une colonne n'a pas de sens clair, mets null
- N'invente pas de données : base-toi uniquement sur ce que tu vois dans la grille`;

  try {
    const result = await aiComplete("", prompt, { maxTokens: 2000 });
    const text = result.text.trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[ExcelIntelligence] No JSON in AI response for "${sheetName}"`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate the response has the minimum required fields
    if (!parsed.columnMap || typeof parsed.columnMap !== "object") {
      console.warn(`[ExcelIntelligence] Invalid columnMap for "${sheetName}"`);
      return null;
    }

    console.log(`[ExcelIntelligence] "${sheetName}": ${parsed.businessContext} (data starts row ${parsed.dataStartRow})`);

    return {
      columnMap: parsed.columnMap,
      dataStartRow: parsed.dataStartRow || 0,
      headerRows: parsed.headerRows || [],
      businessContext: parsed.businessContext || null,
    };
  } catch (err) {
    console.warn(`[ExcelIntelligence] AI analysis failed for "${sheetName}":`, err.message);
    return null;
  }
}

/**
 * Ask the LLM to analyze the structure of a simple table (CSV, JSON,
 * or XLSX without complex merges) and produce a column mapping + business context.
 *
 * @param {string} tableName - Name of the table/file
 * @param {Array} jsonRows - Rows as parsed (with original column names)
 * @param {Function} aiComplete - AI completion function(system, user, opts)
 * @returns {object|null} { columnMap, dataStartRow, businessContext, headerRows }
 */
export async function analyzeSimpleTableStructure(tableName, jsonRows, aiComplete) {
  if (!jsonRows.length) return null;

  const originalKeys = Object.keys(jsonRows[0]);
  if (originalKeys.length < 3) return null;

  // Build column list with sample values for each
  const colSamples = originalKeys.map((k, i) => {
    const vals = jsonRows.slice(0, 8)
      .map(r => r[k])
      .filter(v => v !== null && v !== undefined && v !== "");
    const samples = vals.slice(0, 4).map(v => {
      let s = String(v);
      if (s.length > 30) s = s.substring(0, 29) + "…";
      return s;
    });
    return `  [${i}] "${k}" → exemples: ${samples.length > 0 ? samples.join(", ") : "(vide)"}`;
  }).join("\n");

  // Build a compact text table of sample rows
  let sampleTable = "";
  const maxCols = Math.min(originalKeys.length, 15);
  const headerLine = originalKeys.slice(0, maxCols).map(k => {
    let s = k.length > 14 ? k.substring(0, 13) + "…" : k;
    return s.padEnd(15);
  }).join("│");
  sampleTable += `  ${headerLine}\n`;
  sampleTable += `  ${"─".repeat(Math.min(maxCols * 16, 240))}\n`;

  for (let i = 0; i < Math.min(6, jsonRows.length); i++) {
    const row = jsonRows[i];
    const vals = originalKeys.slice(0, maxCols).map(k => {
      const v = row[k];
      if (v === null || v === undefined) return "·".padEnd(15);
      let s = String(v);
      if (s.length > 14) s = s.substring(0, 13) + "…";
      return s.padEnd(15);
    });
    sampleTable += `  ${vals.join("│")}\n`;
  }

  const prompt = `Tu es un expert en analyse de données d'entreprise (finance, RH, commercial, risques, etc.).

Voici un fichier de données "${tableName}" avec ${jsonRows.length} lignes et ${originalKeys.length} colonnes.

Colonnes et exemples de valeurs :
${colSamples}

Aperçu des données :
${sampleTable}

ANALYSE DEMANDÉE :
1. Quel est le type de données ? (Budget, P&L, Paie, Portefeuille clients, Risques, etc.)
2. Les premières lignes sont-elles des données ou des en-têtes/metadata à exclure ?
3. Pour chaque colonne : le nom est-il clair et descriptif ?
   - Si oui, normalise-le en snake_case sans accents (ex: "Nom Client" → "nom_client")
   - Si non (nom cryptique, abréviation, code), propose un nom clair basé sur les données
   - Si c'est un mois : utilise janvier, fevrier, mars, etc.
   - Si c'est un indicateur : utilise un nom explicite (taux_croissance, montant_ht, etc.)

Réponds UNIQUEMENT avec un JSON valide :
{
  "businessContext": "Type de données et description courte",
  "dataStartRow": 0,
  "headerRows": [],
  "columnMap": {
    "nom_colonne_original": "nouveau_nom_snake_case",
    ...
  }
}

Règles pour columnMap :
- Inclus TOUTES les colonnes
- Noms en snake_case sans accents
- Si une colonne a déjà un bon nom, normalise-le simplement
- N'invente pas de données : base-toi uniquement sur ce que tu vois`;

  try {
    const result = await aiComplete("", prompt, { maxTokens: 1500 });
    const text = result.text.trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[ExcelIntelligence] No JSON in AI response for table "${tableName}"`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.columnMap || typeof parsed.columnMap !== "object") {
      console.warn(`[ExcelIntelligence] Invalid columnMap for table "${tableName}"`);
      return null;
    }

    console.log(`[ExcelIntelligence] Table "${tableName}": ${parsed.businessContext}`);

    return {
      columnMap: parsed.columnMap,
      dataStartRow: parsed.dataStartRow || 0,
      headerRows: parsed.headerRows || [],
      businessContext: parsed.businessContext || null,
    };
  } catch (err) {
    console.warn(`[ExcelIntelligence] AI analysis failed for table "${tableName}":`, err.message);
    return null;
  }
}

/**
 * Apply the AI-produced column mapping to transform raw XLSX rows into
 * clean, properly named rows.
 *
 * @param {Array} jsonRows - Raw rows from XLSX.sheet_to_json
 * @param {object} analysis - Result from analyzeSheetStructure
 * @param {Function} normalizeColumnName - Column name normalizer
 * @returns {{ rows: Array, columns: string[], businessContext: string }}
 */
export function applySheetAnalysis(jsonRows, analysis, normalizeColumnName) {
  const { columnMap, dataStartRow = 0, headerRows = [], businessContext } = analysis;
  const originalKeys = Object.keys(jsonRows[0]);

  // Build the final keyMap: AI mapping takes priority, then normalize original name
  const keyMap = {};
  const usedNames = new Set();

  for (const k of originalKeys) {
    const aiName = columnMap[k];

    if (aiName === null || aiName === undefined) {
      // AI said this column is useless — still include but with normalized name
      const norm = normalizeColumnName(k);
      keyMap[k] = norm;
    } else {
      // AI provided a meaningful name — normalize it for safety
      let norm = normalizeColumnName(String(aiName));
      if (!norm) norm = normalizeColumnName(k);

      // Deduplicate
      if (usedNames.has(norm)) {
        let suffix = 2;
        while (usedNames.has(`${norm}_${suffix}`)) suffix++;
        norm = `${norm}_${suffix}`;
      }
      keyMap[k] = norm;
    }
    usedNames.add(keyMap[k]);
  }

  // Filter out header rows and rows before dataStartRow
  const skipRows = new Set(headerRows);
  const cleanRows = jsonRows
    .filter((_, i) => i >= dataStartRow && !skipRows.has(i))
    .filter(row => Object.values(row).some(v => v !== null && v !== undefined && v !== ""));

  // Remap columns
  const remapped = cleanRows.map(row => {
    const newRow = {};
    for (const [origKey, newKey] of Object.entries(keyMap)) {
      let val = row[origKey];
      if (typeof val === "string") val = val.trim();
      if (val !== null && val !== undefined && val !== "") {
        newRow[newKey] = val;
      }
    }
    return newRow;
  });

  return {
    rows: remapped,
    columns: Object.values(keyMap),
    keyMap,
    businessContext,
  };
}
