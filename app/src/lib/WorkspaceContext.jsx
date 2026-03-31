import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { createWorkspaceApi, getWorkspace } from "./api";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children, slug: propSlug }) {
  const params = useParams();
  const slug = propSlug || params.slug;

  const api = useMemo(() => createWorkspaceApi(slug), [slug]);

  // Load workspace metadata (name, industry, etc.)
  const [workspace, setWorkspace] = useState(null);
  useEffect(() => {
    getWorkspace(slug)
      .then(setWorkspace)
      .catch(() => setWorkspace(null));
  }, [slug]);

  const value = useMemo(() => ({ slug, api, workspace }), [slug, api, workspace]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export function useWorkspaceApi() {
  return useWorkspace().api;
}
