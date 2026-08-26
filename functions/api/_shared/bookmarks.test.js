import { describe, expect, it } from "vitest";
import { migrateCatalog } from "./catalogV2.js";
import { prepareBookmarkImport } from "./bookmarks.js";

const current = migrateCatalog({ version: 1, sites: [{ id: "existing", name: "Existing", description: "Existing", url: "https://existing.example/", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 0 }] });

describe("bookmark import preparation", () => {
  it("merges categories and folders case-insensitively and generates fallbacks", () => {
    const configured = { ...current, categories: [{ ...current.categories[0] }, { id: "work", name: "Work", order: 1, hidden: false, palette: "aurora" }], folders: [{ id: "dev", name: "Dev", categoryId: "work", order: 0 }] };
    const result = prepareBookmarkImport(configured, [{ url: "https://new.example/path", categoryName: "work", folderName: "dev" }]);
    expect(result.summary).toMatchObject({ addable: 1, skipped: 0, newCategories: 0, newFolders: 0, blocked: false });
    expect(result.config.sites.at(-1)).toMatchObject({ name: "new.example", description: "来自 new.example 的书签", categoryId: "work", folderId: "dev", pinned: false, access: "public" });
  });

  it("skips existing, in-file duplicate, HTTP, and browser-internal URLs", () => {
    const result = prepareBookmarkImport(current, [
      { name: "Existing", url: "https://existing.example" },
      { name: "New", url: "https://new.example/" },
      { name: "New duplicate", url: "https://new.example" },
      { name: "HTTP", url: "http://http.example/" },
      { name: "Chrome", url: "chrome://settings" },
    ]);
    expect(result.summary).toMatchObject({ addable: 1, duplicates: 2, invalid: 2, skipped: 4 });
  });

  it("blocks the whole import when the final site count exceeds the limit", () => {
    const full = { ...current, sites: Array.from({ length: 100 }, (_, index) => ({ ...current.sites[0], id: `site-${index}`, url: `https://site-${index}.example/`, hostname: `site-${index}.example`, order: index })) };
    const result = prepareBookmarkImport(full, [{ name: "Overflow", url: "https://overflow.example/" }]);
    expect(result.summary.blocked).toBe(true);
    expect(result.errors[0]).toContain("101 个网站");
  });
});
