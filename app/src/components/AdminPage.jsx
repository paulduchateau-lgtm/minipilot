import { useState, useEffect } from "react";
import { Users, Database, Settings, Shield, FileText, BarChart3, Clock, Hash, Save, Check, Loader2, RefreshCw } from "lucide-react";
import { useWorkspaceApi } from "../lib/WorkspaceContext";

const SLM_CONFIG = [
  { n: "Analyse & Rapports", m: "Claude (Anthropic)", s: "API", status: "success" },
  { n: "Chat & Exploration", m: "Claude (Anthropic)", s: "API", status: "success" },
  { n: "Fallback local", m: "Ministral 8B", s: "Optionnel", status: "warning" },
];

export default function AdminPage() {
  const api = useWorkspaceApi();
  const [tab, setTab] = useState("context");
  const [context, setContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextSaving, setContextSaving] = useState(false);
  const [contextSaved, setContextSaved] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [themeStats, setThemeStats] = useState([]);
  const [usageStats, setUsageStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => { loadContext(); }, []);
  useEffect(() => {
    if (tab === "logs") loadLogs();
    if (tab === "stats") loadStats();
  }, [tab]);

  const loadContext = async () => {
    setContextLoading(true);
    try {
      const data = await api.getContext();
      setContext(data);
    } catch {
      setContext({ project_name: "", industry: "", objectives: "", free_text: "" });
    }
    setContextLoading(false);
  };

  const saveContextHandler = async () => {
    setContextSaving(true);
    try {
      await api.updateContext(context);
      setContextSaved(true);
      setTimeout(() => setContextSaved(false), 2000);
    } catch (e) { console.error(e); }
    setContextSaving(false);
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await api.getLogs(1);
      setLogs(data.logs || []);
    } catch { setLogs([]); }
    setLogsLoading(false);
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const [themes, usage] = await Promise.all([api.getThemeStats(), api.getUsageStats()]);
      setThemeStats(themes.themes || []);
      setUsageStats(usage);
    } catch { setThemeStats([]); setUsageStats(null); }
    setStatsLoading(false);
  };

  const TABS = [
    { id: "context", label: "Contexte projet", Icon: FileText },
    { id: "logs", label: "Logs d'usage", Icon: Clock },
    { id: "stats", label: "Statistiques", Icon: BarChart3 },
    { id: "config", label: "Configuration", Icon: Settings },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 900, width: "100%", margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 4, fontFamily: "var(--font-display)" }}>
        Administration
      </h1>
      <p style={{ color: "var(--mp-text-muted)", fontSize: 14, marginBottom: 24 }}>
        Contexte, logs d'usage et configuration
      </p>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: "var(--mp-bg-elevated)", borderRadius: "var(--radius-md)", padding: 4,
      }}>
        {TABS.map(t => {
          const TIcon = t.Icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: "10px 16px",
              background: active ? "var(--mp-bg-card)" : "transparent",
              border: active ? "1px solid var(--mp-border)" : "1px solid transparent",
              borderRadius: "var(--radius-sm)", cursor: "pointer",
              color: active ? "var(--mp-text)" : "var(--mp-text-muted)",
              fontSize: 13, fontWeight: active ? 500 : 400,
              fontFamily: "var(--font-body)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s",
            }}>
              <TIcon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Context Tab */}
      {tab === "context" && (
        <div style={{
          background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)", padding: 24,
        }}>
          {contextLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: 40 }}>
              <Loader2 size={18} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ color: "var(--mp-text-muted)", fontSize: 14 }}>Chargement...</span>
            </div>
          ) : context && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label className="data-label" style={{ display: "block", marginBottom: 6 }}>Nom du projet</label>
                <input
                  value={context.project_name || ""}
                  onChange={e => setContext({ ...context, project_name: e.target.value })}
                  style={inputStyle}
                  placeholder="Ex: Mutuelle Entreprise Collective"
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="data-label" style={{ display: "block", marginBottom: 6 }}>Secteur d'activité</label>
                <select
                  value={context.industry || ""}
                  onChange={e => setContext({ ...context, industry: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Sélectionner...</option>
                  <option value="assurance">Assurance</option>
                  <option value="banque">Banque</option>
                  <option value="mutuelle">Mutuelle</option>
                  <option value="prevoyance">Prévoyance</option>
                  <option value="institution_publique">Institution publique</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="data-label" style={{ display: "block", marginBottom: 6 }}>Objectifs</label>
                <input
                  value={context.objectives || ""}
                  onChange={e => setContext({ ...context, objectives: e.target.value })}
                  style={inputStyle}
                  placeholder="Ex: Pilotage sinistralité, suivi portefeuille"
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="data-label" style={{ display: "block", marginBottom: 6 }}>Contexte libre</label>
                <textarea
                  value={context.free_text || ""}
                  onChange={e => setContext({ ...context, free_text: e.target.value })}
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
                  placeholder="Décrivez votre contexte métier, contraintes et besoins spécifiques..."
                />
              </div>
              <button onClick={saveContextHandler} disabled={contextSaving} style={{
                background: contextSaved ? "var(--mp-success)" : "var(--mp-accent)",
                border: "none", borderRadius: "var(--radius-sm)",
                padding: "10px 20px", cursor: contextSaving ? "wait" : "pointer",
                color: "var(--mp-accent-on)", fontSize: 14, fontWeight: 500,
                fontFamily: "var(--font-body)",
                display: "flex", alignItems: "center", gap: 8,
                transition: "background 0.2s",
              }}>
                {contextSaving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> :
                  contextSaved ? <Check size={14} /> : <Save size={14} />}
                {contextSaving ? "Enregistrement..." : contextSaved ? "Enregistré" : "Enregistrer"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {tab === "logs" && (
        <div style={{
          background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)", overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid var(--mp-border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Journal d'activité</span>
            <button onClick={loadLogs} style={{
              background: "none", border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-sm)", padding: "6px 12px",
              cursor: "pointer", color: "var(--mp-text-muted)", fontSize: 12,
              display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)",
            }}>
              <RefreshCw size={12} /> Actualiser
            </button>
          </div>
          {logsLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: 40 }}>
              <Loader2 size={18} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--mp-text-muted)", fontSize: 14 }}>
              Aucun log disponible
            </div>
          ) : (
            <div style={{ maxHeight: 500, overflow: "auto" }}>
              {logs.map((log, i) => (
                <div key={log.id || i} style={{
                  padding: "12px 20px",
                  borderBottom: i < logs.length - 1 ? "1px solid var(--mp-border-subtle)" : "none",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: log.action === "chat_query" ? "var(--mp-accent)" :
                      log.action === "report_generate" ? "var(--mp-signal)" : "var(--mp-text-muted)",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13 }}>{log.query || log.action}</span>
                    {log.themes && (() => {
                      const themes = typeof log.themes === "string" ? JSON.parse(log.themes) : log.themes;
                      return themes.length > 0 && (
                        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                          {themes.map((t, j) => (
                            <span key={j} style={{
                              fontFamily: "var(--font-data)", fontSize: 9,
                              textTransform: "uppercase", letterSpacing: "0.1em",
                              background: "var(--mp-accent-dim)", color: "var(--mp-accent)",
                              padding: "2px 8px", borderRadius: "var(--radius-pill)",
                            }}>{t}</span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <span style={{
                    fontFamily: "var(--font-data)", fontSize: 11,
                    color: "var(--mp-text-muted)", whiteSpace: "nowrap",
                  }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString("fr-FR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                    }) : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {tab === "stats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{
            background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
            borderRadius: "var(--radius-md)", padding: 24,
          }}>
            <h3 style={{
              fontSize: 15, fontWeight: 500, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <BarChart3 size={16} color="var(--mp-accent-text)" /> Usage global
            </h3>
            {statsLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: 20 }}>
                <Loader2 size={18} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : usageStats ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                <StatCard label="Requêtes totales" value={usageStats.total_queries || 0} />
                <StatCard label="Rapports générés" value={usageStats.total_reports || 0} />
                <StatCard label="Requêtes aujourd'hui" value={usageStats.queries_today || 0} />
              </div>
            ) : (
              <p style={{ color: "var(--mp-text-muted)", fontSize: 14, textAlign: "center", padding: 20 }}>
                Aucune statistique disponible
              </p>
            )}
          </div>

          <div style={{
            background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
            borderRadius: "var(--radius-md)", padding: 24,
          }}>
            <h3 style={{
              fontSize: 15, fontWeight: 500, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Hash size={16} color="var(--mp-accent-text)" /> Thèmes les plus recherchés
            </h3>
            {statsLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: 20 }}>
                <Loader2 size={18} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : themeStats.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {themeStats.map((t, i) => {
                  const maxCount = themeStats[0]?.count || 1;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px", background: "var(--mp-bg)",
                      borderRadius: "var(--radius-sm)", border: "1px solid var(--mp-border)",
                    }}>
                      <span style={{
                        fontFamily: "var(--font-data)", fontSize: 11, color: "var(--mp-text-muted)",
                        width: 24, textAlign: "right",
                      }}>#{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, minWidth: 140 }}>{t.theme}</span>
                      <div style={{ flex: 1, height: 6, background: "var(--mp-border)", borderRadius: 3 }}>
                        <div style={{
                          width: `${(t.count / maxCount) * 100}%`, height: "100%",
                          background: "var(--mp-accent)", borderRadius: 3, transition: "width 0.3s",
                        }} />
                      </div>
                      <span style={{
                        fontFamily: "var(--font-data)", fontSize: 12, fontWeight: 600,
                        minWidth: 32, textAlign: "right",
                      }}>{t.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "var(--mp-text-muted)", fontSize: 14, textAlign: "center", padding: 20 }}>
                Aucune recherche enregistrée
              </p>
            )}
          </div>
        </div>
      )}

      {/* Config Tab */}
      {tab === "config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* SLM Config */}
          <div style={{
            background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
            borderRadius: "var(--radius-md)", padding: 24,
          }}>
            <h3 style={{
              fontSize: 15, fontWeight: 500, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Settings size={16} color="var(--mp-accent-text)" /> Pipeline IA
            </h3>
            {SLM_CONFIG.map((m, i) => {
              const isSuccess = m.status === "success";
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", background: "var(--mp-bg)", borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--mp-border)", marginBottom: 8,
                }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{m.n}</span>
                    <span style={{
                      fontFamily: "var(--font-data)", fontSize: 12,
                      color: "var(--mp-text-muted)", marginLeft: 12,
                    }}>{m.m}</span>
                  </div>
                  <span style={{
                    fontFamily: "var(--font-data)", fontSize: 10,
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    background: "var(--mp-accent-dim)",
                    color: isSuccess ? "var(--mp-success)" : "var(--mp-warning)",
                    padding: "3px 10px", borderRadius: "var(--radius-pill)",
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: isSuccess ? "var(--mp-success)" : "var(--mp-warning)",
                    }} />
                    {m.s}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Users */}
          <div style={{
            background: "var(--mp-bg-card)", border: "1px solid var(--mp-border)",
            borderRadius: "var(--radius-md)", padding: 24,
          }}>
            <h3 style={{
              fontSize: 15, fontWeight: 500, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Users size={16} color="var(--mp-accent-text)" /> Utilisateurs
            </h3>
            {[
              { n: "Admin DG", l: "Niv. 1", d: "Accès complet", c: "var(--mp-success)" },
              { n: "Gestionnaire", l: "Niv. 2", d: "Génération & consultation", c: "var(--mp-signal)" },
              { n: "Lecteur", l: "Niv. 3", d: "Rapports partagés uniquement", c: "var(--mp-text-muted)" },
            ].map((u, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", background: "var(--mp-bg)", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--mp-border)", marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Shield size={16} color={u.c} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{u.n}</span>
                  <span className="data-label">{u.l}</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--mp-text-muted)" }}>{u.d}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      background: "var(--mp-bg)", border: "1px solid var(--mp-border)",
      borderRadius: "var(--radius-sm)", padding: "14px 16px",
    }}>
      <span className="data-label">{label}</span>
      <span style={{
        display: "block", fontSize: 28, fontWeight: 600,
        fontFamily: "var(--font-body)", marginTop: 6,
      }}>{value}</span>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px",
  background: "var(--mp-bg)", border: "1px solid var(--mp-border)",
  borderRadius: "var(--radius-sm)", color: "var(--mp-text)",
  fontSize: 14, fontFamily: "var(--font-body)",
  outline: "none", boxSizing: "border-box",
};
