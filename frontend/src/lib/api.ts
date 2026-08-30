const API_URL = import.meta.env.VITE_API_URL || "http://localhost:1001";
const TOKEN_KEY = "twoppals_token";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response, path: string): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    if (window.location.pathname !== "/login") window.location.href = "/login";
    throw new Error("Sesi login sudah berakhir, silakan login ulang");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}: ${path}`);
  }
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, { headers: { ...authHeaders() } });
  return handleResponse<T>(res, path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, path);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, path);
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
    return undefined as T;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}: ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Business { code: string; name: string; icon: string | null; }