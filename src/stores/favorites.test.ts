import { beforeEach, describe, expect, it, vi } from "vitest";
import { favoritesStore } from "./favorites";

const storage = new Map<string, string>();
vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });

describe("favoritesStore", () => {
  beforeEach(() => storage.clear());
  it("toggles and exports favorites", () => { expect(favoritesStore.toggle("github")).toEqual(["github"]); expect(JSON.parse(favoritesStore.export())).toEqual({ version: 1, resourceIds: ["github"] }); });
  it("imports only valid ids and merges without replacing", () => { favoritesStore.toggle("cloudflare"); expect(favoritesStore.import('{"version":1,"resourceIds":["github","unknown"]}', new Set(["github", "cloudflare"]))).toEqual(["cloudflare", "github"]); });
});
