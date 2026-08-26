import { requireAuth } from "../../_shared/auth.js";
import { prepareBookmarkImport, readBookmarkPayload } from "../../_shared/bookmarks.js";
import { json, readConfig, ROLLBACK_KEY, writeConfig } from "../../_shared/catalogV2.js";

export async function onRequestPost(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try {
    const current = await readConfig(context.env);
    const result = prepareBookmarkImport(current, await readBookmarkPayload(context.request));
    if (result.summary.blocked) return json({ error: result.errors.join(" "), summary: result.summary }, 400);
    await context.env.HFDZ_NAVIGATION_KV.put(ROLLBACK_KEY, JSON.stringify({ createdAt: new Date().toISOString(), config: current }), { expirationTtl: 86400 });
    await writeConfig(context.env, result.config);
    return json({ success: true, summary: result.summary, config: result.config, rollbackAvailable: true });
  } catch (error) {
    return json({ error: error.message || "无法导入书签。" }, 400);
  }
}
