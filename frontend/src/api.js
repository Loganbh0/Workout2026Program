const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
const API_KEY = import.meta.env.VITE_API_KEY || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  today: (date) => request(`/today${date ? `?date=${date}` : ''}`),
  stats: () => request('/stats'),
  settings: () => request('/settings'),
  updateSettings: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  programDay: (dayNumber) => request(`/program/day/${dayNumber}`),
  prefillDay: (dayNumber) => request(`/prefill/day/${dayNumber}`),
  sessions: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/sessions${qs ? `?${qs}` : ''}`);
  },
  session: (id) => request(`/sessions/${id}`),
  createSession: (body) => request('/sessions', { method: 'POST', body: JSON.stringify(body) }),
  exercises: () => request('/exercises'),
  exerciseProgress: (name) => request(`/progress/exercise/${encodeURIComponent(name)}`),
};

// Local calendar date (YYYY-MM-DD) so day resolution matches the user's TZ.
export function localIsoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
