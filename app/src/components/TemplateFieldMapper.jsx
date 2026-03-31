import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function TemplateFieldMapper({ detectedFields, availableColumns, onConfirm, loading }) {
  const [mapping, setMapping] = useState(
    Object.fromEntries((detectedFields || []).map(f => [f, ""]))
  );

  const handleChange = (field, value) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onConfirm(mapping);
  };

  if (!detectedFields || detectedFields.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0", color: "var(--mp-text-muted)", fontSize: 14, fontFamily: "var(--font-body)" }}>
        Aucun champ detecte dans le modele.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-body)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {detectedFields.map(field => (
          <div key={field} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <span style={{ fontSize: 14, color: "var(--mp-text)", flex: 1 }}>{field}</span>
            <select
              value={mapping[field] || ""}
              onChange={e => handleChange(field, e.target.value)}
              style={{
                padding: "6px 10px",
                border: "1px solid var(--mp-border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--mp-bg-card)",
                color: "var(--mp-text)",
                fontSize: 13,
                fontFamily: "var(--font-body)",
                minWidth: 200,
                cursor: "pointer",
              }}
            >
              <option value="">-- ignorer --</option>
              {(availableColumns || []).map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          background: "var(--mp-accent)",
          color: "var(--mp-accent-on)",
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "10px 24px",
          fontSize: 14,
          fontWeight: 500,
          fontFamily: "var(--font-body)",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
        Generer le rapport
      </button>
    </div>
  );
}
