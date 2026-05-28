import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPublicReport, postPublicComment } from "../lib/api";
import RenderSection from "./RenderSection";
import { useTheme } from "../data/theme";
import {
  BarChart3, Activity, TrendingUp, Heart, AlertTriangle, Users,
  FileText, Calendar, Clock, Eye, Stethoscope, Building2,
  MessageSquare, Send, Loader2, ArrowUpRight, ArrowDownRight,
  Download, Sun, Moon,
} from "lucide-react";

const ICON_MAP = {
  BarChart3, Activity, TrendingUp, Heart, AlertTriangle, Users,
  FileText, Calendar, Clock, Eye, Stethoscope, Building2,
};
function getIcon(iconName) {
  if (typeof iconName === "function") return iconName;
  return ICON_MAP[iconName] || BarChart3;
}

// ── TheFork brand tokens ───────────────────────────────────────────
const TF = {
  deepGreen:  "#002925",
  teal:       "#006D5B",
  mint:       "#C2FEB3",
  cream:      "#FFFCF0",
  paper:      "#FAFAF7",
  white:      "#FFFFFF",
  ink900:     "#1A1A1A",
  ink700:     "#3D3D3D",
  ink500:     "#737373",
  ink300:     "#BFBFBF",
  ink100:     "#F2F2F2",
  positive:   "#1F8A3B",
  negative:   "#C0392B",
  radius:     16,
  radiusSm:   10,
  radiusPill: 999,
  fontDisplay: "'Outfit', 'DM Sans', sans-serif",
  fontBody:    "'Hind', 'DM Sans', sans-serif",
  fontMono:    "'JetBrains Mono', monospace",
};

// ── Inject TheFork Google Fonts (Outfit + Hind) ────────────────────
const TF_FONTS_URL = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Hind:wght@300;400;500&display=swap";
if (typeof document !== "undefined" && !document.querySelector(`link[href="${TF_FONTS_URL}"]`)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = TF_FONTS_URL;
  document.head.appendChild(link);
}

