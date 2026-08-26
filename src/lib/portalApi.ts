import type { ManagedPortalSite, PortalConfig } from "../data/portalSites";

type ApiError = Error & { status?: number };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error ?? "请求没有完成。") as ApiError;
    error.status = response.status;
    throw error;
  }
  return body as T;
}

export const portalApi = {
  publicSites: () => request<PortalConfig>("/api/sites").then((value) => {
    if (!isPortalConfig(value)) throw new Error("首页配置响应格式不正确。");
    return value;
  }),
  session: () => request<{ authenticated: boolean }>("/api/admin/session"),
  login: (password: string) => request<{ authenticated: boolean }>("/api/admin/session", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request<{ authenticated: boolean }>("/api/admin/session", { method: "DELETE" }),
  sites: () => request<PortalConfig>("/api/admin/sites"),
  create: (site: Omit<ManagedPortalSite, "id" | "hostname" | "order">) => request<{ site: ManagedPortalSite }>("/api/admin/sites", { method: "POST", body: JSON.stringify(site) }),
  update: (site: ManagedPortalSite) => request<{ site: ManagedPortalSite }>("/api/admin/sites", { method: "PUT", body: JSON.stringify(site) }),
  remove: (id: string) => request<{ success: true }>(`/api/admin/sites?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
  saveConfig: (config: Pick<PortalConfig, "categories" | "folders" | "settings">) => request<PortalConfig>("/api/admin/config", { method: "PUT", body: JSON.stringify(config) }),
  weather: (latitude: number, longitude: number, city: string) => request<WeatherResponse>(`/api/weather?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&city=${encodeURIComponent(city)}`).then((value) => {
    if (!isWeatherResponse(value)) throw new Error("天气响应格式不正确。");
    return value;
  }),
};

export type WeatherResponse = { location: string; current: { temperature: number; apparentTemperature: number; weatherCode: number }; forecast: Array<{ date: string; maximum: number; minimum: number; weatherCode: number }> };

export function isWeatherResponse(value: unknown): value is WeatherResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WeatherResponse>;
  return typeof candidate.location === "string" && typeof candidate.current?.temperature === "number" && typeof candidate.current.apparentTemperature === "number" && typeof candidate.current.weatherCode === "number" && Array.isArray(candidate.forecast);
}

function isPortalConfig(value: unknown): value is PortalConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PortalConfig>;
  return candidate.version === 2 && Array.isArray(candidate.sites) && Array.isArray(candidate.categories) && Array.isArray(candidate.folders) && Boolean(candidate.settings);
}
