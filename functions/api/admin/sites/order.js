import { requireAuth } from "../../_shared/auth.js";
import { json, readConfig, reorderSites, writeConfig } from "../../_shared/catalogV2.js";

export async function onRequestPut(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try {
    const config = reorderSites(await readConfig(context.env), await context.request.json());
    await writeConfig(context.env, config);
    return json({ sites: config.sites });
  } catch (error) {
    return json({ error: error.message || "无法保存排序。" }, 400);
  }
}
