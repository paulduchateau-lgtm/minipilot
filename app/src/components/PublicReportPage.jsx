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

export default function PublicReportPage() {
  const { token } = useParams();
  const { theme, toggle: toggleTheme } = useTheme();
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

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", padding: 80 }}>
          <Loader2 size={24} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ color: "var(--mp-text-muted)", fontSize: 14, marginTop: 12 }}>Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", padding: 80 }}>
          <FileText size={32} color="var(--mp-text-muted)" />
          <p style={{ fontSize: 16, marginTop: 12, fontWeight: 400 }}>{error}</p>
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)", marginTop: 4 }}>
            Ce lien est peut-être invalide ou le rapport a été dépublié.
          </p>
        </div>
      </div>
    );
  }

  const { report, comments = [], publishedAt } = data;
  const kpis = typeof report.kpis === "string" ? JSON.parse(report.kpis) : (report.kpis || []);
  const sections = typeof report.sections === "string" ? JSON.parse(report.sections) : (report.sections || []);
  const color = report.color || "var(--color-amber, #C4872E)";
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
