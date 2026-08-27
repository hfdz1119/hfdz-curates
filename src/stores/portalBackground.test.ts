import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePortalBackground, normalizePortalBackgroundUrl, PORTAL_BACKGROUND_STORAGE_KEY, PORTAL_MANAGE_BACKGROUND_STORAGE_KEY, portalBackgroundStore, portalManageBackgroundStore } from "./portalBackground";

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
});

describe("portalBackgroundStore", () => {
  beforeEach(() => storage.clear());

  it("accepts and normalizes HTTPS image URLs", () => {
    expect(normalizePortalBackgroundUrl("  https://image.hfdz1119.top/r/home.webp?size=large  ")).toBe("https://image.hfdz1119.top/r/home.webp?size=large");
  });

  it("rejects insecure, invalid, and credential-bearing URLs", () => {
    expect(() => normalizePortalBackgroundUrl("not-a-url")).toThrow("链接格式不正确");
    expect(() => normalizePortalBackgroundUrl("http://image.hfdz1119.top/home.webp")).toThrow("HTTPS");
    expect(() => normalizePortalBackgroundUrl("https://user:secret@example.com/home.webp")).toThrow("账号或密码");
  });

  it("stores one browser-local override and clears it", () => {
    const config = portalBackgroundStore.set("https://image.hfdz1119.top/r/home.webp");
    expect(JSON.parse(storage.get(PORTAL_BACKGROUND_STORAGE_KEY)!)).toEqual(config);
    expect(portalBackgroundStore.get()).toEqual(config);
    portalBackgroundStore.clear();
    expect(portalBackgroundStore.get()).toBeNull();
  });

  it("ignores an invalid value already present in storage", () => {
    storage.set(PORTAL_BACKGROUND_STORAGE_KEY, "javascript:alert(1)");
    expect(portalBackgroundStore.get()).toBeNull();
  });

  it("keeps home and management backgrounds independent", () => {
    portalBackgroundStore.set("https://image.hfdz1119.top/r/home.webp");
    portalManageBackgroundStore.set("https://image.hfdz1119.top/r/manage.webp");
    expect(storage.get(PORTAL_BACKGROUND_STORAGE_KEY)).toContain("home.webp");
    expect(storage.get(PORTAL_MANAGE_BACKGROUND_STORAGE_KEY)).toContain("manage.webp");
    portalManageBackgroundStore.clear();
    expect(portalBackgroundStore.get()?.url).toContain("home.webp");
    expect(portalManageBackgroundStore.get()).toBeNull();
  });

  it("migrates old URL strings and clamps detailed settings", () => {
    storage.set(PORTAL_BACKGROUND_STORAGE_KEY, "https://image.hfdz1119.top/old.webp");
    expect(portalBackgroundStore.get()).toEqual({ url: "https://image.hfdz1119.top/old.webp", scale: 100, positionX: 50, positionY: 50, overlay: 38, imageBlur: 0, glassStrength: "standard" });
    expect(normalizePortalBackground({ url: "https://image.hfdz1119.top/new.webp", scale: 999, positionX: -20, positionY: 120, overlay: 90, imageBlur: 30, glassStrength: "strong" })).toMatchObject({ scale: 140, positionX: 0, positionY: 100, overlay: 80, imageBlur: 16, glassStrength: "strong" });
  });
});
