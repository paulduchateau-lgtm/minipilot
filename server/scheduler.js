// ── Scheduler Module ─────────────────────────────────────────────────────────
// In-process cron scheduling for recurring report generation.
// Uses node-cron v4 (ESM default import, no scheduled:false, no task.destroy()).

import cron from 'node-cron';

// ── Module-level state ───────────────────────────────────────────────────────

const activeTasks = new Map();
let dbGet = null;
let dbAll = null;
let dbRun = null;
let helpers = {};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize the scheduler with the database helpers and AI helper functions.
 * Rehydrates all active schedules from the DB.
 */
export async function initScheduler(database, helperFns) {
  dbGet = database.dbGet;
  dbAll = database.dbAll;
  dbRun = database.dbRun;
  helpers = helperFns;

  if (!dbGet || !dbAll || !dbRun) {
    console.warn('[Scheduler] Rehydration disabled: missing database helpers');
    return;
  }
  await rehydrateSchedules();
}

/**
 * Map a schedule's frequency + time params to a cron expression string.
 * Returns null for 'once' (handled separately via immediate execution).
 */
export function buildCronExpression(schedule) {
  const { frequency, minute, hour, day_of_week, day_of_month } = schedule;
  if (frequency === 'daily')   return `${minute} ${hour} * * *`;
  if (frequency === 'weekly')  return `${minute} ${hour} * * ${day_of_week}`;
  if (frequency === 'monthly') return `${minute} ${hour} ${day_of_month} * *`;
  return null; // 'once' handled separately
}

/**
 * Register a schedule with node-cron. For 'once' frequency, executes immediately.
 */
export function registerSchedule(schedule) {
  if (schedule.frequency === 'once') {
    executeSchedule(schedule.id);
    return;
  }

  const expr = buildCronExpression(schedule);
  if (!expr) return;

  const task = cron.schedule(expr, async () => {
    try {
      await executeSchedule(schedule.id);
    } catch (err) {
      console.error(`[Scheduler] Cron callback error for ${schedule.id}:`, err);
    }
  }, {
    timezone: 'Europe/Paris',
    noOverlap: true,
    name: schedule.id,
  });

  activeTasks.set(schedule.id, task);
}

/**
 * Unregister a schedule — stops the cron task and removes it from memory.
 */
export function unregisterSchedule(scheduleId) {
  const task = activeTasks.get(scheduleId);
  if (task) {
    task.stop();
    activeTasks.delete(scheduleId);
  }
}

/**
 * Execute a scheduled report generation.
 * Loads the schedule from DB, generates a report edition, records the run.
 */
