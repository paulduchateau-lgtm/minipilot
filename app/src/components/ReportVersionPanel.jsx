import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function ReportVersionPanel({ reportId, currentVersion, api, onCompare }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    api.getReportVersions(reportId)
      .then((data) => {
        setVersions(data.versions || []);
      })
      .catch(() => {
        setVersions([]);
      })
      .finally(() => setLoading(false));
  }, [reportId, currentVersion]);

  const formatDate = (isoStr) => {
    if (!isoStr) return "";
    try {
      return new Date(isoStr).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const truncateFeedback = (text, max = 60) => {
    if (!text) return null;
    return text.length > max ? text.slice(0, max) + "…" : text;
  };

  return (
    <div
      role="region"
      aria-label="Historique des versions"
      style={{
        background: "var(--mp-bg-elevated)",
        border: "1px solid var(--mp-border)",
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
      }}
    >
      {loading ? (
        <p style={{
          fontSize: 13, color: "var(--mp-text-muted)",
          margin: 0, fontFamily: "var(--font-body)",
        }}>
          Chargement…
        </p>
      ) : versions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 16px" }}>
          <p style={{
            fontSize: 14, fontFamily: "var(--font-body)",
            color: "var(--mp-text-muted)", margin: "0 0 6px",
            fontWeight: 500,
          }}>
            Aucune version précédente
          </p>
          <p style={{
            fontSize: 13, fontFamily: "var(--font-body)",
            color: "var(--mp-text-muted)", margin: 0, lineHeight: 1.5,
          }}>
            Améliorez ce rapport pour créer votre première version archivée.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {versions.map((v) => {
            const isCurrent = v.version_num === currentVersion;
            const feedbackPreview = truncateFeedback(v.feedback);
            return (
              <li
                key={v.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  borderLeft: isCurrent ? "2px solid var(--mp-accent)" : "2px solid transparent",
                  background: isCurrent ? "var(--mp-accent-dim)" : "transparent",
                  transition: "background 150ms ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isCurrent ? "var(--mp-accent-dim)" : "transparent";
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: feedbackPreview ? 2 : 0 }}>
                    <span style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      color: isCurrent ? "var(--mp-accent)" : "var(--mp-text)",
                      fontWeight: isCurrent ? 500 : 400,
                    }}>
                      Version {v.version_num}
                    </span>
                    {isCurrent && (
                      <span style={{
                        fontFamily: "var(--font-data)",
                        fontSize: 9,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--mp-accent)",
                      }}>
                        actuelle
                      </span>
                    )}
                    <span style={{
                      fontFamily: "var(--font-data)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--mp-text-muted)",
                    }}>
                      {formatDate(v.created_at)}
                    </span>
                  </div>
                  {feedbackPreview && (
                    <p style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      color: "var(--mp-text-secondary)",
                      margin: 0,
                      lineHeight: 1.4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {feedbackPreview}
                    </p>
                  )}
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => onCompare(v.version_num)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      color: "var(--mp-text-muted)",
                      padding: "4px 8px",
                      borderRadius: "var(--radius-sm)",
                      flexShrink: 0,
                      marginLeft: 12,
                      transition: "color 150ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--mp-text)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--mp-text-muted)"; }}
                    aria-label={`Comparer avec la version ${v.version_num}`}
                  >
                    Comparer
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
