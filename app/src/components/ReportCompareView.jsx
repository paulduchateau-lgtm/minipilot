import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import RenderSection from "./RenderSection";

function detectChangedSections(sectionsA, sectionsB) {
  return sectionsB.map((s, i) => ({
    ...s,
    _changed: !sectionsA[i] || sectionsA[i].title !== s.title || sectionsA[i].insight !== s.insight,
    _new: !sectionsA[i],
  }));
}

function DiffBadge({ type }) {
  const isNew = type === "new";
  return (
    <span
      role="status"
      style={{
        display: "inline-block",
        fontFamily: "var(--font-data)",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: isNew ? "var(--mp-success)" : "var(--mp-accent)",
        background: isNew ? "rgba(104, 180, 116, 0.12)" : "var(--mp-accent-dim)",
        padding: "2px 8px",
        borderRadius: 9999,
        marginBottom: 6,
        animationName: "fadeIn",
        animationDuration: "200ms",
        animationTimingFunction: "ease",
        animationFillMode: "both",
      }}
    >
      {isNew ? "NOUVEAU" : "MODIFIÉ"}
    </span>
  );
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  try {
    return new Date(isoStr).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

export default function ReportCompareView({ report, compareVersionNum, api, onExit }) {
  const [pastVersion, setPastVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsNarrow(mq.matches);
    const handler = (e) => setIsNarrow(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!report?.id || compareVersionNum == null) return;
    setLoading(true);
    api.getReportVersion(report.id, compareVersionNum)
      .then((data) => {
        setPastVersion(data.version || null);
      })
      .catch(() => {
        setPastVersion(null);
      })
      .finally(() => setLoading(false));
  }, [report?.id, compareVersionNum]);

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 200, color: "var(--mp-text-muted)",
        fontFamily: "var(--font-body)", fontSize: 14,
      }}>
        Chargement…
      </div>
    );
  }

  const pastSnapshot = pastVersion?.snapshot || {};
  const pastSections = typeof pastSnapshot.sections === "string"
    ? JSON.parse(pastSnapshot.sections)
    : (pastSnapshot.sections || []);

  const currentSections = typeof report.sections === "string"
    ? JSON.parse(report.sections)
    : (report.sections || []);

  const annotatedCurrentSections = detectChangedSections(pastSections, currentSections);

  const colHeaderStyle = {
    fontFamily: "var(--font-data)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "var(--mp-text-muted)",
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  };

  return (
    <div
      role="region"
      aria-label="Comparaison de versions"
      style={{ overflow: "hidden" }}
    >
      {/* Exit button */}
      <button
        onClick={onExit}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: "var(--mp-text-muted)",
          padding: "4px 0",
          marginBottom: 24,
          transition: "color 150ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--mp-text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--mp-text-muted)"; }}
        aria-label="Retour au rapport"
      >
        <ChevronLeft size={16} />
        Retour au rapport
      </button>

      {/* Two-column comparison grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
          gap: 32,
          overflow: "hidden",
        }}
      >
        {/* Left pane — past version */}
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={colHeaderStyle}>
            <span>VERSION {compareVersionNum}</span>
            <span>{pastVersion ? formatDate(pastVersion.created_at) : ""}</span>
          </div>
          {pastSections.map((s, i) => (
            <RenderSection
              key={i}
              section={s}
              feedbackMode={false}
              sectionIndex={i}
            />
          ))}
          {pastSections.length === 0 && (
            <p style={{
              fontSize: 13, color: "var(--mp-text-muted)",
              fontFamily: "var(--font-body)",
            }}>
              Aucune section dans cette version.
            </p>
          )}
        </div>

        {/* Right pane — current version */}
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={colHeaderStyle}>
            <span>VERSION {report.currentVersion || 1}</span>
            <span style={{ color: "var(--mp-accent)" }}>(actuelle)</span>
          </div>
          {annotatedCurrentSections.map((s, i) => {
            const isNew = s._new;
            const isChanged = !isNew && s._changed;
            const hasDiff = isNew || isChanged;

            return (
              <div
                key={i}
                style={{
                  borderLeft: hasDiff
                    ? `3px solid ${isNew ? "var(--mp-success)" : "var(--mp-accent)"}`
                    : "3px solid transparent",
                  background: hasDiff
                    ? isNew
                      ? "rgba(104, 180, 116, 0.06)"
                      : "var(--mp-accent-dim)"
                    : "transparent",
                  borderRadius: hasDiff ? "0 var(--radius-md) var(--radius-md) 0" : 0,
                  marginBottom: hasDiff ? 4 : 0,
                  paddingLeft: hasDiff ? 8 : 0,
                  animationDelay: prefersReducedMotion ? "0ms" : `${i * 0.05}s`,
                }}
              >
                {hasDiff && (
                  <div style={{ marginBottom: 4 }}>
                    <DiffBadge type={isNew ? "new" : "changed"} />
                  </div>
                )}
                <RenderSection
                  section={s}
                  feedbackMode={false}
                  sectionIndex={i}
                />
              </div>
            );
          })}
          {annotatedCurrentSections.length === 0 && (
            <p style={{
              fontSize: 13, color: "var(--mp-text-muted)",
              fontFamily: "var(--font-body)",
            }}>
              Aucune section dans la version actuelle.
            </p>
          )}
        </div>
      </div>

      {/* Inline keyframe for badge fade-in */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes fadeIn {
            from { opacity: 1; }
            to { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}
