import { useState, useEffect } from "react";
import { Routes, Route, useParams, useNavigate, useLocation } from "react-router-dom";
import { WorkspaceProvider, useWorkspaceApi, useWorkspace } from "../lib/WorkspaceContext";
import { getProductName } from "../lib/productLabel";
import Sidebar from "./Sidebar";
import DashboardPage from "./DashboardPage";
import ChatPage from "./ChatPage";
import AdminPage from "./AdminPage";
import FullReport from "./FullReport";
import TrashPage from "./TrashPage";
import OnboardingWizard from "./onboarding/OnboardingWizard";
import ReportEditorPage from "./ReportEditorPage";
import ImportReportPage from "./ImportReportPage";
import SchedulePage from "./SchedulePage";
import ScheduleListPage from "./ScheduleListPage";

function WorkspaceContent() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const api = useWorkspaceApi();
  const { workspace } = useWorkspace();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [onboarded, setOnboarded] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [reports, setReports] = useState({ shared: [], private: [] });
  const [reportsLoading, setReportsLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState(null);

  // Dynamic browser tab title based on workspace product type
  useEffect(() => {
    if (workspace) {
      const label = getProductName(workspace);
      document.title = `${label} — ${workspace.name}`;
    }
  }, [workspace]);

  useEffect(() => {
    checkOnboarding();
  }, [slug]);

  const checkOnboarding = async () => {
    try {
      const status = await api.getOnboardingStatus();
      if (status.step === "complete") {
        setOnboarded(true);
        setShowOnboarding(false);
        loadReports();
      } else {
        setOnboarded(false);
        setShowOnboarding(true);
      }
    } catch {
      setOnboarded(false);
      setShowOnboarding(true);
    }
  };

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const data = await api.getReports();
      setReports(data);
    } catch {
      setReports({ shared: [], private: [] });
    }
    setReportsLoading(false);
  };

  const handleOnboardingComplete = () => {
    setOnboarded(true);
    setShowOnboarding(false);
    loadReports();
    navigate(`/${slug}`);
  };

  const toggleStar = async (reportId) => {
    const allReports = [...(reports.shared || []), ...(reports.private || [])];
    const report = allReports.find(r => r.id === reportId);
    if (!report) return;
    try {
      await api.updateReport(reportId, { starred: report.starred ? 0 : 1 });
      loadReports();
    } catch (e) {
      console.error("Failed to toggle star", e);
    }
  };

  const openReport = (reportId) => {
    const allReports = [...(reports.shared || []), ...(reports.private || [])];
    const report = allReports.find(r => r.id === reportId);
    if (report) {
      setViewingReport(report);
    }
    navigate(`/${slug}/report/${reportId}`);
  };

  const trashReport = async (reportId) => {
    try {
      await api.deleteReport(reportId);
      loadReports();
    } catch (e) {
      console.error("Failed to trash report", e);
    }
  };

  const goToChat = () => navigate(`/${slug}/chat`);
  const goToImport = () => navigate(`/${slug}/import`);

  // Determine current page from location — strip the slug prefix
  const subPath = location.pathname.replace(`/${slug}`, "").replace(/^\//, "");
  const currentPage = subPath.split("/")[0] || "dashboard";

  // Load report directly by ID when navigating to a report URL
  useEffect(() => {
    if (currentPage === "report" && !viewingReport) {
      const reportId = subPath.split("/")[1];
      if (!reportId) return;
      // First try from already-loaded reports
      const allReports = [...(reports.shared || []), ...(reports.private || [])];
      const found = allReports.find(r => r.id === reportId);
      if (found) {
        setViewingReport(found);
      } else {
        // Fetch directly from API
        api.getReport(reportId)
          .then(report => { if (report) setViewingReport(report); })
          .catch(() => {});
      }
    }
  }, [currentPage, viewingReport, reports, subPath]);

  const handleSetPage = (p) => {
    if (p !== "report") setViewingReport(null);
    if (p === "dashboard") navigate(`/${slug}`);
    else navigate(`/${slug}/${p}`);
    if (p === "dashboard") loadReports();
  };

  if (showOnboarding) {
    return (
      <div style={{
        height: "100vh", width: "100%",
        background: "var(--mp-bg)",
        fontFamily: "var(--font-body)",
        color: "var(--mp-text)",
        overflow: "auto",
        transition: "background 0.3s, color 0.3s",
      }}>
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  if (onboarded === null) {
    return (
      <div style={{
        height: "100vh", width: "100%",
        background: "var(--mp-bg)",
        fontFamily: "var(--font-body)",
        color: "var(--mp-text)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, borderRadius: "var(--radius-md)",
            background: "var(--mp-accent-dim)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600 }}>m</span>
          </div>
          <p style={{ color: "var(--mp-text-muted)", fontSize: 14 }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100%",
      background: "var(--mp-bg)",
      fontFamily: "var(--font-body)",
      color: "var(--mp-text)",
      overflow: "hidden",
      transition: "background 0.3s, color 0.3s",
    }}>
      <Sidebar
        page={currentPage}
        setPage={handleSetPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        slug={slug}
        onStartOnboarding={async () => {
          try { await api.resetOnboarding(); } catch {}
          setOnboarded(false);
          setShowOnboarding(true);
          setReports({ shared: [], private: [] });
        }}
      />

      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {(currentPage === "dashboard" || currentPage === slug) && (
          <DashboardPage
            reports={reports}
            reportsLoading={reportsLoading}
            toggleStar={toggleStar}
            trashReport={trashReport}
            openReport={openReport}
            goToChat={goToChat}
            goToImport={goToImport}
          />
        )}

        {currentPage === "report" && (
          <div style={{ padding: 32, overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
              <button
                onClick={() => handleSetPage("dashboard")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--mp-text-muted)", fontSize: 13,
                  display: "flex", alignItems: "center", gap: 6,
                  fontFamily: "var(--font-body)", padding: 0,
                }}
              >
                ← Retour au tableau de bord
              </button>
              {viewingReport && (
                <button
                  onClick={() => navigate(`/${slug}/editor/${viewingReport.id}`)}
                  style={{
                    background: "none", border: "1px solid var(--mp-border)", cursor: "pointer",
                    color: "var(--mp-text-secondary)", fontSize: 13, borderRadius: "var(--radius-sm)",
                    display: "inline-flex", alignItems: "center", gap: 6,
                    marginLeft: 12, fontFamily: "var(--font-body)", padding: "4px 12px",
                  }}
                >
                  Editer dans l'editeur visuel
                </button>
              )}
            </div>
            {viewingReport ? (
              <FullReport
                report={viewingReport}
                isFav={!!viewingReport.starred}
                onToggleFav={() => toggleStar(viewingReport.id)}
                api={api}
                onReportUpdated={(updatedReport) => setViewingReport(updatedReport)}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
                <p style={{ color: "var(--mp-text-muted)", fontSize: 14 }}>Chargement du rapport...</p>
              </div>
            )}
          </div>
        )}

        {currentPage === "editor" && (
          <ReportEditorPage
            api={api}
            slug={slug}
            reportId={subPath.split("/")[1] === "new" ? null : subPath.split("/")[1] || null}
          />
        )}

        {currentPage === "import" && (
          <ImportReportPage api={api} slug={slug} />
        )}

        {currentPage === "schedule" && (
          <SchedulePage api={api} slug={slug} />
        )}

        {currentPage === "schedules" && (
          <ScheduleListPage api={api} slug={slug} />
        )}

        {currentPage === "chat" && (
          <ChatPage
            reports={reports}
            toggleStar={toggleStar}
            openReport={openReport}
            onReportGenerated={loadReports}
          />
        )}

        {currentPage === "trash" && (
          <TrashPage onReportRestored={loadReports} />
        )}

        {currentPage === "admin" && <AdminPage />}
      </div>
    </div>
  );
}

export default function WorkspaceShell() {
  const { slug } = useParams();
  return (
    <WorkspaceProvider slug={slug}>
      <WorkspaceContent />
    </WorkspaceProvider>
  );
}
