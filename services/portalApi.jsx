/**
 * PORTABLE API CLIENT ABSTRACTION LAYER
 * ======================================
 * This module provides a backend-agnostic API client that mirrors
 * the Base44 SDK interface but routes through a standard REST API.
 * 
 * MIGRATION STATUS: This is the canonical API layer for the Client Portal.
 * All portal components should import from here instead of @/api/base44Client.
 * 
 * MODES:
 *   - 'base44'  → bridges to the Base44 SDK (current, for Base44-hosted environment)
 *   - 'rest'    → calls your own REST API at api.pacificengineeringsf.com
 * 
 * USAGE:
 *   import { portalApi } from '@/components/services/portalApi';
 *   const user = await portalApi.auth.me();
 *   const projects = await portalApi.entities.Project.filter({ client_email: user.email });
 */

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------
const API_MODE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_MODE) || 'base44';
const REST_API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REST_API_URL) || 'https://api.pacificengineeringsf.com';

// ---------------------------------------------------------------------------
// REST adapter (used when API_MODE === 'rest')
// ---------------------------------------------------------------------------
function getAuthHeaders() {
  const token = localStorage.getItem('pe_auth_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function restFetch(path, options = {}) {
  const url = `${REST_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || body.message || `API ${res.status}`);
    err.statusCode = res.status;
    throw err;
  }
  return res.json();
}

function createRestEntityProxy(entityName) {
  const base = `/api/entities/${entityName}`;
  return {
    list: (sort, limit) =>
      restFetch(`${base}?${new URLSearchParams({ ...(sort ? { sort } : {}), ...(limit ? { limit } : {}) })}`),
    filter: (filters, sort, limit) =>
      restFetch(`${base}/filter`, {
        method: 'POST',
        body: JSON.stringify({ filters, sort, limit }),
      }),
    get: (id) => restFetch(`${base}/${id}`),
    create: (data) => restFetch(base, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => restFetch(`${base}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => restFetch(`${base}/${id}`, { method: 'DELETE' }),
    bulkCreate: (data) => restFetch(`${base}/bulk`, { method: 'POST', body: JSON.stringify(data) }),
  };
}

const restAuth = {
  isAuthenticated: async () => {
    try { await restFetch('/api/auth/me'); return true; } catch { return false; }
  },
  me: () => restFetch('/api/auth/me'),
  updateMe: (data) => restFetch('/api/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  logout: (redirectUrl) => {
    localStorage.removeItem('pe_auth_token');
    window.location.href = redirectUrl || '/login';
  },
  redirectToLogin: (nextUrl) => {
    window.location.href = `/login${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''}`;
  },
};

const restIntegrations = {
  Core: {
    InvokeLLM: (params) => restFetch('/api/integrations/llm', { method: 'POST', body: JSON.stringify(params) }),
    GenerateImage: (params) => restFetch('/api/integrations/generate-image', { method: 'POST', body: JSON.stringify(params) }),
    SendEmail: (params) => restFetch('/api/integrations/send-email', { method: 'POST', body: JSON.stringify(params) }),
    UploadFile: (params) => {
      const formData = new FormData();
      formData.append('file', params.file);
      return restFetch('/api/integrations/upload', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': undefined },
        body: formData,
      });
    },
    UploadPrivateFile: (params) => {
      const formData = new FormData();
      formData.append('file', params.file);
      return restFetch('/api/integrations/upload-private', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': undefined },
        body: formData,
      });
    },
    CreateFileSignedUrl: (params) => restFetch('/api/integrations/signed-url', { method: 'POST', body: JSON.stringify(params) }),
    ExtractDataFromUploadedFile: (params) => restFetch('/api/integrations/extract-data', { method: 'POST', body: JSON.stringify(params) }),
  },
};

const restFunctions = {
  invoke: (functionName, params) =>
    restFetch(`/api/functions/${functionName}`, { method: 'POST', body: JSON.stringify(params) }),
};

