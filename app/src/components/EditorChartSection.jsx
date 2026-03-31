const labelStyle = {
  display: "block",
  fontFamily: "var(--font-data)",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--mp-text-muted)",
  marginBottom: 4,
};

const inputStyle = {
  width: "100%",
  background: "var(--mp-bg-elevated)",
  border: "1px solid var(--mp-border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 10px",
  color: "var(--mp-text)",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  boxSizing: "border-box",
};

const fieldGroup = {
  marginBottom: 12,
};

export default function EditorChartSection({ section, onChange }) {
  const xKey = section.config?.xKey || "";
  const yKeys = section.config?.yKeys || [];
  const data = section.data || [];

  const updateConfig = (key, value) => {
    onChange({
      ...section,
      config: { ...section.config, [key]: value },
    });
  };

  const updateData = (newData) => {
    onChange({ ...section, data: newData });
  };

  const parseCell = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? val : n;
  };

  const addRow = () => {
    const emptyRow = {};
    if (xKey) emptyRow[xKey] = "";
    yKeys.forEach(k => { emptyRow[k] = ""; });
    updateData([...data, emptyRow]);
  };

  const deleteRow = (idx) => {
    updateData(data.filter((_, i) => i !== idx));
  };

  const updateCell = (rowIdx, colKey, val) => {
    const newData = data.map((row, i) =>
      i === rowIdx ? { ...row, [colKey]: parseCell(val) } : row
    );
    updateData(newData);
  };

  const allCols = xKey ? [xKey, ...yKeys] : yKeys;

  return (
    <div style={{ padding: "4px 0" }}>
      {/* Title */}
      <div style={fieldGroup}>
        <label style={labelStyle}>Titre</label>
        <input
          style={inputStyle}
          value={section.title || ""}
          onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder="Titre de la section"
        />
      </div>

      {/* Insight */}
      <div style={fieldGroup}>
        <label style={labelStyle}>Commentaire analytique</label>
        <textarea
          style={{ ...inputStyle, resize: "vertical", minHeight: 56 }}
          value={section.insight || ""}
          onChange={e => onChange({ ...section, insight: e.target.value })}
          placeholder="Insight ou commentaire (optionnel)"
        />
      </div>

      {/* X Axis Key */}
      <div style={fieldGroup}>
        <label style={labelStyle}>Clé axe X</label>
        <input
          style={inputStyle}
          value={xKey}
          onChange={e => updateConfig("xKey", e.target.value)}
          placeholder="ex: mois"
        />
      </div>

      {/* Y Axis Keys */}
      <div style={fieldGroup}>
        <label style={labelStyle}>Clés axe Y (séparées par des virgules)</label>
        <input
          style={inputStyle}
          value={yKeys.join(", ")}
          onChange={e => {
            const keys = e.target.value.split(",").map(k => k.trim()).filter(Boolean);
            updateConfig("yKeys", keys);
          }}
          placeholder="ex: valeur, objectif"
        />
      </div>

      {/* Data rows */}
      <div style={fieldGroup}>
        <label style={labelStyle}>Données</label>
        {allCols.length > 0 && data.length > 0 ? (
          <div style={{ overflowX: "auto", marginBottom: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {allCols.map(col => (
                    <th key={col} style={{
                      padding: "4px 8px",
                      textAlign: "left",
                      fontFamily: "var(--font-data)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--mp-text-muted)",
                      borderBottom: "1px solid var(--mp-border)",
                      whiteSpace: "nowrap",
                    }}>
                      {col}
                    </th>
                  ))}
                  <th style={{ width: 32, borderBottom: "1px solid var(--mp-border)" }} />
                </tr>
              </thead>
              <tbody>
                {data.map((row, ri) => (
                  <tr key={ri}>
                    {allCols.map(col => (
                      <td key={col} style={{ padding: "3px 4px" }}>
                        <input
                          style={{
                            ...inputStyle,
                            padding: "4px 6px",
                            fontSize: 12,
                          }}
                          value={row[col] !== undefined ? String(row[col]) : ""}
                          onChange={e => updateCell(ri, col, e.target.value)}
                        />
                      </td>
                    ))}
                    <td style={{ padding: "3px 4px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => deleteRow(ri)}
                        title="Supprimer la ligne"
                        aria-label="Supprimer la ligne"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--mp-text-muted)",
                          fontSize: 14,
                          lineHeight: 1,
                          padding: 2,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = "#C45A32"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--mp-text-muted)"; }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: "5px 12px",
            background: "var(--mp-bg-elevated)",
            border: "1px solid var(--mp-border)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            color: "var(--mp-text-secondary)",
            fontSize: 12,
            fontFamily: "var(--font-body)",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--mp-accent)"; e.currentTarget.style.color = "var(--mp-accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mp-border)"; e.currentTarget.style.color = "var(--mp-text-secondary)"; }}
        >
          + Ajouter une ligne
        </button>
      </div>
    </div>
  );
}
