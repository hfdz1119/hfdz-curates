import { requireAuth } from "../../_shared/auth.js";
import { prepareBookmarkImport, readBookmarkPayload } from "../../_shared/bookmarks.js";
import { json, readConfig } from "../../_shared/catalogV2.js";

export async function onRequestPost(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try {
    const result = prepareBookmarkImport(await readConfig(context.env), await readBookmarkPayload(context.request));
    return json({ summary: result.summary, skipped: result.skipped, destinations: result.destinations, errors: result.errors });
  } catch (error) {
    return json({ error: error.message || "无法预览书签导入。" }, 400);
  }
}
