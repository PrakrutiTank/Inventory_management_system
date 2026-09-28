// Centralized API Client for Gujarat R&B Infrastructure Asset Management System

const API_BASE = "/api";

export async function apiRequest(endpoint, options = {}) {
  const { method = "GET", body, userId } = options;

  const headers = {
    "Content-Type": "application/json",
  };

  // Attach active prototype user ID if available
  const activeUserId = userId || localStorage.getItem("iams_active_user_id");
  if (activeUserId) {
    headers["X-User-Id"] = activeUserId;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `HTTP ${response.status}: Request failed`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Users & Roles
  getUsers: () => apiRequest("/users"),
  getUserProfile: (id) => apiRequest(`/users/${id}`),
  getCurrentUser: () => apiRequest("/users/current"),
  createUser: (userData) => apiRequest("/users", { method: "POST", body: userData }),
  updateUser: (id, userData) => apiRequest(`/users/${id}`, { method: "PUT", body: userData }),
  getRolePermissions: () => apiRequest("/roles/permissions"),
  updateRolePermissions: (role, permissions) =>
    apiRequest(`/roles/permissions/${role}`, { method: "PUT", body: { permissions } }),

  // Hierarchy
  getHierarchy: () => apiRequest("/hierarchy"),

  // Lifecycle Templates
  getLifecycleTemplates: () => apiRequest("/lifecycle-templates"),
  createLifecycleTemplate: (tpl) => apiRequest("/lifecycle-templates", { method: "POST", body: tpl }),
  updateLifecycleTemplate: (id, tpl) => apiRequest(`/lifecycle-templates/${id}`, { method: "PUT", body: tpl }),

  // Projects
  getProjects: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/projects${q ? `?${q}` : ""}`);
  },
  getProject: (id) => apiRequest(`/projects/${id}`),
  createProject: (prj) => apiRequest("/projects", { method: "POST", body: prj }),
  advanceProjectStage: (id, payload) => apiRequest(`/projects/${id}/advance`, { method: "POST", body: payload }),

  // Physical Assets (Standalone inventory)
  getAssets: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/assets${q ? `?${q}` : ""}`);
  },
  getAsset: (id) => apiRequest(`/assets/${id}`),
  createAsset: (asset) => apiRequest("/assets", { method: "POST", body: asset }),
  updateAsset: (id, asset) => apiRequest(`/assets/${id}`, { method: "PUT", body: asset }),
  advanceAssetStage: (id, payload) => apiRequest(`/assets/${id}/advance`, { method: "POST", body: payload }),
  updateAssetPeople: (id, payload) => apiRequest(`/assets/${id}/people`, { method: "PUT", body: payload }),
  
  // Sub-Components
  addAssetComponent: (assetId, comp) => apiRequest(`/assets/${assetId}/components`, { method: "POST", body: comp }),
  updateAssetComponent: (assetId, compId, comp) => apiRequest(`/assets/${assetId}/components/${compId}`, { method: "PUT", body: comp }),
  deleteAssetComponent: (assetId, compId) => apiRequest(`/assets/${assetId}/components/${compId}`, { method: "DELETE" }),

  // Inspections & Defects
  getInspections: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/inspections${q ? `?${q}` : ""}`);
  },
  createInspection: (inspection) => apiRequest("/inspections", { method: "POST", body: inspection }),
  verifyInspection: (id, payload) => apiRequest(`/inspections/${id}/verify`, { method: "POST", body: payload }),

  // Maintenance & Work Orders
  getWorkOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/work-orders${q ? `?${q}` : ""}`);
  },
  createWorkOrder: (wo) => apiRequest("/work-orders", { method: "POST", body: wo }),
  updateWorkOrderProgress: (id, progressData) =>
    apiRequest(`/work-orders/${id}/progress`, { method: "PUT", body: progressData }),
  verifyWorkOrder: (id, verifyData) =>
    apiRequest(`/work-orders/${id}/verify`, { method: "POST", body: verifyData }),

  // Documents
  getDocuments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/documents${q ? `?${q}` : ""}`);
  },
  uploadDocument: (doc) => apiRequest("/documents", { method: "POST", body: doc }),

  // Audit
  getAuditLogs: () => apiRequest("/audit"),

  // Dashboard Stats
  getDashboardStats: () => apiRequest("/dashboard/stats"),

  // Seed / Reset
  reseedDatabase: () => apiRequest("/seed", { method: "POST" }),
};
