const CATALOG_KEY = "portal_sites:v1";
const ROLLBACK_KEY = "portal_sites:import_rollback:v1";
const BACKUP_VERSION = 1;
const MAX_SITES = 100;
const MAX_CATEGORIES = 30;
const MAX_FOLDERS = 50;
const DEFAULT_CATEGORY = { id: "category-default", name: "我的网页", order: 0, hidden: false, palette: "aurora" };
const DEFAULT_SETTINGS = { clockEnabled: true, weatherEnabled: true, defaultCity: "香港", latitude: 22.3193, longitude: 114.1694, density: "compact" };
const DEFAULT_SITES = [
  { id: "portfolio", name: "个人主页", description: "作品、经历与关于我的一切。", url: "https://me.hfdz1119.top/", hostname: "me.hfdz1119.top", iconUrl: "/favicon.svg", category: "我的网页", emphasis: "primary", access: "public", pinned: true, order: 0 },
  { id: "notes", name: "私人笔记", description: "写作、整理与沉淀想法的私人空间。", url: "https://kb.hfdz1119.top/", hostname: "kb.hfdz1119.top", category: "我的网页", emphasis: "standard", access: "authenticated", pinned: false, order: 1 },
  { id: "knowledge", name: "公开知识库", description: "经过筛选后公开分享的知识与记录。", url: "https://wiki.hfdz1119.top/", hostname: "wiki.hfdz1119.top", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 2 },
  { id: "images", name: "图片管理", description: "上传、管理并获取稳定的图片链接。", url: "https://image.hfdz1119.top/", hostname: "image.hfdz1119.top", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 3 },
  { id: "status", name: "服务状态", description: "查看网站与服务当前是否正常运行。", url: "https://status.hfdz1119.top/", hostname: "status.hfdz1119.top", category: "我的网页", emphasis: "standard", access: "public", pinned: false, order: 4 },
];

export const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
function asText(value, field, maximum, required = true) { if (typeof value !== "string") { if (!required && (value === undefined || value === null)) return ""; throw new Error(`${field}格式不正确。`); } const text = value.trim(); if (required && !text) throw new Error(`${field}不能为空。`); if (text.length > maximum) throw new Error(`${field}过长。`); return text; }
function httpsUrl(value, field, required = true) { const text = asText(value, field, 2048, required); if (!text && !required) return ""; let url; try { url = new URL(text); } catch { throw new Error(`${field}不是有效链接。`); } if (url.protocol !== "https:" || url.username || url.password) throw new Error(`${field}必须是安全的 HTTPS 链接。`); return url; }

