import { useState, useEffect } from "react";
import { BarChart3, PieChart, Table2, TrendingUp, Type, Sparkles, Loader2, X } from "lucide-react";

const SECTION_TYPES = [
  { type: "bar",        label: "Barres",     icon: BarChart3 },
  { type: "pie",        label: "Camembert",  icon: PieChart },
  { type: "table",      label: "Tableau",    icon: Table2 },
  { type: "area_multi", label: "Aires",      icon: TrendingUp },
  { type: "text",       label: "Texte",      icon: Type },
];

export function createSection(type) {
  const id = crypto.randomUUID();
  if (type === "text") {
    return { id, title: "Section texte", type: "text", html: "" };
  }
  return {
    id,
    title: "Nouvelle section",
    type,
    insight: "",
    data: [],
    config: { xKey: "", yKeys: [], colors: [], names: [], bars: [], line: null },
  };
}

function ConceptChips({ concepts, onSelect }) {
  if (!concepts || concepts.length === 0) return null;
  const categorical = concepts.filter(c => c.type !== "number");
  const numeric = concepts.filter(c => c.type === "number");

  const chipStyle = {
    display: "inline-block",
    padding: "3px 10px",
    background: "var(--mp-bg)",
    border: "1px solid var(--mp-border)",
    borderRadius: 9999,
    cursor: "pointer",
    color: "var(--mp-text-secondary)",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.02em",
    transition: "border-color 150ms, color 150ms",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ marginTop: 8 }}>
      <span style={{
        display: "block",
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "var(--mp-text-muted)",
        marginBottom: 6,
      }}>
        Concepts disponibles
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {categorical.slice(0, 6).map(c => (
          <span
            key={`${c.table}-${c.column}`}
            style={chipStyle}
            role="button"
            tabIndex={0}
            title={`${c.uniqueCount} valeurs — ex: ${(c.sampleValues || []).slice(0, 3).join(", ")}`}
            onClick={() => onSelect(c.column)}
            onKeyDown={e => e.key === "Enter" && onSelect(c.column)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--mp-accent)"; e.currentTarget.style.color = "var(--mp-accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mp-border)"; e.currentTarget.style.color = "var(--mp-text-secondary)"; }}
          >
            {c.column}
          </span>
        ))}
        {numeric.slice(0, 4).map(c => (
          <span
            key={`${c.table}-${c.column}`}
            style={{ ...chipStyle, fontStyle: "italic" }}
            role="button"
            tabIndex={0}
            title={`min: ${c.min}, max: ${c.max}, moy: ${c.avg}`}
            onClick={() => onSelect(c.column)}
            onKeyDown={e => e.key === "Enter" && onSelect(c.column)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--mp-accent)"; e.currentTarget.style.color = "var(--mp-accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mp-border)"; e.currentTarget.style.color = "var(--mp-text-secondary)"; }}
          >
            {c.column}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EditorSectionPalette({ onAdd, api }) {
  const [aiMode, setAiMode] = useState(null); // { type, label }
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [concepts, setConcepts] = useState(null);

  useEffect(() => {
    if (api && !concepts) {
      api.getDataConcepts().then(r => setConcepts(r.concepts || [])).catch(() => {});
    }
  }, [api]);

  const handleTypeClick = (type, label) => {
    if (type === "text") {
      onAdd(createSection("text"));
      return;
    }
    setAiMode({ type, label });
    setPrompt("");
    setError(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !aiMode) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generateSection(aiMode.type, prompt.trim());
      if (result.error) throw new Error(result.error);
      const section = result.section;
      section.id = crypto.randomUUID();
      // Ensure numeric data values for Recharts compatibility
      if (Array.isArray(section.data)) {
        const yKeys = section.config?.yKeys || [];
        section.data = section.data.map(row => {
          const fixed = { ...row };
          for (const [k, v] of Object.entries(fixed)) {
            if (typeof v === "string" && !isNaN(v) && v !== "") fixed[k] = Number(v);
          }
          // Also fix nested data (for pie_multi data_sets)
          if (Array.isArray(fixed.data)) {
            fixed.data = fixed.data.map(d => ({
              ...d,
              value: typeof d.value === "string" ? Number(d.value) : d.value,
            }));
          }
          return fixed;
        });
      }
      if (Array.isArray(section.data_sets)) {
        section.data_sets = section.data_sets.map(ds => ({
          ...ds,
          data: (ds.data || []).map(d => ({
            ...d,
            value: typeof d.value === "string" ? Number(d.value) : d.value,
          })),
        }));
      }
      // Normalize pie_multi: ensure data_sets at root level
      if (section.type === "pie_multi" && !section.data_sets) {
        if (Array.isArray(section.data) && section.data[0]?.data) {
          section.data_sets = section.data;
          section.data = [];
        } else if (Array.isArray(section.data) && section.data[0]?.name !== undefined) {
          section.data_sets = [{ label: section.title || "Répartition", data: section.data }];
          section.data = [];
        }
      }
      // Ensure config.colors has defaults if missing
      const c = section.config || {};
      if (c.yKeys?.length && (!c.colors || !c.colors.length)) {
        const palette = ["#4A90B8", "#C45A32", "#D4A03A", "#3A8A4A", "#B0D838"];
        c.colors = c.yKeys.map((_, i) => palette[i % palette.length]);
        section.config = c;
      }
      onAdd(section);
      setAiMode(null);
      setPrompt("");
    } catch (err) {
      setError(err.message || "Erreur de generation");
    } finally {
      setGenerating(false);
    }
  };

  const handleManual = () => {
    if (!aiMode) return;
    onAdd(createSection(aiMode.type));
    setAiMode(null);
    setPrompt("");
  };

  const insertConcept = (name) => {
    setPrompt(prev => prev ? `${prev} ${name}` : name);
  };

  return (
    <div style={{ padding: 16, borderBottom: "1px solid var(--mp-border)" }}>
      <span style={{
        display: "block",
        marginBottom: 10,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--mp-text-muted)",
      }}>
        Ajouter une section
      </span>

      {/* Type buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SECTION_TYPES.map(({ type, label, icon: Icon }) => {
          const isActive = aiMode?.type === type;
          return (
            <button
              key={type}
              onClick={() => handleTypeClick(type, label)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: isActive ? "var(--mp-accent)" : "var(--mp-bg-elevated)",
                border: `1px solid ${isActive ? "var(--mp-accent)" : "var(--mp-border)"}`,
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                color: isActive ? "var(--mp-bg)" : "var(--mp-text-secondary)",
                fontSize: 12,
                fontFamily: "var(--font-body)",
                fontWeight: isActive ? 600 : 400,
                transition: "border-color 150ms ease, color 150ms ease, background 150ms ease",
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "var(--mp-accent)";
                  e.currentTarget.style.color = "var(--mp-accent)";
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "var(--mp-border)";
                  e.currentTarget.style.color = "var(--mp-text-secondary)";
                }
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      {/* AI prompt panel */}
      {aiMode && (
        <div style={{
          marginTop: 12,
          padding: 14,
          background: "var(--mp-bg-elevated)",
          border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}>
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--mp-text)",
            }}>
              <Sparkles size={14} style={{ color: "var(--mp-accent)" }} />
              Decrivez votre {aiMode.label.toLowerCase()}
            </span>
            <button
              onClick={() => { setAiMode(null); setPrompt(""); setError(null); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--mp-text-muted)", padding: 2, display: "flex",
              }}
            >
              <X size={14} />
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={`Ex: "repartition des absences par motif" ou "top 5 des CSE par turnover"`}
            disabled={generating}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
            }}
            style={{
              width: "100%",
              minHeight: 56,
              padding: "10px 12px",
              background: "var(--mp-bg)",
              border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--mp-text)",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              resize: "vertical",
              boxSizing: "border-box",
              outline: "none",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "var(--mp-accent)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "var(--mp-border)"; }}
          />

          {/* Concept chips */}
          <ConceptChips concepts={concepts} onSelect={insertConcept} />

          {error && (
            <p style={{
              marginTop: 8,
              color: "#C45A32",
              fontSize: 12,
              fontFamily: "var(--font-body)",
            }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 16px",
                background: !prompt.trim() || generating ? "var(--mp-border)" : "var(--mp-accent)",
                color: !prompt.trim() || generating ? "var(--mp-text-muted)" : "var(--mp-bg)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: !prompt.trim() || generating ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "var(--font-body)",
                transition: "background 150ms, color 150ms",
              }}
            >
              {generating ? (
                <>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Generation...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generer avec l'IA
                </>
              )}
            </button>
            <button
              onClick={handleManual}
              disabled={generating}
              style={{
                padding: "8px 14px",
                background: "transparent",
                border: "1px solid var(--mp-border)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                color: "var(--mp-text-secondary)",
                fontSize: 12,
                fontFamily: "var(--font-body)",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--mp-text-secondary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mp-border)"; }}
            >
              Manuel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
