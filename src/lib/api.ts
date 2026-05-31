type ApiError = {
  error?: string;
  message?: string;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
const ADMIN_TOKEN_KEY = 'studio_aruo_admin_token';

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function parseJsonSafely(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(getAdminToken() ? { Authorization: `Bearer ${getAdminToken()}` } : {}),
      ...(headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!res.ok) {
    const data = (await parseJsonSafely(res)) as ApiError | string | null;
    const msg =
      typeof data === 'string'
        ? data
        : data?.message || data?.error || `HTTP_${res.status}`;
    throw new Error(msg);
  }

  return (await parseJsonSafely(res)) as T;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, json: unknown) {
  return apiRequest<T>(path, { method: 'POST', json });
}

export function apiPut<T>(path: string, json: unknown) {
  return apiRequest<T>(path, { method: 'PUT', json });
}

export function apiDelete<T>(path: string) {
  return apiRequest<T>(path, { method: 'DELETE' });
}