export function siteUrlKey(value) { const url = value instanceof URL ? new URL(value.href) : new URL(value); url.hash = ""; url.hostname = url.hostname.toLowerCase(); if (url.protocol === "https:" && url.port === "443") url.port = ""; url.pathname = url.pathname.replace(/\/+$/, "") || "/"; return url.href; }
export function hasDuplicateSite(sites, url, excludedId) { const candidate = siteUrlKey(url); return sites.some((site) => site.id !== excludedId && siteUrlKey(site.url) === candidate); }
export function migrateCatalog(raw) { const sourceSites = Array.isArray(raw?.sites) ? raw.sites : DEFAULT_SITES; if (raw?.version === 2 && Array.isArray(raw.categories) && Array.isArray(raw.folders) && raw.settings) return { version: 2, sites: sourceSites, categories: raw.categories, folders: raw.folders, settings: { ...DEFAULT_SETTINGS, ...raw.settings } }; return { version: 2, sites: sourceSites.map((site) => ({ ...site, category: site.category || DEFAULT_CATEGORY.name, categoryId: DEFAULT_CATEGORY.id })), categories: [DEFAULT_CATEGORY], folders: [], settings: DEFAULT_SETTINGS }; }
export function validateSite(input, existing = {}, config = migrateCatalog(null)) { const url = httpsUrl(input.url, "网站地址"); const iconUrl = httpsUrl(input.iconUrl, "图标地址", false); const category = config.categories.find((item) => item.id === input.categoryId) ?? config.categories[0]; if (!category) throw new Error("请先创建分类。"); const folder = input.folderId ? config.folders.find((item) => item.id === input.folderId && item.categoryId === category.id) : null; if (input.folderId && !folder) throw new Error("文件夹与分类不匹配。"); return { id: existing.id ?? crypto.randomUUID(), name: asText(input.name, "网站名称", 80), description: asText(input.description, "简介", 180), url: url.href, hostname: url.hostname, ...(iconUrl ? { iconUrl: iconUrl.href } : {}), category: category.name, categoryId: category.id, ...(folder ? { folderId: folder.id } : {}), emphasis: input.emphasis === "primary" ? "primary" : "standard", access: input.access === "authenticated" ? "authenticated" : "public", pinned: input.pinned === true, order: Number.isInteger(input.order) && input.order >= 0 && input.order <= MAX_SITES * 10 ? input.order : (existing.order ?? 0) }; }
const validPalette = (value) => ["aurora", "sakura", "lavender", "sunset"].includes(value) ? value : "aurora";
export function validatePublicConfig(input, current) { if (Array.isArray(input.categories) && input.categories.length > MAX_CATEGORIES) throw new Error(`最多保存 ${MAX_CATEGORIES} 个分类。`); if (Array.isArray(input.folders) && input.folders.length > MAX_FOLDERS) throw new Error(`最多保存 ${MAX_FOLDERS} 个文件夹。`); const categories = Array.isArray(input.categories) ? input.categories.map((item, index) => ({ id: asText(item.id, "分类 ID", 80), name: asText(item.name, "分类名称", 40), order: Number.isInteger(item.order) ? item.order : index, hidden: item.hidden === true, palette: validPalette(item.palette) })) : current.categories; if (!categories.length) throw new Error("至少保留一个分类。"); const categoryIds = new Set(categories.map((item) => item.id)); if (categoryIds.size !== categories.length) throw new Error("分类 ID 不能重复。"); const folders = Array.isArray(input.folders) ? input.folders.map((item, index) => { if (!categoryIds.has(item.categoryId)) throw new Error("文件夹必须属于有效分类。"); return { id: asText(item.id, "文件夹 ID", 80), name: asText(item.name, "文件夹名称", 40), categoryId: item.categoryId, order: Number.isInteger(item.order) ? item.order : index }; }) : current.folders; const settingsInput = input.settings ?? current.settings; const latitude = Number(settingsInput.latitude); const longitude = Number(settingsInput.longitude); const brandIconUrl = httpsUrl(settingsInput.brandIconUrl, "品牌头像", false); if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("天气经纬度无效。"); return { categories, folders, settings: { clockEnabled: settingsInput.clockEnabled !== false, weatherEnabled: settingsInput.weatherEnabled !== false, defaultCity: asText(settingsInput.defaultCity, "默认城市", 60), latitude, longitude, density: settingsInput.density === "comfortable" ? "comfortable" : "compact", ...(brandIconUrl ? { brandIconUrl: brandIconUrl.href } : {}) } }; }
export function createBackup(config) { return { backupVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), portalConfig: { ...config, version: 2 } }; }
export function backupSummary(config) { return { sites: config.sites.length, categories: config.categories.length, folders: config.folders.length, configVersion: config.version }; }
export function validateBackup(input) {
  if (!input || input.backupVersion !== BACKUP_VERSION || input.portalConfig?.version !== 2) throw new Error("备份版本不受支持。");
  const raw = input.portalConfig;
  if (!Array.isArray(raw.sites) || !Array.isArray(raw.categories) || !Array.isArray(raw.folders) || !raw.settings) throw new Error("备份内容不完整。");
  if (raw.sites.length > MAX_SITES) throw new Error(`备份最多包含 ${MAX_SITES} 个网站。`);
  if (!raw.categories.length || raw.categories.length > MAX_CATEGORIES) throw new Error(`备份必须包含 1–${MAX_CATEGORIES} 个分类。`);
  if (raw.folders.length > MAX_FOLDERS) throw new Error(`备份最多包含 ${MAX_FOLDERS} 个文件夹。`);
  const publicConfig = validatePublicConfig(raw, migrateCatalog(null));
  const categoryNames = new Set(publicConfig.categories.map((item) => item.name.toLocaleLowerCase()));
  if (categoryNames.size !== publicConfig.categories.length) throw new Error("分类名称不能重复。");
  const folderIds = new Set(publicConfig.folders.map((item) => item.id));
  if (folderIds.size !== publicConfig.folders.length) throw new Error("文件夹 ID 不能重复。");
  const siteIds = new Set();
  const sites = [];
  raw.sites.forEach((item, index) => {
    const id = asText(item?.id, "网站 ID", 80);
    if (siteIds.has(id)) throw new Error("网站 ID 不能重复。");
    siteIds.add(id);
    const order = Number.isInteger(item.order) && item.order >= 0 && item.order <= MAX_SITES * 10 ? item.order : index;
    const site = validateSite(item, { id, order }, { version: 2, sites: [], ...publicConfig });
    if (hasDuplicateSite(sites, site.url)) throw new Error("备份中包含重复的网站地址。");
    sites.push(site);
  });
  return { version: 2, sites, ...publicConfig };
}
export function reorderSites(config, input) {
  const pinnedIds = Array.isArray(input?.pinnedIds) ? input.pinnedIds : [];
  const regularIds = Array.isArray(input?.regularIds) ? input.regularIds : [];
  const allIds = [...pinnedIds, ...regularIds];
  if (allIds.length !== config.sites.length || new Set(allIds).size !== allIds.length) throw new Error("排序列表与当前网站不一致，请刷新后重试。");
  const siteById = new Map(config.sites.map((site) => [site.id, site]));
  if (allIds.some((id) => typeof id !== "string" || !siteById.has(id))) throw new Error("排序列表包含未知网站。");
  if (pinnedIds.some((id) => !siteById.get(id).pinned) || regularIds.some((id) => siteById.get(id).pinned)) throw new Error("排序不能改变网站的置顶状态。");
  const orderById = new Map([...pinnedIds.map((id, order) => [id, order]), ...regularIds.map((id, order) => [id, order])]);
  return { ...config, sites: config.sites.map((site) => ({ ...site, order: orderById.get(site.id) })) };
}
export async function readConfig(env) { if (!env.HFDZ_NAVIGATION_KV) throw new Error("HFDZ_NAVIGATION_KV 尚未绑定。"); return migrateCatalog(await env.HFDZ_NAVIGATION_KV.get(CATALOG_KEY, "json")); }
export async function writeConfig(env, config) { if (!env.HFDZ_NAVIGATION_KV) throw new Error("HFDZ_NAVIGATION_KV 尚未绑定。"); await env.HFDZ_NAVIGATION_KV.put(CATALOG_KEY, JSON.stringify({ ...config, version: 2 })); }
export { BACKUP_VERSION, CATALOG_KEY, DEFAULT_CATEGORY, DEFAULT_SETTINGS, MAX_CATEGORIES, MAX_FOLDERS, MAX_SITES, ROLLBACK_KEY };
