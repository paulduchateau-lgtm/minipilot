const API_BASE = "/api";

// ── Global (non-workspace) API functions ──────────────────────────────────

export async function listWorkspaces() {
  const res = await fetch(`${API_BASE}/workspaces`);
  return res.json();
}

export async function createWorkspace(name, industry) {
  const res = await fetch(`${API_BASE}/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, industry }),
  });
  return res.json();
}

export async function getWorkspace(slug) {
  const res = await fetch(`${API_BASE}/workspaces/${slug}`);
  return res.json();
}

export async function deleteWorkspace(slug) {
  const res = await fetch(`${API_BASE}/workspaces/${slug}`, { method: "DELETE" });
  return res.json();
}

export async function getAiMode() {
  const res = await fetch(`${API_BASE}/ai/mode`);
  return res.json();
}

export async function setAiMode(mode) {
  const res = await fetch(`${API_BASE}/ai/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  return res.json();
}

// ── Workspace-scoped API factory ──────────────────────────────────────────

export function createWorkspaceApi(slug) {
  const BASE = `${API_BASE}/w/${slug}`;

  return {
    uploadFiles: async (files) => {
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      const res = await fetch(`${BASE}/upload`, { method: "POST", body: formData });
      return res.json();
    },

    saveContext: async (context) => {
      const payload = {
        projectName: context.projectName || "",
        industry: context.secteur || context.industry || "",
        objectives: context.objectif || context.objectives || "",
        questionnaire: {
          perimetre: context.perimetre || "",
          periode: context.periode || "",
          indicateurs: context.indicateurs || [],
          mode: context.mode || "form",
        },
        freeText: context.freeText || context.free_text || "",
      };
      const res = await fetch(`${BASE}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },

    getContext: async () => {
      const res = await fetch(`${BASE}/context`);
      const data = await res.json();
      const ctx = data.context || data;
      return {
        project_name: ctx.projectName || ctx.project_name || "",
        industry: ctx.industry || "",
        objectives: ctx.objectives || "",
        free_text: ctx.freeText || ctx.free_text || "",
        questionnaire: ctx.questionnaire || null,
      };
    },

    updateContext: async (context) => {
      const payload = {
        projectName: context.project_name || context.projectName || "",
        industry: context.industry || "",
        objectives: context.objectives || "",
        freeText: context.free_text || context.freeText || "",
      };
      const res = await fetch(`${BASE}/context`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },

    transformData: async () => {
      const res = await fetch(`${BASE}/transform`, { method: "POST" });
      return res.json();
    },

    getDataPreview: async () => {
      const res = await fetch(`${BASE}/data/preview`);
      return res.json();
    },

    getDataStats: async () => {
      const res = await fetch(`${BASE}/data/stats`);
      return res.json();
    },

    suggestReports: async () => {
      const res = await fetch(`${BASE}/ai/suggest-reports`, { method: "POST" });
      return res.json();
    },

    generateReport: async (suggestion) => {
      const res = await fetch(`${BASE}/ai/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion }),
      });
      return res.json();
    },

    chatMessage: async (message, history) => {
      const res = await fetch(`${BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      return res.json();
    },

    // Chat sessions
    getChatSessions: async () => {
      const res = await fetch(`${BASE}/chat-sessions`);
      return res.json();
    },
    getChatSession: async (id) => {
      const res = await fetch(`${BASE}/chat-sessions/${id}`);
      return res.json();
    },
    createChatSession: async (title) => {
      const res = await fetch(`${BASE}/chat-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      return res.json();
    },
    updateChatSession: async (id, data) => {
      const res = await fetch(`${BASE}/chat-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    deleteChatSession: async (id) => {
      const res = await fetch(`${BASE}/chat-sessions/${id}`, { method: "DELETE" });
      return res.json();
    },

    getReports: async () => {
      const res = await fetch(`${BASE}/reports`);
      return res.json();
    },

    getReport: async (id) => {
      const res = await fetch(`${BASE}/reports/${id}`);
      if (!res.ok) return null;
      return res.json();
    },

    saveReport: async (report) => {
      const res = await fetch(`${BASE}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      return res.json();
    },

    updateReport: async (id, updates) => {
      const res = await fetch(`${BASE}/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return res.json();
    },

    deleteReport: async (id) => {
      const res = await fetch(`${BASE}/reports/${id}`, { method: "DELETE" });
      return res.json();
    },

    getTrashedReports: async () => {
      const res = await fetch(`${BASE}/reports-trash`);
      return res.json();
    },

    restoreReport: async (id) => {
      const res = await fetch(`${BASE}/reports/${id}/restore`, { method: "POST" });
      return res.json();
    },

    importTemplate: async (filesOrFile) => {
      const formData = new FormData();
      const fileList = Array.isArray(filesOrFile) ? filesOrFile : [filesOrFile];
      fileList.forEach(f => formData.append("files", f));
      const res = await fetch(`${BASE}/reports/import-template`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur lors de l'import" }));
        throw new Error(err.error || "Erreur lors de l'import");
      }
      return res.json();
    },

    iterateReport: async (id, globalFeedback, sectionFeedback) => {
      const res = await fetch(`${BASE}/reports/${id}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalFeedback, sectionFeedback }),
      });
      return res.json();
    },

    getReportVersions: async (id) => {
      const res = await fetch(`${BASE}/reports/${id}/versions`);
      return res.json();
    },

    getReportVersion: async (id, vnum) => {
      const res = await fetch(`${BASE}/reports/${id}/versions/${vnum}`);
      return res.json();
    },

    getOnboardingStatus: async () => {
      const res = await fetch(`${BASE}/onboarding/status`);
      return res.json();
    },

    resetOnboarding: async () => {
      const res = await fetch(`${BASE}/onboarding/reset`, { method: "POST" });
      return res.json();
    },

    getLogs: async (page = 1) => {
      const res = await fetch(`${BASE}/logs?page=${page}`);
      return res.json();
    },

    getThemeStats: async () => {
      const res = await fetch(`${BASE}/stats/themes`);
      return res.json();
    },

    getUsageStats: async () => {
      const res = await fetch(`${BASE}/stats/usage`);
      return res.json();
    },

    // Schedules
    getSchedules: async () => {
      const res = await fetch(`${BASE}/schedules`);
      return res.json();
    },

    createSchedule: async (data) => {
      const res = await fetch(`${BASE}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },

    getSchedule: async (id) => {
      const res = await fetch(`${BASE}/schedules/${id}`);
      return res.json();
    },

    updateSchedule: async (id, data) => {
      const res = await fetch(`${BASE}/schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },

    deleteSchedule: async (id) => {
      const res = await fetch(`${BASE}/schedules/${id}`, { method: "DELETE" });
      return res.json();
    },

    getScheduleRuns: async (id) => {
      const res = await fetch(`${BASE}/schedules/${id}/runs`);
      return res.json();
    },

    runScheduleNow: async (id) => {
      const res = await fetch(`${BASE}/schedules/${id}/run-now`, { method: "POST" });
      return res.json();
    },

    getFiles: async () => {
      const res = await fetch(`${BASE}/files`);
      return res.json();
    },

    getDataConcepts: async () => {
      const res = await fetch(`${BASE}/data/concepts`);
      return res.json();
    },

    generateSection: async (type, description) => {
      const res = await fetch(`${BASE}/ai/generate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description }),
      });
      return res.json();
    },
  };
}
