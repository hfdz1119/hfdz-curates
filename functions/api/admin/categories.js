import { requireAuth } from "../_shared/auth.js";
import { deleteEmptyCategory, json, readConfig, writeConfig } from "../_shared/catalogV2.js";

export async function onRequestDelete(context) {
  const allowed = await requireAuth(context); if (allowed !== true) return allowed;
  const id = new URL(context.request.url).searchParams.get("id");
  try {
    const next = deleteEmptyCategory(await readConfig(context.env), id);
    await writeConfig(context.env, next);
    return json({ config: next });
  } catch (error) { return json({ error: error.message || "无法删除分类。" }, error.status ?? 400); }
}
