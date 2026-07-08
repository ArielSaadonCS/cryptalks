const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "cryptalks_token";

export interface User {
  id: number;
  name: string;
  email: string;
  onboardingCompleted: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Preferences {
  assets: string[];
  investorType: string;
  contentTypes: string[];
  riskLevel: string;
  onboardingCompleted: boolean;
}

export interface PreferencesInput {
  assets: string[];
  investorType: string;
  contentTypes: string[];
  riskLevel: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item: { msg?: string }) => (item.msg ?? "").replace(/^Value error,\s*/, ""))
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    // response body was not JSON
  }
  return "Something went wrong. Please try again.";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    throw new ApiError(await extractErrorMessage(response), response.status);
  }

  return response.json() as Promise<T>;
}

export function signup(name: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getMe(): Promise<User> {
  return request<User>("/auth/me");
}

export function getPreferences(): Promise<Preferences> {
  return request<Preferences>("/preferences/me");
}

export function savePreferences(preferences: PreferencesInput): Promise<Preferences> {
  return request<Preferences>("/preferences/me", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
}
