import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useWorkspaceApi } from "../../lib/WorkspaceContext";

const TYPE_COLORS = {
  number: "var(--mp-signal)",
  text: "var(--mp-text-muted)",
  string: "var(--mp-text-muted)",
  date: "var(--mp-warning)",
};

const TYPE_LABELS = {
  number: "Num",
  text: "Texte",
  string: "Texte",
  date: "Date",
};

function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] || "var(--mp-text-muted)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: "var(--font-data)", fontSize: 9,
      textTransform: "uppercase", letterSpacing: "0.1em",
      background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: "var(--radius-pill)",
      padding: "2px 7px",
      color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {TYPE_LABELS[type] || type}
    </span>
  );
}

export default function OnboardingVerify({ onNext, data }) {
  const api = useWorkspaceApi();
  const [preview, setPreview] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [previewData, statsData] = await Promise.all([
          api.getDataPreview(),
          api.getDataStats(),
        ]);
        // Normalize preview format — guard against legacy API responses
        const normalized = {
          columns: Array.isArray(previewData?.columns) ? previewData.columns : [],
          rows: Array.isArray(previewData?.rows) ? previewData.rows : [],
          totalRows: typeof previewData?.totalRows === "number" ? previewData.totalRows : 0,
          tables: typeof previewData?.tables === "number" ? previewData.tables : 1,
        };
        if (normalized.columns.length === 0 && normalized.rows.length === 0) {
          setError("Aucune donnee disponible. Verifiez que l'import et la transformation ont reussi.");
        } else {
          setPreview(normalized);
        }
        setStats(statsData && typeof statsData === "object" && !Array.isArray(statsData) ? statsData : {});
      } catch (err) {
        console.error("[OnboardingVerify]", err);
        setError("Impossible de charger l'apercu des donnees.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const getSortedRows = () => {
    if (!preview?.rows || !sortKey) return preview?.rows || [];
    return [...preview.rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "fr");
      return sortDir === "asc" ? cmp : -cmp;
    });
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "60px 0", gap: 16,
      }}>
        <Loader2 size={28} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 14, color: "var(--mp-text-muted)", fontFamily: "var(--font-body)" }}>
          Chargement de l'apercu...
        </p>
      </div>
    );
  }

  if (error) {
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

  const columns = preview?.columns || [];
  const rows = getSortedRows();
  const displayRows = rows.slice(0, 20);
  const numericCols = columns.filter(c => c.type === "number" || c.type === "integer" || c.type === "float");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary bar */}
      {preview && (
        <div style={{
          background: "var(--mp-bg-card)",
          border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
        }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--mp-accent-text)", marginBottom: 16,
          }}>
            Base de donnees unifiee
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16 }}>
            {[
              { label: "Tables", value: typeof preview.tables === "number" ? preview.tables : 1 },
              { label: "Colonnes", value: columns.length },
              { label: "Lignes totales", value: typeof preview.totalRows === "number" ? preview.totalRows.toLocaleString("fr-FR") : rows.length },
              { label: "Num.", value: numericCols.length, color: "var(--mp-signal)" },
              { label: "Texte", value: columns.filter(c => c.type === "string" || c.type === "text").length },
              { label: "Dates", value: columns.filter(c => c.type === "date").length, color: "var(--mp-warning)" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <span style={{
                  fontFamily: "var(--font-data)", fontSize: 9,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: "var(--mp-text-muted)", display: "block", marginBottom: 4,
                }}>
                  {label}
                </span>
                <span style={{
                  fontFamily: "var(--font-data)", fontSize: 20,
                  fontWeight: 600, color: color || "var(--mp-text)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Column schema */}
      {columns.length > 0 && (
        <div style={{
          background: "var(--mp-bg-card)",
          border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
        }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--mp-text-muted)", marginBottom: 12,
          }}>
            Schema des colonnes detectees
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {columns.map(col => (
              <div key={col.key} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "var(--mp-bg)",
                border: "1px solid var(--mp-border)",
                borderRadius: "var(--radius-sm)",
                padding: "5px 10px",
              }}>
                <span style={{
                  fontFamily: "var(--font-data)", fontSize: 12,
                  color: "var(--mp-text)",
                }}>
                  {col.label || col.key}
                </span>
                <TypeBadge type={col.type} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data table */}
      {columns.length > 0 && (
        <div style={{
          border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--mp-border)",
            background: "var(--mp-bg-card)",
          }}>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 10,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: "var(--mp-text-muted)",
            }}>
              Apercu des donnees nettoyees — {displayRows.length} sur {(typeof preview?.totalRows === "number" ? preview.totalRows : rows.length).toLocaleString("fr-FR")} lignes
            </span>
          </div>
          <div style={{ overflow: "auto", maxHeight: 380 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ background: "var(--mp-bg-elevated)" }}>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{
                        padding: "10px 14px",
                        textAlign: col.type === "number" ? "right" : "left",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--mp-border)",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      <div style={{
                        display: "flex", flexDirection: "column",
                        alignItems: col.type === "number" ? "flex-end" : "flex-start",
                        gap: 4,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{
                            fontFamily: "var(--font-data)", fontSize: 10,
                            textTransform: "uppercase", letterSpacing: "0.1em",
                            color: sortKey === col.key ? "var(--mp-accent-text)" : "var(--mp-text-muted)",
                            fontWeight: 500,
                          }}>
                            {col.label || col.key}
                          </span>
                          {sortKey === col.key && (
                            sortDir === "asc"
                              ? <ChevronUp size={10} color="var(--mp-accent)" />
                              : <ChevronDown size={10} color="var(--mp-accent)" />
                          )}
                        </div>
                        <TypeBadge type={col.type} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, ri) => (
                  <tr
                    key={ri}
                    style={{
                      background: ri % 2 === 0 ? "transparent" : "var(--mp-bg)",
                      borderBottom: "1px solid var(--mp-border-subtle)",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--mp-accent-dim)"}
                    onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? "transparent" : "var(--mp-bg)"}
                  >
                    {columns.map(col => {
                      const val = row[col.key];
                      const isNum = col.type === "number";
                      return (
                        <td key={col.key} style={{
                          padding: "9px 14px",
                          textAlign: isNum ? "right" : "left",
                          fontFamily: isNum ? "var(--font-data)" : "var(--font-body)",
                          fontSize: isNum ? 12 : 13,
                          fontVariantNumeric: isNum ? "tabular-nums" : "normal",
                          color: val == null ? "var(--mp-text-muted)" : "var(--mp-text)",
                          whiteSpace: "nowrap",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {val == null ? (
                            <span style={{ fontStyle: "italic", color: "var(--mp-text-muted)", fontSize: 11 }}>—</span>
                          ) : isNum ? (
                            typeof val === "number" ? val.toLocaleString("fr-FR") : val
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length > 20 && (
            <div style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--mp-border)",
              background: "var(--mp-bg-elevated)",
            }}>
              <span style={{
                fontFamily: "var(--font-data)", fontSize: 10,
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: "var(--mp-text-muted)",
              }}>
                Affichage de 20 sur {rows.length.toLocaleString("fr-FR")} lignes
              </span>
            </div>
          )}
        </div>
      )}

      {/* Numeric stats */}
      {stats && numericCols.length > 0 && (
        <div style={{
          background: "var(--mp-bg-card)",
          border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--mp-border)",
          }}>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 10,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: "var(--mp-text-muted)",
            }}>
              Statistiques — colonnes numeriques
            </span>
          </div>

          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--mp-bg-elevated)" }}>
                  {["Colonne", "Min", "Max", "Moyenne"].map(h => (
                    <th key={h} style={{
                      padding: "8px 14px",
                      textAlign: h === "Colonne" ? "left" : "right",
                      fontFamily: "var(--font-data)", fontSize: 10,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                      color: "var(--mp-text-muted)",
                      fontWeight: 500,
                      borderBottom: "1px solid var(--mp-border)",
                      whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {numericCols.map((col, i) => {
                  const colStats = stats[col.key] || {};
                  return (
                    <tr key={col.key} style={{
                      borderBottom: "1px solid var(--mp-border-subtle)",
                      background: i % 2 === 0 ? "transparent" : "var(--mp-bg)",
                    }}>
                      <td style={{
                        padding: "8px 14px",
                        fontFamily: "var(--font-body)", fontSize: 13,
                        color: "var(--mp-text)",
                      }}>
                        {col.label || col.key}
                      </td>
                      {["min", "max", "avg"].map(stat => (
                        <td key={stat} style={{
                          padding: "8px 14px",
                          textAlign: "right",
                          fontFamily: "var(--font-data)", fontSize: 12,
                          color: "var(--mp-text)",
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {colStats[stat] != null
                            ? (typeof colStats[stat] === "number"
                              ? colStats[stat].toLocaleString("fr-FR", { maximumFractionDigits: 2 })
                              : colStats[stat])
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "var(--mp-bg-card)",
        border: `1px solid ${confirmed ? "rgba(58, 138, 74, 0.3)" : "var(--mp-border)"}`,
        borderRadius: "var(--radius-md)",
        padding: "16px 20px",
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
      onClick={() => setConfirmed(c => !c)}
      >
        <div style={{
          width: 20, height: 20, borderRadius: "var(--radius-sm)",
          border: `2px solid ${confirmed ? "var(--mp-success)" : "var(--mp-border)"}`,
          background: confirmed ? "rgba(58, 138, 74, 0.15)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all 0.15s",
        }}>
          {confirmed && <CheckCircle size={13} color="var(--mp-success)" />}
        </div>
        <p style={{
          fontSize: 14, fontFamily: "var(--font-body)",
          color: confirmed ? "var(--mp-text)" : "var(--mp-text-muted)",
        }}>
          Les donnees semblent correctes et coherentes avec mon perimetre d'analyse
        </p>
      </div>

      {/* Next button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => confirmed && onNext({ preview, stats })}
          disabled={!confirmed}
          style={{
            background: confirmed ? "var(--mp-accent)" : "var(--mp-border)",
            color: confirmed ? "var(--mp-accent-on)" : "var(--mp-text-muted)",
            border: "none", borderRadius: "var(--radius-md)",
            padding: "10px 24px", fontSize: 14, fontWeight: 500,
            fontFamily: "var(--font-body)", cursor: confirmed ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 8,
            transition: "background 0.15s, color 0.15s",
          }}
        >
          Confirmer et continuer
          {confirmed && <span style={{ fontSize: 16, lineHeight: 1 }}>&#8594;</span>}
        </button>
      </div>
    </div>
  );
}
