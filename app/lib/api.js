// Central API configuration. Set NEXT_PUBLIC_API_URL to point at the backend,
// otherwise the local development API is used.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5077';

export const API = rawApiUrl.replace(/\/$/, '');

export function apiUrl(path) {
  if (!path) return API;
  return `${API}${path.startsWith('/') ? path : `/${path}`}`;
}
