import { requireAuth } from "../../_shared/auth.js";
import { json, readConfig, reorderCategories, writeConfig } from "../../_shared/catalogV2.js";

export async function onRequestPut(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try {
    const config = reorderCategories(await readConfig(context.env), await context.request.json());
    await writeConfig(context.env, config);
    return json({ categories: config.categories });
  } catch (error) {
    return json({ error: error.message || "无法保存分类排序。" }, 400);
  }
}
