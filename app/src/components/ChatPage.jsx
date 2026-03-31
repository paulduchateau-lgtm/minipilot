import { useState, useRef, useEffect, useCallback } from "react";
import { Send, MessageSquare, Database, FileText, Star, StarOff, Loader2, Sparkles, Save, Plus, Clock, Trash2, X } from "lucide-react";
import { useWorkspaceApi } from "../lib/WorkspaceContext";
import RenderSection from "./RenderSection";

const SUGGESTIONS = [
  "Quels sont les risques avec la criticite la plus elevee ?",
  "Quelle est la repartition des risques par niveau de criticite ?",
  "Quelle direction concentre le plus de risques critiques ?",
  "Quels risques critiques n'ont pas de plan d'action ?",
  "Construis un dashboard COMEX synthetisant les risques majeurs",
];

export default function ChatPage({ reports, toggleStar, openReport, onReportGenerated }) {
  const api = useWorkspaceApi();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load sessions on mount
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, [activeSessionId]);

  const loadSessions = async () => {
    try {
      const data = await api.getChatSessions();
      setSessions(data.sessions || []);
    } catch { setSessions([]); }
  };

  const saveCurrentSession = async (msgs, sessionId) => {
    if (!sessionId || msgs.length === 0) return;
    const firstUserMsg = msgs.find(m => m.role === "user");
    const title = firstUserMsg ? firstUserMsg.content.slice(0, 60) : "Conversation";
    try {
      await api.updateChatSession(sessionId, {
        title,
        messages: msgs.map(m => ({ role: m.role, content: m.content, reportData: m.reportData || null })),
      });
    } catch {}
  };

  const startNewSession = async () => {
    // Save current session first
    if (activeSessionId && messages.length > 0) {
      await saveCurrentSession(messages, activeSessionId);
    }
    try {
      const session = await api.createChatSession("Nouvelle conversation");
      setActiveSessionId(session.id);
      setMessages([]);
      await loadSessions();
    } catch {}
  };

  const loadSession = async (id) => {
    // Save current first
    if (activeSessionId && messages.length > 0) {
      await saveCurrentSession(messages, activeSessionId);
    }
    try {
      const data = await api.getChatSession(id);
      setActiveSessionId(id);
      setMessages(data.messages || []);
      setHistoryOpen(false);
    } catch {}
  };

  const deleteSession = async (id) => {
    try {
      await api.deleteChatSession(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
      await loadSessions();
    } catch {}
  };

  const handleSend = useCallback(async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || isTyping) return;
    setInput("");

    // Auto-create session if none active
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await api.createChatSession(userMsg.slice(0, 60));
        sessionId = session.id;
        setActiveSessionId(sessionId);
      } catch {}
    }

    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const result = await api.chatMessage(userMsg, messages.map(m => ({ role: m.role, content: m.content })));
      const assistantMsg = {
        role: "assistant",
        content: result.response || result.message || "Analyse en cours...",
        reportData: result.reportData || null,
        saved: false,
      };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);

      // Auto-save session
      if (sessionId) {
        await saveCurrentSession(updatedMessages, sessionId);
        loadSessions();
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Une erreur est survenue. Verifiez le serveur et reessayez.",
      }]);
    }
    setIsTyping(false);
  }, [input, isTyping, messages, activeSessionId]);

  const handleSaveReport = async (msgIndex) => {
    const msg = messages[msgIndex];
    if (!msg?.reportData) return;
    try {
      await api.saveReport({ ...msg.reportData, source: "chat", shared: 0, starred: 1 });
      setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, saved: true } : m));
      if (onReportGenerated) onReportGenerated();
    } catch {}
  };

  const renderMarkdown = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
  };

  const renderReportPreview = (reportData, msgIndex, isSaved) => {
    if (!reportData) return null;
    const kpis = typeof reportData.kpis === "string" ? JSON.parse(reportData.kpis) : (reportData.kpis || []);
    const sections = typeof reportData.sections === "string" ? JSON.parse(reportData.sections) : (reportData.sections || []);

    return (
      <div style={{
        marginTop: 16, background: "var(--mp-bg)",
        border: "1px solid var(--mp-border)", borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--mp-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Sparkles size={14} color="var(--mp-accent)" />
            <span style={{ fontSize: 14, fontWeight: 500 }}>{reportData.title}</span>
          </div>
          {reportData.subtitle && (
            <p style={{ fontSize: 12, color: "var(--mp-text-muted)", margin: 0 }}>{reportData.subtitle}</p>
          )}
        </div>
        {kpis.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
            gap: 1, background: "var(--mp-border)",
          }}>
            {kpis.slice(0, 4).map((kpi, i) => (
              <div key={i} style={{ background: "var(--mp-bg)", padding: "12px 14px" }}>
                <span className="data-label" style={{ fontSize: 9 }}>{kpi.label}</span>
                <span style={{ display: "block", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-body)", marginTop: 4 }}>{kpi.value}</span>
                {kpi.trend && (
                  <span className="data-value" style={{ fontSize: 10, color: kpi.bad ? "var(--mp-warm)" : "var(--mp-success)" }}>{kpi.trend}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {sections.length > 0 && (
          <div style={{ padding: "12px 18px" }}>
            <RenderSection section={sections[0]} />
          </div>
        )}
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--mp-border)", display: "flex", gap: 8 }}>
          <button
            onClick={() => handleSaveReport(msgIndex)}
            disabled={isSaved}
            style={{
              background: isSaved ? "var(--mp-bg-elevated)" : "var(--mp-accent)",
              border: "none", borderRadius: "var(--radius-sm)", padding: "8px 16px",
              color: isSaved ? "var(--mp-text-muted)" : "var(--mp-accent-on)",
              cursor: isSaved ? "default" : "pointer",
              fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6,
              fontFamily: "var(--font-body)",
            }}
          >
            {isSaved ? <><Star size={14} fill="#D4A03A" color="#D4A03A" /> Sauvegarde</> : <><Save size={14} /> Sauvegarder</>}
          </button>
        </div>
      </div>
    );
  };

  const formatDate = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <div style={{ flex: 1, display: "flex", height: "100%", position: "relative" }}>

      {/* History sidebar */}
      {historyOpen && (
        <div style={{
          width: 280, minWidth: 280,
          background: "var(--mp-bg-elevated)",
          borderRight: "1px solid var(--mp-border)",
          display: "flex", flexDirection: "column",
          transition: "all 0.2s",
        }}>
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--mp-border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 10,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: "var(--mp-text-muted)",
            }}>
              Historique
            </span>
            <button
              onClick={() => setHistoryOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <X size={14} color="var(--mp-text-muted)" />
            </button>
          </div>

          <div style={{ padding: "8px", overflow: "auto", flex: 1 }}>
            <button
              onClick={startNewSession}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "10px 12px", marginBottom: 8,
                background: "var(--mp-accent-dim)",
                border: "1px solid rgba(176, 216, 56, 0.15)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer", fontSize: 13, fontWeight: 500,
                fontFamily: "var(--font-body)",
                color: "var(--mp-accent-text)",
              }}
            >
              <Plus size={14} />
              Nouvelle conversation
            </button>

            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => loadSession(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px", marginBottom: 2,
                  background: activeSessionId === s.id ? "var(--mp-accent-dim)" : "transparent",
                  border: "none", borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (activeSessionId !== s.id) e.currentTarget.style.background = "var(--mp-nav-hover)"; }}
                onMouseLeave={e => { if (activeSessionId !== s.id) e.currentTarget.style.background = "transparent"; }}
              >
                <MessageSquare size={13} color="var(--mp-text-muted)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, margin: 0, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: activeSessionId === s.id ? "var(--mp-accent-text)" : "var(--mp-text-secondary)",
                    fontWeight: activeSessionId === s.id ? 500 : 400,
                  }}>
                    {s.title}
                  </p>
                  <span style={{
                    fontFamily: "var(--font-data)", fontSize: 10,
                    color: "var(--mp-text-muted)",
                  }}>
                    {formatDate(s.updated_at)}
                  </span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0, opacity: 0.5 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                >
                  <Trash2 size={12} color="var(--mp-text-muted)" />
                </button>
              </div>
            ))}

            {sessions.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--mp-text-muted)", textAlign: "center", padding: 16 }}>
                Aucune conversation
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{
          padding: "14px 24px", borderBottom: "1px solid var(--mp-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              title="Historique des conversations"
              style={{
                background: historyOpen ? "var(--mp-accent-dim)" : "var(--mp-bg-elevated)",
                border: "1px solid var(--mp-border)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                color: historyOpen ? "var(--mp-accent-text)" : "var(--mp-text-muted)",
                fontSize: 12, fontFamily: "var(--font-body)",
                transition: "all 0.15s",
              }}
            >
              <Clock size={13} />
              <span>{sessions.length}</span>
            </button>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 400, margin: 0, fontFamily: "var(--font-display)" }}>
                Explorateur de donnees
              </h2>
              <p style={{ fontSize: 12, color: "var(--mp-text-muted)", margin: 0, marginTop: 2 }}>
                Langage naturel → Analyse IA → Rapport metier
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={startNewSession}
              style={{
                background: "var(--mp-bg-elevated)", border: "1px solid var(--mp-border)",
                borderRadius: "var(--radius-sm)", padding: "6px 12px",
                cursor: "pointer", fontSize: 12, fontFamily: "var(--font-body)",
                color: "var(--mp-text-muted)",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--mp-accent)"; e.currentTarget.style.color = "var(--mp-accent-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mp-border)"; e.currentTarget.style.color = "var(--mp-text-muted)"; }}
            >
              <Plus size={13} />
              Nouveau
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Database size={13} color="var(--mp-text-muted)" />
              <span style={{ fontFamily: "var(--font-data)", fontSize: 11, color: "var(--mp-text-muted)" }}>
                Donnees connectees
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px 24px 12px" }}>
          {messages.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 20, paddingBottom: 60,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "var(--radius-lg)",
                background: "var(--mp-accent-dim)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MessageSquare size={24} color="var(--mp-accent)" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 17, fontWeight: 300, marginBottom: 6, fontFamily: "var(--font-display)" }}>
                  Quelle analyse souhaitez-vous ?
                </p>
                <p style={{ fontSize: 13, color: "var(--mp-text-muted)", maxWidth: 480 }}>
                  Decrivez votre besoin et Pilot genere un rapport complet avec KPIs, graphiques et tableaux.
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 640 }}>
                {SUGGESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    style={{
                      background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
                      borderRadius: "var(--radius-pill)", padding: "8px 16px",
                      color: "var(--mp-text-muted)", fontSize: 13, cursor: "pointer",
                      fontFamily: "var(--font-body)", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--mp-accent)"; e.currentTarget.style.color = "var(--mp-accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mp-border)"; e.currentTarget.style.color = "var(--mp-text-muted)"; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 16,
            }}>
              <div style={{
                maxWidth: msg.reportData ? 800 : 600,
                width: msg.reportData ? "100%" : undefined,
                background: msg.role === "user" ? "var(--mp-bg-elevated)" : "var(--mp-bg-card)",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "14px 18px",
                border: "1px solid var(--mp-border)",
              }}>
                <p
                  style={{ fontSize: 14, lineHeight: 1.65, margin: 0 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
                {msg.reportData && renderReportPreview(msg.reportData, i, msg.saved)}
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: "flex", marginBottom: 16 }}>
              <div style={{
                background: "var(--mp-bg-card)",
                borderRadius: "16px 16px 16px 4px", padding: "12px 20px",
                border: "1px solid var(--mp-border)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Loader2 size={15} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: "var(--mp-text-muted)" }}>
                  Analyse des donnees — generation du rapport...
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 24px 20px", borderTop: "1px solid var(--mp-border)" }}>
          <div style={{
            display: "flex", gap: 12, alignItems: "center",
            background: "var(--mp-bg-input)", borderRadius: "var(--radius-md)",
            padding: "4px 4px 4px 16px", border: "1px solid var(--mp-border)",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Posez votre question sur les donnees..."
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "var(--mp-text)", fontSize: 14, fontFamily: "var(--font-body)",
                padding: "8px 0",
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              style={{
                background: input.trim() ? "var(--mp-accent)" : "var(--mp-border)",
                border: "none", borderRadius: "var(--radius-md)",
                width: 40, height: 40,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: input.trim() ? "pointer" : "default",
                transition: "background 0.15s",
              }}
            >
              <Send size={18} color={input.trim() ? "var(--lc-olive-900)" : "var(--mp-text-muted)"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
