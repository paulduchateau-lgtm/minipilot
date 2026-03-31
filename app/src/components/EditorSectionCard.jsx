import { GripVertical, Trash2 } from "lucide-react";
import EditorTextSection from "./EditorTextSection";
import EditorChartSection from "./EditorChartSection";

const TYPE_LABELS = {
  bar: "Barres",
  pie: "Camembert",
  table: "Tableau",
  area_multi: "Aires",
  text: "Texte",
  grouped_bar: "Barres groupées",
  composed: "Composé",
};

export default function EditorSectionCard({ section, onChange, onDelete, dragHandleProps }) {
  const typeLabel = TYPE_LABELS[section.type] || section.type;

  return (
    <div style={{
      background: "var(--mp-bg-elevated)",
      border: "1px solid var(--mp-border)",
      borderRadius: "var(--radius-md)",
      padding: "12px 16px",
      marginBottom: 8,
    }}>
      {/* Header row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
      }}>
        {/* Drag handle */}
        <span
          {...(dragHandleProps || {})}
          style={{
            cursor: "grab",
            touchAction: "none",
            color: "var(--mp-text-muted)",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
          title="Réordonner"
          aria-label="Réordonner la section"
        >
          <GripVertical size={14} />
        </span>

        {/* Type badge */}
        <span style={{
          fontFamily: "var(--font-data)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          padding: "2px 8px",
          borderRadius: 9999,
          background: "var(--mp-accent-dim)",
          color: "var(--mp-accent)",
          flexShrink: 0,
        }}>
          {typeLabel}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          title="Supprimer la section"
          aria-label="Supprimer la section"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--mp-text-muted)",
            display: "flex",
            alignItems: "center",
            padding: 2,
            borderRadius: "var(--radius-sm)",
            flexShrink: 0,
            transition: "color 150ms ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--warm-500, #C45A32)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--mp-text-muted)"; }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Body: type-specific editor */}
      {section.type === "text" ? (
        <EditorTextSection
          value={section.html}
          onChange={html => onChange({ ...section, html })}
        />
      ) : (
        <EditorChartSection section={section} onChange={onChange} />
      )}
    </div>
  );
}
