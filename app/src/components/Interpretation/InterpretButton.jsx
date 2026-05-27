import { Sparkles } from "lucide-react";

const baseStyle = {
  background: "none",
  border: "1px solid var(--mp-border)",
  borderRadius: 6,
  padding: "6px 8px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 150ms ease, border-color 150ms ease, opacity 150ms ease",
  flexShrink: 0,
};

const pulseKeyframes = `
@keyframes interpret-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
`;

export default function InterpretButton({ onInterpret, loading, hasInterpretation }) {
  const color = hasInterpretation
    ? "var(--color-green, #A5D900)"
    : "var(--mp-text-muted)";

  const borderColor = hasInterpretation
    ? "var(--color-green, #A5D900)"
    : "var(--mp-border)";

  return (
    <>
      {loading && <style>{pulseKeyframes}</style>}
      <button
        onClick={onInterpret}
        disabled={loading}
        title={hasInterpretation ? "Voir l'interprétation" : "Interpréter cette section"}
        aria-label={hasInterpretation ? "Voir l'interprétation" : "Interpréter cette section"}
        style={{
          ...baseStyle,
          color,
          borderColor,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "wait" : "pointer",
          animation: loading ? "interpret-pulse 1.4s ease-in-out infinite" : "none",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.color = "var(--color-green, #A5D900)";
            e.currentTarget.style.borderColor = "var(--color-green, #A5D900)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.color = color;
            e.currentTarget.style.borderColor = borderColor;
          }
        }}
      >
        <Sparkles size={14} />
      </button>
    </>
  );
}
