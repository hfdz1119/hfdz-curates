export const PORTAL_BACKGROUND_STORAGE_KEY = "hfdz-navigation:background-url";
export const PORTAL_MANAGE_BACKGROUND_STORAGE_KEY = "hfdz-navigation:manage-background-url";
export type PortalGlassStrength = "light" | "standard" | "strong";
export type PortalBackgroundConfig = { url: string; scale: number; positionX: number; positionY: number; overlay: number; imageBlur: number; glassStrength: PortalGlassStrength };
export const defaultPortalBackgroundConfig: Omit<PortalBackgroundConfig, "url"> = { scale: 100, positionX: 50, positionY: 50, overlay: 38, imageBlur: 0, glassStrength: "standard" };

export function normalizePortalImageUrl(value: string, subject = "背景图片") {
  const trimmedValue = value.trim(); if (!trimmedValue) throw new Error("请粘贴图片的 HTTPS 链接。");
  let url: URL; try { url = new URL(trimmedValue); } catch { throw new Error("链接格式不正确，请粘贴完整的图片地址。"); }
  if (url.protocol !== "https:") throw new Error(`为了安全，${subject}必须使用 HTTPS 链接。`);
  if (url.username || url.password) throw new Error(`${subject}链接不能包含账号或密码。`);
  return url.href;
}
export const normalizePortalBackgroundUrl = (value: string) => normalizePortalImageUrl(value, "背景图片");
const clamp = (value: unknown, minimum: number, maximum: number, fallback: number) => { const number = Number(value); return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback; };
export function normalizePortalBackground(value: string | Partial<PortalBackgroundConfig>): PortalBackgroundConfig {
  const source = typeof value === "string" ? { url: value } : value;
  return { url: normalizePortalBackgroundUrl(source.url ?? ""), scale: clamp(source.scale, 100, 140, 100), positionX: clamp(source.positionX, 0, 100, 50), positionY: clamp(source.positionY, 0, 100, 50), overlay: clamp(source.overlay, 0, 80, 38), imageBlur: clamp(source.imageBlur, 0, 16, 0), glassStrength: ["light", "standard", "strong"].includes(source.glassStrength ?? "") ? source.glassStrength as PortalGlassStrength : "standard" };
}
function getStorage() { try { return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage; } catch { return null; } }
function createPortalBackgroundStore(storageKey: string) { return {
  get() { const storage = getStorage(); if (!storage) return null; try { const raw = storage.getItem(storageKey); if (!raw) return null; try { return normalizePortalBackground(JSON.parse(raw)); } catch { return normalizePortalBackground(raw); } } catch { return null; } },
  set(value: string | Partial<PortalBackgroundConfig>) { const normalized = normalizePortalBackground(value); const storage = getStorage(); if (!storage) throw new Error("当前浏览器无法保存背景设置。"); storage.setItem(storageKey, JSON.stringify(normalized)); return normalized; },
  clear() { getStorage()?.removeItem(storageKey); },
}; }
export const portalBackgroundStore = createPortalBackgroundStore(PORTAL_BACKGROUND_STORAGE_KEY);
export const portalManageBackgroundStore = createPortalBackgroundStore(PORTAL_MANAGE_BACKGROUND_STORAGE_KEY);
