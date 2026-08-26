import type { ManagedPortalSite } from "../data/portalSites";

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
  publicSites: () => request<{ sites: ManagedPortalSite[] }>("/api/sites"),
  session: () => request<{ authenticated: boolean }>("/api/admin/session"),
  login: (password: string) => request<{ authenticated: boolean }>("/api/admin/session", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request<{ authenticated: boolean }>("/api/admin/session", { method: "DELETE" }),
  sites: () => request<{ sites: ManagedPortalSite[] }>("/api/admin/sites"),
  create: (site: Omit<ManagedPortalSite, "id" | "hostname" | "order">) => request<{ site: ManagedPortalSite }>("/api/admin/sites", { method: "POST", body: JSON.stringify(site) }),
  update: (site: ManagedPortalSite) => request<{ site: ManagedPortalSite }>("/api/admin/sites", { method: "PUT", body: JSON.stringify(site) }),
  remove: (id: string) => request<{ success: true }>(`/api/admin/sites?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
};
