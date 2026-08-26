import { requireAuth } from "../_shared/auth.js";
import { createBackup, json, readConfig } from "../_shared/catalogV2.js";

export async function onRequestGet(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try { return json(createBackup(await readConfig(context.env))); }
  catch (error) { return json({ error: error.message || "无法导出配置。" }, 503); }
}
