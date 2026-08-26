import { describe, expect, it } from "vitest";
import type { ManagedPortalSite, PortalCategory } from "../data/portalSites";
import { externalSearchUrl, matchesPortalSite } from "./portalSearch";

const category: PortalCategory = { id: "tools", name: "效率工具", order: 0, hidden: false, palette: "aurora" };
const site: ManagedPortalSite = { id: "one", name: "图片管理", description: "上传图片", url: "https://img.example.com/", hostname: "img.example.com", category: category.name, categoryId: category.id, emphasis: "standard", access: "public", pinned: false, order: 0 };
describe("portal search", () => {
  it("matches names, descriptions, hostnames and categories", () => { expect(matchesPortalSite(site, category, "图片")).toBe(true); expect(matchesPortalSite(site, category, "上传")).toBe(true); expect(matchesPortalSite(site, category, "example.com")).toBe(true); expect(matchesPortalSite(site, category, "效率")).toBe(true); expect(matchesPortalSite(site, category, "不存在")).toBe(false); });
  it("encodes external queries", () => { expect(externalSearchUrl("google", "HFDZ 导航")).toBe("https://www.google.com/search?q=HFDZ%20%E5%AF%BC%E8%88%AA"); });
});
