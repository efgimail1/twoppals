import { apiPost } from "./api";

const TOKEN_KEY = "twoppals_token";

interface LoginResponse { access_token: string; token_type: string; }

export async function login(email: string, password: string): Promise<void> {
  const res = await apiPost<LoginResponse>("/core/auth/login", { email, password });
  localStorage.setItem(TOKEN_KEY, res.access_token);
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}