import { requireAuth } from "../_shared/auth.js";
import { json } from "../_shared/catalogV2.js";
import { fetchMetadata } from "../_shared/metadata.js";

export async function onRequestPost(context) {
  const allowed = await requireAuth(context);
  if (allowed !== true) return allowed;
  try {
    const { url } = await context.request.json();
    return json(await fetchMetadata(url));
  } catch (error) {
    return json({ error: error.message || "无法识别网站信息。" }, 400);
  }
}
