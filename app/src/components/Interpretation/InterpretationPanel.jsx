import { X, BarChart3, AlertTriangle, ArrowRight } from "lucide-react";

const SECTIONS = [
  { key: "faits",    label: "Faits clés", Icon: BarChart3 },
  { key: "alertes",  label: "Alertes",    Icon: AlertTriangle },
  { key: "actions",  label: "Actions",    Icon: ArrowRight },
];

const ACCENT = "var(--color-green, #A5D900)";
const ALERT_COLOR = "var(--mp-warm, #C45A32)";
const FONT = "var(--font-body, 'DM Sans')";

const panelStyle = {
  background: "var(--mp-bg-elevated, #363530)",
  border: "1px solid var(--mp-border, #D5D1CB)",
  borderRadius: 6, padding: "14px 18px", position: "relative",
  marginTop: 12, marginBottom: 12,
};
const closeBtnStyle = {
  position: "absolute", top: 10, right: 10, background: "none",
  border: "none", cursor: "pointer", color: "var(--mp-text-muted)",
  padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 4, transition: "color 150ms ease",
};
const labelStyle = {
  display: "inline-flex", alignItems: "center", gap: 5,
  fontSize: 10, fontWeight: 500, fontFamily: "var(--font-data, monospace)",
  textTransform: "uppercase", letterSpacing: "0.1em",
  marginBottom: 4,
};
const contentStyle = {
  fontSize: 12.5, lineHeight: 1.65, color: "var(--mp-text-secondary, #F0EEEB)",
  fontFamily: FONT, margin: 0, whiteSpace: "pre-wrap",
};

const CURSOR_CSS = `@keyframes interpret-cursor{0%,100%{opacity:1}50%{opacity:0}}`;

function StreamingView({ text }) {
  return (
    <>
      <style>{CURSOR_CSS}</style>
      <div style={{ ...contentStyle, fontSize: 12 }}>
        {text}
        <span style={{
          display: "inline-block", width: 2, height: 13,
          background: ACCENT, marginLeft: 2, verticalAlign: "text-bottom",
          animation: "interpret-cursor 0.8s step-end infinite",
        }} />
      </div>
    </>
  );
}

function SectionBlock({ label, Icon, content, color }) {
  if (!content) return null;
  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12, marginBottom: 10 }}>
      <div style={{ ...labelStyle, color }}>
        <Icon size={11} />
        {label}
      </div>
      <p style={contentStyle}>{content}</p>
    </div>
  );
}

function CloseBtn({ onClose }) {
  return (
    <button
      onClick={onClose} style={closeBtnStyle} aria-label="Fermer"
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--mp-text)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--mp-text-muted)"; }}
    >
      <X size={13} />
    </button>
  );
}

export default function InterpretationPanel({ interpretation, loading, streamingText, error, onClose }) {
  if (error) {
    return (
      <div style={panelStyle}>
        <CloseBtn onClose={onClose} />
        <p style={{ fontSize: 12, color: ALERT_COLOR, margin: 0, lineHeight: 1.6 }}>
          {error}
        </p>
        <p style={{ fontSize: 11, color: "var(--mp-text-muted)", margin: "6px 0 0" }}>
          Relancez l'interprétation pour réessayer.
        </p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <CloseBtn onClose={onClose} />
      {loading && streamingText != null ? (
        <StreamingView text={streamingText} />
      ) : loading ? (
        <p style={{ fontSize: 12, color: "var(--mp-text-muted)", margin: 0, fontStyle: "italic" }}>
          Analyse en cours…
        </p>
      ) : interpretation ? (
        <div>
          <SectionBlock key="faits" label="Faits clés" Icon={BarChart3} content={interpretation.faits} color={ACCENT} />
          <SectionBlock key="alertes" label="Alertes" Icon={AlertTriangle} content={interpretation.alertes} color={ALERT_COLOR} />
          <SectionBlock key="actions" label="Actions" Icon={ArrowRight} content={interpretation.actions} color={ACCENT} />
        </div>
      ) : null}
    </div>
  );
}
