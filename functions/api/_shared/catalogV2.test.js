import { describe, expect, it } from "vitest";
import { bulkMoveSites, createBackup, deleteEmptyCategory, deleteEmptyFolder, filterPublicConfig, migrateCatalog, reorderCategories, reorderSites, validateBackup, validatePublicConfig } from "./catalogV2.js";

describe("portal catalog v2 migration", () => {
  it("keeps every legacy site and its stable fields", () => {
    const legacy = { version: 1, sites: [
      { id: "a", name: "A", url: "https://a.example/", iconUrl: "https://a.example/icon.png", order: 8, pinned: true },
      { id: "b", name: "B", url: "https://b.example/", order: 2, pinned: false },
    ] };
    const config = migrateCatalog(legacy);
    expect(config.version).toBe(3);
    expect(config.sites).toHaveLength(2);
    expect(config.sites.map(({ id, url, iconUrl, order, pinned }) => ({ id, url, iconUrl, order, pinned }))).toEqual(legacy.sites.map(({ id, url, iconUrl, order, pinned }) => ({ id, url, iconUrl, order, pinned })));
    expect(config.sites.every((site) => site.categoryId === "category-default")).toBe(true);
    expect(config.sites.every((site) => site.visibility === "public")).toBe(true);
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

  it("preserves private fields in new backups and accepts legacy backups", () => {
    const privateConfig = { ...config, sites: config.sites.map((site, index) => ({ ...site, visibility: index ? "public" : "private" })), categories: config.categories.map((category) => ({ ...category, visibility: "private" })) };
    const backup = createBackup(privateConfig);
    expect(backup.backupVersion).toBe(2);
    expect(validateBackup(backup).sites[0].visibility).toBe("private");
    const legacy = { ...backup, backupVersion: 1, portalConfig: { ...backup.portalConfig, version: 2, sites: backup.portalConfig.sites.map(({ visibility: _visibility, ...site }) => site), categories: backup.portalConfig.categories.map(({ visibility: _visibility, ...category }) => category) } };
    expect(validateBackup(legacy).sites.every((site) => site.visibility === "public")).toBe(true);
  });

  it("round-trips an optional global brand icon", () => {
    const branded = { ...config, settings: { ...config.settings, brandIconUrl: "https://image.example/hfdz.png" } };
    expect(validateBackup(createBackup(branded)).settings.brandIconUrl).toBe("https://image.example/hfdz.png");
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

describe("portal public settings", () => {
  const current = migrateCatalog(null);

  it("accepts a secure brand icon and keeps v2 settings backwards compatible", () => {
    expect(validatePublicConfig({ settings: { ...current.settings, brandIconUrl: "https://image.example/icon.png" } }, current).settings.brandIconUrl).toBe("https://image.example/icon.png");
    expect(validatePublicConfig({ settings: current.settings }, current).settings.brandIconUrl).toBeUndefined();
  });

  it("rejects insecure and credential-bearing brand icons", () => {
    expect(() => validatePublicConfig({ settings: { ...current.settings, brandIconUrl: "http://image.example/icon.png" } }, current)).toThrow("HTTPS");
    expect(() => validatePublicConfig({ settings: { ...current.settings, brandIconUrl: "https://user:secret@image.example/icon.png" } }, current)).toThrow("HTTPS");
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

describe("portal category and folder actions", () => {
  const config = {
    ...migrateCatalog(null),
    categories: [
      { id: "a", name: "A", order: 0, hidden: false, palette: "aurora", visibility: "public" },
      { id: "b", name: "B", order: 1, hidden: true, palette: "sakura", visibility: "public" },
      { id: "c", name: "C", order: 2, hidden: false, palette: "lavender", visibility: "public" },
    ],
    folders: [
      { id: "empty", name: "Empty", categoryId: "a", order: 1 },
      { id: "used", name: "Used", categoryId: "a", order: 4 },
    ],
    sites: [{ ...migrateCatalog(null).sites[0], categoryId: "a", category: "A", folderId: "used" }],
  };

  it("assigns a complete contiguous category order", () => {
    expect(reorderCategories(config, { categoryIds: ["c", "b", "a"] }).categories.map(({ id, order }) => ({ id, order }))).toEqual([
      { id: "a", order: 2 }, { id: "b", order: 1 }, { id: "c", order: 0 },
    ]);
    expect(() => reorderCategories(config, { categoryIds: ["a", "c"] })).toThrow("当前分类不一致");
  });

  it("deletes only empty folders and normalizes the remaining order", () => {
    expect(deleteEmptyFolder(config, "empty").folders).toEqual([{ id: "used", name: "Used", categoryId: "a", order: 0 }]);
    expect(() => deleteEmptyFolder(config, "used")).toThrow("仍有网站");
  });
});

describe("portal privacy and bulk actions", () => {
  const base = migrateCatalog(null);
  const config = { ...base, categories: [{ ...base.categories[0], id: "public" }, { ...base.categories[0], id: "private", name: "Secret", visibility: "private", order: 1 }, { ...base.categories[0], id: "empty", name: "Empty", order: 2 }], folders: [{ id: "public-folder", name: "Public Folder", categoryId: "public", order: 0 }, { id: "private-folder", name: "Private Folder", categoryId: "private", order: 1 }], sites: [{ ...base.sites[0], id: "visible", categoryId: "public", category: "我的网页", folderId: "public-folder", visibility: "public" }, { ...base.sites[0], id: "hidden-site", url: "https://hidden.example/", categoryId: "public", visibility: "private" }, { ...base.sites[0], id: "hidden-category-site", url: "https://secret.example/", categoryId: "private", category: "Secret", folderId: "private-folder", visibility: "public" }] };
  it("filters private sites, categories, and leaked folder names", () => { const result = filterPublicConfig(config); expect(result.sites.map((site) => site.id)).toEqual(["visible"]); expect(result.categories.map((category) => category.id)).toEqual(["public", "empty"]); expect(result.folders.map((folder) => folder.id)).toEqual(["public-folder"]); });
  it("moves sites atomically and validates destinations", () => { const moved = bulkMoveSites(config, { siteIds: ["hidden-site"], categoryId: "public", folderId: "public-folder" }); expect(moved.sites.find((site) => site.id === "hidden-site").folderId).toBe("public-folder"); expect(() => bulkMoveSites(config, { siteIds: ["missing"], categoryId: "public" })).toThrow("未知网站"); expect(() => bulkMoveSites(config, { siteIds: ["visible", "visible"], categoryId: "public" })).toThrow("互不重复"); expect(() => bulkMoveSites(config, { siteIds: ["visible"], categoryId: "public", folderId: "private-folder" })).toThrow("不匹配"); });
  it("deletes only an empty non-final category", () => { expect(deleteEmptyCategory(config, "empty").categories.some((category) => category.id === "empty")).toBe(false); expect(() => deleteEmptyCategory(config, "public")).toThrow("仍有网站"); expect(() => deleteEmptyCategory({ ...config, categories: [config.categories[0]] }, "public")).toThrow("至少保留"); });
});
