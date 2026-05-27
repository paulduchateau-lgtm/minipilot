import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getPublicReport, postPublicComment } from "../lib/api";
import RenderSection from "./RenderSection";
import { ThemeProvider } from "../data/theme";
import {
  BarChart3, Activity, TrendingUp, Heart, AlertTriangle, Users,
  FileText, Calendar, Clock, Eye, Stethoscope, Building2,
  MessageSquare, Send, Loader2, ArrowUpRight, ArrowDownRight,
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", padding: 80 }}>
          <Loader2 size={24} color="var(--color-green, #A5D900)" style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ color: "var(--color-fog, #A8A49C)", fontSize: 14, marginTop: 12 }}>Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", padding: 80 }}>
          <FileText size={32} color="var(--color-fog, #A8A49C)" />
          <p style={{ fontSize: 16, marginTop: 12, fontWeight: 400 }}>{error}</p>
          <p style={{ fontSize: 13, color: "var(--color-fog, #A8A49C)", marginTop: 4 }}>
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
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Branding bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 32, paddingBottom: 16,
          borderBottom: "1px solid var(--color-rule, #3A3935)",
        }}>
          <span style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--color-green, #A5D900)",
          }}>PILOT · RAPPORT PUBLIÉ</span>
          {publishedAt && (
            <span style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 10, color: "var(--color-fog, #A8A49C)",
              letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              {new Date(publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
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
            <p style={{ fontSize: 14, color: "var(--color-fog, #A8A49C)", margin: "4px 0 0 46px" }}>{report.subtitle}</p>
          )}
          {report.objective && (
            <p style={{ fontSize: 13, color: "var(--color-sage, #7A7A6E)", margin: "8px 0 0 46px", fontStyle: "italic" }}>{report.objective}</p>
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
                background: "var(--color-dark, #1E1D1B)",
                border: "1px solid var(--color-rule, #3A3935)",
                borderRadius: 6, padding: "16px 20px",
              }}>
                <div style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em",
                  color: "var(--color-fog, #A8A49C)", marginBottom: 8,
                }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 500 }}>{k.value}</div>
                {k.trend && (
                  <div style={{
                    fontSize: 11, marginTop: 4,
                    color: k.bad ? "var(--color-alert, #C45A32)" : "var(--color-green, #A5D900)",
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

        {/* Sections */}
        {sections.map((section, i) => {
          const sectionComments = commentsBySection[i] || [];
          return (
            <div key={i} style={{ marginBottom: 32 }}>
              <RenderSection
                section={section}
                index={i}
                color={color}
              />

              {/* Comments on this section */}
              {sectionComments.length > 0 && (
                <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: `2px solid ${color}33` }}>
                  {sectionComments.map(c => (
                    <CommentBubble key={c.id} comment={c} />
                  ))}
                </div>
              )}

              {/* Comment button for this section */}
              <div style={{ marginTop: 8 }}>
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
                  <button
                    onClick={() => setCommentSection(i)}
                    style={commentBtnStyle}
                  >
                    <MessageSquare size={12} />
                    Commenter cette section
                    {sectionComments.length > 0 && (
                      <span style={{
                        background: color + "30",
                        color: color,
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                      }}>{sectionComments.length}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* General comments section */}
        <div style={{
          marginTop: 48, paddingTop: 24,
          borderTop: "1px solid var(--color-rule, #3A3935)",
        }}>
          <h3 style={{
            fontSize: 15, fontWeight: 500, marginBottom: 16,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <MessageSquare size={16} color="var(--color-fog, #A8A49C)" />
            Commentaires généraux
            {generalComments.length > 0 && (
              <span style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 10, color: "var(--color-fog, #A8A49C)",
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

function CommentBubble({ comment }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid var(--color-rule, #3A3935)",
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
          color: "var(--color-fog, #A8A49C)",
        }}>
          {comment.author_name || "Anonyme"}
        </span>
        <span style={{
          fontSize: 10,
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          color: "var(--color-sage, #7A7A6E)",
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
      background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--color-rule, #3A3935)",
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
            background: "var(--color-green, #A5D900)",
            color: "var(--color-dark, #1E1D1B)",
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
            color: "var(--color-fog, #A8A49C)",
            border: "1px solid var(--color-rule, #3A3935)", borderRadius: 6,
            fontSize: 13, fontFamily: "inherit", cursor: "pointer",
          }}
        >
          Annuler
        </button>
        {success && (
          <span style={{ fontSize: 12, color: "var(--color-green, #A5D900)" }}>{success}</span>
        )}
      </div>
    </form>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#1A1918",
  color: "var(--color-paper, #F0EEEB)",
  fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--color-dark, #1E1D1B)",
  border: "1px solid var(--color-rule, #3A3935)",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--color-paper, #F0EEEB)",
  outline: "none",
  boxSizing: "border-box",
};

const commentBtnStyle = {
  background: "none",
  border: "none",
  color: "var(--color-fog, #A8A49C)",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "inherit",
  padding: "4px 0",
  display: "flex",
  alignItems: "center",
  gap: 6,
};