export default function PublicReportPage() {
  const { token } = useParams();
  const { theme, toggle: toggleTheme, setTheme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [commentSection, setCommentSection] = useState(null);
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(null);

  useEffect(() => {
    setLoading(true);
    getPublicReport(token)
      .then(d => {
        if (!d || d.error) {
          setError(d?.error || "Rapport introuvable.");
        } else {
          setData(d);
        }
      })
      .catch(() => setError("Impossible de charger le rapport."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setCommentSending(true);
    try {
      const result = await postPublicComment(token, {
        sectionIndex: commentSection,
        authorName: commentAuthor || null,
        body: commentBody,
      });
      if (result.comment) {
        setData(prev => ({
          ...prev,
          comments: [...(prev.comments || []), result.comment],
        }));
        setCommentBody("");
        setCommentSuccess("Commentaire ajouté !");
        setTimeout(() => setCommentSuccess(null), 3000);
      }
    } catch {
      setCommentSuccess(null);
    }
    setCommentSending(false);
  };

  const handleExportPdf = async () => {
    if (pdfLoading || !data?.report) return;
    setPdfLoading(true);
    try {
      const { generateTheForkPdf } = await import("../lib/generateTheForkPdf.js");
      await generateTheForkPdf(data.report, {});
    } catch (err) {
      console.error("[PDF] generation failed:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Detect TheFork tenant ──────────────────────────────────────
  const isTheFork = data?.tenant === "thefork";

  // Force light theme for TheFork (charts use theme context for palette)
  useEffect(() => {
    if (isTheFork && theme !== "light") {
      setTheme("light");
    }
  }, [isTheFork, theme, setTheme]);

  if (loading) {
    return (
      <div style={isTheFork ? tfPageStyle : pageStyle}>
        <div style={{ textAlign: "center", padding: 80 }}>
          <Loader2 size={24} color={isTheFork ? TF.deepGreen : "var(--mp-accent)"} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ color: isTheFork ? TF.ink500 : "var(--mp-text-muted)", fontSize: 14, marginTop: 12 }}>Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={isTheFork ? tfPageStyle : pageStyle}>
        <div style={{ textAlign: "center", padding: 80 }}>
          <FileText size={32} color={isTheFork ? TF.ink500 : "var(--mp-text-muted)"} />
          <p style={{ fontSize: 16, marginTop: 12, fontWeight: 400, color: isTheFork ? TF.ink900 : undefined }}>{error}</p>
          <p style={{ fontSize: 13, color: isTheFork ? TF.ink500 : "var(--mp-text-muted)", marginTop: 4 }}>
            Ce lien est peut-être invalide ou le rapport a été dépublié.
          </p>
        </div>
      </div>
    );
  }

  const { report, comments = [], publishedAt } = data;
  const kpis = typeof report.kpis === "string" ? JSON.parse(report.kpis) : (report.kpis || []);
  const sections = typeof report.sections === "string" ? JSON.parse(report.sections) : (report.sections || []);
  const color = report.color || (isTheFork ? TF.deepGreen : "var(--color-amber, #C4872E)");
  const Icon = getIcon(report.icon);

  const commentsBySection = {};
  const generalComments = [];
  for (const c of comments) {
    if (c.section_index != null) {
      if (!commentsBySection[c.section_index]) commentsBySection[c.section_index] = [];
      commentsBySection[c.section_index].push(c);
    } else {
      generalComments.push(c);
    }
  }

  // ── TheFork branded layout ──────────────────────────────────────
  if (isTheFork) {
    return (
      <div style={tfPageStyle}>
        {/* TheFork Header Bar */}
        <div style={{
          background: TF.white,
          padding: "16px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 50,
          borderBottom: `1px solid ${TF.ink100}`,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img
              src="/logo_thefork.png"
              alt="TheFork"
              style={{ height: 32, width: "auto" }}
            />
            <div style={{
              width: 1, height: 24, background: TF.ink100,
            }} />
            <span style={{
              fontSize: 11, fontWeight: 400,
              color: TF.teal, letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: TF.fontMono,
            }}>Rapport</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {publishedAt && (
              <span style={{
                fontFamily: TF.fontMono,
                fontSize: 10, color: TF.ink500,
                letterSpacing: "0.1em", textTransform: "uppercase",
              }}>
                {new Date(publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
            <button
              onClick={handleExportPdf}
              disabled={pdfLoading}
              style={{
                background: TF.paper, border: `1px solid ${TF.ink100}`,
                borderRadius: TF.radiusSm, padding: "6px 12px", cursor: pdfLoading ? "wait" : "pointer",
                display: "flex", alignItems: "center", gap: 5,
                color: TF.ink700, fontSize: 11, fontFamily: "inherit",
                opacity: pdfLoading ? 0.6 : 1,
              }}
            >
              {pdfLoading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={12} />}
              PDF
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 80px" }}>
          {/* Report header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{
                width: 40, height: 40, borderRadius: TF.radiusSm,
                background: TF.deepGreen + "12",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={20} color={TF.deepGreen} />
              </div>
              <h1 style={{
                fontSize: 28, fontWeight: 600, margin: 0,
                fontFamily: TF.fontDisplay,
                color: TF.ink900, letterSpacing: "-0.02em",
              }}>{report.title}</h1>
            </div>
            {report.subtitle && (
              <p style={{ fontSize: 15, color: TF.ink500, margin: "4px 0 0 52px", fontFamily: TF.fontBody }}>{report.subtitle}</p>
            )}
            {report.objective && (
              <p style={{ fontSize: 13, color: TF.ink700, margin: "8px 0 0 52px", fontStyle: "italic", fontFamily: TF.fontBody }}>{report.objective}</p>
            )}
          </div>

          {/* KPIs — alternating deep green / white cards */}
          {kpis.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
              gap: 14, marginBottom: 32,
            }}>
              {kpis.map((k, i) => {
                const isGreenCard = i === 0 || i === 3;
                return (
                  <div key={i} style={{
                    background: isGreenCard ? TF.deepGreen : TF.white,
                    border: isGreenCard ? "none" : `1px solid ${TF.ink100}`,
                    borderRadius: TF.radius, padding: "18px 22px",
                    boxShadow: isGreenCard ? "none" : "0 1px 3px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{
                      fontFamily: TF.fontMono,
                      fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em",
                      color: isGreenCard ? TF.mint : TF.ink500,
                      marginBottom: 8,
                    }}>{k.label}</div>
                    <div style={{
                      fontSize: 26, fontWeight: 600,
                      fontFamily: TF.fontDisplay,
                      color: isGreenCard ? TF.white : TF.ink900,
                    }}>{k.value}</div>
                    {k.trend && (
                      <div style={{
                        fontSize: 11, marginTop: 6,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <span style={{
                          background: k.bad
                            ? "rgba(192,57,43,0.1)"
                            : isGreenCard ? "rgba(194,254,179,0.2)" : "rgba(31,138,59,0.1)",
                          color: k.bad
                            ? (isGreenCard ? "#FF8A80" : TF.negative)
                            : (isGreenCard ? TF.mint : TF.positive),
                          padding: "2px 8px", borderRadius: TF.radiusPill,
                          fontSize: 10, fontWeight: 500, fontFamily: TF.fontMono,
                          display: "inline-flex", alignItems: "center", gap: 3,
                        }}>
                          {k.bad ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                          {k.trend}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sections — 2-column grid with TheFork cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
            gap: 20,
          }}>
            {sections.map((section, i) => {
              const sectionComments = commentsBySection[i] || [];
              return (
                <div key={i} style={{
                  background: TF.white,
                  border: `1px solid ${TF.ink100}`,
                  borderRadius: TF.radius,
                  padding: 22,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,41,37,0.08)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
                  e.currentTarget.style.transform = "none";
                }}
                >
                  {/* Section index tag */}
                  <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      background: TF.mint,
                      color: TF.deepGreen,
                      fontSize: 10, fontWeight: 500,
                      padding: "3px 10px", borderRadius: TF.radiusPill,
                      fontFamily: TF.fontMono,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>
                      Section {i + 1}
                    </span>
                    {sectionComments.length > 0 && (
                      <span style={{
                        background: TF.deepGreen + "12",
                        color: TF.deepGreen,
                        fontSize: 10, fontWeight: 500,
                        padding: "3px 8px", borderRadius: TF.radiusPill,
                        fontFamily: TF.fontMono,
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        <MessageSquare size={10} />
                        {sectionComments.length}
                      </span>
                    )}
                  </div>

                  <RenderSection section={section} index={i} color={TF.deepGreen} />

                  {/* Comments under this section card */}
                  {sectionComments.length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${TF.ink100}` }}>
                      {sectionComments.map(c => (
                        <TfMarginComment key={c.id} comment={c} />
                      ))}
                    </div>
                  )}

                  {/* Comment button / form */}
                  <div style={{ marginTop: 10 }}>
                    {commentSection === i ? (
                      <TfCommentForm
                        author={commentAuthor}
                        setAuthor={setCommentAuthor}
                        body={commentBody}
                        setBody={setCommentBody}
                        sending={commentSending}
                        success={commentSuccess}
                        onSubmit={handleSubmitComment}
                        onCancel={() => { setCommentSection(null); setCommentBody(""); }}
                      />
                    ) : (
                      <button onClick={() => setCommentSection(i)} style={tfCommentBtnStyle}>
                        <MessageSquare size={12} />
                        Commenter
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* General comments section */}
          <div style={{
            marginTop: 48, paddingTop: 24,
            borderTop: `1px solid ${TF.ink100}`,
          }}>
            <h3 style={{
              fontSize: 16, fontWeight: 500, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
              color: TF.ink900, fontFamily: TF.fontDisplay,
            }}>
              <MessageSquare size={16} color={TF.ink500} />
              Commentaires généraux
              {generalComments.length > 0 && (
                <span style={{
                  fontFamily: TF.fontMono,
                  fontSize: 10, color: TF.ink500,
                }}>({generalComments.length})</span>
              )}
            </h3>

            {generalComments.map(c => (
              <TfCommentBubble key={c.id} comment={c} />
            ))}

            {commentSection === "general" ? (
              <TfCommentForm
                author={commentAuthor}
                setAuthor={setCommentAuthor}
                body={commentBody}
                setBody={setCommentBody}
                sending={commentSending}
                success={commentSuccess}
                onSubmit={handleSubmitComment}
                onCancel={() => { setCommentSection(null); setCommentBody(""); }}
              />
            ) : (
              <button
                onClick={() => setCommentSection("general")}
                style={{ ...tfCommentBtnStyle, marginTop: 8 }}
              >
                <MessageSquare size={12} />
                Ajouter un commentaire général
              </button>
            )}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 48, paddingTop: 20, borderTop: `1px solid ${TF.ink100}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img src="/logo_thefork.png" alt="TheFork" style={{ height: 18, width: "auto", opacity: 0.5 }} />
              <span style={{ fontSize: 11, color: TF.ink500, fontFamily: TF.fontMono, letterSpacing: "0.05em" }}>
                Propulsé par Pilot
              </span>
            </div>
            <span style={{ fontSize: 10, color: TF.ink300, fontFamily: TF.fontMono }}>
              Document confidentiel
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Default (Pilot) layout ──────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Branding bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 32, paddingBottom: 16,
          borderBottom: "1px solid var(--mp-border)",
        }}>
          <span style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--mp-accent)",
          }}>PILOT · RAPPORT PUBLIÉ</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {publishedAt && (
              <span style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 10, color: "var(--mp-text-muted)",
                letterSpacing: "0.12em", textTransform: "uppercase",
              }}>
                {new Date(publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
            <button
              onClick={handleExportPdf}
              disabled={pdfLoading}
              style={{
                background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
                borderRadius: 6, padding: "6px 12px", cursor: pdfLoading ? "wait" : "pointer",
                display: "flex", alignItems: "center", gap: 5,
                color: "var(--mp-text-muted)", fontSize: 11, fontFamily: "inherit",
                opacity: pdfLoading ? 0.6 : 1,
              }}
            >
              {pdfLoading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={12} />}
              PDF
            </button>
            <button
              onClick={toggleTheme}
              style={{
                background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
                borderRadius: 6, padding: "6px 10px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
                color: "var(--mp-text-muted)", fontSize: 11, fontFamily: "inherit",
              }}
              title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
            </button>
          </div>
        </div>

        {/* Report header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 6,
              background: color + "18",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={18} color={color} />
            </div>
            <h1 style={{
              fontSize: 24, fontWeight: 400, margin: 0,
              fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
              letterSpacing: "-0.02em",
            }}>{report.title}</h1>
          </div>
          {report.subtitle && (
            <p style={{ fontSize: 14, color: "var(--mp-text-muted)", margin: "4px 0 0 46px" }}>{report.subtitle}</p>
          )}
          {report.objective && (
            <p style={{ fontSize: 13, color: "var(--mp-text-secondary)", margin: "8px 0 0 46px", fontStyle: "italic" }}>{report.objective}</p>
          )}
        </div>

        {/* KPIs */}
        {kpis.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
            gap: 12, marginBottom: 32,
          }}>
            {kpis.map((k, i) => (
              <div key={i} style={{
                background: "var(--mp-bg-card)",
                border: "1px solid var(--mp-border)",
                borderRadius: 6, padding: "16px 20px",
              }}>
                <div style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em",
                  color: "var(--mp-text-muted)", marginBottom: 8,
                }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 500 }}>{k.value}</div>
                {k.trend && (
                  <div style={{
                    fontSize: 11, marginTop: 4,
                    color: k.bad ? "var(--mp-error)" : "var(--mp-success)",
                    display: "flex", alignItems: "center", gap: 3,
                  }}>
                    {k.bad ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                    {k.trend}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sections — 2-column grid on wide screens */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
          gap: 20,
        }}>
          {sections.map((section, i) => {
            const sectionComments = commentsBySection[i] || [];
            return (
              <div key={i} style={{
                background: "var(--mp-bg-card)",
                border: "1px solid var(--mp-border)",
                borderRadius: 6,
                padding: 20,
              }}>
                <RenderSection section={section} index={i} color={color} />

                {/* Comments under this section card */}
                {sectionComments.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--mp-border)" }}>
                    {sectionComments.map(c => (
                      <MarginComment key={c.id} comment={c} color={color} />
                    ))}
                  </div>
                )}

                {/* Comment button / form */}
                <div style={{ marginTop: 10 }}>
                  {commentSection === i ? (
                    <CommentForm
                      author={commentAuthor}
                      setAuthor={setCommentAuthor}
                      body={commentBody}
                      setBody={setCommentBody}
                      sending={commentSending}
                      success={commentSuccess}
                      onSubmit={handleSubmitComment}
                      onCancel={() => { setCommentSection(null); setCommentBody(""); }}
                    />
                  ) : (
                    <button onClick={() => setCommentSection(i)} style={commentBtnStyle}>
                      <MessageSquare size={12} />
                      Commenter
                      {sectionComments.length > 0 && (
                        <span style={{
                          background: color + "20", color,
                          fontSize: 10, padding: "1px 5px", borderRadius: 4,
                          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                        }}>{sectionComments.length}</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* General comments section */}
        <div style={{
          marginTop: 48, paddingTop: 24,
          borderTop: "1px solid var(--mp-border)",
        }}>
          <h3 style={{
            fontSize: 15, fontWeight: 500, marginBottom: 16,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <MessageSquare size={16} color="var(--mp-text-muted)" />
            Commentaires généraux
            {generalComments.length > 0 && (
              <span style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 10, color: "var(--mp-text-muted)",
              }}>({generalComments.length})</span>
            )}
          </h3>

          {generalComments.map(c => (
            <CommentBubble key={c.id} comment={c} />
          ))}

          {commentSection === "general" ? (
            <CommentForm
              author={commentAuthor}
              setAuthor={setCommentAuthor}
              body={commentBody}
              setBody={setCommentBody}
              sending={commentSending}
              success={commentSuccess}
              onSubmit={handleSubmitComment}
              onCancel={() => { setCommentSection(null); setCommentBody(""); }}
            />
          ) : (
            <button
              onClick={() => setCommentSection("general")}
              style={{ ...commentBtnStyle, marginTop: 8 }}
            >
              <MessageSquare size={12} />
              Ajouter un commentaire général
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TheFork sub-components ──────────────────────────────────────────

function TfMarginComment({ comment }) {
  return (
    <div style={{
      borderLeft: `2px solid ${TF.deepGreen}`,
      padding: "6px 10px",
      marginBottom: 10,
      fontSize: 12,
      lineHeight: 1.5,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 3,
      }}>
        <span style={{ fontWeight: 500, color: TF.deepGreen, fontSize: 11 }}>
          {comment.author_name || "Anonyme"}
        </span>
        <span style={{
          fontSize: 9, fontFamily: TF.fontMono,
          color: TF.ink500, letterSpacing: "0.05em",
        }}>
          {new Date(comment.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </span>
      </div>
      <p style={{ margin: 0, color: TF.ink700, fontSize: 12, fontFamily: TF.fontBody }}>
        {comment.body}
      </p>
    </div>
  );
}

function TfCommentBubble({ comment }) {
  return (
    <div style={{
      background: TF.white,
      border: `1px solid ${TF.ink100}`,
      borderRadius: TF.radiusSm,
      padding: "10px 14px",
      marginBottom: 8,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: TF.ink500 }}>
          {comment.author_name || "Anonyme"}
        </span>
        <span style={{
          fontSize: 10, fontFamily: TF.fontMono,
          color: TF.ink300,
        }}>
          {new Date(comment.created_at).toLocaleDateString("fr-FR", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>
      <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: TF.ink900, fontFamily: TF.fontBody }}>{comment.body}</p>
    </div>
  );
}

function TfCommentForm({ author, setAuthor, body, setBody, sending, success, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} style={{
      background: TF.paper,
      border: `1px solid ${TF.ink100}`,
      borderRadius: TF.radiusSm, padding: 16,
    }}>
      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Votre nom (optionnel)"
          style={tfInputStyle}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Votre commentaire..."
          required
          rows={3}
          style={{ ...tfInputStyle, resize: "vertical", minHeight: 60 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="submit"
          disabled={sending || !body.trim()}
          style={{
            padding: "8px 16px",
            background: TF.deepGreen,
            color: TF.white,
            border: "none", borderRadius: TF.radiusSm,
            fontSize: 13, fontWeight: 500, fontFamily: "inherit",
            cursor: sending ? "wait" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
            opacity: sending || !body.trim() ? 0.6 : 1,
          }}
        >
          {sending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
          Envoyer
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: TF.ink500,
            border: `1px solid ${TF.ink300}`, borderRadius: TF.radiusSm,
            fontSize: 13, fontFamily: "inherit", cursor: "pointer",
          }}
        >
          Annuler
        </button>
        {success && (
          <span style={{ fontSize: 12, color: TF.positive }}>{success}</span>
        )}
      </div>
    </form>
  );
}

// ── Default (Pilot) sub-components ──────────────────────────────────

function MarginComment({ comment, color }) {
  return (
    <div style={{
      borderLeft: `2px solid ${color || "var(--mp-accent)"}`,
      padding: "6px 10px",
      marginBottom: 10,
      fontSize: 12,
      lineHeight: 1.5,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 3,
      }}>
        <span style={{ fontWeight: 500, color: color || "var(--mp-accent)", fontSize: 11 }}>
          {comment.author_name || "Anonyme"}
        </span>
        <span style={{
          fontSize: 9, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
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

function CommentBubble({ comment }) {
  return (
    <div style={{
      background: "var(--mp-bg-card)",
      border: "1px solid var(--mp-border)",
      borderRadius: 6,
      padding: "10px 14px",
      marginBottom: 8,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 500,
          color: "var(--mp-text-muted)",
        }}>
          {comment.author_name || "Anonyme"}
        </span>
        <span style={{
          fontSize: 10,
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          color: "var(--mp-text-muted)",
        }}>
          {new Date(comment.created_at).toLocaleDateString("fr-FR", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>
      <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{comment.body}</p>
    </div>
  );
}

function CommentForm({ author, setAuthor, body, setBody, sending, success, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} style={{
      background: "var(--mp-bg-elevated)",
      border: "1px solid var(--mp-border)",
      borderRadius: 6, padding: 16,
    }}>
      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Votre nom (optionnel)"
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Votre commentaire..."
          required
          rows={3}
          style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="submit"
          disabled={sending || !body.trim()}
          style={{
            padding: "8px 16px",
            background: "var(--mp-accent)",
            color: "var(--mp-accent-on)",
            border: "none", borderRadius: 6,
            fontSize: 13, fontWeight: 500, fontFamily: "inherit",
            cursor: sending ? "wait" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
            opacity: sending || !body.trim() ? 0.6 : 1,
          }}
        >
          {sending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
          Envoyer
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "8px 16px",
            background: "transparent",
            color: "var(--mp-text-muted)",
            border: "1px solid var(--mp-border)", borderRadius: 6,
            fontSize: 13, fontFamily: "inherit", cursor: "pointer",
          }}
        >
          Annuler
        </button>
        {success && (
          <span style={{ fontSize: 12, color: "var(--mp-accent)" }}>{success}</span>
        )}
      </div>
    </form>
  );
}

// ── TheFork page style (always light, cream bg) ─────────────────────
const tfPageStyle = {
  minHeight: "100vh",
  background: TF.paper,
  color: TF.ink900,
  fontFamily: TF.fontBody,
};

// ── Default Pilot page styles ───────────────────────────────────────
const pageStyle = {
  minHeight: "100vh",
  background: "var(--mp-bg)",
  color: "var(--mp-text)",
  fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
  transition: "background 0.3s, color 0.3s",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--mp-bg-input)",
  border: "1px solid var(--mp-border)",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--mp-text)",
  outline: "none",
  boxSizing: "border-box",
};

const tfInputStyle = {
  width: "100%",
  padding: "8px 12px",
  background: TF.white,
  border: `1px solid ${TF.ink300}`,
  borderRadius: TF.radiusSm,
  fontSize: 13,
  fontFamily: "inherit",
  color: TF.ink900,
  outline: "none",
  boxSizing: "border-box",
};

const commentBtnStyle = {
  background: "none",
  border: "none",
  color: "var(--mp-text-muted)",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "inherit",
  padding: "4px 0",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const tfCommentBtnStyle = {
  background: "none",
  border: "none",
  color: TF.ink500,
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "inherit",
  padding: "4px 0",
  display: "flex",
  alignItems: "center",
  gap: 6,
};
