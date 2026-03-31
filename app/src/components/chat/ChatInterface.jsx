import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, MessageSquare, Star, StarOff, FileText,
  Loader2, BarChart2, PieChart, Table2,
} from "lucide-react";
import { useWorkspaceApi } from "../../lib/WorkspaceContext";

const DEFAULT_SUGGESTIONS = [
  "Quels sont les risques avec la criticite la plus elevee ?",
  "Quelle est la repartition des risques par niveau de criticite ?",
  "Quelle direction concentre le plus de risques critiques ?",
  "Quels risques critiques n'ont pas de plan d'action ?",
  "Construis un dashboard COMEX synthetisant les risques majeurs",
];

function TypingIndicator() {
  return (
    <div style={{ display: "flex", marginBottom: 16 }}>
      <div style={{
        background: "var(--mp-bg-card)",
        borderRadius: "var(--radius-md) var(--radius-md) var(--radius-md) var(--radius-sm)",
        padding: "14px 20px",
        border: "1px solid var(--mp-border)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--mp-accent)",
            display: "inline-block",
            animation: "pulse-glow 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

function ChartTypeBadge({ type }) {
  const map = {
    bar: { Icon: BarChart2, label: "Barres" },
    pie: { Icon: PieChart, label: "Camembert" },
    table: { Icon: Table2, label: "Tableau" },
    line: { Icon: BarChart2, label: "Courbe" },
  };
  const { Icon, label } = map[type] || { Icon: BarChart2, label: type };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: "var(--font-data)", fontSize: 9,
      textTransform: "uppercase", letterSpacing: "0.1em",
      background: "var(--mp-bg-elevated)",
      border: "1px solid var(--mp-border)",
      borderRadius: "var(--radius-pill)",
      padding: "2px 8px",
      color: "var(--mp-text-muted)",
    }}>
      <Icon size={8} />
      {label}
    </span>
  );
}

function InlineReport({ data, onSave, onOpen, isSaved }) {
  return (
    <div style={{
      marginTop: 14,
      background: "var(--mp-bg-elevated)",
      border: "1px solid var(--mp-border)",
      borderRadius: "var(--radius-md)",
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div>
          <p style={{
            fontSize: 13, fontWeight: 500,
            fontFamily: "var(--font-body)",
            color: "var(--mp-text)", marginBottom: 4,
          }}>
            {data.title}
          </p>
          {data.chartType && <ChartTypeBadge type={data.chartType} />}
        </div>
        {data.kpis && data.kpis.length > 0 && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{
              fontFamily: "var(--font-data)", fontSize: 9,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: "var(--mp-text-muted)", marginBottom: 4,
            }}>
              KPIs
            </p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {data.kpis.slice(0, 3).map(kpi => (
                <span key={kpi} style={{
                  fontFamily: "var(--font-data)", fontSize: 9,
                  background: "var(--mp-accent-dim)",
                  border: "1px solid rgba(176, 216, 56, 0.15)",
                  borderRadius: "var(--radius-sm)",
                  padding: "2px 6px",
                  color: "var(--mp-accent-text)",
                }}>
                  {kpi}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {onOpen && (
          <button
            onClick={onOpen}
            style={{
              background: "var(--mp-accent)", border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "7px 14px",
              color: "var(--mp-accent-on)", cursor: "pointer",
              fontSize: 12, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 5,
              fontFamily: "var(--font-body)",
            }}
          >
            <FileText size={12} />
            Voir le rapport complet
          </button>
        )}
        <button
          onClick={onSave}
          style={{
            background: isSaved ? "rgba(212, 160, 58, 0.12)" : "var(--mp-bg)",
            border: `1px solid ${isSaved ? "rgba(212, 160, 58, 0.3)" : "var(--mp-border)"}`,
            borderRadius: "var(--radius-sm)",
            padding: "7px 12px",
            color: isSaved ? "#D4A03A" : "var(--mp-text-muted)",
            fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            fontFamily: "var(--font-body)",
            transition: "all 0.15s",
          }}
        >
          {isSaved ? <Star size={12} fill="#D4A03A" /> : <StarOff size={12} />}
          {isSaved ? "Sauvegarde" : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}

export default function ChatInterface({ onOpenReport }) {
  const api = useWorkspaceApi();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [savedReports, setSavedReports] = useState(new Set());
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async (text) => {
    const messageText = text || input.trim();
    if (!messageText || isTyping) return;
    setInput("");

    const userMessage = { role: "user", content: messageText, id: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const result = await api.chatMessage(messageText, history);

      setMessages(prev => [...prev, {
        role: "assistant",
        content: result.response || result.message || result.content || "Analyse en cours...",
        reportData: result.reportData || null,
        id: Date.now() + 1,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Une erreur est survenue. Veuillez reessayer.",
        id: Date.now() + 1,
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, messages, isTyping]);

  const handleSaveReport = useCallback(async (reportData, msgId) => {
    try {
      await api.saveReport(reportData);
      setSavedReports(prev => new Set([...prev, msgId]));
    } catch {
      setSavedReports(prev => new Set([...prev, msgId]));
    }
  }, []);

  const renderMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
  };

  const showSuggestions = messages.length === 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Messages area */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 24px 12px" }}>

        {/* Empty state with suggestions */}
        {showSuggestions && (
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
              <p style={{
                fontSize: 17, fontWeight: 300, marginBottom: 6,
                fontFamily: "var(--font-display)", color: "var(--mp-text)",
              }}>
                Quelle analyse souhaitez-vous ?
              </p>
              <p style={{
                fontSize: 13, color: "var(--mp-text-muted)",
                maxWidth: 480, fontFamily: "var(--font-body)", lineHeight: 1.6,
              }}>
                Decrivez votre besoin metier et Pilot genere un rapport complet avec KPIs, graphiques et tableaux.
              </p>
            </div>

            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8,
              justifyContent: "center", maxWidth: 640,
            }}>
              {DEFAULT_SUGGESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  style={{
                    background: "var(--mp-bg-card)",
                    border: "1px solid var(--mp-border)",
                    borderRadius: "var(--radius-pill)",
                    padding: "8px 16px",
                    color: "var(--mp-text-muted)",
                    fontSize: 13, cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "var(--mp-accent)";
                    e.currentTarget.style.color = "var(--mp-accent-text)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "var(--mp-border)";
                    e.currentTarget.style.color = "var(--mp-text-muted)";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="animate-fade-up"
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 16,
            }}
          >
            {msg.role === "user" ? (
              <div style={{
                background: "var(--mp-accent-dim)",
                borderRadius: "var(--radius-md) var(--radius-md) var(--radius-sm) var(--radius-md)",
                padding: "12px 18px",
                maxWidth: "70%",
                fontSize: 14,
                lineHeight: 1.6,
                fontFamily: "var(--font-body)",
                color: "var(--mp-text)",
                border: "1px solid rgba(176, 216, 56, 0.1)",
              }}>
                {msg.content}
              </div>
            ) : (
              <div style={{
                background: "var(--mp-bg-card)",
                border: "1px solid var(--mp-border)",
                borderRadius: "var(--radius-md) var(--radius-md) var(--radius-md) var(--radius-sm)",
                padding: "14px 20px",
                maxWidth: "80%",
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: "var(--font-body)",
                color: "var(--mp-text)",
              }}>
                <p
                  style={{ margin: 0, lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
                {msg.reportData && (
                  <InlineReport
                    data={msg.reportData}
                    onSave={() => handleSaveReport(msg.reportData, msg.id)}
                    onOpen={onOpenReport ? () => onOpenReport(msg.reportData) : null}
                    isSaved={savedReports.has(msg.id)}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: "12px 24px 20px", borderTop: "1px solid var(--mp-border)" }}>
        <div style={{
          display: "flex", gap: 12, alignItems: "center",
          background: "var(--mp-bg-input)",
          borderRadius: "var(--radius-md)",
          padding: "4px 4px 4px 16px",
          border: "1px solid var(--mp-border)",
          transition: "border-color 0.15s",
        }}
        onFocus={() => {}}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Posez votre question sur les donnees..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--mp-text)", fontSize: 14,
              fontFamily: "var(--font-body)", padding: "8px 0",
            }}
            aria-label="Message pour Pilot"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            style={{
              background: input.trim() && !isTyping ? "var(--mp-accent)" : "var(--mp-border)",
              border: "none", borderRadius: "var(--radius-md)",
              width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !isTyping ? "pointer" : "default",
              transition: "background 0.15s",
              flexShrink: 0,
            }}
            aria-label="Envoyer"
          >
            {isTyping ? (
              <Loader2 size={16} color="var(--mp-text-muted)" style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Send size={16} color={input.trim() ? "var(--mp-accent-on)" : "var(--mp-text-muted)"} />
            )}
          </button>
        </div>

        <p style={{
          fontFamily: "var(--font-data)", fontSize: 9,
          color: "var(--mp-text-muted)", textAlign: "center",
          marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          SLM locaux — aucune donnee ne quitte votre infrastructure
        </p>
      </div>
    </div>
  );
}
