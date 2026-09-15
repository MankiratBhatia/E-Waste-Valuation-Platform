const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API error');
  }
  return res.json();
}

export const getDashboard = () => api('/dashboard');
export const getSuppliers = (adminKey) => api('/supplier', { headers: { 'X-API-Key': adminKey } });
export const getSupplier = (id) => api(`/supplier/${id}`);
export const createSupplier = (name) => api('/supplier', { method: 'POST', body: { name } });
export const submitBatch = (payload) => api('/batch/submit', { method: 'POST', body: payload });
export const getBatch = (id) => api(`/batch/${id}`);
export const submitFeedback = (payload) => api('/feedback', { method: 'POST', body: payload });
export const updateBatchStatus = (id, newStatus) =>
  api(`/batch/${id}/status`, { method: 'PATCH', body: { status: newStatus } });
