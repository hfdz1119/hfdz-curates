import { describe, expect, it } from "vitest";
import { createSession } from "../../_shared/auth.js";
import { createBackup, migrateCatalog } from "../../_shared/catalogV2.js";
import { onRequestPost as applyImport } from "./apply.js";
import { onRequestPost as previewImport } from "./preview.js";
import { onRequestPost as rollbackImport } from "./rollback.js";

const secret = "test-password";
const original = migrateCatalog({ version: 1, sites: [{ id: "old", name: "Old", description: "Old site", url: "https://old.example/", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 0 }] });
const replacement = migrateCatalog({ version: 1, sites: [{ id: "new", name: "New", description: "New site", url: "https://new.example/", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 0 }] });

async function setup() {
  const values = new Map([["portal_sites:v1", JSON.stringify(original)]]);
  const calls = { puts: [], deletes: [] };
  const kv = {
    async get(key, type) { const value = values.get(key); return type === "json" && value ? JSON.parse(value) : value ?? null; },
    async put(key, value, options) { calls.puts.push({ key, value, options }); values.set(key, value); },
    async delete(key) { calls.deletes.push(key); values.delete(key); },
  };
  const token = await createSession(secret);
  const context = (handlerUrl, body) => ({ request: new Request(handlerUrl, { method: "POST", headers: { cookie: `hfdz_manage_session=${token}`, "content-type": "application/json" }, body: JSON.stringify(body) }), env: { HFDZ_NAVIGATION_ADMIN_PASSWORD: secret, HFDZ_NAVIGATION_KV: kv } });
  return { calls, context, values };
}

describe("portal backup endpoints", () => {
  it("previews a backup without writing KV", async () => {
    const { calls, context } = await setup();
    const response = await previewImport(context("https://example.com/api/admin/import/preview", createBackup(replacement)));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ valid: true, summary: { sites: 1, configVersion: 3 } });
    expect(calls.puts).toHaveLength(0);
  });

  it("applies a backup with rollback data and restores it once", async () => {
    const { calls, context, values } = await setup();
    const applied = await applyImport(context("https://example.com/api/admin/import/apply", createBackup(replacement)));
    expect(applied.status).toBe(200);
    expect(calls.puts.map((call) => call.key)).toEqual(["portal_sites:import_rollback:v1", "portal_sites:v1"]);
    expect(calls.puts[0].options).toEqual({ expirationTtl: 86400 });
    expect(JSON.parse(values.get("portal_sites:v1")).sites[0].id).toBe("new");

    const rolledBack = await rollbackImport(context("https://example.com/api/admin/import/rollback", {}));
    expect(rolledBack.status).toBe(200);
    expect(JSON.parse(values.get("portal_sites:v1")).sites[0].id).toBe("old");
    expect(calls.deletes).toEqual(["portal_sites:import_rollback:v1"]);
  });
});
