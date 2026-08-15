import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PORTAL_PALETTE, portalPalettes } from "../data/portalPalettes";
import { PORTAL_PALETTE_STORAGE_KEY, portalPaletteStore } from "./portalPalette";

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
});

describe("portalPaletteStore", () => {
  beforeEach(() => storage.clear());

  it("matches the four HFDZ portfolio palettes", () => {
    expect(portalPalettes).toEqual([
      { id: "aurora", label: "Aurora", colors: ["#4F9DFF", "#8B5CFF", "#4DE1C1"] },
      { id: "sakura", label: "Sakura", colors: ["#FF86B7", "#C86CFF", "#FFB08B"] },
      { id: "lavender", label: "Lavender", colors: ["#8798FF", "#B06CFF", "#73E4D4"] },
      { id: "sunset", label: "Sunset", colors: ["#FF8A65", "#E85D9E", "#FFD166"] },
    ]);
    expect(new Set(portalPalettes.map((palette) => palette.id)).size).toBe(4);
  });

  it("persists a valid browser-local palette", () => {
    expect(portalPaletteStore.set("sakura")).toBe("sakura");
    expect(storage.get(PORTAL_PALETTE_STORAGE_KEY)).toBe("sakura");
    expect(portalPaletteStore.get()).toBe("sakura");
  });

  it("falls back to Aurora for missing or invalid stored values", () => {
    expect(portalPaletteStore.get()).toBe(DEFAULT_PORTAL_PALETTE);
    storage.set(PORTAL_PALETTE_STORAGE_KEY, "unknown");
    expect(portalPaletteStore.get()).toBe(DEFAULT_PORTAL_PALETTE);
  });
});
