import { requireAuth } from "../../_shared/auth.js";
import { backupSummary, json, ROLLBACK_KEY, validateBackup, writeConfig } from "../../_shared/catalogV2.js";

async function readRollback(env) {
  if (!env.HFDZ_NAVIGATION_KV) throw new Error("HFDZ_NAVIGATION_KV 尚未绑定。");
  return env.HFDZ_NAVIGATION_KV.get(ROLLBACK_KEY, "json");
}

export async function onRequestGet(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try {
    const rollback = await readRollback(context.env);
    return json({ available: Boolean(rollback?.config), createdAt: rollback?.createdAt ?? null });
  } catch (error) { return json({ error: error.message || "无法读取回滚状态。" }, 503); }
}

export async function onRequestPost(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try {
    const rollback = await readRollback(context.env);
    if (!rollback?.config) return json({ error: "没有可恢复的导入记录。" }, 404);
    const config = validateBackup({ backupVersion: rollback.config?.version === 3 ? 2 : 1, portalConfig: rollback.config });
    await writeConfig(context.env, config);
    await context.env.HFDZ_NAVIGATION_KV.delete(ROLLBACK_KEY);
    return json({ success: true, summary: backupSummary(config), config, rollbackAvailable: false });
  } catch (error) { return json({ error: error.message || "无法撤销导入。" }, 400); }
}
