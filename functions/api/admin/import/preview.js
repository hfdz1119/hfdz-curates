import { requireAuth } from "../../_shared/auth.js";
import { backupSummary, json, validateBackup } from "../../_shared/catalogV2.js";

export async function onRequestPost(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try { return json({ valid: true, summary: backupSummary(validateBackup(await context.request.json())) }); }
  catch (error) { return json({ error: error.message || "备份文件无效。" }, 400); }
}
