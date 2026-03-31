import { Plus, BookOpen, Lock, Loader2 } from "lucide-react";
import ReportCard from "./ReportCard";

export default function ReportsPage({ reports, reportsLoading, toggleStar, trashReport, openReport, goToChat }) {
  const sharedReports = reports.shared || [];
  const privateReports = reports.private || [];
  const total = sharedReports.length + privateReports.length;

  return (
    <div style={{ padding: 32, maxWidth: 1140, width: "100%", margin: "0 auto" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28,
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 4, fontFamily: "var(--font-display)" }}>
            Rapports
          </h1>
          <p style={{ color: "var(--mp-text-muted)", fontSize: 14 }}>
            {total} rapport{total !== 1 ? "s" : ""} disponible{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={goToChat} style={{
          background: "var(--mp-accent)", border: "none", borderRadius: "var(--radius-md)",
          padding: "10px 20px", color: "var(--mp-accent-on)", cursor: "pointer",
          fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
          fontFamily: "var(--font-body)",
        }}>
          <Plus size={16} /> Nouveau rapport
        </button>
      </div>

      {reportsLoading && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 60, gap: 12,
        }}>
          <Loader2 size={20} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "var(--mp-text-muted)", fontSize: 14 }}>Chargement...</span>
        </div>
      )}

      {/* Shared reports */}
      {sharedReports.length > 0 && (
        <>
          <h2 style={{
            fontSize: 14, fontWeight: 500, marginBottom: 14,
            display: "flex", alignItems: "center", gap: 8,
            color: "var(--mp-text-secondary)",
          }}>
            <BookOpen size={14} /> Rapports partagés
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16, marginBottom: 28 }}>
            {sharedReports.map(r => (
              <ReportCard
                key={r.id}
                report={normalizeReport(r)}
                isFav={!!r.starred}
                onToggleFav={() => toggleStar(r.id)}
                onDelete={trashReport ? () => trashReport(r.id) : undefined}
                onClick={() => openReport(r.id)}
                isShared
              />
            ))}
          </div>
        </>
      )}

      {/* Private reports */}
      {privateReports.length > 0 && (
        <>
          <h2 style={{
            fontSize: 14, fontWeight: 500, marginBottom: 14,
            display: "flex", alignItems: "center", gap: 8,
            color: "var(--mp-text-secondary)",
          }}>
            <Lock size={14} /> Rapports privés
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16, marginBottom: 28 }}>
            {privateReports.map(r => (
              <ReportCard
                key={r.id}
                report={normalizeReport(r)}
                isFav={!!r.starred}
                onToggleFav={() => toggleStar(r.id)}
                onDelete={trashReport ? () => trashReport(r.id) : undefined}
                onClick={() => openReport(r.id)}
              />
            ))}
          </div>
        </>
      )}

      {!reportsLoading && total === 0 && (
        <div style={{
          background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)", padding: "48px 32px", textAlign: "center",
        }}>
          <BookOpen size={32} color="var(--mp-text-muted)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Aucun rapport</p>
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)", marginBottom: 16 }}>
            Explorez vos données pour générer des rapports métier.
          </p>
          <button onClick={goToChat} style={{
            background: "var(--mp-accent)", border: "none", borderRadius: "var(--radius-md)",
            padding: "10px 20px", color: "var(--mp-accent-on)", cursor: "pointer",
            fontSize: 14, fontWeight: 500, fontFamily: "var(--font-body)",
          }}>
            Lancer l'explorateur
          </button>
        </div>
      )}
    </div>
  );
}

function normalizeReport(r) {
  const kpis = typeof r.kpis === "string" ? JSON.parse(r.kpis) : (r.kpis || []);
  const sections = typeof r.sections === "string" ? JSON.parse(r.sections) : (r.sections || []);
  return {
    ...r,
    kpis,
    sections,
    subtitle: r.subtitle || "",
    color: r.color || "#4A90B8",
  };
}
