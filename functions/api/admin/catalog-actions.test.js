import { describe, expect, it } from "vitest";
import { createSession } from "../_shared/auth.js";
import { migrateCatalog } from "../_shared/catalogV2.js";
import { onRequestPut as reorderCategories } from "./categories/order.js";
import { onRequestDelete as deleteFolder } from "./folders.js";

const secret = "test-password";

async function setup() {
  const base = migrateCatalog(null);
  const config = {
    ...base,
    categories: [
      { ...base.categories[0] },
      { id: "second", name: "Second", order: 1, hidden: false, palette: "sakura" },
    ],
    folders: [
      { id: "empty", name: "Empty", categoryId: "second", order: 0 },
      { id: "used", name: "Used", categoryId: "second", order: 1 },
    ],
    sites: base.sites.map((site, index) => index === 0 ? { ...site, categoryId: "second", category: "Second", folderId: "used" } : site),
  };
  const values = new Map([["portal_sites:v1", JSON.stringify(config)]]);
  const puts = [];
  const kv = { async get(key, type) { const value = values.get(key); return type === "json" && value ? JSON.parse(value) : value ?? null; }, async put(key, value) { puts.push(key); values.set(key, value); } };
  const token = await createSession(secret);
  const context = (path, method, body) => ({ request: new Request(`https://example.com${path}`, { method, headers: { cookie: `hfdz_manage_session=${token}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }), env: { HFDZ_NAVIGATION_ADMIN_PASSWORD: secret, HFDZ_NAVIGATION_KV: kv } });
  return { context, puts, values };
}

describe("category order and folder delete endpoints", () => {
  it("rejects unauthenticated writes", async () => {
    const { context, puts } = await setup();
    const authorized = context("/api/admin/categories/order", "PUT", { categoryIds: ["category-default", "second"] });
    const response = await reorderCategories({ ...authorized, request: new Request(authorized.request.url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ categoryIds: ["category-default", "second"] }) }) });
    expect(response.status).toBe(401);
    expect(puts).toHaveLength(0);
  });

  it("persists a complete category order in one write", async () => {
    const { context, puts, values } = await setup();
    const response = await reorderCategories(context("/api/admin/categories/order", "PUT", { categoryIds: ["second", "category-default"] }));
    expect(response.status).toBe(200);
    expect(puts).toEqual(["portal_sites:v1"]);
    expect(JSON.parse(values.get("portal_sites:v1")).categories.map(({ id, order }) => ({ id, order }))).toEqual([{ id: "category-default", order: 1 }, { id: "second", order: 0 }]);
  });

  it("deletes an empty folder but preserves a referenced folder", async () => {
    const { context, puts, values } = await setup();
    const deleted = await deleteFolder(context("/api/admin/folders?id=empty", "DELETE"));
    expect(deleted.status).toBe(200);
    expect(JSON.parse(values.get("portal_sites:v1")).folders.map((folder) => folder.id)).toEqual(["used"]);
    const blocked = await deleteFolder(context("/api/admin/folders?id=used", "DELETE"));
    expect(blocked.status).toBe(409);
    expect(puts).toEqual(["portal_sites:v1"]);
  });
});
