import { X, BarChart3, Search, TrendingUp, Zap, Target, HelpCircle } from "lucide-react";

const SECTIONS = [
  { key: "factuelle",       label: "Lecture factuelle",   Icon: BarChart3 },
  { key: "analytique",      label: "Lecture analytique",  Icon: Search },
  { key: "comparee",        label: "Lecture comparée",    Icon: TrendingUp },
  { key: "signaux",         label: "Signaux faibles",     Icon: Zap },
  { key: "recommandations", label: "Recommandations",     Icon: Target },
  { key: "questions",       label: "Questions à creuser", Icon: HelpCircle },
];

const ACCENT = "var(--color-green, #A5D900)";
const TEXT = "var(--mp-text-secondary, #F0EEEB)";
const FONT = "var(--font-body, 'DM Sans')";

const panelStyle = {
  background: "#363530", border: "1px solid var(--mp-border, #D5D1CB)",
  borderRadius: 6, padding: "16px 20px", position: "relative",
  marginTop: 12, marginBottom: 16,
};
const closeBtnStyle = {
  position: "absolute", top: 12, right: 12, background: "none",
  border: "none", cursor: "pointer", color: "var(--mp-text-muted)",
  padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 4, transition: "color 150ms ease",
};
const titleStyle = {
  display: "flex", alignItems: "center", gap: 8,
  fontSize: 12, fontWeight: 500, fontFamily: FONT,
  color: "var(--color-paper, #F0EEEB)", marginBottom: 6,
};
const contentStyle = {
  fontSize: 13, lineHeight: 1.7, color: TEXT,
  fontFamily: FONT, margin: 0, whiteSpace: "pre-wrap",
};

const CURSOR_CSS = `@keyframes interpret-cursor{0%,100%{opacity:1}50%{opacity:0}}`;

function StreamingView({ text }) {
  return (
    <>
      <style>{CURSOR_CSS}</style>
      <div style={{ ...contentStyle }}>
        {text}
        <span style={{
          display: "inline-block", width: 2, height: 14,
          background: ACCENT, marginLeft: 2, verticalAlign: "text-bottom",
          animation: "interpret-cursor 0.8s step-end infinite",
        }} />
      </div>
    </>
  );
}

function SectionBlock({ label, Icon, content }) {
  if (!content) return null;
  return (
    <div style={{ borderLeft: `3px solid ${ACCENT}`, paddingLeft: 14, marginBottom: 14 }}>
      <div style={titleStyle}>
        <Icon size={13} color={ACCENT} />
        {label}
      </div>
      <p style={contentStyle}>{content}</p>
    </div>
  );
}

function CloseBtn({ onClose }) {
  return (
    <button
      onClick={onClose} style={closeBtnStyle} aria-label="Fermer l'interprétation"
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--mp-text)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--mp-text-muted)"; }}
    >
      <X size={14} />
    </button>
  );
}

export default function InterpretationPanel({ interpretation, loading, streamingText, error, onClose }) {
  if (error) {
    return (
      <div style={panelStyle}>
        <CloseBtn onClose={onClose} />
        <p style={{ fontSize: 13, color: "var(--mp-warm, #C45A32)", margin: 0, lineHeight: 1.6 }}>
          {error}
        </p>
        <p style={{ fontSize: 11, color: "var(--mp-text-muted)", margin: "8px 0 0" }}>
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
        <p style={{ fontSize: 13, color: "var(--mp-text-muted)", margin: 0, fontStyle: "italic" }}>
          Analyse en cours...
        </p>
      ) : interpretation ? (
        <div>
          {SECTIONS.map(({ key, label, Icon }) => (
            <SectionBlock key={key} label={label} Icon={Icon} content={interpretation[key]} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
