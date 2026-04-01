import { useState } from "react";
import { Loader2 } from "lucide-react";

// SessionStorage persistence note:
// - Global feedback is persisted per-report during the session.
// - On successful iterate, the parent (FullReport) clears sessionStorage via
//   sessionStorage.removeItem("feedback-global-" + report.id).
// - Section feedbacks are managed inline in each section (RenderSection)
//   and passed here as the `sectionFeedbacks` prop.

export default function ReportFeedbackPanel({ report, onSubmit, loading, error, sectionFeedbacks = {} }) {
  const storageKeyGlobal = "feedback-global-" + report.id;

  const [globalFeedback, setGlobalFeedback] = useState(
    () => sessionStorage.getItem(storageKeyGlobal) || ""
  );

  const [focusedField, setFocusedField] = useState(null);

  const handleGlobalChange = (val) => {
    setGlobalFeedback(val);
    sessionStorage.setItem(storageKeyGlobal, val);
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

      {/* Section feedback summary (read-only count) */}
      {Object.values(sectionFeedbacks).some(v => v.trim().length > 0) && (
        <p style={{
          marginTop: 10,
          fontSize: 12,
          fontFamily: "var(--font-body)",
          color: "var(--mp-text-muted)",
        }}>
          + {Object.values(sectionFeedbacks).filter(v => v.trim().length > 0).length} feedback(s) par section
        </p>
      )}

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
