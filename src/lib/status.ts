export type ServiceStatus = "operational" | "degraded" | "down" | "planned" | "access_protected";
export type Service = { id: string; name: string; visibility: string; status: ServiceStatus; checkedAt: string | null; latencyMs: number | null };

export async function loadServices(signal?: AbortSignal): Promise<Service[]> {
  const response = await fetch("https://status.hfdz1119.top/api/services", { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Status API unavailable");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { services?: unknown }).services)) throw new Error("Invalid status API payload");
  return (payload as { services: Service[] }).services;
}