const restAnalytics = {
  track: (params) => {
    // Fire-and-forget
    restFetch('/api/analytics/track', { method: 'POST', body: JSON.stringify(params) }).catch(() => {});
  },
};

// ---------------------------------------------------------------------------
// Base44 bridge adapter (used when API_MODE === 'base44')
// ---------------------------------------------------------------------------
let base44Bridge = null;

function getBase44() {
  if (!base44Bridge) {
    // Lazy-load to avoid import errors when running outside Base44
    try {
      const mod = require('@/api/base44Client');
      base44Bridge = mod.base44;
    } catch {
      // Dynamic import fallback
      base44Bridge = null;
    }
  }
  return base44Bridge;
}

// For static import during Base44 environment — tree-shaken when mode is 'rest'
import { base44 } from '@/api/base44Client';

function createBase44EntityProxy(entityName) {
  return {
    list: (sort, limit) => base44.entities[entityName].list(sort, limit),
    filter: (filters, sort, limit) => base44.entities[entityName].filter(filters, sort, limit),
    get: (id) => base44.entities[entityName].get
      ? base44.entities[entityName].get(id)
      : base44.entities[entityName].filter({ id }),
    create: (data) => base44.entities[entityName].create(data),
    update: (id, data) => base44.entities[entityName].update(id, data),
    delete: (id) => base44.entities[entityName].delete(id),
    bulkCreate: (data) => base44.entities[entityName].bulkCreate
      ? base44.entities[entityName].bulkCreate(data)
      : Promise.all(data.map(d => base44.entities[entityName].create(d))),
    subscribe: (callback) => base44.entities[entityName].subscribe
      ? base44.entities[entityName].subscribe(callback)
      : () => {},
    schema: () => base44.entities[entityName].schema
      ? base44.entities[entityName].schema()
      : Promise.resolve({}),
  };
}

const base44Auth = {
  isAuthenticated: () => base44.auth.isAuthenticated(),
  me: () => base44.auth.me(),
  updateMe: (data) => base44.auth.updateMe(data),
  logout: (redirectUrl) => base44.auth.logout(redirectUrl),
  redirectToLogin: (nextUrl) => base44.auth.redirectToLogin(nextUrl),
};

const base44Integrations = {
  Core: {
    InvokeLLM: (params) => base44.integrations.Core.InvokeLLM(params),
    GenerateImage: (params) => base44.integrations.Core.GenerateImage(params),
    SendEmail: (params) => base44.integrations.Core.SendEmail(params),
    UploadFile: (params) => base44.integrations.Core.UploadFile(params),
    UploadPrivateFile: (params) => base44.integrations.Core.UploadPrivateFile(params),
    CreateFileSignedUrl: (params) => base44.integrations.Core.CreateFileSignedUrl(params),
    ExtractDataFromUploadedFile: (params) => base44.integrations.Core.ExtractDataFromUploadedFile(params),
  },
};

const base44Functions = {
  invoke: (functionName, params) => base44.functions.invoke(functionName, params),
};

const base44Analytics = {
  track: (params) => base44.analytics ? base44.analytics.track(params) : undefined,
};

// ---------------------------------------------------------------------------
// Unified portalApi — switches implementation based on API_MODE
// ---------------------------------------------------------------------------
const isRest = API_MODE === 'rest';

const entitiesProxy = new Proxy({}, {
  get: (_target, prop) =>
    isRest ? createRestEntityProxy(prop) : createBase44EntityProxy(prop),
});

const portalApiInstance = {
  auth: isRest ? restAuth : base44Auth,
  entities: entitiesProxy,
  integrations: isRest ? restIntegrations : base44Integrations,
  functions: isRest ? restFunctions : base44Functions,
  analytics: isRest ? restAnalytics : base44Analytics,

  // Utility: current mode
  getMode: () => API_MODE,
  getApiUrl: () => REST_API_URL,
};

export const portalApi = portalApiInstance;
export default portalApi;