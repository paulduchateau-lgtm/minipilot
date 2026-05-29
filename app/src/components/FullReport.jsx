import { useState, useEffect } from "react";
import { Star, StarOff, Download, Loader2, ArrowUpRight, ArrowDownRight, BarChart3, Activity, TrendingUp, Heart, AlertTriangle, Users, FileText, Calendar, Clock, Eye, Stethoscope, Building2, MessageSquare, ChevronDown, Globe, Link2, Copy, Check } from "lucide-react";
import RenderSection from "./RenderSection";
import ReportFeedbackPanel from "./ReportFeedbackPanel";
import ReportVersionPanel from "./ReportVersionPanel";
import ReportCompareView from "./ReportCompareView";

// Map icon names to components for dynamic reports
const ICON_MAP = {
  BarChart3, Activity, TrendingUp, Heart, AlertTriangle, Users, FileText,
  Calendar, Clock, Eye, Stethoscope, Building2,
};

function getIcon(iconName) {
  if (typeof iconName === "function") return iconName; // Already a component
  return ICON_MAP[iconName] || BarChart3;
}

// ── Parse 3-section interpretation from LLM text ───────────────────
const SECTION_KEYS = [
  { key: "faits",    pattern: /##?\s*Faits cl[ée]s/i },
  { key: "alertes",  pattern: /##?\s*Alertes/i },
  { key: "actions",  pattern: /##?\s*Actions/i },
];

function parseInterpretation(text) {
  if (!text) return null;
  const result = {};
  const positions = [];
  for (const { key, pattern } of SECTION_KEYS) {
    const match = text.match(pattern);
    if (match) positions.push({ key, index: match.index, len: match[0].length });
  }
  positions.sort((a, b) => a.index - b.index);
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index + positions[i].len;
    const end = i + 1 < positions.length ? positions[i + 1].index : text.length;
    result[positions[i].key] = text.slice(start, end).replace(/^\s*\n/, "").trim();
  }
  // If no sections found, put everything in faits
  if (Object.keys(result).length === 0) result.faits = text.trim();
  return result;
}

export default function FullReport({ report, isFav, onToggleFav, api, onReportUpdated, onImprovingChange }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [iterateLoading, setIterateLoading] = useState(false);
  const [iterateError, setIterateError] = useState(null);
  const [sectionFeedbacks, setSectionFeedbacks] = useState({});
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersionNum, setCompareVersionNum] = useState(null);

  // ── Per-section improvement state ──────────────────────────────
  // { [sectionIndex]: { loading: true, startTime: Date.now(), error: null } }
  const [sectionImproving, setSectionImproving] = useState({});

  const handleSectionImprove = async (sectionIndex, feedback) => {
    setSectionImproving(prev => ({
      ...prev,
      [sectionIndex]: { loading: true, startTime: Date.now(), error: null },
    }));
    try {
      const result = await api.improveSection(report.id, sectionIndex, feedback);
      if (result.error) {
        setSectionImproving(prev => ({
          ...prev,
          [sectionIndex]: { loading: false, startTime: null, error: result.error },
        }));
      } else {
        // Update the section in the report
        const sections = typeof report.sections === "string"
          ? JSON.parse(report.sections) : [...(report.sections || [])];
        sections[sectionIndex] = result.section;
        const updated = { ...report, sections };
        if (onReportUpdated) onReportUpdated(updated);
        setSectionImproving(prev => {
          const n = { ...prev };
          delete n[sectionIndex];
          return n;
        });
      }
    } catch (err) {
      setSectionImproving(prev => ({
        ...prev,
        [sectionIndex]: { loading: false, startTime: null, error: err.message || "Échec de l'amélioration" },
      }));
    }
  };

  // Check if any section improvement is in progress
  const hasImprovingSection = Object.values(sectionImproving).some(s => s.loading);

  // Notify parent when improving state changes
  useEffect(() => {
    if (onImprovingChange) onImprovingChange(hasImprovingSection);
  }, [hasImprovingSection]);

  // ── Publication state ──────────────────────────────────────────
  const [publishStatus, setPublishStatus] = useState(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [reportComments, setReportComments] = useState([]);

  useEffect(() => {
    if (!report?.id || !api?.getPublishStatus) return;
    api.getPublishStatus(report.id).then(status => {
      setPublishStatus(status);
      if (status?.published) {
        api.getReportComments(report.id).then(r => setReportComments(r.comments || [])).catch(() => {});
      }
    }).catch(() => {});
  }, [report?.id]);

  const handlePublish = async () => {
    setPublishLoading(true);
    try {
      const result = await api.publishReport(report.id);
      setPublishStatus({ published: true, token: result.token, commentCount: 0 });
    } catch {}
    setPublishLoading(false);
  };

  const handleUnpublish = async () => {
    setPublishLoading(true);
    try {
      await api.unpublishReport(report.id);
      setPublishStatus({ published: false });
      setReportComments([]);
    } catch {}
    setPublishLoading(false);
  };

  const handleCopyLink = () => {
    if (!publishStatus?.token) return;
    const url = `${window.location.origin}/pub/${publishStatus.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const commentsBySection = {};
  for (const c of reportComments) {
    const idx = c.section_index != null ? c.section_index : "general";
    if (!commentsBySection[idx]) commentsBySection[idx] = [];
    commentsBySection[idx].push(c);
  }

  // ── Interpretation state ──────────────────────────────────────────
  const [interpretations, setInterpretations] = useState({});       // { [sectionIndex]: { faits, alertes, actions } }
  const [interpretLoading, setInterpretLoading] = useState({});     // { [sectionIndex]: true/false }
  const [interpretStream, setInterpretStream] = useState({});       // { [sectionIndex]: "streaming text..." }
  const [interpretErrors, setInterpretErrors] = useState({});       // { [sectionIndex]: "error msg" }

  // ── Load saved interpretations on mount ──
  useEffect(() => {
    if (!report?.id || !api?.getInterpretations) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await api.getInterpretations(report.id);
        if (cancelled || !result?.interpretations?.length) return;
        // Group by section_index, take most recent per section
        const bySection = {};
        for (const row of result.interpretations) {
          const idx = row.section_index;
          if (idx == null) continue;
          if (!bySection[idx]) {
            bySection[idx] = parseInterpretation(row.interpretation);
          }
        }
        if (Object.keys(bySection).length > 0) {
          setInterpretations(bySection);
        }
      } catch {
        // Silently fail — interpretations are optional
      }
    })();
    return () => { cancelled = true; };
  }, [report?.id]);

  // Track which sections are visually hidden (collapsed) vs truly absent
  const [interpretHidden, setInterpretHidden] = useState({});

  const handleInterpret = async (sectionIndex) => {
    const sections = typeof report.sections === "string" ? JSON.parse(report.sections) : (report.sections || []);
    const section = sections[sectionIndex];
    if (!section) return;

    // If already has interpretation, toggle visibility
    if (interpretations[sectionIndex]) {
      setInterpretHidden(prev => ({ ...prev, [sectionIndex]: !prev[sectionIndex] }));
      return;
    }

    setInterpretLoading(prev => ({ ...prev, [sectionIndex]: true }));
    setInterpretErrors(prev => { const n = { ...prev }; delete n[sectionIndex]; return n; });
    setInterpretStream(prev => ({ ...prev, [sectionIndex]: "" }));

    try {
      const chartMeta = {
        title: section.title || "",
        type: section.type || "unknown",
        insight: section.insight || "",
        config: section.config || {},
      };
      const chartData = section.data || section.data_sets || [];

      const fullText = await api.interpretSection(
        sectionIndex,
        chartData,
        chartMeta,
        report.id,
        (streamText) => setInterpretStream(prev => ({ ...prev, [sectionIndex]: streamText })),
      );

      // Parse the 6-section response
      const parsed = parseInterpretation(fullText);
      setInterpretations(prev => ({ ...prev, [sectionIndex]: parsed }));
    } catch (err) {
      setInterpretErrors(prev => ({ ...prev, [sectionIndex]: err.message || "Erreur lors de l'interprétation" }));
    } finally {
      setInterpretLoading(prev => ({ ...prev, [sectionIndex]: false }));
      setInterpretStream(prev => { const n = { ...prev }; delete n[sectionIndex]; return n; });
    }
  };

  const handleCloseInterpretation = (sectionIndex) => {
    setInterpretHidden(prev => ({ ...prev, [sectionIndex]: true }));
    setInterpretErrors(prev => { const n = { ...prev }; delete n[sectionIndex]; return n; });
  };

  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleIterate = async (globalFeedback, sectionFeedback) => {
    setIterateLoading(true);
    setIterateError(null);
    try {
      const result = await api.iterateReport(report.id, globalFeedback, sectionFeedback);
      if (result.error) {
        setIterateError(result.error);
      } else {
        // Clear feedback state and sessionStorage after successful iterate
        sessionStorage.removeItem("feedback-global-" + report.id);
        setSectionFeedbacks({});
        setFeedbackOpen(false);
        setVersionPanelOpen(false);
        setCompareMode(false);
        setCompareVersionNum(null);
        if (onReportUpdated) onReportUpdated(result.report);
      }
    } catch {
      setIterateError("La génération a échoué. Vérifiez votre connexion et réessayez.");
    } finally {
      setIterateLoading(false);
    }
  };

  const Icon = getIcon(report.icon);
  const rawKpis = typeof report.kpis === "string" ? JSON.parse(report.kpis) : (report.kpis || []);
  const kpis = rawKpis.filter(kpi => {
    if (!kpi.value) return false;
    const v = String(kpi.value);
    if (/\b(Table|GroupBy|Aggregate|Filter|SELECT|FROM|WHERE)\s*:/i.test(v)) return false;
    if (v.length > 40) return false;
    return true;
  });
  const sections = typeof report.sections === "string" ? JSON.parse(report.sections) : (report.sections || []);
  const color = report.color || "#A5D900";

  return (
    <div style={{ maxWidth: reportComments.length > 0 ? 1200 : 960, margin: "0 auto", transition: "max-width 200ms ease" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "var(--radius-md)",
              background: color + "18",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={18} color={color} />
            </div>
            <h2 style={{
              fontSize: 22, fontWeight: 400, margin: 0,
              fontFamily: "var(--font-display)", letterSpacing: "-0.02em",
            }}>{report.title}</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)", margin: 0, marginLeft: 46 }}>{report.subtitle}</p>
          <button
            onClick={() => setVersionPanelOpen(!versionPanelOpen)}
            style={{
              background: "none",
              border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-sm)",
              padding: "4px 10px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-data)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--mp-text-muted)",
              marginLeft: 46,
              marginTop: 6,
              transition: "color 150ms ease, border-color 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--mp-text)";
              e.currentTarget.style.borderColor = "var(--mp-text-muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--mp-text-muted)";
              e.currentTarget.style.borderColor = "var(--mp-border)";
            }}
            aria-expanded={versionPanelOpen}
            aria-label={`Historique des versions — VERSION ${report.currentVersion || 1}`}
          >
            VERSION {report.currentVersion || 1}
            <ChevronDown size={12} style={{
              transform: versionPanelOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: prefersReducedMotion ? "none" : "transform 180ms ease",
            }} />
          </button>
          {versionPanelOpen && !compareMode && (
            <div style={{
              marginTop: 12,
              marginBottom: 16,
              marginLeft: 46,
              opacity: 1,
              transform: "translateY(0)",
              transition: prefersReducedMotion ? "none" : "opacity 180ms ease, transform 180ms ease",
            }}>
              <ReportVersionPanel
                reportId={report.id}
                currentVersion={report.currentVersion || 1}
                api={api}
                onCompare={(vnum) => {
                  setCompareVersionNum(vnum);
                  setCompareMode(true);
                  setVersionPanelOpen(false);
                }}
              />
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setFeedbackOpen(!feedbackOpen)}
            style={{
              background: "transparent",
              border: feedbackOpen ? "1px solid var(--mp-accent)" : "1px solid var(--mp-border)",
              borderRadius: "var(--radius-sm)", padding: "8px 14px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              color: feedbackOpen ? "var(--mp-accent)" : "var(--mp-text-muted)",
              fontSize: 12, fontFamily: "var(--font-body)",
              transition: "color 150ms ease, border-color 150ms ease",
            }}
          >
            <MessageSquare size={14} />
            Améliorer
          </button>
          <button onClick={onToggleFav} style={{
            background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
            borderRadius: "var(--radius-sm)", padding: "8px 14px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            color: isFav ? "#D4A03A" : "var(--mp-text-muted)",
            fontSize: 12, fontFamily: "var(--font-body)",
          }}>
            {isFav ? <Star size={14} fill="#D4A03A" /> : <StarOff size={14} />}
            {isFav ? "Favori" : "Ajouter"}
          </button>
          <button
            onClick={async () => {
              if (pdfLoading) return;
              setPdfLoading(true);
              try {
                const { generateTheForkPdf } = await import("../lib/generateTheForkPdf.js");
                await generateTheForkPdf(report, interpretations);
              } catch (err) {
                console.error("[PDF] generation failed:", err);
              } finally {
                setPdfLoading(false);
              }
            }}
            style={{
              background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-sm)", padding: "8px 14px", cursor: pdfLoading ? "wait" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
              color: "var(--mp-text-muted)", fontSize: 12, fontFamily: "var(--font-body)",
              opacity: pdfLoading ? 0.6 : 1, transition: "opacity 0.2s",
            }}
            disabled={pdfLoading}
          >
            {pdfLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={14} />}
            {pdfLoading ? "Génération…" : "PDF"}
          </button>

          {/* Publish / Unpublish button */}
          {publishStatus?.published ? (
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={handleCopyLink}
                style={{
                  background: "var(--mp-bg-card)", border: "1px solid var(--mp-accent)",
                  borderRadius: "var(--radius-sm)", padding: "8px 14px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  color: "var(--mp-accent)", fontSize: 12, fontFamily: "var(--font-body)",
                }}
                title="Copier le lien public"
              >
                {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                {linkCopied ? "Copié !" : "Lien"}
              </button>
              {reportComments.length > 0 && (
                <span style={{
                  display: "flex", alignItems: "center", gap: 4,
                  color: "var(--mp-text-muted)", fontSize: 12, fontFamily: "var(--font-body)",
                  padding: "8px 10px",
                }}>
                  <MessageSquare size={14} />
                  {reportComments.length}
                </span>
              )}
              <button
                onClick={handleUnpublish}
                disabled={publishLoading}
                style={{
                  background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
                  borderRadius: "var(--radius-sm)", padding: "8px 10px", cursor: "pointer",
                  color: "var(--mp-text-muted)", fontSize: 12, fontFamily: "var(--font-body)",
                  opacity: publishLoading ? 0.6 : 1,
                }}
                title="Dépublier"
              >
                <Globe size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={handlePublish}
              disabled={publishLoading}
              style={{
                background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
                borderRadius: "var(--radius-sm)", padding: "8px 14px",
                cursor: publishLoading ? "wait" : "pointer",
                display: "flex", alignItems: "center", gap: 6,
                color: "var(--mp-text-muted)", fontSize: 12, fontFamily: "var(--font-body)",
                opacity: publishLoading ? 0.6 : 1,
              }}
            >
              {publishLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Globe size={14} />}
              Publier sur le web
            </button>
          )}
        </div>
      </div>

      {/* Comment margin indicator */}

      {/* Compare mode or normal report content */}
      {compareMode ? (
        <ReportCompareView
          report={report}
          compareVersionNum={compareVersionNum}
          api={api}
          onExit={() => {
            setCompareMode(false);
            setCompareVersionNum(null);
          }}
        />
      ) : (
        <>
          {/* Objective */}
          {report.objective && (
            <div style={{
              background: "linear-gradient(135deg, var(--mp-accent-dim), transparent)",
              border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-md)",
              padding: "14px 18px", marginBottom: 20,
            }}>
              <span className="data-label" style={{ color: "var(--mp-accent)" }}>Objectif du rapport</span>
              <p style={{ fontSize: 13, color: "var(--mp-text-secondary)", margin: "6px 0 0", lineHeight: 1.6 }}>{report.objective}</p>
            </div>
          )}

          {/* KPIs */}
          {kpis.length > 0 && (
            <div style={{
              display: "grid", gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
              gap: 12, marginBottom: 24,
            }}>
              {kpis.map((kpi, i) => {
                const K = getIcon(kpi.icon);
                return (
                  <div key={i} className="animate-fade-up" style={{
                    background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
                    borderRadius: "var(--radius-md)", padding: "14px 16px",
                    animationDelay: `${i * 0.1}s`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span className="data-label">{kpi.label}</span>
                      <K size={13} color="var(--mp-text-muted)" />
                    </div>
                    <span style={{
                      fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
                      display: "block", fontFamily: "var(--font-body)",
                    }}>{kpi.value}</span>
                    <span className="data-value" style={{
                      fontSize: 11,
                      color: kpi.bad ? "var(--mp-warm)" : "var(--mp-success)",
                      display: "flex", alignItems: "center", gap: 3, marginTop: 3,
                    }}>
                      {kpi.bad ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {kpi.trend}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Feedback panel */}
          <div style={{
            maxHeight: feedbackOpen ? 2000 : 0,
            overflow: "hidden",
            transition: prefersReducedMotion ? "none" : "max-height 200ms ease, opacity 200ms ease",
            opacity: feedbackOpen ? 1 : 0,
            marginBottom: feedbackOpen ? 20 : 0,
          }}>
            {feedbackOpen && (
              <ReportFeedbackPanel
                report={report}
                onSubmit={handleIterate}
                loading={iterateLoading}
                error={iterateError}
                sectionFeedbacks={sectionFeedbacks}
              />
            )}
          </div>

          {/* Sections with comment margin */}
          {sections.map((s, i) => {
            const sComments = commentsBySection[i] || [];
            return (
              <div key={i} style={{
                display: sComments.length > 0 ? "grid" : "block",
                gridTemplateColumns: sComments.length > 0 ? "1fr 240px" : "1fr",
                gap: sComments.length > 0 ? 20 : 0,
                alignItems: "start",
              }}>
                <RenderSection
                  section={s}
                  feedbackMode={feedbackOpen}
                  sectionFeedback={sectionFeedbacks[i] || ""}
                  onSectionFeedback={(idx, text) => setSectionFeedbacks(prev => ({ ...prev, [idx]: text }))}
                  sectionIndex={i}
                  interpretation={(!interpretHidden[i] && interpretations[i]) || null}
                  interpretLoading={!!interpretLoading[i]}
                  interpretStreamText={interpretStream[i] || null}
                  interpretError={interpretErrors[i] || null}
                  onInterpret={handleInterpret}
                  onCloseInterpretation={handleCloseInterpretation}
                  hasPersistedInterpretation={!!interpretations[i]}
                  onImproveSection={handleSectionImprove}
                  sectionImproving={sectionImproving[i] || null}
                />
                {sComments.length > 0 && (
                  <div style={{ paddingTop: 36 }}>
                    {sComments.map(c => (
                      <MarginComment key={c.id} comment={c} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function MarginComment({ comment }) {
  return (
    <div style={{
      borderLeft: "2px solid var(--mp-accent)",
      padding: "6px 10px",
      marginBottom: 10,
      fontSize: 12,
      lineHeight: 1.5,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 3,
      }}>
        <span style={{ fontWeight: 500, color: "var(--mp-accent)", fontSize: 11 }}>
          {comment.author_name || "Anonyme"}
        </span>
        <span style={{
          fontSize: 9, fontFamily: "var(--font-data)",
          color: "var(--mp-text-muted)", letterSpacing: "0.05em",
        }}>
          {new Date(comment.created_at).toLocaleDateString("fr-FR", {
            day: "numeric", month: "short",
          })}
        </span>
      </div>
      <p style={{ margin: 0, color: "var(--mp-text-secondary)", fontSize: 12 }}>
        {comment.body}
      </p>
    </div>
  );
}
