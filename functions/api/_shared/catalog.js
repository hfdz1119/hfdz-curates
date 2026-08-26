const CATALOG_KEY = "portal_sites:v1";
const MAX_SITES = 100;
const DEFAULT_SITES = [
  { id: "portfolio", name: "个人主页", description: "作品、经历与关于我的一切。", url: "https://me.hfdz1119.top/", hostname: "me.hfdz1119.top", iconUrl: "/favicon.svg", category: "我的网页", emphasis: "primary", access: "public", pinned: true, order: 0 },
  { id: "notes", name: "私人笔记", description: "写作、整理与沉淀想法的私人空间。", url: "https://kb.hfdz1119.top/", hostname: "kb.hfdz1119.top", category: "我的网页", emphasis: "standard", access: "authenticated", pinned: false, order: 1 },
  { id: "knowledge", name: "公开知识库", description: "经过筛选后公开分享的知识与记录。", url: "https://wiki.hfdz1119.top/", hostname: "wiki.hfdz1119.top", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 2 },
  { id: "images", name: "图片管理", description: "上传、管理并获取稳定的图片链接。", url: "https://image.hfdz1119.top/", hostname: "image.hfdz1119.top", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 3 },
  { id: "status", name: "服务状态", description: "查看网站与服务当前是否正常运行。", url: "https://status.hfdz1119.top/", hostname: "status.hfdz1119.top", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 4 },
];

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

function asText(value, field, maximum, required = true) {
  if (typeof value !== "string") { if (!required && (value === undefined || value === null)) return ""; throw new Error(`${field}格式不正确。`); }
  const text = value.trim();
  if (required && !text) throw new Error(`${field}不能为空。`);
  if (text.length > maximum) throw new Error(`${field}过长。`);
  return text;
}

function httpsUrl(value, field, required = true) {
  const text = asText(value, field, 2048, required);
  if (!text && !required) return "";
  let url;
  try { url = new URL(text); } catch { throw new Error(`${field}不是有效链接。`); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error(`${field}必须是安全的 HTTPS 链接。`);
  return url;
}

export function validateSite(input, existing = {}) {
  const url = httpsUrl(input.url, "网站地址");
  const iconUrl = httpsUrl(input.iconUrl, "图标地址", false);
  const emphasis = input.emphasis === "primary" ? "primary" : "standard";
  const access = input.access === "authenticated" ? "authenticated" : "public";
  const order = Number.isInteger(input.order) && input.order >= 0 && input.order <= MAX_SITES * 10 ? input.order : (existing.order ?? 0);
  return {
    id: existing.id ?? crypto.randomUUID(),
    name: asText(input.name, "网站名称", 80),
    description: asText(input.description, "简介", 180),
    url: url.href,
    hostname: url.hostname,
    ...(iconUrl ? { iconUrl: iconUrl.href } : {}),
    category: asText(input.category, "分类", 40),
    emphasis,
    access,
    pinned: input.pinned === true,
    order,
  };
}

export async function readSites(env) {
  if (!env.HFDZ_NAVIGATION_KV) throw new Error("HFDZ_NAVIGATION_KV 尚未绑定。");
  const raw = await env.HFDZ_NAVIGATION_KV.get(CATALOG_KEY, "json");
  return Array.isArray(raw?.sites) ? raw.sites : DEFAULT_SITES;
}

export async function writeSites(env, sites) {
  if (!env.HFDZ_NAVIGATION_KV) throw new Error("HFDZ_NAVIGATION_KV 尚未绑定。");
  await env.HFDZ_NAVIGATION_KV.put(CATALOG_KEY, JSON.stringify({ version: 1, sites }));
}

export { CATALOG_KEY, MAX_SITES, json };
