import { Star, BookOpen, FileText, MessageSquare, Activity, Loader2, FileUp } from "lucide-react";
import ReportCard from "./ReportCard";

export default function DashboardPage({ reports, reportsLoading, toggleStar, trashReport, openReport, goToChat, goToImport }) {
  const sharedReports = reports.shared || [];
  const allPrivate = reports.private || [];
  const favoriteReports = allPrivate.filter(r => r.starred);
  const otherReports = allPrivate.filter(r => !r.starred);
  const total = sharedReports.length + allPrivate.length;

  // Compute overview KPIs from shared reports (take first 4)
  const overviewKpis = [];
  for (const report of sharedReports) {
    if (overviewKpis.length >= 4) break;
    const kpis = typeof report.kpis === "string" ? JSON.parse(report.kpis) : (report.kpis || []);
    for (const kpi of kpis) {
      if (overviewKpis.length < 4) overviewKpis.push(kpi);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 1140, width: "100%", margin: "0 auto" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 300, marginBottom: 4,
            fontFamily: "var(--font-display)",
          }}>Tableau de bord</h1>
          <p style={{ color: "var(--mp-text-muted)", fontSize: 14 }}>
            {total} rapport{total !== 1 ? "s" : ""} disponible{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={goToImport} style={{
            background: "transparent", border: "1px solid var(--mp-border)", borderRadius: "var(--radius-md)",
            padding: "10px 20px", color: "var(--mp-text-secondary)", cursor: "pointer",
            fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
            fontFamily: "var(--font-body)",
          }}>
            <FileUp size={16} /> Importer un modele
          </button>
          <button onClick={goToChat} style={{
            background: "var(--mp-accent)", border: "none", borderRadius: "var(--radius-md)",
            padding: "10px 20px", color: "var(--mp-accent-on)", cursor: "pointer",
            fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
            fontFamily: "var(--font-body)",
          }}>
            <MessageSquare size={16} /> Nouvelle exploration
          </button>
        </div>
      </div>

      {/* Overview KPIs */}
      {overviewKpis.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(overviewKpis.length, 4)}, 1fr)`, gap: 14, marginBottom: 28 }}>
          {overviewKpis.map((k, i) => (
            <div key={i} className="animate-fade-up" style={{
              background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-md)", padding: "18px 22px",
              animationDelay: `${i * 0.1}s`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="data-label">{k.label}</span>
                <Activity size={15} color="var(--mp-text-muted)" />
              </div>
              <span style={{ fontSize: 24, fontWeight: 600, fontFamily: "var(--font-body)" }}>{k.value}</span>
              <span className="data-value" style={{
                fontSize: 11, display: "block", marginTop: 4,
                color: k.bad ? "var(--mp-warm)" : "var(--mp-success)",
              }}>{k.trend} vs N-1</span>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {reportsLoading && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 60, gap: 12,
        }}>
          <Loader2 size={20} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ color: "var(--mp-text-muted)", fontSize: 14 }}>Chargement des rapports...</span>
        </div>
      )}

      {/* Section 1: Rapports communs (partagés) */}
      {sharedReports.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader icon={<BookOpen size={15} color="var(--mp-accent)" />} label="Rapports communs" count={sharedReports.length} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
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
        </div>
      )}

      {/* Section 2: Mes rapports favoris */}
      {favoriteReports.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader icon={<Star size={15} color="#D4A03A" fill="#D4A03A" />} label="Mes rapports favoris" count={favoriteReports.length} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
            {favoriteReports.map(r => (
              <ReportCard
                key={r.id}
                report={normalizeReport(r)}
                isFav
                onToggleFav={() => toggleStar(r.id)}
                onDelete={trashReport ? () => trashReport(r.id) : undefined}
                onClick={() => openReport(r.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Tous mes rapports (non-favoris) */}
      {otherReports.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader icon={<FileText size={15} color="var(--mp-text-muted)" />} label="Tous mes rapports" count={otherReports.length} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
            {otherReports.map(r => (
              <ReportCard
                key={r.id}
                report={normalizeReport(r)}
                isFav={false}
                onToggleFav={() => toggleStar(r.id)}
                onDelete={trashReport ? () => trashReport(r.id) : undefined}
                onClick={() => openReport(r.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!reportsLoading && total === 0 && (
        <div style={{
          background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)", padding: "48px 32px",
          textAlign: "center", marginBottom: 28,
        }}>
          <BookOpen size={32} color="var(--mp-text-muted)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Aucun rapport disponible</p>
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)", marginBottom: 16 }}>
            Lancez l'explorateur pour generer votre premier rapport.
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

function SectionHeader({ icon, label, count }) {
  return (
    <h2 style={{
      fontSize: 15, fontWeight: 500, marginBottom: 14,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      {icon}
      {label}
      <span style={{
        fontFamily: "var(--font-data)", fontSize: 10,
        color: "var(--mp-text-muted)", fontWeight: 400,
      }}>
        ({count})
      </span>
    </h2>
  );
}

// Normalize report from backend format to component format
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
