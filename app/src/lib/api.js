const API_BASE = "/api";

function apiFetch(url, opts = {}) {
  return fetch(url, { credentials: "include", ...opts });
}

// ── Global (non-workspace) API functions ──────────────────────────────────

export async function listWorkspaces(tenant = "default") {
  const res = await apiFetch(`${API_BASE}/workspaces?tenant=${tenant}`);
  return res.json();
}

export async function createWorkspace(name, industry, tenant = "default") {
  const res = await apiFetch(`${API_BASE}/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, industry, tenant }),
  });
  return res.json();
}

export async function getWorkspace(slug) {
  const res = await apiFetch(`${API_BASE}/workspaces/${slug}`);
  return res.json();
}

export async function deleteWorkspace(slug) {
  const res = await apiFetch(`${API_BASE}/workspaces/${slug}`, { method: "DELETE" });
  return res.json();
}

export async function getAiMode() {
  const res = await apiFetch(`${API_BASE}/ai/mode`);
  return res.json();
}

export async function setAiMode(mode) {
  const res = await apiFetch(`${API_BASE}/ai/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  return res.json();
}

// ── Public report API (no auth) ──────────────────────────────────────────

export async function getPublicReport(token) {
  const res = await apiFetch(`${API_BASE}/pub/${token}`);
  if (!res.ok) return null;
  return res.json();
}

export async function postPublicComment(token, { sectionIndex, authorName, body }) {
  const res = await apiFetch(`${API_BASE}/pub/${token}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sectionIndex, authorName, body }),
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
      const res = await apiFetch(`${BASE}/upload`, { method: "POST", body: formData });
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
      const res = await apiFetch(`${BASE}/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },

    getContext: async () => {
      const res = await apiFetch(`${BASE}/context`);
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
      const res = await apiFetch(`${BASE}/context`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },

    transformData: async () => {
      const res = await apiFetch(`${BASE}/transform`, { method: "POST" });
      return res.json();
    },

    getDataPreview: async () => {
      const res = await apiFetch(`${BASE}/data/preview`);
      return res.json();
    },

    getDataStats: async () => {
      const res = await apiFetch(`${BASE}/data/stats`);
      return res.json();
    },

    suggestReports: async () => {
      const res = await apiFetch(`${BASE}/ai/suggest-reports`, { method: "POST" });
      return res.json();
    },

    generateReport: async (suggestion) => {
      const res = await apiFetch(`${BASE}/ai/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion }),
      });
      return res.json();
    },

    chatMessage: async (message, history) => {
      const res = await apiFetch(`${BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      return res.json();
    },

    // Chat sessions
    getChatSessions: async () => {
      const res = await apiFetch(`${BASE}/chat-sessions`);
      return res.json();
    },
    getChatSession: async (id) => {
      const res = await apiFetch(`${BASE}/chat-sessions/${id}`);
      return res.json();
    },
    createChatSession: async (title) => {
      const res = await apiFetch(`${BASE}/chat-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      return res.json();
    },
    updateChatSession: async (id, data) => {
      const res = await apiFetch(`${BASE}/chat-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    deleteChatSession: async (id) => {
      const res = await apiFetch(`${BASE}/chat-sessions/${id}`, { method: "DELETE" });
      return res.json();
    },

    getReports: async () => {
      const res = await apiFetch(`${BASE}/reports`);
      return res.json();
    },

    getReport: async (id) => {
      const res = await apiFetch(`${BASE}/reports/${id}`);
      if (!res.ok) return null;
      return res.json();
    },

    saveReport: async (report) => {
      const res = await apiFetch(`${BASE}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      return res.json();
    },

    updateReport: async (id, updates) => {
      const res = await apiFetch(`${BASE}/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return res.json();
    },

    deleteReport: async (id) => {
      const res = await apiFetch(`${BASE}/reports/${id}`, { method: "DELETE" });
      return res.json();
    },

    getTrashedReports: async () => {
      const res = await apiFetch(`${BASE}/reports-trash`);
      return res.json();
    },

    restoreReport: async (id) => {
      const res = await apiFetch(`${BASE}/reports/${id}/restore`, { method: "POST" });
      return res.json();
    },

    importTemplate: async (filesOrFile) => {
      const formData = new FormData();
      const fileList = Array.isArray(filesOrFile) ? filesOrFile : [filesOrFile];
      fileList.forEach(f => formData.append("files", f));
      const res = await apiFetch(`${BASE}/reports/import-template`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur lors de l'import" }));
        throw new Error(err.error || "Erreur lors de l'import");
      }
      return res.json();
    },

    iterateReport: async (id, globalFeedback, sectionFeedback) => {
      const res = await apiFetch(`${BASE}/reports/${id}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalFeedback, sectionFeedback }),
      });
      return res.json();
    },

    getReportVersions: async (id) => {
      const res = await apiFetch(`${BASE}/reports/${id}/versions`);
      return res.json();
    },

    getReportVersion: async (id, vnum) => {
      const res = await apiFetch(`${BASE}/reports/${id}/versions/${vnum}`);
      return res.json();
    },

    getOnboardingStatus: async () => {
      const res = await apiFetch(`${BASE}/onboarding/status`);
      return res.json();
    },

    resetOnboarding: async () => {
      const res = await apiFetch(`${BASE}/onboarding/reset`, { method: "POST" });
      return res.json();
    },

    getLogs: async (page = 1) => {
      const res = await apiFetch(`${BASE}/logs?page=${page}`);
      return res.json();
    },

    getThemeStats: async () => {
      const res = await apiFetch(`${BASE}/stats/themes`);
      return res.json();
    },

    getUsageStats: async () => {
      const res = await apiFetch(`${BASE}/stats/usage`);
      return res.json();
    },

    // Schedules
    getSchedules: async () => {
      const res = await apiFetch(`${BASE}/schedules`);
      return res.json();
    },

    createSchedule: async (data) => {
      const res = await apiFetch(`${BASE}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },

    getSchedule: async (id) => {
      const res = await apiFetch(`${BASE}/schedules/${id}`);
      return res.json();
    },

    updateSchedule: async (id, data) => {
      const res = await apiFetch(`${BASE}/schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },

    deleteSchedule: async (id) => {
      const res = await apiFetch(`${BASE}/schedules/${id}`, { method: "DELETE" });
      return res.json();
    },

    getScheduleRuns: async (id) => {
      const res = await apiFetch(`${BASE}/schedules/${id}/runs`);
      return res.json();
    },

    runScheduleNow: async (id) => {
      const res = await apiFetch(`${BASE}/schedules/${id}/run-now`, { method: "POST" });
      return res.json();
    },

    getFiles: async () => {
      const res = await apiFetch(`${BASE}/files`);
      return res.json();
    },

    getDataConcepts: async () => {
      const res = await apiFetch(`${BASE}/data/concepts`);
      return res.json();
    },

    generateSection: async (type, description) => {
      const res = await apiFetch(`${BASE}/ai/generate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description }),
      });
      return res.json();
    },

    // ── Interpretation ──────────────────────────────────────────────
    interpretSection: (sectionIndex, chartData, chartMeta, reportId, onChunk) => {
      return new Promise((resolve, reject) => {
        apiFetch(`${BASE}/ai/interpret`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionIndex, chartData, chartMeta, reportId }),
        })
          .then((res) => {
            if (!res.ok) return res.json().then((e) => reject(new Error(e.error || "Erreur")));
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let fullText = "";

            function read() {
              reader.read().then(({ done, value }) => {
                if (done) return resolve(fullText);
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    try {
                      const parsed = JSON.parse(line.slice(6));
                      if (parsed.type === "token" && parsed.text) {
                        fullText += parsed.text;
                        if (onChunk) onChunk(fullText);
                      } else if (parsed.type === "done") {
                        fullText = parsed.text || fullText;
                        return resolve(fullText);
                      } else if (parsed.type === "error") {
                        return reject(new Error(parsed.message || "Erreur IA"));
                      }
                    } catch {
                      // non-JSON SSE line, skip
                    }
                  }
                }
                read();
              }).catch(reject);
            }
            read();
          })
          .catch(reject);
      });
    },

    getInterpretations: async (reportId) => {
      const res = await apiFetch(`${BASE}/interpretations/${reportId}`);
      return res.json();
    },

    // ── Publication web ────────────────────────────────────────────
    publishReport: async (id) => {
      const res = await apiFetch(`${BASE}/reports/${id}/publish`, { method: "POST" });
      return res.json();
    },

    unpublishReport: async (id) => {
      const res = await apiFetch(`${BASE}/reports/${id}/publish`, { method: "DELETE" });
      return res.json();
    },

    getPublishStatus: async (id) => {
      const res = await apiFetch(`${BASE}/reports/${id}/publish`);
      return res.json();
    },

    getReportComments: async (id) => {
      const res = await apiFetch(`${BASE}/reports/${id}/comments`);
      return res.json();
    },

    getPublishedReports: async () => {
      const res = await apiFetch(`${BASE}/published-reports`);
      return res.json();
    },
  };
}
