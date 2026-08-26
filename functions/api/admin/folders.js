import { requireAuth } from "../_shared/auth.js";
import { deleteEmptyFolder, json, readConfig, writeConfig } from "../_shared/catalogV2.js";

export async function onRequestDelete(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try {
    const folderId = new URL(context.request.url).searchParams.get("id");
    const config = deleteEmptyFolder(await readConfig(context.env), folderId);
    await writeConfig(context.env, config);
    return json(config);
  } catch (error) {
    return json({ error: error.message || "无法删除文件夹。" }, error.status ?? 400);
  }
}
