import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, X, Database, FileText, Check, AlertCircle } from "lucide-react";
import { useWorkspaceApi } from "../../lib/WorkspaceContext";

const ACCEPTED_TYPES = [".xlsx", ".xls", ".csv", ".json"];
const ACCEPTED_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/json",
];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getFileTypeLabel(name) {
  const ext = name.split(".").pop().toLowerCase();
  return ext.toUpperCase();
}

function FileIcon({ name }) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "xlsx" || ext === "xls") return <FileSpreadsheet size={16} color="var(--mp-success)" />;
  if (ext === "csv") return <FileText size={16} color="var(--mp-signal)" />;
  return <FileText size={16} color="var(--mp-text-muted)" />;
}

export default function OnboardingUpload({ onNext, data }) {
  const api = useWorkspaceApi();
  const [files, setFiles] = useState(data?.files || []);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [uploadStats, setUploadStats] = useState(data?.uploadStats || null);
  const fileInputRef = useRef(null);

  const uploadFiles = useCallback(async (fileList) => {
    setUploading(true);
    setError(null);
    let progressTimer = null;

    const pending = fileList.map(f => ({
      name: f.name,
      size: f.size,
      type: getFileTypeLabel(f.name),
      progress: 0,
      status: "uploading",
      id: `${f.name}-${Date.now()}`,
    }));

    setFiles(prev => [...prev, ...pending]);

    try {
      // Show visible progress while the request is in flight.
      setFiles(prev =>
        prev.map(f => (f.status === "uploading" ? { ...f, progress: Math.max(f.progress || 0, 12) } : f))
      );
      progressTimer = setInterval(() => {
        setFiles(prev =>
          prev.map(f => {
            if (f.status !== "uploading") return f;
            const next = Math.min((f.progress || 0) + 8, 92);
            return { ...f, progress: next };
          })
        );
      }, 350);

      const result = await api.uploadFiles(fileList);

      if (!result || result.error) throw new Error(result?.error || "Echec du transfert");

      setFiles(prev =>
        prev.map(f => {
          const match = result.files?.find(r => r.name === f.name);
          if (match) return { ...f, ...match, progress: 100, status: "done" };
          if (f.status === "uploading") return { ...f, progress: 100, status: "done" };
          return f;
        })
      );

      if (result.stats) setUploadStats(result.stats);
    } catch (err) {
      setFiles(prev =>
        prev.map(f =>
          f.status === "uploading" ? { ...f, status: "error", progress: 0 } : f
        )
      );
      setError("Une erreur est survenue lors du transfert. Veuillez réessayer.");
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setUploading(false);
    }
  }, [api]);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
      ACCEPTED_MIME.includes(f.type) ||
      ACCEPTED_TYPES.some(ext => f.name.toLowerCase().endsWith(ext))
    );
    if (droppedFiles.length === 0) {
      setError("Format non supporté. Utilisez .xlsx, .xls, .csv ou .json");
      return;
    }
    await uploadFiles(droppedFiles);
  }, [uploadFiles]);

  const handleFileSelect = useCallback(async (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) await uploadFiles(selected);
    e.target.value = "";
  }, [uploadFiles]);

  const removeFile = useCallback((id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const doneFiles = files.filter(f => f.status === "done");
  const canProceed = doneFiles.length > 0 && !uploading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--mp-accent)" : "var(--mp-border)"}`,
          borderRadius: "var(--radius-lg)",
          padding: "48px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          cursor: "pointer",
          background: dragOver ? "var(--mp-accent-dim)" : "var(--mp-bg-card)",
          transition: "border-color 0.2s, background 0.2s",
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: "var(--radius-lg)",
          background: dragOver ? "var(--mp-accent-dim)" : "var(--mp-bg-elevated)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s",
        }}>
          <Upload size={24} color={dragOver ? "var(--mp-accent)" : "var(--mp-text-muted)"} />
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{
            fontSize: 15, fontWeight: 500, marginBottom: 6,
            fontFamily: "var(--font-body)", color: "var(--mp-text)",
          }}>
            {dragOver ? "Relacher pour importer" : "Glissez vos fichiers ici"}
          </p>
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)" }}>
            ou{" "}
            <span style={{ color: "var(--mp-accent-text)", textDecoration: "underline", cursor: "pointer" }}>
              selectionnez des fichiers
            </span>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {ACCEPTED_TYPES.map(ext => (
            <span key={ext} style={{
              fontFamily: "var(--font-data)", fontSize: 10,
              textTransform: "uppercase", letterSpacing: "0.1em",
              background: "var(--mp-bg-elevated)",
              border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-sm)",
              padding: "3px 8px",
              color: "var(--mp-text-muted)",
            }}>
              {ext}
            </span>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileSelect}
          style={{ display: "none" }}
          aria-label="Selectionner des fichiers"
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(196, 90, 50, 0.08)",
          border: "1px solid rgba(196, 90, 50, 0.25)",
          borderLeft: "3px solid var(--mp-warm)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
        }}>
          <AlertCircle size={14} color="var(--mp-warm)" />
          <span style={{ fontSize: 13, color: "var(--mp-warm)", fontFamily: "var(--font-body)" }}>{error}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div style={{
          background: "var(--mp-bg-card)",
          border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}>
          {files.map((file, i) => (
            <div key={file.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px",
              borderBottom: i < files.length - 1 ? "1px solid var(--mp-border-subtle)" : "none",
            }}>
              <FileIcon name={file.name} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: file.status === "uploading" ? 6 : 0 }}>
                  <span style={{
                    fontSize: 13, fontFamily: "var(--font-body)",
                    color: "var(--mp-text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {file.name}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-data)", fontSize: 10,
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    background: "var(--mp-bg-elevated)",
                    border: "1px solid var(--mp-border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "2px 6px",
                    color: "var(--mp-text-muted)",
                    flexShrink: 0,
                  }}>
                    {file.type}
                  </span>
                  <span style={{
                    fontSize: 11, color: "var(--mp-text-muted)",
                    fontFamily: "var(--font-data)",
                    flexShrink: 0,
                  }}>
                    {formatFileSize(file.size)}
                  </span>
                </div>

                {file.status === "uploading" && (
                  <div style={{
                    height: 3, background: "var(--mp-border)",
                    borderRadius: 9999, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", background: "var(--mp-accent)",
                      borderRadius: 9999,
                      width: `${file.progress}%`,
                      transition: "width 0.3s ease",
                      animation: "progress-indeterminate 1.5s ease-in-out infinite",
                    }} />
                  </div>
                )}

                {file.status === "error" && (
                  <span style={{ fontSize: 11, color: "var(--mp-warm)", fontFamily: "var(--font-body)" }}>
                    Echec du transfert
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {file.status === "done" && (
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: "rgba(58, 138, 74, 0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check size={11} color="var(--mp-success)" />
                  </div>
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 24, height: 24, borderRadius: "var(--radius-sm)",
                    color: "var(--mp-text-muted)",
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--mp-bg-elevated)"; e.currentTarget.style.color = "var(--mp-warm)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--mp-text-muted)"; }}
                  aria-label={`Supprimer ${file.name}`}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload stats */}
      {uploadStats && (
        <div className="animate-fade-up" style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(58, 138, 74, 0.08)",
          border: "1px solid rgba(58, 138, 74, 0.2)",
          borderLeft: "3px solid var(--mp-success)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
        }}>
          <Check size={14} color="var(--mp-success)" />
          <span style={{
            fontFamily: "var(--font-data)", fontSize: 11,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--mp-success)",
          }}>
            {doneFiles.length} fichier{doneFiles.length > 1 ? "s" : ""} &bull; {uploadStats.totalRows?.toLocaleString("fr-FR")} lignes &bull; {uploadStats.totalCols} colonnes
          </span>
        </div>
      )}

      {/* DB connector (disabled) */}
      <div style={{
        border: "1px solid var(--mp-border)",
        borderRadius: "var(--radius-md)",
        padding: "16px 20px",
        display: "flex", alignItems: "center", gap: 14,
        opacity: 0.6,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "var(--radius-sm)",
          background: "var(--mp-bg-elevated)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Database size={16} color="var(--mp-text-muted)" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontFamily: "var(--font-body)", color: "var(--mp-text)", marginBottom: 2 }}>
            Connecter une base de donnees
          </p>
          <p style={{ fontSize: 12, color: "var(--mp-text-muted)", fontFamily: "var(--font-body)" }}>
            PostgreSQL, MySQL, SQL Server — connexion directe
          </p>
        </div>
        <span style={{
          fontFamily: "var(--font-data)", fontSize: 10,
          textTransform: "uppercase", letterSpacing: "0.1em",
          background: "var(--mp-bg-elevated)",
          border: "1px solid var(--mp-border)",
          borderRadius: "var(--radius-pill)",
          padding: "3px 10px",
          color: "var(--mp-text-muted)",
          flexShrink: 0,
        }}>
          Bientot
        </span>
      </div>

      {/* Next button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => canProceed && onNext({ files: doneFiles, uploadStats })}
          disabled={!canProceed}
          style={{
            background: canProceed ? "var(--mp-accent)" : "var(--mp-border)",
            color: canProceed ? "var(--mp-accent-on)" : "var(--mp-text-muted)",
            border: "none", borderRadius: "var(--radius-md)",
            padding: "10px 24px", fontSize: 14, fontWeight: 500,
            fontFamily: "var(--font-body)", cursor: canProceed ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 8,
            transition: "background 0.15s, color 0.15s",
          }}
        >
          Suivant
          {canProceed && <span style={{ fontSize: 16, lineHeight: 1 }}>&#8594;</span>}
        </button>
      </div>
    </div>
  );
}
