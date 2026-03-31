import { useState } from "react";
import { AlignLeft, List, Save } from "lucide-react";
import { useWorkspaceApi, useWorkspace } from "../../lib/WorkspaceContext";

const SECTEURS = [
  "Assurance",
  "Banque",
  "Mutuelle",
  "Prevoyance",
  "Institution publique",
  "Energie",
  "Telecom",
  "Transport",
  "Sante",
  "Industrie",
  "Autre",
];

const INDICATEURS = [
  "Pilotage COMEX",
  "Analyses financieres",
  "Analyse des risques",
  "Gestion de projet",
  "Optimisation des ressources",
  "Suivi RH",
];

const inputStyle = {
  width: "100%",
  background: "var(--mp-bg)",
  border: "1px solid var(--mp-border)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 14px",
  fontSize: 14,
  fontFamily: "var(--font-body)",
  color: "var(--mp-text)",
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontFamily: "var(--font-data)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--mp-text-muted)",
  marginBottom: 8,
};

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function OnboardingContext({ onNext, data }) {
  const api = useWorkspaceApi();
  const { workspace } = useWorkspace();
  const [mode, setMode] = useState("form");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    projectName: data?.projectName || workspace?.name || "",
    secteur: data?.secteur || workspace?.industry || "",
    objectif: data?.objectif || "",
    perimetre: data?.perimetre || "",
    indicateurs: data?.indicateurs || [],
  });
  const [freeText, setFreeText] = useState(data?.freeText || "");

  const update = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const toggleIndicateur = (ind) => {
    setFormData(prev => ({
      ...prev,
      indicateurs: prev.indicateurs.includes(ind)
        ? prev.indicateurs.filter(i => i !== ind)
        : [...prev.indicateurs, ind],
    }));
  };

  const isFormValid = mode === "form"
    ? formData.projectName.trim() && formData.secteur
    : freeText.trim().length > 20;

  const handleNext = async () => {
    if (!isFormValid) return;
    setSaving(true);
    try {
      const payload = mode === "form"
        ? { mode: "form", ...formData }
        : { mode: "free", freeText };
      await api.saveContext(payload);
      onNext(payload);
    } catch {
      const payload = mode === "form"
        ? { mode: "form", ...formData }
        : { mode: "free", freeText };
      onNext(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Mode toggle */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        background: "var(--mp-bg-elevated)",
        border: "1px solid var(--mp-border)",
        borderRadius: "var(--radius-md)",
        padding: 4,
        width: "fit-content",
      }}>
        {[
          { key: "form", Icon: List, label: "Questionnaire guide" },
          { key: "free", Icon: AlignLeft, label: "Texte libre" },
        ].map(({ key, Icon, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 16px",
              background: mode === key ? "var(--mp-bg-card)" : "transparent",
              border: mode === key ? "1px solid var(--mp-border)" : "1px solid transparent",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontSize: 13, fontFamily: "var(--font-body)",
              color: mode === key ? "var(--mp-text)" : "var(--mp-text-muted)",
              fontWeight: mode === key ? 500 : 400,
              transition: "all 0.15s",
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Form mode */}
      {mode === "form" && (
        <div className="animate-fade-up">
          <FormField label="Nom du projet">
            <input
              type="text"
              value={formData.projectName}
              onChange={e => update("projectName", e.target.value)}
              placeholder="Ex : Analyse prevoyance 2024 — Groupe Alpha"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "var(--mp-accent)"}
              onBlur={e => e.target.style.borderColor = "var(--mp-border)"}
            />
          </FormField>

          <FormField label="Secteur d'activite">
            <select
              value={formData.secteur}
              onChange={e => update("secteur", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={e => e.target.style.borderColor = "var(--mp-accent)"}
              onBlur={e => e.target.style.borderColor = "var(--mp-border)"}
            >
              <option value="">Selectionner...</option>
              {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>

          <FormField label="Objectif principal">
            <textarea
              value={formData.objectif}
              onChange={e => update("objectif", e.target.value)}
              placeholder="Decrivez en quelques lignes l'objectif principal de cette analyse. Que cherchez-vous a comprendre, mesurer ou ameliorer ?"
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.6,
                minHeight: 80,
              }}
              onFocus={e => e.target.style.borderColor = "var(--mp-accent)"}
              onBlur={e => e.target.style.borderColor = "var(--mp-border)"}
            />
          </FormField>

          <FormField label="Description du perimetre">
            <textarea
              value={formData.perimetre}
              onChange={e => update("perimetre", e.target.value)}
              placeholder="Decrivez le perimetre de l'analyse : population concernee, entites, geographie, produits, processus, periode... Tout element de cadrage utile."
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.6,
                minHeight: 80,
              }}
              onFocus={e => e.target.style.borderColor = "var(--mp-accent)"}
              onBlur={e => e.target.style.borderColor = "var(--mp-border)"}
            />
          </FormField>

          <FormField label="Axes d'analyse attendus">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {INDICATEURS.map(ind => {
                const selected = formData.indicateurs.includes(ind);
                return (
                  <button
                    key={ind}
                    onClick={() => toggleIndicateur(ind)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px",
                      background: selected ? "var(--mp-accent-dim)" : "var(--mp-bg-elevated)",
                      border: `1px solid ${selected ? "var(--mp-accent)" : "var(--mp-border)"}`,
                      borderRadius: "var(--radius-pill)",
                      cursor: "pointer",
                      fontSize: 13, fontFamily: "var(--font-body)",
                      color: selected ? "var(--mp-accent-text)" : "var(--mp-text-muted)",
                      fontWeight: selected ? 500 : 400,
                      transition: "all 0.15s",
                    }}
                  >
                    {selected && (
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "var(--mp-accent)", flexShrink: 0,
                      }} />
                    )}
                    {ind}
                  </button>
                );
              })}
            </div>
          </FormField>
        </div>
      )}

      {/* Free text mode */}
      {mode === "free" && (
        <div className="animate-fade-up">
          <label style={labelStyle}>Description du projet</label>
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder="Decrivez votre projet et vos besoins d'analyse en langage libre. Mentionnez le secteur, les objectifs, le perimetre, les axes d'analyse importants et tout element contextuel utile..."
            rows={10}
            style={{
              ...inputStyle,
              resize: "vertical",
              lineHeight: 1.7,
              minHeight: 220,
            }}
            onFocus={e => e.target.style.borderColor = "var(--mp-accent)"}
            onBlur={e => e.target.style.borderColor = "var(--mp-border)"}
          />
          <p style={{
            fontSize: 11, color: "var(--mp-text-muted)",
            fontFamily: "var(--font-body)", marginTop: 8,
          }}>
            {freeText.length} caracteres — minimum recommande : 100
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleNext}
          disabled={!isFormValid || saving}
          style={{
            background: isFormValid ? "var(--mp-accent)" : "var(--mp-border)",
            color: isFormValid ? "var(--mp-accent-on)" : "var(--mp-text-muted)",
            border: "none", borderRadius: "var(--radius-md)",
            padding: "10px 24px", fontSize: 14, fontWeight: 500,
            fontFamily: "var(--font-body)", cursor: isFormValid ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 8,
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {saving ? (
            <>
              <Save size={14} style={{ animation: "spin 1s linear infinite" }} />
              Enregistrement...
            </>
          ) : (
            <>
              Suivant
              <span style={{ fontSize: 16, lineHeight: 1 }}>&#8594;</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
