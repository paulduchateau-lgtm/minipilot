import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";

const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const FREQUENCIES = [
  { value: "once", label: "Une fois" },
  { value: "daily", label: "Quotidien" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
];

function describeSchedule(s) {
  const pad = (n) => String(n).padStart(2, "0");
  const time = `${pad(s.hour)}h${pad(s.minute)}`;
  if (s.frequency === "daily") return `Tous les jours a ${time}`;
  if (s.frequency === "weekly") return `Chaque semaine (${DAYS_FR[s.dayOfWeek || s.day_of_week || 1]}) a ${time}`;
  if (s.frequency === "monthly") return `Chaque mois le ${s.dayOfMonth || s.day_of_month || 1} a ${time}`;
  if (s.frequency === "once") return "Une seule fois (immediatement)";
  return s.frequency;
}

export default function SchedulePage({ api, slug }) {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [endDate, setEndDate] = useState("");
  const [sourceFileId, setSourceFileId] = useState(null);
  const [templateReportId, setTemplateReportId] = useState(null);
  const [suggestion, setSuggestion] = useState("");
  const [useExisting, setUseExisting] = useState(true);
  const [useCurrentData, setUseCurrentData] = useState(true);
  const [reports, setReports] = useState([]);
  const [files, setFiles] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getReports().then((data) => {
      const all = [...(data.shared || []), ...(data.private || [])];
      setReports(all);
      if (all.length > 0) setTemplateReportId(all[0].id);
    }).catch(() => {});
    api.getFiles().then((data) => {
      setFiles(data.files || []);
    }).catch(() => {});
  }, []);

  const goBack = () => navigate(`/${slug}/schedules`);

  const canProceedStep1 = name.trim() && (useExisting ? templateReportId : suggestion.trim());
  const canCreate = canProceedStep1;

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      await api.createSchedule({
        name,
        frequency,
        hour,
        minute,
        day_of_week: dayOfWeek,
        day_of_month: dayOfMonth,
        end_date: endDate || null,
        source_file_id: useCurrentData ? null : sourceFileId,
        template_report_id: useExisting ? templateReportId : null,
        suggestion: useExisting
          ? null
          : JSON.stringify({ title: name, description: suggestion, type: "bar", columns: [], kpis: [] }),
      });
      navigate(`/${slug}/schedules`);
    } catch (err) {
      setError(err.message || "Erreur lors de la creation de la programmation.");
      setCreating(false);
    }
  };

  const selectedReport = reports.find((r) => r.id === templateReportId);
  const selectedFile = files.find((f) => f.id === sourceFileId);

  const labelStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--mp-text-muted)",
    marginBottom: 10,
    display: "block",
  };

  const cardStyle = {
    background: "var(--mp-surface)",
    border: "1px solid var(--mp-border)",
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    fontFamily: "var(--font-body)",
    background: "var(--mp-bg)",
    color: "var(--mp-text)",
    border: "1px solid var(--mp-border)",
    borderRadius: 6,
    outline: "none",
    boxSizing: "border-box",
  };

  const selectStyle = {
    ...inputStyle,
    width: "auto",
    minWidth: 120,
    cursor: "pointer",
  };

  const primaryBtnStyle = {
    background: "var(--mp-accent)",
    color: "var(--mp-accent-on)",
    border: "none",
    borderRadius: 10,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "var(--font-body)",
    cursor: "pointer",
  };

  const secondaryBtnStyle = {
    background: "transparent",
    color: "var(--mp-text-secondary)",
    border: "1px solid var(--mp-border)",
    borderRadius: 10,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: "var(--font-body)",
    cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 32, fontFamily: "var(--font-body)" }}>
      {/* Back link */}
      <button
        onClick={goBack}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--mp-text-muted)",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-body)",
          padding: 0,
          marginBottom: 28,
        }}
      >
        <ChevronLeft size={15} />
        Retour aux programmations
      </button>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 24,
          fontWeight: 300,
          marginBottom: 8,
          color: "var(--mp-text)",
        }}
      >
        Nouvelle programmation
      </h1>

      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--mp-text-muted)",
          marginBottom: 28,
        }}
      >
        ETAPE {step}/4
      </p>

      {error && (
        <div
          style={{
            color: "#C45A32",
            fontSize: 13,
            marginBottom: 16,
            padding: "10px 14px",
            background: "rgba(196,90,50,0.08)",
            borderRadius: 6,
            border: "1px solid rgba(196,90,50,0.2)",
          }}
        >
          {error}
        </div>
      )}

      {/* Step 1: Choisir le modele */}
      {step === 1 && (
        <div>
          <div style={cardStyle}>
            <label style={labelStyle}>Nom de la programmation</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Rapport hebdomadaire adoption"
              style={inputStyle}
            />
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Modele de rapport</label>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <button
                onClick={() => setUseExisting(true)}
                style={{
                  ...secondaryBtnStyle,
                  background: useExisting ? "var(--mp-accent-dim)" : "transparent",
                  color: useExisting ? "var(--mp-accent-text)" : "var(--mp-text-secondary)",
                  borderColor: useExisting ? "var(--mp-accent)" : "var(--mp-border)",
                }}
              >
                Rapport existant
              </button>
              <button
                onClick={() => setUseExisting(false)}
                style={{
                  ...secondaryBtnStyle,
                  background: !useExisting ? "var(--mp-accent-dim)" : "transparent",
                  color: !useExisting ? "var(--mp-accent-text)" : "var(--mp-text-secondary)",
                  borderColor: !useExisting ? "var(--mp-accent)" : "var(--mp-border)",
                }}
              >
                Nouveau rapport
              </button>
            </div>

            {useExisting ? (
              <div>
                {reports.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--mp-text-muted)" }}>
                    Aucun rapport disponible. Creez d'abord un rapport.
                  </p>
                ) : (
                  <select
                    value={templateReportId || ""}
                    onChange={(e) => setTemplateReportId(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {reports.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title || "Sans titre"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Decrivez le rapport a generer (ex: Graphique d'adoption par service avec KPIs principaux)"
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              style={{
                ...primaryBtnStyle,
                opacity: canProceedStep1 ? 1 : 0.5,
                cursor: canProceedStep1 ? "pointer" : "not-allowed",
              }}
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Configurer la frequence */}
      {step === 2 && (
        <div>
          <div style={cardStyle}>
            <label style={labelStyle}>Frequence</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 9999,
                    border: "1px solid",
                    borderColor: frequency === f.value ? "var(--mp-accent)" : "var(--mp-border)",
                    background: frequency === f.value ? "var(--mp-accent-dim)" : "transparent",
                    color: frequency === f.value ? "var(--mp-accent-text)" : "var(--mp-text-secondary)",
                    fontSize: 13,
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    fontWeight: frequency === f.value ? 500 : 400,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {frequency !== "once" && (
              <>
                <label style={labelStyle}>Heure d'execution</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
                  <select value={hour} onChange={(e) => setHour(Number(e.target.value))} style={selectStyle}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, "0")}h
                      </option>
                    ))}
                  </select>
                  <span style={{ color: "var(--mp-text-muted)" }}>:</span>
                  <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} style={selectStyle}>
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {frequency === "weekly" && (
              <>
                <label style={labelStyle}>Jour de la semaine</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  style={{ ...selectStyle, marginBottom: 20 }}
                >
                  {DAYS_FR.map((day, i) => (
                    <option key={i} value={i}>
                      {day}
                    </option>
                  ))}
                </select>
              </>
            )}

            {frequency === "monthly" && (
              <>
                <label style={labelStyle}>Jour du mois</label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  style={{ ...selectStyle, marginBottom: 20 }}
                >
                  {Array.from({ length: 28 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label style={labelStyle}>Date de fin (optionnelle)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ ...inputStyle, width: "auto" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={secondaryBtnStyle}>
              Precedent
            </button>
            <button onClick={() => setStep(3)} style={primaryBtnStyle}>
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Source de donnees */}
      {step === 3 && (
        <div>
          <div style={cardStyle}>
            <label style={labelStyle}>Source de donnees</label>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <button
                onClick={() => {
                  setUseCurrentData(true);
                  setSourceFileId(null);
                }}
                style={{
                  ...secondaryBtnStyle,
                  background: useCurrentData ? "var(--mp-accent-dim)" : "transparent",
                  color: useCurrentData ? "var(--mp-accent-text)" : "var(--mp-text-secondary)",
                  borderColor: useCurrentData ? "var(--mp-accent)" : "var(--mp-border)",
                }}
              >
                Utiliser les donnees actuelles
              </button>
              <button
                onClick={() => setUseCurrentData(false)}
                style={{
                  ...secondaryBtnStyle,
                  background: !useCurrentData ? "var(--mp-accent-dim)" : "transparent",
                  color: !useCurrentData ? "var(--mp-accent-text)" : "var(--mp-text-secondary)",
                  borderColor: !useCurrentData ? "var(--mp-accent)" : "var(--mp-border)",
                }}
              >
                Choisir un fichier source
              </button>
            </div>

            {!useCurrentData && (
              <div>
                {files.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--mp-text-muted)" }}>
                    Aucun fichier disponible dans cet espace.
                  </p>
                ) : (
                  <select
                    value={sourceFileId || ""}
                    onChange={(e) => setSourceFileId(e.target.value || null)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="">Selectionner un fichier...</option>
                    {files.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name || f.original_name} {f.size ? `(${(f.size / 1024).toFixed(0)} Ko)` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <p style={{ fontSize: 13, color: "var(--mp-text-muted)", marginTop: 16 }}>
              Les donnees seront rafraichies avant chaque generation.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(2)} style={secondaryBtnStyle}>
              Precedent
            </button>
            <button onClick={() => setStep(4)} style={primaryBtnStyle}>
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div>
          <div style={cardStyle}>
            <label style={labelStyle}>Resume de la programmation</label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <span style={{ fontSize: 12, color: "var(--mp-text-muted)", display: "block", marginBottom: 4 }}>
                  Nom
                </span>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{name}</span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--mp-text-muted)", display: "block", marginBottom: 4 }}>
                  Frequence
                </span>
                <span style={{ fontSize: 15, fontWeight: 500 }}>
                  {describeSchedule({ frequency, hour, minute, dayOfWeek, dayOfMonth })}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--mp-text-muted)", display: "block", marginBottom: 4 }}>
                  Modele
                </span>
                <span style={{ fontSize: 15, fontWeight: 500 }}>
                  {useExisting
                    ? selectedReport?.title || "Rapport selectionne"
                    : `Nouveau: ${suggestion.slice(0, 60)}${suggestion.length > 60 ? "..." : ""}`}
                </span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--mp-text-muted)", display: "block", marginBottom: 4 }}>
                  Source de donnees
                </span>
                <span style={{ fontSize: 15, fontWeight: 500 }}>
                  {useCurrentData
                    ? "Donnees actuelles"
                    : selectedFile?.name || selectedFile?.original_name || "Fichier selectionne"}
                </span>
              </div>
              {endDate && (
                <div>
                  <span style={{ fontSize: 12, color: "var(--mp-text-muted)", display: "block", marginBottom: 4 }}>
                    Date de fin
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{endDate}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(3)} style={secondaryBtnStyle}>
              Precedent
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{
                ...primaryBtnStyle,
                opacity: creating ? 0.6 : 1,
                cursor: creating ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {creating && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
              {creating ? "Creation en cours..." : "Creer la programmation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
