import { useState } from "react";
import { Loader2 } from "lucide-react";

// SessionStorage persistence note:
// - Feedback is persisted per-report during the session.
// - On successful iterate, the parent (FullReport) clears sessionStorage via
//   sessionStorage.removeItem("feedback-global-" + report.id) and
//   sessionStorage.removeItem("feedback-sections-" + report.id).

export default function ReportFeedbackPanel({ report, onSubmit, loading, error }) {
  const storageKeyGlobal = "feedback-global-" + report.id;
  const storageKeySections = "feedback-sections-" + report.id;

  const [globalFeedback, setGlobalFeedback] = useState(
    () => sessionStorage.getItem(storageKeyGlobal) || ""
  );
  const [sectionFeedbacks, setSectionFeedbacks] = useState(
    () => JSON.parse(sessionStorage.getItem(storageKeySections) || "{}")
  );

  const [focusedField, setFocusedField] = useState(null);

  const sections = typeof report.sections === "string"
    ? JSON.parse(report.sections)
    : (report.sections || []);

  const handleGlobalChange = (val) => {
    setGlobalFeedback(val);
    sessionStorage.setItem(storageKeyGlobal, val);
  };

  const handleSectionChange = (index, val) => {
    const updated = { ...sectionFeedbacks, [index]: val };
    setSectionFeedbacks(updated);
    sessionStorage.setItem(storageKeySections, JSON.stringify(updated));
  };

  const hasContent = () => {
    if (globalFeedback.trim().length > 0) return true;
    return Object.values(sectionFeedbacks).some(v => v.trim().length > 0);
  };

  const handleSubmit = () => {
    const filtered = Object.entries(sectionFeedbacks)
      .filter(([, text]) => text.trim().length > 0)
      .map(([index, text]) => ({ index: parseInt(index), text }));
    onSubmit(globalFeedback, filtered);
  };

  const isDisabled = loading || !hasContent();

  const textareaStyle = (key, minHeight) => ({
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    minHeight,
    resize: "vertical",
    fontSize: 14,
    fontFamily: "var(--font-body)",
    background: "var(--mp-bg)",
    border: `1px solid ${focusedField === key ? "var(--mp-accent)" : "var(--mp-border)"}`,
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    color: "var(--mp-text)",
    outline: focusedField === key ? "2px solid var(--mp-accent)" : "none",
    outlineOffset: 2,
    transition: "border-color 150ms ease, outline-color 150ms ease",
  });

  return (
    <div style={{
      background: "var(--mp-bg-card)",
      border: "1px solid var(--mp-border)",
      borderRadius: "var(--radius-md)",
      padding: "20px 24px",
    }}>
      <h3 style={{
        fontSize: 16,
        fontWeight: 400,
        fontFamily: "var(--font-display)",
        letterSpacing: "-0.01em",
        color: "var(--mp-text)",
        margin: 0,
        marginBottom: 16,
      }}>
        Améliorer ce rapport
      </h3>

      {/* Global feedback */}
      <label
        className="data-label"
        htmlFor="feedback-global"
        style={{ display: "block", marginBottom: 6 }}
      >
        FEEDBACK GLOBAL
      </label>
      <textarea
        id="feedback-global"
        value={globalFeedback}
        onChange={e => handleGlobalChange(e.target.value)}
        onFocus={() => setFocusedField("global")}
        onBlur={() => setFocusedField(null)}
        placeholder="Qu'est-ce qui fonctionne bien ? Qu'est-ce qui doit changer ?"
        disabled={loading}
        style={textareaStyle("global", 88)}
      />

      {/* Per-section feedback */}
      {sections.map((section, i) => (
        <div key={i}>
          <label
            className="data-label"
            htmlFor={`feedback-section-${i}`}
            style={{ display: "block", marginTop: 16, marginBottom: 4, textTransform: "uppercase" }}
          >
            {section.title}
          </label>
          <textarea
            id={`feedback-section-${i}`}
            value={sectionFeedbacks[i] || ""}
            onChange={e => handleSectionChange(i, e.target.value)}
            onFocus={() => setFocusedField(`section-${i}`)}
            onBlur={() => setFocusedField(null)}
            placeholder="Feedback spécifique à cette section (optionnel)"
            aria-label={`Feedback pour ${section.title}`}
            disabled={loading}
            style={textareaStyle(`section-${i}`, 56)}
          />
        </div>
      ))}

      {/* CTA */}
      <button
        onClick={handleSubmit}
        disabled={isDisabled}
        aria-busy={loading ? "true" : "false"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 20,
          padding: "10px 24px",
          background: "var(--mp-accent)",
          color: "var(--mp-accent-on)",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: 14,
          fontFamily: "var(--font-body)",
          fontWeight: 500,
          cursor: loading ? "wait" : isDisabled ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : isDisabled ? 0.4 : 1,
          transition: "opacity 150ms ease",
        }}
      >
        {loading && (
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "var(--mp-accent-on)" }} />
        )}
        {loading ? "Génération en cours…" : "Générer la version améliorée"}
      </button>

      {/* Error state */}
      {error && (
        <div style={{
          marginTop: 12,
          padding: "10px 14px",
          borderLeft: "3px solid var(--mp-error, #E08A68)",
          background: "rgba(224, 138, 104, 0.08)",
          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
          fontSize: 14,
          fontFamily: "var(--font-body)",
          color: "var(--mp-error, #E08A68)",
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
