import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EditorSectionPalette from "./EditorSectionPalette";
import EditorSectionList from "./EditorSectionList";
import RenderSection from "./RenderSection";

export default function ReportEditorPage({ api, slug, reportId }) {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [title, setTitle] = useState("Nouveau rapport");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (reportId) {
      api.getReport(reportId)
        .then(report => {
          if (report) {
            setTitle(report.title || "Rapport sans titre");
            let parsedSections = [];
            try {
              parsedSections = typeof report.sections === "string"
                ? JSON.parse(report.sections)
                : (Array.isArray(report.sections) ? report.sections : []);
            } catch {
              parsedSections = [];
            }
            // Ensure each section has a unique id for DnD
            parsedSections = parsedSections.map(s =>
              s.id ? s : { ...s, id: crypto.randomUUID() }
            );
            setSections(parsedSections);
          }
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    } else {
      setSections([]);
      setLoaded(true);
    }
  }, [reportId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Strip internal id fields before saving
      const sectionsForApi = sections.map(({ id, ...rest }) => rest);
      const payload = {
        title,
        subtitle: "",
        objective: "",
        kpis: [],
        sections: sectionsForApi,
        isPrivate: 1,
      };
      if (reportId) {
        await api.updateReport(reportId, payload);
        navigate(`/${slug}/report/${reportId}`);
      } else {
        const saved = await api.saveReport(payload);
        navigate(`/${slug}/report/${saved.id}`);
      }
    } catch (err) {
      console.error("[ReportEditorPage] save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-body)", color: "var(--mp-text-muted)", fontSize: 14,
      }}>
        Chargement de l'editeur...
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      height: "100%",
      overflow: "hidden",
      fontFamily: "var(--font-body)",
    }}>
      {/* Left column: palette + section list */}
      <div style={{
        width: 420,
        minWidth: 420,
        borderRight: "1px solid var(--mp-border)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header: title input + save button */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--mp-border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            aria-label="Titre du rapport"
            style={{
              flex: 1,
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--mp-text)",
              minWidth: 0,
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || sections.length === 0}
            style={{
              background: sections.length === 0 || saving ? "var(--mp-border)" : "var(--mp-accent)",
              color: sections.length === 0 || saving ? "var(--mp-text-muted)" : "var(--mp-bg)",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              cursor: sections.length === 0 || saving ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              transition: "background 150ms ease, color 150ms ease",
              flexShrink: 0,
            }}
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>

        {/* Section palette */}
        <EditorSectionPalette
          onAdd={section => setSections(prev => [...prev, section])}
          api={api}
        />

        {/* DnD section list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <EditorSectionList
            sections={sections}
            onReorder={setSections}
            onChange={updated => setSections(prev =>
              prev.map(s => s.id === updated.id ? updated : s)
            )}
            onDelete={id => setSections(prev => prev.filter(s => s.id !== id))}
          />
        </div>
      </div>

      {/* Right column: live preview */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: 32,
        minWidth: 0,
        background: "var(--mp-bg)",
      }}>
        <span style={{
          display: "block",
          fontFamily: "var(--font-data)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--mp-text-muted)",
          marginBottom: 20,
        }}>
          APERCU
        </span>

        {sections.length === 0 ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
            color: "var(--mp-text-muted)",
            fontSize: 13,
            fontStyle: "italic",
            fontFamily: "var(--font-body)",
          }}>
            L'apercu apparaitra ici
          </div>
        ) : (
          sections.map(s => (
            <div key={s.id} style={{ marginBottom: 24 }}>
              <RenderSection section={s} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