export async function executeSchedule(scheduleId) {
  const { aiComplete, buildDataSummary, buildColumnStats, extractThemes, uuidv4 } = helpers;

  const schedule = await dbGet("SELECT * FROM schedules WHERE id = ?", scheduleId);
  if (!schedule || schedule.status !== 'active') return;

  // Check end_date
  if (schedule.end_date && new Date(schedule.end_date) < new Date()) {
    await dbRun("UPDATE schedules SET status = 'completed' WHERE id = ?", scheduleId);
    unregisterSchedule(scheduleId);
    return;
  }

  const runId = helpers.uuidv4();
  const editionNum = schedule.edition_count + 1;

  try {
    let suggestion;
    if (schedule.template_report_id) {
      const templateReport = await dbGet("SELECT * FROM reports WHERE id = ?", schedule.template_report_id);
      if (templateReport) {
        suggestion = {
          title: `${templateReport.title} #${editionNum}`,
          description: templateReport.objective || '',
          type: 'bar',
          columns: [],
          kpis: [],
        };
      }
    } else if (schedule.suggestion) {
      suggestion = JSON.parse(schedule.suggestion);
      suggestion.title = `${suggestion.title} #${editionNum}`;
    }

    if (!suggestion) throw new Error('No suggestion or template configured');

    const report = await generateReportForSchedule(schedule.workspace_id, suggestion);

    await dbRun(`
      INSERT INTO schedule_runs (id, schedule_id, edition_number, report_id, status)
      VALUES (?, ?, ?, ?, 'success')
    `, runId, scheduleId, editionNum, report.id);

    await dbRun(`
      UPDATE schedules SET edition_count = ?, last_run_at = datetime('now'), status = ?
      WHERE id = ?
    `, editionNum, schedule.frequency === 'once' ? 'completed' : 'active', scheduleId);

    if (schedule.frequency === 'once') {
      unregisterSchedule(scheduleId);
    }

    console.log(`[Scheduler] Schedule ${scheduleId} — edition #${editionNum} generated (report ${report.id})`);

  } catch (err) {
    await dbRun(`
      INSERT INTO schedule_runs (id, schedule_id, edition_number, report_id, status, error)
      VALUES (?, ?, ?, NULL, 'error', ?)
    `, runId, scheduleId, editionNum, err.message);

    await dbRun("UPDATE schedules SET status = 'error' WHERE id = ?", scheduleId);

    console.error(`[Scheduler] Schedule ${scheduleId} run failed:`, err);
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function generateReportForSchedule(workspaceId, suggestion) {
  const { aiComplete, buildDataSummary, buildColumnStats, extractThemes, uuidv4 } = helpers;

  const context = await dbGet("SELECT * FROM project_context WHERE workspace_id = ?", workspaceId);
  const dataSummary = await buildDataSummary(20, workspaceId);
  const colStats = await buildColumnStats(workspaceId);

  const contextText = context
    ? `Projet : ${context.project_name || "\u2014"}\nSecteur : ${context.industry || "\u2014"}\nObjectifs : ${context.objectives || "\u2014"}`
    : "Aucun contexte renseigne.";

  const dataText = dataSummary.map(t =>
    `Table "${t.name}" (${t.rowCount} lignes) :\nColonnes : ${t.columns.map(c => `${c.name}(${c.type})`).join(", ")}\nExemples :\n${t.sample.map(r => JSON.stringify(r)).join("\n")}`
  ).join("\n\n");

  const statsText = Object.entries(colStats).map(([table, cols]) => {
    const entries = Object.entries(cols).map(([col, s]) =>
      s.type === "number" ? `  ${col}: min=${s.min}, max=${s.max}, avg=${s.avg}` : `  ${col}: ${s.uniqueCount} valeurs uniques`
    ).join("\n");
    return `Table "${table}" :\n${entries}`;
  }).join("\n\n");

  const prompt = `Tu es un expert data pour mutuelles sante collectives francaises.

CONTEXTE :
${contextText}

RAPPORT A GENERER :
Titre : ${suggestion.title}
Description : ${suggestion.description}
Type principal : ${suggestion.type}
Colonnes cles : ${(suggestion.columns || []).join(", ")}
KPIs demandes : ${(suggestion.kpis || []).join(", ")}

DONNEES DISPONIBLES :
${dataText}

STATISTIQUES :
${statsText}

Genere un rapport analytique complet avec des donnees REELLES calculees depuis les donnees fournies.

REGLES IMPORTANTES pour le format des sections :
- type "bar" : config doit avoir { xKey, yKeys: [...], colors: [...] }
- type "composed" : config doit avoir { xKey, bars: [{key, color, name}], line: {key, color, name} }
- type "grouped_bar" : config doit avoir { xKey, yKeys: [...], colors: [...], names: [...] }
- type "area_multi" : config doit avoir { xKey, yKeys: [...], colors: [...], names: [...] }
- type "pie_multi" : doit avoir data_sets: [{label, data: [{name, value}]}]
- type "table" : doit avoir columns: [{key, label, align?, fmt?, hl?}]
- Les couleurs disponibles : "#C8FF3C" (lite), "#4A90B8" (signal), "#C45A32" (warm), "#D4A03A" (warning), "#3A8A4A" (success)

Reponds UNIQUEMENT avec un JSON valide, sans markdown :
{
  "id": "report_<uuid>",
  "title": "...",
  "subtitle": "...",
  "objective": "...",
  "color": "#4A90B8",
  "kpis": [
    { "label": "...", "value": "...", "trend": "+X%", "bad": false }
  ],
  "sections": [
    {
      "title": "...",
      "type": "bar|composed|grouped_bar|area_multi|pie_multi|table",
      "insight": "Observation analytique cle",
      "data": [...],
      "config": { ... }
    }
  ]
}`;

  const aiResult = await aiComplete("", prompt, { maxTokens: 4000 });
  const rawText = aiResult.text.trim();
  const jsonText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const report = JSON.parse(jsonText);
  report.id = report.id || `report_${uuidv4()}`;

  await dbRun(`
    INSERT INTO reports (id, title, subtitle, objective, color, icon, kpis, sections, shared, starred, source, workspace_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'ai', ?)
  `, report.id, report.title, report.subtitle || null, report.objective || null, report.color || "#4A90B8", report.icon || "BarChart3", JSON.stringify(report.kpis || []), JSON.stringify(report.sections || []), workspaceId);

  await dbRun("INSERT INTO usage_logs (action, query, themes, user_id, workspace_id) VALUES (?, ?, ?, ?, ?)",
    "report_generate", `Generated: ${report.title}`, JSON.stringify(extractThemes(report.title)), "default", workspaceId);

  return report;
}

/**
 * Rehydrate all active schedules from the DB on startup.
 * Skips schedules past their end_date.
 */
async function rehydrateSchedules() {
  const active = await dbAll("SELECT * FROM schedules WHERE status = 'active'");
  let registered = 0;

  for (const s of active) {
    if (s.end_date && new Date(s.end_date) < new Date()) {
      await dbRun("UPDATE schedules SET status = 'completed' WHERE id = ?", s.id);
      continue;
    }
    if (s.frequency !== 'once') {
      const expr = buildCronExpression(s);
      if (expr) {
        const task = cron.schedule(expr, async () => {
          try {
            await executeSchedule(s.id);
          } catch (err) {
            console.error(`[Scheduler] Cron callback error for ${s.id}:`, err);
          }
        }, {
          timezone: 'Europe/Paris',
          noOverlap: true,
          name: s.id,
        });
        activeTasks.set(s.id, task);
        registered++;
      }
    }
  }

  console.log(`[Scheduler] ${registered} schedule(s) rehydrated from ${active.length} active`);
}
