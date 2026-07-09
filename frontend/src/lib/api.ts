// Cryptalks API client — preserves backend contract exactly.
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

export interface MarketNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  relatedAssets: string[];
  url: string | null;
  isFallback: boolean;
}

export interface CoinPriceItem {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  isFallback: boolean;
  source: string;
}

export interface AIInsightItem {
  id: string;
  title: string;
  content: string;
  source: string;
  isFallback: boolean;
}

export interface MemeItem {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  source: string;
  isFallback: boolean;
}

export interface DashboardData {
  marketNews: MarketNewsItem[];
  coinPrices: CoinPriceItem[];
  aiInsight: AIInsightItem;
  meme: MemeItem;
}

export type SectionType = "MARKET_NEWS" | "COIN_PRICE" | "AI_INSIGHT" | "MEME";
export type Vote = "UP" | "DOWN";

export interface FeedbackInput {
  sectionType: SectionType;
  itemId: string;
  vote: Vote;
}

export interface Feedback {
  id: number;
  sectionType: SectionType;
  itemId: string;
  vote: Vote;
  createdAt: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item: { msg?: string }) => (item.msg ?? "").replace(/^Value error,\s*/, ""))
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    // no JSON
  }
  return "Something went wrong. Please try again.";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  if (!response.ok) throw new ApiError(await extractErrorMessage(response), response.status);
  return response.json() as Promise<T>;
}

export const signup = (name: string, email: string, password: string) =>
  request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) });

export const login = (email: string, password: string) =>
  request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const getMe = () => request<User>("/auth/me");
export const getPreferences = () => request<Preferences>("/preferences/me");
export const savePreferences = (p: PreferencesInput) =>
  request<Preferences>("/preferences/me", { method: "PUT", body: JSON.stringify(p) });
export const getDashboardToday = () => request<DashboardData>("/dashboard/today");
export const submitFeedback = (data: FeedbackInput) =>
  request<Feedback>("/feedback", { method: "POST", body: JSON.stringify(data) });
export const getMyFeedback = () => request<Feedback[]>("/feedback/me");
