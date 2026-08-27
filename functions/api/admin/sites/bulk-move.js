import { requireAuth } from "../../_shared/auth.js";
import { bulkMoveSites, json, readConfig, writeConfig } from "../../_shared/catalogV2.js";

export async function onRequestPut(context) {
  const allowed = await requireAuth(context); if (allowed !== true) return allowed;
  try {
    const next = bulkMoveSites(await readConfig(context.env), await context.request.json());
    await writeConfig(context.env, next);
    return json({ config: next });
  } catch (error) { return json({ error: error.message || "无法移动网站。" }, 400); }
}
