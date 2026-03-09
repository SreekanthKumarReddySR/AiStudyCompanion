const rawApiUrl = (process.env.REACT_APP_API_URL || '/api').trim();

function normalizeApiBase(url) {
  if (!url) return '/api';
  const trimmed = url.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
  }
  return trimmed || '/api';
}
 
export const API_BASE = normalizeApiBase(rawApiUrl);
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/i, '');

// helper to make POST requests with optional token/header
async function parseResponse(res) {
  if (!res.ok) {
    const raw = await res.text();
    let message = raw || res.statusText;
    try {
      const parsed = JSON.parse(raw);
      message = parsed.message || message;
    } catch (_e) {
      // Keep text response when body is not JSON.
    }
    throw new Error(message);
  }
  return res.json();
}

async function post(path, data, token, isForm = false) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';
  const body = isForm ? data : JSON.stringify(data);
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body });
  return parseResponse(res);
}

async function get(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'GET', headers });
  return parseResponse(res);
}

async function del(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  return parseResponse(res);
}

export const signup = (email, password, name) => post('/auth/signup', { email, password, name });
export const login = (email, password) => post('/auth/login', { email, password });

export const uploadDocument = (file, token, folder = 'General', onProgress) => {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/docs/upload`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      if (typeof onProgress === 'function') {
        onProgress(percent);
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed.'));
    xhr.onload = () => {
      const raw = xhr.responseText || '';
      let parsed = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch (_err) {
        parsed = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed);
      } else {
        reject(new Error(parsed.message || raw || `Upload failed (${xhr.status})`));
      }
    };
    xhr.send(form);
  });
};
export const listDocuments = (token) => get('/docs', token);
export const getDocument = (docId, token) => get(`/docs/${docId}`, token);
export const getChunks = (docId, token) => get(`/docs/${docId}/chunks`, token);
export const deleteDocument = (docId, token) => del(`/docs/${docId}`, token);

export const queryChat = (query, docId, token, history = []) => post('/chat/query', { query, docId, history }, token);
export const summarize = (docId, token) => post('/chat/summary', { docId }, token);
export const getAnalytics = (token) => get('/analytics', token);
export const incrementAnalytics = (metrics, token) => post('/analytics/increment', metrics || {}, token);
