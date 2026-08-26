import { describe, expect, it } from "vitest";
import { createBackup, migrateCatalog, reorderSites, validateBackup } from "./catalogV2.js";

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

describe("portal backup", () => {
  const config = migrateCatalog({ version: 1, sites: [
    { id: "a", name: "A", description: "Alpha", url: "https://a.example/", category: "我的网页", emphasis: "standard", access: "public", pinned: true, order: 4 },
    { id: "b", name: "B", description: "Beta", url: "https://b.example/", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 2 },
  ] });

  it("round-trips a complete v2 configuration", () => {
    const restored = validateBackup(createBackup(config));
    expect(restored.sites.map((site) => site.hostname)).toEqual(["a.example", "b.example"]);
    expect(restored.sites.map(({ hostname: _hostname, ...site }) => site)).toEqual(config.sites);
  });

  it("rejects duplicate URLs without changing their stable ids", () => {
    const backup = createBackup(config);
    backup.portalConfig.sites[1].url = "https://a.example";
    expect(() => validateBackup(backup)).toThrow("重复的网站地址");
  });

  it("rejects a folder assigned across categories", () => {
    const backup = createBackup(config);
    backup.portalConfig.folders = [{ id: "folder-a", name: "A", categoryId: "missing", order: 0 }];
    expect(() => validateBackup(backup)).toThrow("有效分类");
  });
});

describe("portal site ordering", () => {
  const config = migrateCatalog({ version: 1, sites: [
    { id: "p1", name: "P1", url: "https://p1.example/", pinned: true, order: 0 },
    { id: "p2", name: "P2", url: "https://p2.example/", pinned: true, order: 1 },
    { id: "r1", name: "R1", url: "https://r1.example/", pinned: false, order: 0 },
  ] });

  it("assigns contiguous order within pinned and regular groups", () => {
    const next = reorderSites(config, { pinnedIds: ["p2", "p1"], regularIds: ["r1"] });
    expect(next.sites.map(({ id, order }) => ({ id, order }))).toEqual([{ id: "p1", order: 1 }, { id: "p2", order: 0 }, { id: "r1", order: 0 }]);
  });

  it("rejects attempts to move a regular site into the pinned group", () => {
    expect(() => reorderSites(config, { pinnedIds: ["p2", "r1"], regularIds: ["p1"] })).toThrow("置顶状态");
  });
});
