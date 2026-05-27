// ── Interpretation routes — AI-powered chart analysis ────────────────────────
// REF-SPEC/AG001-INTERPRET v1.0

import { v4 as uuidv4 } from "uuid";
import { buildInterpretPrompt } from "./prompts.js";

/**
 * Register interpretation routes on the Express app.
 *
 * @param {object} app - Express app instance
 * @param {object} deps
 * @param {Function} deps.dbGet
 * @param {Function} deps.dbAll
 * @param {Function} deps.dbRun
 * @param {object}   deps.anthropic - Anthropic SDK client
 * @param {Function} deps.streamAnthropicSSE - SSE streaming helper
 */
export function registerInterpretRoutes(app, { dbGet, dbAll, dbRun, anthropic, streamAnthropicSSE }) {

  // ── Ensure the interpretations table exists ─────────────────────────────────

  (async () => {
    try {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS interpretations (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          report_id TEXT,
          section_index INTEGER,
          chart_meta TEXT,
          interpretation TEXT NOT NULL,
          language TEXT DEFAULT 'fr',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (err) {
      console.error("Failed to create interpretations table:", err.message);
    }
  })();

  // ── POST /api/w/:slug/ai/interpret — streaming chart interpretation ───────

  app.post("/api/w/:slug/ai/interpret", async (req, res) => {
    try {
      if (!anthropic) {
        return res.status(503).json({ error: "Service IA indisponible (clé API Anthropic manquante)." });
      }

      const { sectionIndex, chartData, chartMeta, userContext, language, reportId } = req.body;

      // Validate required fields
      if (!chartData) {
        return res.status(400).json({ error: "Paramètre 'chartData' manquant." });
      }
      if (!chartMeta || typeof chartMeta !== "object") {
        return res.status(400).json({ error: "Paramètre 'chartMeta' manquant ou invalide." });
      }

      const workspaceId = req.workspace.id;
      const lang = language === "en" ? "en" : "fr";

      // Build prompts
      const { system, user } = buildInterpretPrompt(chartData, chartMeta, userContext, lang);

      // Stream the response via SSE
      const fullText = await streamAnthropicSSE(anthropic, res, system, user, {
        maxTokens: 1500,
      });

      // Persist interpretation after streaming completes
      try {
        const id = uuidv4();
        await dbRun(
          `INSERT INTO interpretations (id, workspace_id, report_id, section_index, chart_meta, interpretation, language)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          id,
          workspaceId,
          reportId || null,
          sectionIndex != null ? sectionIndex : null,
          JSON.stringify(chartMeta),
          fullText,
          lang
        );
      } catch (persistErr) {
        // Log but don't fail — the user already received the streamed response
        console.error("Failed to persist interpretation:", persistErr.message);
      }

    } catch (err) {
      console.error("Interpret error:", err.message);
      // If headers already sent (SSE started), the stream helper handles the error
      if (!res.headersSent) {
        res.status(500).json({ error: "Erreur lors de l'interprétation." });
      }
    }
  });

  // ── GET /api/w/:slug/interpretations/:reportId — retrieve saved interpretations

  app.get("/api/w/:slug/interpretations/:reportId", async (req, res) => {
    try {
      const workspaceId = req.workspace.id;
      const { reportId } = req.params;

      const rows = await dbAll(
        `SELECT id, section_index, chart_meta, interpretation, language, created_at
         FROM interpretations
         WHERE workspace_id = ? AND report_id = ?
         ORDER BY section_index ASC, created_at DESC`,
        workspaceId,
        reportId
      );

      // Parse chart_meta JSON for each row
      const interpretations = rows.map((row) => ({
        ...row,
        chart_meta: row.chart_meta ? JSON.parse(row.chart_meta) : null,
      }));

      res.json({ interpretations });

    } catch (err) {
      console.error("Get interpretations error:", err.message);
      res.status(500).json({ error: "Erreur lors de la récupération des interprétations." });
    }
  });
}
