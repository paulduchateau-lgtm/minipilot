import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "minipilot.db"));
db.pragma("journal_mode = WAL");

const slug = process.argv[2] || "carto-des-risques";
const ws = db.prepare("SELECT id FROM workspaces WHERE slug = ?").get(slug);
if (!ws) { console.error("Workspace not found:", slug); process.exit(1); }
const wsId = ws.id;

// Delete old clean_data for this workspace
db.prepare("DELETE FROM clean_data WHERE workspace_id = ?").run(wsId);
console.log("Cleared old clean_data for workspace:", slug);

// Get all uploaded files
const files = db.prepare("SELECT * FROM uploaded_files WHERE workspace_id = ?").all(wsId);

for (const file of files) {
  // Get unique sheet names
  const sheets = db.prepare("SELECT DISTINCT sheet_name FROM data_rows WHERE file_id = ?").all(file.id);

  for (const { sheet_name } of sheets) {
    const rows = db.prepare("SELECT row_data FROM data_rows WHERE file_id = ? AND sheet_name = ?").all(file.id, sheet_name);
    if (rows.length === 0) continue;

    const parsed = rows.map(r => JSON.parse(r.row_data));

    // Detect columns from first row
    const colNames = Object.keys(parsed[0]);
    const columns = colNames.map(name => {
      const values = parsed.map(r => r[name]).filter(v => v !== null && v !== undefined && v !== "");
      const numCount = values.filter(v => typeof v === "number" || (!isNaN(Number(v)) && String(v).trim() !== "")).length;
      const type = numCount > values.length * 0.7 ? "number" : "text";
      return { name, type };
    });

    const tableName = sheet_name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    console.log(`  ${tableName}: ${parsed.length} rows, ${columns.length} cols`);

    const insert = db.prepare("INSERT INTO clean_data (table_name, columns, row_data, source_file_id, workspace_id) VALUES (?, ?, ?, ?, ?)");
    const colsJson = JSON.stringify(columns);
    const tx = db.transaction(() => {
      for (const row of parsed) {
        insert.run(tableName, colsJson, JSON.stringify(row), file.id, wsId);
      }
    });
    tx();
  }
}

// Update workspace row_count
const totalRows = db.prepare("SELECT COUNT(*) as cnt FROM clean_data WHERE workspace_id = ?").get(wsId).cnt;
db.prepare("UPDATE workspaces SET row_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(totalRows, wsId);

console.log(`Done! Total clean rows: ${totalRows}`);
