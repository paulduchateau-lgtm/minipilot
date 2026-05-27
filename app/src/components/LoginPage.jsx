import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--mp-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
      color: "var(--mp-text)",
      transition: "background 0.3s, color 0.3s",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 400,
        padding: 32,
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}>
            <span style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--mp-accent)",
            }}>PILOT</span>
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 400,
            margin: "8px 0 4px",
          }}>
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </h1>
          <p style={{ fontSize: 13, color: "var(--mp-text-muted)" }}>
            {mode === "login"
              ? "Connectez-vous pour accéder à vos espaces de travail"
              : "Créez votre compte pour commencer"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nom</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Votre nom"
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@entreprise.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === "register" ? "6 caractères minimum" : "Votre mot de passe"}
              required
              minLength={mode === "register" ? 6 : undefined}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(196, 90, 50, 0.15)",
              border: "1px solid rgba(196, 90, 50, 0.3)",
              borderRadius: 6,
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--mp-error)",
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 20px",
              background: "var(--mp-accent)",
              color: "var(--mp-accent-on)",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              : mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />
            }
            {mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <div style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: 13,
          color: "var(--mp-text-muted)",
        }}>
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                onClick={() => { setMode("register"); setError(null); }}
                style={linkButtonStyle}
              >
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button
                onClick={() => { setMode("login"); setError(null); }}
                style={linkButtonStyle}
              >
                Se connecter
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  marginBottom: 6,
  color: "var(--mp-text-muted)",
  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--mp-bg-input)",
  border: "1px solid var(--mp-border)",
  borderRadius: 6,
  fontSize: 14,
  fontFamily: "inherit",
  color: "var(--mp-text)",
  outline: "none",
  boxSizing: "border-box",
};

const linkButtonStyle = {
  background: "none",
  border: "none",
  color: "var(--mp-accent)",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
  padding: 0,
  textDecoration: "underline",
};
