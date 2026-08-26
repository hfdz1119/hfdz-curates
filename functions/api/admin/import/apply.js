import { requireAuth } from "../../_shared/auth.js";
import { backupSummary, json, readConfig, ROLLBACK_KEY, validateBackup, writeConfig } from "../../_shared/catalogV2.js";

export async function onRequestPost(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try {
    const config = validateBackup(await context.request.json());
    const current = await readConfig(context.env);
    await context.env.HFDZ_NAVIGATION_KV.put(ROLLBACK_KEY, JSON.stringify({ createdAt: new Date().toISOString(), config: current }), { expirationTtl: 86400 });
    await writeConfig(context.env, config);
    return json({ success: true, summary: backupSummary(config), config, rollbackAvailable: true });
  } catch (error) {
    return json({ error: error.message || "无法恢复备份。" }, 400);
  }
}
