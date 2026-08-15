import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePortalBackgroundUrl, PORTAL_BACKGROUND_STORAGE_KEY, portalBackgroundStore } from "./portalBackground";

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
    const url = portalBackgroundStore.set("https://image.hfdz1119.top/r/home.webp");
    expect(storage.get(PORTAL_BACKGROUND_STORAGE_KEY)).toBe(url);
    expect(portalBackgroundStore.get()).toBe(url);
    portalBackgroundStore.clear();
    expect(portalBackgroundStore.get()).toBeNull();
  });

  it("ignores an invalid value already present in storage", () => {
    storage.set(PORTAL_BACKGROUND_STORAGE_KEY, "javascript:alert(1)");
    expect(portalBackgroundStore.get()).toBeNull();
  });
});
