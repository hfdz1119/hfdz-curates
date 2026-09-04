export const PORTAL_HOME_PREFERENCES_KEY = "hfdz-navigation:home-preferences";
export type PortalHomePreferences = {
  theme: "system" | "light" | "dark";
  accent: "aurora" | "sakura" | "lavender" | "sunset";
  iconSize: number;
  iconRadius: number;
  iconGap: number;
  cardOpacity: number;
  backgroundOverlay: number;
  backgroundBlur: number;
  clockEnabled: boolean;
  dateEnabled: boolean;
  weatherEnabled: boolean;
  searchEngine: "bing" | "baidu" | "google";
  sidebarVisible: boolean;
  showNames: boolean;
  showDescriptions: boolean;
  density: "compact" | "comfortable";
  dynamicWallpaperEnabled: boolean;
  background?: { type: "image" | "video"; url: string; poster?: string };
};
export const defaultPortalHomePreferences: PortalHomePreferences = { theme: "system", accent: "aurora", iconSize: 42, iconRadius: 14, iconGap: 12, cardOpacity: 70, backgroundOverlay: 30, backgroundBlur: 0, clockEnabled: true, dateEnabled: true, weatherEnabled: false, searchEngine: "bing", sidebarVisible: true, showNames: true, showDescriptions: true, density: "comfortable", dynamicWallpaperEnabled: false };
const accents = ["aurora", "sakura", "lavender", "sunset"];
const engines = ["bing", "baidu", "google"];
const clamp = (value: unknown, min: number, max: number, fallback: number) => { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; };
let memoryPreferences: PortalHomePreferences | null = null;
function storage() { try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; } }
export function normalizePortalHomePreferences(input: unknown): PortalHomePreferences {
  const source = input && typeof input === "object" ? input as Partial<PortalHomePreferences> : {};
  const background = source.background && typeof source.background === "object" && typeof source.background.url === "string" ? { type: source.background.type === "video" ? "video" as const : "image" as const, url: source.background.url.trim(), ...(typeof source.background.poster === "string" && source.background.poster.trim() ? { poster: source.background.poster.trim() } : {}) } : undefined;
  return { ...defaultPortalHomePreferences, ...source, theme: ["system", "light", "dark"].includes(source.theme ?? "") ? source.theme! : "system", accent: accents.includes(source.accent ?? "") ? source.accent as PortalHomePreferences["accent"] : "aurora", searchEngine: engines.includes(source.searchEngine ?? "") ? source.searchEngine as PortalHomePreferences["searchEngine"] : "bing", iconSize: clamp(source.iconSize, 28, 72, 42), iconRadius: clamp(source.iconRadius, 0, 28, 14), iconGap: clamp(source.iconGap, 6, 28, 12), cardOpacity: clamp(source.cardOpacity, 35, 95, 70), backgroundOverlay: clamp(source.backgroundOverlay, 0, 80, 30), backgroundBlur: clamp(source.backgroundBlur, 0, 18, 0), clockEnabled: source.clockEnabled !== false, dateEnabled: source.dateEnabled !== false, weatherEnabled: source.weatherEnabled === true, sidebarVisible: source.sidebarVisible !== false, showNames: source.showNames !== false, showDescriptions: source.showDescriptions !== false, density: source.density === "compact" ? "compact" : "comfortable", dynamicWallpaperEnabled: source.dynamicWallpaperEnabled === true, ...(background ? { background } : {}) };
}
export const portalHomePreferencesStore = { get() { try { const raw = storage()?.getItem(PORTAL_HOME_PREFERENCES_KEY); return raw ? normalizePortalHomePreferences(JSON.parse(raw)) : memoryPreferences ?? defaultPortalHomePreferences; } catch { return memoryPreferences ?? defaultPortalHomePreferences; } }, set(input: Partial<PortalHomePreferences>) { const next = normalizePortalHomePreferences({ ...this.get(), ...input }); memoryPreferences = next; try { storage()?.setItem(PORTAL_HOME_PREFERENCES_KEY, JSON.stringify(next)); } catch { /* preferences remain active for this session */ } return next; }, exportJson() { return JSON.stringify(this.get(), null, 2); }, importJson(raw: string) { const next = normalizePortalHomePreferences(JSON.parse(raw)); memoryPreferences = next; try { storage()?.setItem(PORTAL_HOME_PREFERENCES_KEY, JSON.stringify(next)); } catch { /* ignore unavailable storage */ } return next; } };
