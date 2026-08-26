import { describe, expect, it } from "vitest";
import { migrateCatalog } from "./catalogV2.js";

describe("portal catalog v2 migration", () => {
  it("keeps every legacy site and its stable fields", () => {
    const legacy = { version: 1, sites: [
      { id: "a", name: "A", url: "https://a.example/", iconUrl: "https://a.example/icon.png", order: 8, pinned: true },
      { id: "b", name: "B", url: "https://b.example/", order: 2, pinned: false },
    ] };
    const config = migrateCatalog(legacy);
    expect(config.version).toBe(2);
    expect(config.sites).toHaveLength(2);
    expect(config.sites.map(({ id, url, iconUrl, order, pinned }) => ({ id, url, iconUrl, order, pinned }))).toEqual(legacy.sites.map(({ id, url, iconUrl, order, pinned }) => ({ id, url, iconUrl, order, pinned })));
    expect(config.sites.every((site) => site.categoryId === "category-default")).toBe(true);
  });
});
