import { useState, useEffect } from "react";
import { Trash2, Loader2, RotateCcw } from "lucide-react";
import { useWorkspaceApi } from "../lib/WorkspaceContext";
import ReportCard from "./ReportCard";

export default function TrashPage({ onReportRestored }) {
  const api = useWorkspaceApi();
  const [trashedReports, setTrashedReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const data = await api.getTrashedReports();
      setTrashedReports(data.reports || []);
    } catch {
      setTrashedReports([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadTrash(); }, []);

  const handleRestore = async (id) => {
    try {
      await api.restoreReport(id);
      setTrashedReports(prev => prev.filter(r => r.id !== id));
      if (onReportRestored) onReportRestored();
    } catch (e) {
      console.error("Failed to restore report", e);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 1140, width: "100%", margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 300, marginBottom: 4,
          fontFamily: "var(--font-display)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Trash2 size={24} color="var(--mp-text-muted)" />
          Corbeille
        </h1>
        <p style={{ color: "var(--mp-text-muted)", fontSize: 14 }}>
          {trashedReports.length} rapport{trashedReports.length !== 1 ? "s" : ""} dans la corbeille
        </p>
      </div>

      {loading && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 60, gap: 12,
        }}>
          <Loader2 size={20} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "var(--mp-text-muted)", fontSize: 14 }}>Chargement...</span>
        </div>
      )}

      {!loading && trashedReports.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
          {trashedReports.map(r => {
            const kpis = typeof r.kpis === "string" ? JSON.parse(r.kpis) : (r.kpis || []);
            const sections = typeof r.sections === "string" ? JSON.parse(r.sections) : (r.sections || []);
            return (
              <ReportCard
                key={r.id}
                report={{ ...r, kpis, sections, subtitle: r.subtitle || "", color: r.color || "#4A90B8" }}
                isTrashed
                onRestore={() => handleRestore(r.id)}
                onClick={() => {}}
              />
            );
          })}
        </div>
      )}

      {!loading && trashedReports.length === 0 && (
        <div style={{
          background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)", padding: "48px 32px", textAlign: "center",
        }}>
          <Trash2 size={32} color="var(--mp-text-muted)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Corbeille vide</p>
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)" }}>
            Les rapports supprimes apparaitront ici.
          </p>
        </div>
      )}
    </div>
  );
}
