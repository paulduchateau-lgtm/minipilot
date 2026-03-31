import { useState, useEffect, useRef } from "react";
import {
  Sparkles, BarChart2, PieChart, Table2, TrendingUp,
  Check, Loader2, AlertTriangle, ChevronRight,
} from "lucide-react";
import { useWorkspaceApi } from "../../lib/WorkspaceContext";

const CHART_TYPE_ICONS = {
  bar: BarChart2,
  pie: PieChart,
  table: Table2,
  line: TrendingUp,
  area: TrendingUp,
};

const CHART_TYPE_LABELS = {
  bar: "Barres",
  pie: "Camembert",
  table: "Tableau",
  line: "Courbe",
  area: "Aire",
};

function ChartTypeBadge({ type }) {
  const Icon = CHART_TYPE_ICONS[type] || BarChart2;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: "var(--font-data)", fontSize: 9,
      textTransform: "uppercase", letterSpacing: "0.1em",
      background: "var(--mp-bg-elevated)",
      border: "1px solid var(--mp-border)",
      borderRadius: "var(--radius-pill)",
      padding: "3px 8px",
      color: "var(--mp-text-muted)",
    }}>
      <Icon size={9} />
      {CHART_TYPE_LABELS[type] || type}
    </span>
  );
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", marginLeft: 4 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "var(--mp-accent)",
          display: "inline-block",
          animation: "pulse-glow 1.4s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </span>
  );
}

