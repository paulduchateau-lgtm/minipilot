import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Play, Pause, Trash2, Plus, Loader2 } from "lucide-react";

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function describeSchedule(s) {
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(s.hour)}h${pad(s.minute)}`;
  if (s.frequency === "daily") return `Tous les jours a ${time}`;
  if (s.frequency === "weekly") return `Chaque semaine (${DAYS_FR[s.day_of_week || 0]}) a ${time}`;
  if (s.frequency === "monthly") return `Chaque mois le ${s.day_of_month || 1} a ${time}`;
  if (s.frequency === "once") return "Une seule fois";
  return s.frequency;
}

const STATUS_MAP = {
  active: { label: "ACTIF", color: "#3A8A4A", bg: "rgba(58,138,74,0.1)" },
  paused: { label: "EN PAUSE", color: "#D4A03A", bg: "rgba(212,160,58,0.1)" },
  completed: { label: "TERMINE", color: "#4A90B8", bg: "rgba(74,144,184,0.1)" },
  error: { label: "ERREUR", color: "#C45A32", bg: "rgba(196,90,50,0.1)" },
};

function relativeTime(dateStr) {
  if (!dateStr) return "Jamais";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export default function ScheduleListPage({ api, slug }) {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const loadSchedules = async () => {
    try {
      const data = await api.getSchedules();
      setSchedules(data.schedules || []);
    } catch {
      setSchedules([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handlePauseResume = async (s) => {
    const newStatus = s.status === "paused" ? "active" : "paused";
    await api.updateSchedule(s.id, { status: newStatus });
    loadSchedules();
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Supprimer la programmation "${s.name}" ?`)) return;
    await api.deleteSchedule(s.id);
    loadSchedules();
  };

  const handleRunNow = async (s) => {
    await api.runScheduleNow(s.id);
    setFeedback(s.id);
    setTimeout(() => {
      setFeedback(null);
      loadSchedules();
    }, 2000);
  };

  const goToWizard = () => navigate(`/${slug}/schedule`);

  const cardStyle = {
    background: "var(--mp-surface)",
    border: "1px solid var(--mp-border)",
    borderRadius: 10,
    padding: 20,
    marginBottom: 12,
  };

  const actionBtnStyle = {
    background: "none",
    border: "1px solid var(--mp-border)",
    borderRadius: 6,
    padding: "6px 10px",
    cursor: "pointer",
    color: "var(--mp-text-secondary)",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontFamily: "var(--font-body)",
    transition: "background 200ms",
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 32, fontFamily: "var(--font-body)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 300,
              marginBottom: 4,
              color: "var(--mp-text)",
            }}
          >
            Programmations
          </h1>
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)" }}>
            {schedules.length} programmation{schedules.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={goToWizard}
          style={{
            background: "var(--mp-accent)",
            color: "var(--mp-accent-on)",
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Plus size={16} />
          Nouvelle programmation
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Loader2 size={32} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {!loading && schedules.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            background: "var(--mp-surface)",
            border: "1px solid var(--mp-border)",
            borderRadius: 10,
          }}
        >
          <Clock size={40} color="var(--mp-text-muted)" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: "var(--mp-text)" }}>
            Aucune programmation
          </p>
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)", marginBottom: 20 }}>
            Creez une programmation pour generer des rapports automatiquement.
          </p>
          <button
            onClick={goToWizard}
            style={{
              background: "var(--mp-accent)",
              color: "var(--mp-accent-on)",
              border: "none",
              borderRadius: 10,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
            }}
          >
            Creer une programmation
          </button>
        </div>
      )}

      {!loading &&
        schedules.map((s) => {
          const status = STATUS_MAP[s.status] || STATUS_MAP.active;
          return (
            <div key={s.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--font-body)", color: "var(--mp-text)" }}>
                      {s.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        padding: "3px 10px",
                        borderRadius: 9999,
                        background: status.bg,
                        color: status.color,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: status.color,
                          display: "inline-block",
                        }}
                      />
                      {status.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--mp-text-muted)", marginBottom: 8 }}>
                    {describeSchedule(s)}
                  </p>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--mp-text-muted)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {s.edition_count} edition{s.edition_count !== 1 ? "s" : ""}
                    </span>
                    <span>Derniere execution: {relativeTime(s.last_run_at)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                {s.status !== "completed" && (
                  <button
                    onClick={() => handlePauseResume(s)}
                    style={actionBtnStyle}
                    title={s.status === "paused" ? "Reprendre" : "Pause"}
                  >
                    {s.status === "paused" ? <Play size={13} /> : <Pause size={13} />}
                    {s.status === "paused" ? "Reprendre" : "Pause"}
                  </button>
                )}
                <button
                  onClick={() => handleRunNow(s)}
                  style={actionBtnStyle}
                  title="Executer maintenant"
                >
                  <Play size={13} />
                  {feedback === s.id ? "Execution lancee" : "Executer maintenant"}
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  style={{ ...actionBtnStyle, color: "#C45A32" }}
                  title="Supprimer"
                >
                  <Trash2 size={13} />
                  Supprimer
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
}
