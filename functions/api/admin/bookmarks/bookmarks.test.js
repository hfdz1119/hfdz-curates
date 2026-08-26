import { describe, expect, it } from "vitest";
import { createSession } from "../../_shared/auth.js";
import { migrateCatalog } from "../../_shared/catalogV2.js";
import { onRequestPost as applyBookmarks } from "./apply.js";
import { onRequestPost as previewBookmarks } from "./preview.js";

const secret = "test-password";
const original = migrateCatalog({ version: 1, sites: [{ id: "old", name: "Old", description: "Old", url: "https://old.example/", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 0 }] });

async function setup() {
  const values = new Map([["portal_sites:v1", JSON.stringify(original)]]); const puts = [];
  const kv = { async get(key, type) { const value = values.get(key); return type === "json" && value ? JSON.parse(value) : value ?? null; }, async put(key, value, options) { puts.push({ key, options }); values.set(key, value); }, async delete(key) { values.delete(key); } };
  const token = await createSession(secret);
  const context = (path, bookmarks) => ({ request: new Request(`https://example.com${path}`, { method: "POST", headers: { cookie: `hfdz_manage_session=${token}`, "content-type": "application/json" }, body: JSON.stringify({ bookmarks }) }), env: { HFDZ_NAVIGATION_ADMIN_PASSWORD: secret, HFDZ_NAVIGATION_KV: kv } });
  return { context, puts, values };
}

describe("bookmark import endpoints", () => {
  it("previews without writing and applies with one config write plus rollback", async () => {
    const { context, puts, values } = await setup(); const input = [{ name: "New", url: "https://new.example/", categoryName: "资料" }];
    const preview = await previewBookmarks(context("/api/admin/bookmarks/preview", input));
    expect(await preview.json()).toMatchObject({ summary: { addable: 1, blocked: false } }); expect(puts).toHaveLength(0);
    const applied = await applyBookmarks(context("/api/admin/bookmarks/apply", input));
    expect(applied.status).toBe(200); expect(puts.map((item) => item.key)).toEqual(["portal_sites:import_rollback:v1", "portal_sites:v1"]);
    expect(JSON.parse(values.get("portal_sites:v1")).sites.at(-1).hostname).toBe("new.example");
  });

  it("does not write when every candidate is invalid", async () => {
    const { context, puts } = await setup();
    const response = await applyBookmarks(context("/api/admin/bookmarks/apply", [{ name: "HTTP", url: "http://invalid.example/" }]));
    expect(response.status).toBe(400); expect(puts).toHaveLength(0);
  });
});