export default function OnboardingSuggest({ onNext, data }) {
  const api = useWorkspaceApi();
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({});
  const [error, setError] = useState(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const load = async () => {
      try {
        const result = await api.suggestReports();
        const list = result.suggestions || [];
        setSuggestions(list);
        // Pre-select top 3
        const top3 = new Set(list.slice(0, 3).map((_, i) => i));
        setSelected(top3);
      } catch {
        setError("Impossible de charger les suggestions. Veuillez reessayer.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleSelection = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selected.size === 0 || generating) return;
    setGenerating(true);
    setError(null);

    const selectedList = [...selected].map(i => suggestions[i]);
    const initialProgress = {};
    selectedList.forEach((_, i) => { initialProgress[i] = "pending"; });
    setGenerationProgress(initialProgress);

    const generated = [];

    for (let i = 0; i < selectedList.length; i++) {
      setGenerationProgress(prev => ({ ...prev, [i]: "active" }));
      try {
        const report = await api.generateReport(selectedList[i]);
        generated.push(report);
        setGenerationProgress(prev => ({ ...prev, [i]: "done" }));
      } catch {
        setGenerationProgress(prev => ({ ...prev, [i]: "error" }));
        generated.push(null);
      }
    }

    setGenerating(false);
    onNext({ reports: generated.filter(Boolean) });
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 0", gap: 20,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "var(--radius-lg)",
          background: "var(--mp-accent-dim)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Sparkles size={24} color="var(--mp-accent)" />
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{
            fontSize: 15, fontFamily: "var(--font-body)",
            color: "var(--mp-text)", marginBottom: 8,
          }}>
            L'IA analyse vos donnees et votre contexte
            <TypingDots />
          </p>
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)", fontFamily: "var(--font-body)" }}>
            Identification des analyses les plus pertinentes...
          </p>
        </div>
      </div>
    );
  }

  if (error && suggestions.length === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(196, 90, 50, 0.08)",
        border: "1px solid rgba(196, 90, 50, 0.25)",
        borderLeft: "3px solid var(--mp-warm)",
        borderRadius: "var(--radius-sm)",
        padding: "12px 16px",
      }}>
        <AlertTriangle size={14} color="var(--mp-warm)" />
        <span style={{ fontSize: 13, color: "var(--mp-warm)", fontFamily: "var(--font-body)" }}>{error}</span>
      </div>
    );
  }

  const selectedArray = [...selected];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, color: "var(--mp-text-muted)", fontFamily: "var(--font-body)" }}>
          {suggestions.length} rapports suggeres — selectionnez ceux a generer
        </p>
        <span style={{
          fontFamily: "var(--font-data)", fontSize: 10,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--mp-accent-text)",
          background: "var(--mp-accent-dim)",
          border: "1px solid var(--mp-accent)",
          borderRadius: "var(--radius-pill)",
          padding: "3px 10px",
        }}>
          {selected.size} selectionne{selected.size > 1 ? "s" : ""}
        </span>
      </div>

      {/* Suggestion cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {suggestions.map((sug, i) => {
          const isSelected = selected.has(i);
          const progStatus = generationProgress[selectedArray.indexOf(i)];

          return (
            <div
              key={i}
              className="animate-fade-up"
              style={{
                animationDelay: `${i * 0.05}s`,
                background: isSelected ? "var(--mp-bg-card)" : "var(--mp-bg-elevated)",
                border: `1px solid ${isSelected ? "var(--mp-accent)" : "var(--mp-border)"}`,
                borderRadius: "var(--radius-md)",
                padding: "16px 18px",
                cursor: generating ? "default" : "pointer",
                transition: "border-color 0.15s, background 0.15s",
                position: "relative",
                overflow: "hidden",
              }}
              onClick={() => !generating && toggleSelection(i)}
              onMouseEnter={e => {
                if (!generating && !isSelected) {
                  e.currentTarget.style.borderColor = "var(--mp-border)";
                  e.currentTarget.style.background = "var(--mp-bg-card)";
                }
              }}
              onMouseLeave={e => {
                if (!generating && !isSelected) {
                  e.currentTarget.style.borderColor = "var(--mp-border)";
                  e.currentTarget.style.background = "var(--mp-bg-elevated)";
                }
              }}
            >
              {/* Selection indicator */}
              <div style={{
                position: "absolute", top: 12, right: 12,
                width: 18, height: 18, borderRadius: "50%",
                border: `2px solid ${isSelected ? "var(--mp-accent)" : "var(--mp-border)"}`,
                background: isSelected ? "var(--mp-accent)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
                {isSelected && <Check size={10} color="var(--mp-accent-on)" />}
              </div>

              {/* Generation progress overlay */}
              {generating && progStatus && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  height: 3,
                  background: progStatus === "done" ? "var(--mp-success)" :
                    progStatus === "error" ? "var(--mp-warm)" :
                    progStatus === "active" ? "var(--mp-accent)" : "transparent",
                  transition: "background 0.3s",
                }} />
              )}

              <div style={{ paddingRight: 24 }}>
                {/* Chart type badge */}
                <div style={{ marginBottom: 10 }}>
                  <ChartTypeBadge type={sug.chartType || "bar"} />
                </div>

                {/* Title */}
                <p style={{
                  fontSize: 14, fontWeight: 500,
                  fontFamily: "var(--font-body)",
                  color: isSelected ? "var(--mp-text)" : "var(--mp-text-secondary)",
                  marginBottom: 6, lineHeight: 1.4,
                }}>
                  {sug.title}
                </p>

                {/* Description */}
                <p style={{
                  fontSize: 12, color: "var(--mp-text-muted)",
                  fontFamily: "var(--font-body)", lineHeight: 1.6,
                  marginBottom: 12,
                }}>
                  {sug.description}
                </p>

                {/* Columns */}
                {sug.columns && sug.columns.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{
                      fontFamily: "var(--font-data)", fontSize: 9,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                      color: "var(--mp-text-muted)", display: "block", marginBottom: 4,
                    }}>
                      Colonnes utilises
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {sug.columns.map(col => (
                        <span key={col} style={{
                          fontFamily: "var(--font-data)", fontSize: 9,
                          background: "var(--mp-bg-elevated)",
                          border: "1px solid var(--mp-border)",
                          borderRadius: "var(--radius-sm)",
                          padding: "2px 7px",
                          color: "var(--mp-text-muted)",
                        }}>
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* KPIs */}
                {sug.kpis && sug.kpis.length > 0 && (
                  <div>
                    <span style={{
                      fontFamily: "var(--font-data)", fontSize: 9,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                      color: "var(--mp-text-muted)", display: "block", marginBottom: 4,
                    }}>
                      KPIs
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {sug.kpis.map(kpi => (
                        <span key={kpi} style={{
                          fontFamily: "var(--font-data)", fontSize: 9,
                          background: isSelected ? "var(--mp-accent-dim)" : "var(--mp-bg-elevated)",
                          border: `1px solid ${isSelected ? "rgba(176, 216, 56, 0.2)" : "var(--mp-border)"}`,
                          borderRadius: "var(--radius-sm)",
                          padding: "2px 7px",
                          color: isSelected ? "var(--mp-accent-text)" : "var(--mp-text-muted)",
                          transition: "all 0.15s",
                        }}>
                          {kpi}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generation progress */}
      {generating && (
        <div className="animate-fade-up" style={{
          background: "var(--mp-bg-card)",
          border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
        }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--mp-text-muted)", marginBottom: 12,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Loader2 size={12} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
            Generation des rapports
          </p>
          {selectedArray.map((si, pi) => {
            const sug = suggestions[si];
            const status = generationProgress[pi] || "pending";
            return (
              <div key={si} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 0",
                borderBottom: pi < selectedArray.length - 1 ? "1px solid var(--mp-border-subtle)" : "none",
              }}>
                {status === "done" ? (
                  <Check size={13} color="var(--mp-success)" />
                ) : status === "active" ? (
                  <Loader2 size={13} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
                ) : status === "error" ? (
                  <AlertTriangle size={13} color="var(--mp-warm)" />
                ) : (
                  <div style={{ width: 13, height: 13, borderRadius: "50%", border: "1px solid var(--mp-border)" }} />
                )}
                <span style={{
                  fontSize: 13, fontFamily: "var(--font-body)",
                  color: status === "done" ? "var(--mp-text)" : "var(--mp-text-muted)",
                }}>
                  {sug.title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleGenerate}
          disabled={selected.size === 0 || generating}
          style={{
            background: selected.size > 0 && !generating ? "var(--mp-accent)" : "var(--mp-border)",
            color: selected.size > 0 && !generating ? "var(--mp-accent-on)" : "var(--mp-text-muted)",
            border: "none", borderRadius: "var(--radius-md)",
            padding: "11px 28px", fontSize: 14, fontWeight: 500,
            fontFamily: "var(--font-body)",
            cursor: selected.size > 0 && !generating ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 8,
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {generating ? (
            <>
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
              Generation en cours...
            </>
          ) : (
            <>
              <Sparkles size={15} />
              Generer {selected.size > 0 ? `${selected.size} ` : ""}rapport{selected.size > 1 ? "s" : ""}
              <ChevronRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
