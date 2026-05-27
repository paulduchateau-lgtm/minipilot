import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./data/theme";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import HomePage from "./components/HomePage";
import WorkspaceShell from "./components/WorkspaceShell";
import LoginPage from "./components/LoginPage";
import PublicReportPage from "./components/PublicReportPage";

function AuthGate({ children }) {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--color-dark, #1E1D1B)", color: "var(--color-paper, #F0EEEB)",
        fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
      }}>
        <p style={{ fontSize: 14, color: "var(--color-fog, #A8A49C)" }}>Chargement...</p>
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/pub/:token" element={<PublicReportPage />} />
          <Route path="/*" element={
            <AuthGate>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/:slug/*" element={<WorkspaceShell />} />
              </Routes>
            </AuthGate>
          } />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
