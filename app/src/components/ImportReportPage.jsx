import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, ChevronLeft, Image, X } from "lucide-react";
import TemplateFieldMapper from "./TemplateFieldMapper";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const DOC_EXTENSIONS = [".xlsx", ".xls", ".docx", ".doc"];
const ALL_EXTENSIONS = [...DOC_EXTENSIONS, ...IMAGE_EXTENSIONS];

function getExtension(filename) {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

function isImage(filename) {
  return IMAGE_EXTENSIONS.includes(getExtension(filename));
}

export default function ImportReportPage({ api, slug }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1); // 1=upload, 2=analyzing, 3=mapping
  const [fingerprint, setFingerprint] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [pendingImages, setPendingImages] = useState([]); // for multi-image preview

  const handleFileSelected = (fileOrFiles) => {
    const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (files.length === 0) return;

    // Validate all files
    for (const f of files) {
      if (!ALL_EXTENSIONS.includes(getExtension(f.name))) {
        setError(`Format non supporté : ${f.name}. Utilisez .xlsx, .docx, .png ou .jpg.`);
        return;
      }
    }

    // If images, allow accumulating multiple before sending
    const hasImages = files.some(f => isImage(f.name));
    const hasDocs = files.some(f => !isImage(f.name));

    if (hasImages && hasDocs) {
      setError("Veuillez envoyer soit des images, soit un document — pas les deux en meme temps.");
      return;
    }

    if (hasDocs) {
      // Document: send immediately (single file)
      setError(null);
      setStep(2);
      handleUpload(files);
      return;
    }

    // Images: add to pending list for preview
    setError(null);
    setPendingImages(prev => [...prev, ...files]);
  };

  const removeImage = (idx) => {
    setPendingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const submitImages = () => {
    if (pendingImages.length === 0) return;
    setStep(2);
    handleUpload(pendingImages);
  };

  const handleUpload = async (files) => {
    try {
      setError(null);
      const result = await api.importTemplate(files);
      setFingerprint(result.fingerprint);
      setAvailableColumns(result.availableColumns);
      setStep(3);
    } catch (err) {
      setError(err.message || "Erreur lors de l'analyse du modele.");
      setStep(1);
    }
  };

  const handleConfirm = async (mapping) => {
    setGenerating(true);
    try {
      const suggestion = {
        title: fingerprint.title,
        description: fingerprint.objective || "Rapport importe depuis un modele",
        type: fingerprint.sections?.[0]?.type || "bar",
        columns: Object.values(mapping).filter(Boolean),
        kpis: fingerprint.kpis?.map(k => k.label) || [],
        templateFingerprint: fingerprint,
        columnMapping: mapping,
      };
      const result = await api.generateReport(suggestion);
      navigate(`/${slug}/report/${result.report.id}`);
    } catch (err) {
      setError(err.message || "Erreur lors de la generation du rapport.");
      setGenerating(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = [...(e.dataTransfer.files || [])];
    if (files.length === 1) handleFileSelected(files[0]);
    else if (files.length > 1) handleFileSelected(files);
  };

  const handleInputChange = (e) => {
    const files = [...(e.target.files || [])];
    if (files.length === 1) handleFileSelected(files[0]);
    else if (files.length > 1) handleFileSelected(files);
    e.target.value = ""; // reset for re-selection
  };

  const goBack = () => navigate(`/${slug}/reports`);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: 32, fontFamily: "var(--font-body)" }}>
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
        Retour aux rapports
      </button>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 300,
            marginBottom: 8,
            color: "var(--mp-text)",
          }}>
            Importer un modele de rapport
          </h1>
          <p style={{
            fontSize: 14,
            color: "var(--mp-text-muted)",
            marginBottom: 32,
          }}>
            Deposez un fichier Excel, Word, ou des captures d'ecran de rapports existants.
            L'IA analysera la structure pour recreer un rapport equivalent.
          </p>

          {error && (
            <div style={{
              color: "#C45A32",
              fontSize: 13,
              marginBottom: 16,
              padding: "10px 14px",
              background: "rgba(196,90,50,0.08)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(196,90,50,0.2)",
            }}>
              {error}
            </div>
          )}

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed var(--mp-border)",
              borderRadius: "var(--radius-md)",
              padding: 48,
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--mp-accent)";
              e.currentTarget.style.background = "var(--mp-accent-dim)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--mp-border)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Upload size={32} color="var(--mp-text-muted)" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, color: "var(--mp-text)" }}>
              Deposer des fichiers ici
            </p>
            <p style={{ fontSize: 13, color: "var(--mp-text-muted)" }}>
              .xlsx, .docx — ou captures d'ecran .png, .jpg
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.webp"
              multiple
              onChange={handleInputChange}
              style={{ display: "none" }}
            />
          </div>

          {/* Image preview thumbnails */}
          {pendingImages.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--mp-text-muted)",
                marginBottom: 12,
              }}>
                <Image size={12} style={{ verticalAlign: "middle", marginRight: 6 }} />
                {pendingImages.length} capture{pendingImages.length > 1 ? "s" : ""} selectionnee{pendingImages.length > 1 ? "s" : ""}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                {pendingImages.map((img, i) => (
                  <div key={i} style={{
                    position: "relative",
                    width: 120,
                    height: 80,
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    border: "1px solid var(--mp-border)",
                  }}>
                    <img
                      src={URL.createObjectURL(img)}
                      alt={img.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      style={{
                        position: "absolute", top: 4, right: 4,
                        width: 20, height: 20, borderRadius: "50%",
                        background: "rgba(0,0,0,0.6)", border: "none",
                        color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      <X size={12} />
                    </button>
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      background: "rgba(0,0,0,0.5)", color: "#fff",
                      fontSize: 9, padding: "2px 6px",
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {img.name}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--mp-border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 16px",
                    fontSize: 13,
                    color: "var(--mp-text-muted)",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  + Ajouter des captures
                </button>
                <button
                  onClick={submitImages}
                  style={{
                    background: "var(--mp-accent)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 20px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--mp-bg, #1C1D1A)",
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Analyser {pendingImages.length} capture{pendingImages.length > 1 ? "s" : ""}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Analyzing */}
      {step === 2 && (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <Loader2
            size={40}
            color="var(--mp-accent)"
            style={{ animation: "spin 1s linear infinite", marginBottom: 24 }}
          />
          <p style={{ fontSize: 14, color: "var(--mp-text-muted)", marginBottom: 8 }}>
            Analyse du modele en cours...
          </p>
          <p style={{ fontSize: 13, color: "var(--mp-text-tertiary, var(--mp-text-muted))" }}>
            L'IA identifie la structure, les tableaux, graphiques et KPIs.
          </p>
        </div>
      )}

      {/* Step 3: Field Mapping */}
      {step === 3 && fingerprint && (
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontWeight: 400,
            marginBottom: 8,
            color: "var(--mp-text)",
          }}>
            {fingerprint.title}
          </h1>

          {fingerprint.objective && (
            <p style={{
              fontSize: 14,
              color: "var(--mp-text-muted)",
              marginBottom: 20,
            }}>
              {fingerprint.objective}
            </p>
          )}

          {error && (
            <div style={{
              color: "#C45A32",
              fontSize: 13,
              marginBottom: 16,
              padding: "10px 14px",
              background: "rgba(196,90,50,0.08)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(196,90,50,0.2)",
            }}>
              {error}
            </div>
          )}

          {/* KPIs detectes */}
          {fingerprint.kpis?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--mp-text-muted)",
                marginBottom: 10,
              }}>
                KPIs detectes
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {fingerprint.kpis.map((kpi, i) => (
                  <span key={i} style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    padding: "4px 10px",
                    borderRadius: 9999,
                    background: "var(--mp-accent-dim)",
                    color: "var(--mp-accent-text, var(--mp-accent))",
                    border: "1px solid var(--mp-accent-border, var(--mp-border))",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--mp-accent)", display: "inline-block", flexShrink: 0,
                    }} />
                    {kpi.label}{kpi.unit ? ` (${kpi.unit})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sections detectees */}
          {fingerprint.sections?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--mp-text-muted)",
                marginBottom: 10,
              }}>
                Sections detectees
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {fingerprint.sections.map((section, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    fontSize: 13, color: "var(--mp-text-secondary)",
                  }}>
                    <span>{section.title}</span>
                    {section.type && (
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        padding: "2px 8px",
                        borderRadius: 9999,
                        background: "var(--mp-bg-card)",
                        border: "1px solid var(--mp-border)",
                        color: "var(--mp-text-muted)",
                      }}>
                        {section.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Field Mapper */}
          {fingerprint.detectedFields?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--mp-text-muted)",
                marginBottom: 14,
              }}>
                Correspondance des champs
              </p>
              <TemplateFieldMapper
                detectedFields={fingerprint.detectedFields}
                availableColumns={availableColumns}
                onConfirm={handleConfirm}
                loading={generating}
              />
            </div>
          )}

          {(!fingerprint.detectedFields || fingerprint.detectedFields.length === 0) && (
            <TemplateFieldMapper
              detectedFields={[]}
              availableColumns={availableColumns}
              onConfirm={handleConfirm}
              loading={generating}
            />
          )}
        </div>
      )}
    </div>
  );
}
