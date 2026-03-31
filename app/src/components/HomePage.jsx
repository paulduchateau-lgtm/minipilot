import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, FileText, BarChart2, Calendar, Building2, Loader2, FolderOpen, X, Check } from "lucide-react";
import { listWorkspaces, createWorkspace, deleteWorkspace } from "../lib/api";

const INDUSTRIES = [
  { value: "assurance", label: "Assurance" },
  { value: "banque", label: "Banque" },
  { value: "mutuelle", label: "Mutuelle" },
  { value: "prevoyance", label: "Prevoyance" },
  { value: "institution_publique", label: "Institution publique" },
  { value: "autre", label: "Autre" },
];

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function IndustryBadge({ industry }) {
  if (!industry) return null;
  const label = INDUSTRIES.find(i => i.value === industry)?.label || industry;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: "var(--font-data)", fontSize: 9,
      textTransform: "uppercase", letterSpacing: "0.1em",
      background: "var(--mp-accent-dim)",
      border: "1px solid rgba(176, 216, 56, 0.15)",
      borderRadius: "var(--radius-pill)",
      padding: "3px 10px",
      color: "var(--mp-accent-text)",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: "var(--mp-accent)", flexShrink: 0,
      }} />
      {label}
    </span>
  );
}

function WorkspaceCard({ workspace, onOpen, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    await onDelete(workspace.slug);
  };

  return (
    <div
      onClick={() => onOpen(workspace.slug)}
      style={{
        background: "var(--mp-bg-card)",
        border: "1px solid var(--mp-border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        cursor: "pointer",
        transition: "border-color 200ms ease, box-shadow 200ms ease",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--mp-accent)";
        e.currentTarget.style.boxShadow = "0 0 0 1px var(--mp-accent), var(--mp-shadow)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--mp-border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "var(--radius-md)",
          background: "var(--mp-accent-dim)",
          border: "1px solid rgba(176, 216, 56, 0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <FolderOpen size={18} color="var(--mp-accent)" />
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: confirmDelete ? "rgba(196, 90, 50, 0.1)" : "transparent",
            border: confirmDelete ? "1px solid rgba(196, 90, 50, 0.3)" : "1px solid transparent",
            borderRadius: "var(--radius-sm)",
            padding: "5px 8px",
            cursor: deleting ? "wait" : "pointer",
            display: "flex", alignItems: "center", gap: 5,
            color: confirmDelete ? "var(--mp-warm)" : "var(--mp-text-muted)",
            fontSize: 11, fontFamily: "var(--font-body)",
            transition: "all 150ms ease",
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            if (!confirmDelete) {
              e.currentTarget.style.background = "rgba(196, 90, 50, 0.08)";
              e.currentTarget.style.borderColor = "rgba(196, 90, 50, 0.2)";
              e.currentTarget.style.color = "var(--mp-warm)";
            }
          }}
          onMouseLeave={e => {
            if (!confirmDelete) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.color = "var(--mp-text-muted)";
            }
          }}
          title={confirmDelete ? "Cliquez pour confirmer" : "Supprimer l'espace"}
        >
          {deleting ? (
            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
          ) : confirmDelete ? (
            <><Check size={12} /> Confirmer</>
          ) : (
            <Trash2 size={13} />
          )}
        </button>
      </div>

      {/* Name */}
      <div>
        <h3 style={{
          fontFamily: "var(--font-display)",
          fontSize: 17, fontWeight: 500,
          color: "var(--mp-text)",
          margin: "0 0 6px",
          lineHeight: 1.3,
        }}>
          {workspace.name}
        </h3>
        <IndustryBadge industry={workspace.industry} />
      </div>

      {/* Stats */}
      <div style={{
        display: "flex", gap: 16,
        paddingTop: 12,
        borderTop: "1px solid var(--mp-border-subtle)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <FileText size={12} color="var(--mp-text-muted)" />
          <span style={{
            fontFamily: "var(--font-data)", fontSize: 11,
            color: "var(--mp-text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {workspace.files_count ?? workspace.filesCount ?? 0} fichier{(workspace.files_count ?? workspace.filesCount ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BarChart2 size={12} color="var(--mp-text-muted)" />
          <span style={{
            fontFamily: "var(--font-data)", fontSize: 11,
            color: "var(--mp-text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {workspace.reports_count ?? workspace.reportsCount ?? 0} rapport{(workspace.reports_count ?? workspace.reportsCount ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>
        {(workspace.created_at || workspace.createdAt) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <Calendar size={11} color="var(--mp-text-muted)" style={{ flexShrink: 0 }} />
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 10,
              color: "var(--mp-text-muted)",
            }}>
              {formatDate(workspace.created_at || workspace.createdAt)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "80px 24px",
      gap: 24,
    }}>
      {/* Illustration */}
      <div style={{ position: "relative" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "var(--radius-lg)",
          background: "var(--mp-bg-elevated)",
          border: "1px solid var(--mp-border)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FolderOpen size={32} color="var(--mp-text-muted)" />
        </div>
        <div style={{
          position: "absolute", bottom: -6, right: -6,
          width: 24, height: 24, borderRadius: "50%",
          background: "var(--mp-accent-dim)",
          border: "1px solid var(--mp-accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Plus size={13} color="var(--mp-accent)" />
        </div>
      </div>

      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: 22, fontWeight: 400,
          color: "var(--mp-text)", margin: "0 0 10px",
        }}>
          Aucun espace de travail
        </h2>
        <p style={{
          fontSize: 14, color: "var(--mp-text-muted)",
          fontFamily: "var(--font-body)", lineHeight: 1.6,
        }}>
          Creez votre premier espace pour importer vos donnees, configurer le contexte metier et generer vos premiers rapports.
        </p>
      </div>

      <button
        onClick={onCreate}
        style={{
          background: "var(--mp-accent)",
          color: "var(--mp-accent-on)",
          border: "none", borderRadius: "var(--radius-md)",
          padding: "11px 28px", fontSize: 14, fontWeight: 500,
          fontFamily: "var(--font-body)", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          transition: "opacity 150ms ease",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        <Plus size={16} />
        Nouvel espace de travail
      </button>
    </div>
  );
}

function CreateWorkspaceForm({ onSubmit, onCancel, loading }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");

  const isValid = name.trim().length >= 2;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid || loading) return;
    onSubmit(name.trim(), industry);
  };

  return (
    <div style={{
      background: "var(--mp-bg-card)",
      border: "1px solid var(--mp-accent)",
      borderRadius: "var(--radius-lg)",
      padding: "24px",
      boxShadow: "0 0 0 1px var(--mp-accent), var(--mp-shadow)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h3 style={{
          fontFamily: "var(--font-display)",
          fontSize: 16, fontWeight: 500, margin: 0,
          color: "var(--mp-text)",
        }}>
          Nouvel espace de travail
        </h3>
        <button
          onClick={onCancel}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--mp-text-muted)", borderRadius: "var(--radius-sm)",
            transition: "color 150ms ease",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--mp-text)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--mp-text-muted)"}
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{
            display: "block",
            fontFamily: "var(--font-data)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--mp-text-muted)", marginBottom: 8,
          }}>
            Nom de l'espace
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex : Prevoyance 2024 — Groupe Alpha"
            autoFocus
            style={{
              width: "100%", padding: "10px 14px",
              background: "var(--mp-bg)",
              border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--mp-text)", fontSize: 14,
              fontFamily: "var(--font-body)", outline: "none",
              transition: "border-color 150ms ease",
              boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "var(--mp-accent)"}
            onBlur={e => e.target.style.borderColor = "var(--mp-border)"}
          />
        </div>

        <div>
          <label style={{
            display: "block",
            fontFamily: "var(--font-data)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--mp-text-muted)", marginBottom: 8,
          }}>
            Secteur (optionnel)
          </label>
          <select
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px",
              background: "var(--mp-bg)",
              border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-sm)",
              color: industry ? "var(--mp-text)" : "var(--mp-text-muted)",
              fontSize: 14, fontFamily: "var(--font-body)",
              outline: "none", cursor: "pointer",
              transition: "border-color 150ms ease",
              boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "var(--mp-accent)"}
            onBlur={e => e.target.style.borderColor = "var(--mp-border)"}
          >
            <option value="">Selectionner...</option>
            {INDUSTRIES.map(i => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "1px solid var(--mp-border)",
              borderRadius: "var(--radius-md)",
              padding: "9px 20px", fontSize: 13, fontWeight: 400,
              fontFamily: "var(--font-body)", cursor: "pointer",
              color: "var(--mp-text-muted)",
              transition: "border-color 150ms ease, color 150ms ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--mp-text-muted)"; e.currentTarget.style.color = "var(--mp-text)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--mp-border)"; e.currentTarget.style.color = "var(--mp-text-muted)"; }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!isValid || loading}
            style={{
              background: isValid && !loading ? "var(--mp-accent)" : "var(--mp-border)",
              color: isValid && !loading ? "var(--mp-accent-on)" : "var(--mp-text-muted)",
              border: "none", borderRadius: "var(--radius-md)",
              padding: "9px 20px", fontSize: 13, fontWeight: 500,
              fontFamily: "var(--font-body)",
              cursor: isValid && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 7,
              transition: "background 150ms ease, color 150ms ease",
            }}
          >
            {loading ? (
              <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Creation...</>
            ) : (
              <>Creer l'espace</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const data = await listWorkspaces();
      setWorkspaces(Array.isArray(data) ? data : (data.workspaces || []));
    } catch {
      setWorkspaces([]);
    }
    setLoading(false);
  };

  const handleCreate = async (name, industry) => {
    setCreating(true);
    setError(null);
    try {
      const result = await createWorkspace(name, industry);
      if (result.error) {
        setError(result.error);
        setCreating(false);
        return;
      }
      const slug = result.slug || result.workspace?.slug;
      if (slug) {
        navigate(`/${slug}`);
      } else {
        await loadWorkspaces();
        setShowForm(false);
      }
    } catch {
      setError("Erreur lors de la creation de l'espace. Veuillez reessayer.");
    }
    setCreating(false);
  };

  const handleDelete = async (slug) => {
    try {
      await deleteWorkspace(slug);
      setWorkspaces(prev => prev.filter(w => w.slug !== slug));
    } catch {
      // silently fail — user can retry
    }
  };

  const handleOpen = (slug) => {
    navigate(`/${slug}`);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--mp-bg)",
      fontFamily: "var(--font-body)",
      color: "var(--mp-text)",
    }}>
      {/* Top bar */}
      <header style={{
        padding: "0 40px",
        height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--mp-border)",
        background: "var(--mp-bg-elevated)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: 22, fontWeight: 300, fontStyle: "italic",
              color: "var(--mp-accent-text)",
            }}>
              Pilot
            </span>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 9,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: "var(--mp-text-muted)", marginLeft: 10,
            }}>
              v0.4
            </span>
          </div>
          <span style={{
            fontFamily: "var(--font-data)", fontSize: 8,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--mp-text-muted)", marginTop: 1,
          }}>
            by Lite Ops
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontFamily: "var(--font-data)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "var(--mp-text-muted)",
          }}>
            Espaces de travail
          </span>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: "var(--mp-accent)",
                color: "var(--mp-accent-on)",
                border: "none", borderRadius: "var(--radius-md)",
                padding: "8px 18px", fontSize: 13, fontWeight: 500,
                fontFamily: "var(--font-body)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 7,
                transition: "opacity 150ms ease",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <Plus size={14} />
              Nouvel espace
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{
        maxWidth: 1140, margin: "0 auto",
        padding: "48px 40px",
      }}>
        {/* Page title */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 32, fontWeight: 400,
            color: "var(--mp-text)", margin: "0 0 8px",
            lineHeight: 1.25,
          }}>
            Vos espaces d'analyse
          </h1>
          <p style={{
            fontSize: 14, color: "var(--mp-text-muted)",
            fontFamily: "var(--font-body)", lineHeight: 1.6,
          }}>
            Chaque espace contient des donnees, un contexte metier et ses rapports associes.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(196, 90, 50, 0.08)",
            border: "1px solid rgba(196, 90, 50, 0.25)",
            borderLeft: "3px solid var(--mp-warm)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px", marginBottom: 24,
          }}>
            <span style={{ fontSize: 13, color: "var(--mp-warm)", fontFamily: "var(--font-body)" }}>
              {error}
            </span>
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: "auto", background: "none", border: "none",
                cursor: "pointer", color: "var(--mp-warm)", padding: 2,
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                background: "var(--mp-bg-card)",
                border: "1px solid var(--mp-border)",
                borderRadius: "var(--radius-lg)",
                padding: 24, height: 176,
                animation: "pulse-glow 2s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}>
            {/* New workspace form card */}
            {showForm && (
              <CreateWorkspaceForm
                onSubmit={handleCreate}
                onCancel={() => { setShowForm(false); setError(null); }}
                loading={creating}
              />
            )}

            {/* Workspace cards */}
            {workspaces.map(ws => (
              <WorkspaceCard
                key={ws.slug}
                workspace={ws}
                onOpen={handleOpen}
                onDelete={handleDelete}
              />
            ))}

            {/* Empty state (only when no form and no workspaces) */}
            {!showForm && workspaces.length === 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <EmptyState onCreate={() => setShowForm(true)} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: "24px 40px",
        borderTop: "1px solid var(--mp-border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--mp-success)",
            animation: "pulse-glow 4s ease-in-out infinite",
          }} />
          <span style={{
            fontFamily: "var(--font-data)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--mp-text-muted)",
          }}>
            Donnees locales
          </span>
        </div>
        <span style={{
          fontFamily: "var(--font-data)", fontSize: 10,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--mp-text-muted)",
        }}>
          Lite Ops · Pilot
        </span>
      </footer>
    </div>
  );
}
