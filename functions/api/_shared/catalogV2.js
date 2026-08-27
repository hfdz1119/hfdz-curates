const CATALOG_KEY = "portal_sites:v1";
const ROLLBACK_KEY = "portal_sites:import_rollback:v1";
const BACKUP_VERSION = 2;
const MAX_SITES = 100;
const MAX_CATEGORIES = 30;
const MAX_FOLDERS = 50;
const DEFAULT_CATEGORY = { id: "category-default", name: "我的网页", order: 0, hidden: false, palette: "aurora", visibility: "public" };
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
export function migrateCatalog(raw) { const sourceSites = Array.isArray(raw?.sites) ? raw.sites : DEFAULT_SITES; if ((raw?.version === 2 || raw?.version === 3) && Array.isArray(raw.categories) && Array.isArray(raw.folders) && raw.settings) return { version: 3, sites: sourceSites.map((site) => ({ ...site, visibility: site.visibility === "private" ? "private" : "public" })), categories: raw.categories.map((category) => ({ ...category, visibility: category.visibility === "private" ? "private" : "public" })), folders: raw.folders, settings: { ...DEFAULT_SETTINGS, ...raw.settings } }; return { version: 3, sites: sourceSites.map((site) => ({ ...site, category: site.category || DEFAULT_CATEGORY.name, categoryId: DEFAULT_CATEGORY.id, visibility: "public" })), categories: [DEFAULT_CATEGORY], folders: [], settings: DEFAULT_SETTINGS }; }
export function validateSite(input, existing = {}, config = migrateCatalog(null)) { const url = httpsUrl(input.url, "网站地址"); const iconUrl = httpsUrl(input.iconUrl, "图标地址", false); const category = config.categories.find((item) => item.id === input.categoryId) ?? config.categories[0]; if (!category) throw new Error("请先创建分类。"); const folder = input.folderId ? config.folders.find((item) => item.id === input.folderId && item.categoryId === category.id) : null; if (input.folderId && !folder) throw new Error("文件夹与分类不匹配。"); return { id: existing.id ?? crypto.randomUUID(), name: asText(input.name, "网站名称", 80), description: asText(input.description, "简介", 180), url: url.href, hostname: url.hostname, ...(iconUrl ? { iconUrl: iconUrl.href } : {}), category: category.name, categoryId: category.id, ...(folder ? { folderId: folder.id } : {}), emphasis: input.emphasis === "primary" ? "primary" : "standard", access: input.access === "authenticated" ? "authenticated" : "public", visibility: input.visibility === "private" ? "private" : "public", pinned: input.pinned === true, order: Number.isInteger(input.order) && input.order >= 0 && input.order <= MAX_SITES * 10 ? input.order : (existing.order ?? 0) }; }
const validPalette = (value) => ["aurora", "sakura", "lavender", "sunset"].includes(value) ? value : "aurora";
export function validatePublicConfig(input, current) { if (Array.isArray(input.categories) && input.categories.length > MAX_CATEGORIES) throw new Error(`最多保存 ${MAX_CATEGORIES} 个分类。`); if (Array.isArray(input.folders) && input.folders.length > MAX_FOLDERS) throw new Error(`最多保存 ${MAX_FOLDERS} 个文件夹。`); const categories = Array.isArray(input.categories) ? input.categories.map((item, index) => ({ id: asText(item.id, "分类 ID", 80), name: asText(item.name, "分类名称", 40), order: Number.isInteger(item.order) ? item.order : index, hidden: item.hidden === true, palette: validPalette(item.palette), visibility: item.visibility === "private" ? "private" : "public" })) : current.categories; if (!categories.length) throw new Error("至少保留一个分类。"); const categoryIds = new Set(categories.map((item) => item.id)); if (categoryIds.size !== categories.length) throw new Error("分类 ID 不能重复。"); const folders = Array.isArray(input.folders) ? input.folders.map((item, index) => { if (!categoryIds.has(item.categoryId)) throw new Error("文件夹必须属于有效分类。"); return { id: asText(item.id, "文件夹 ID", 80), name: asText(item.name, "文件夹名称", 40), categoryId: item.categoryId, order: Number.isInteger(item.order) ? item.order : index }; }) : current.folders; const settingsInput = input.settings ?? current.settings; const latitude = Number(settingsInput.latitude); const longitude = Number(settingsInput.longitude); const brandIconUrl = httpsUrl(settingsInput.brandIconUrl, "品牌头像", false); if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("天气经纬度无效。"); return { categories, folders, settings: { clockEnabled: settingsInput.clockEnabled !== false, weatherEnabled: settingsInput.weatherEnabled !== false, defaultCity: asText(settingsInput.defaultCity, "默认城市", 60), latitude, longitude, density: settingsInput.density === "comfortable" ? "comfortable" : "compact", ...(brandIconUrl ? { brandIconUrl: brandIconUrl.href } : {}) } }; }
export function createBackup(config) { return { backupVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), portalConfig: { ...config, version: 3 } }; }
export function backupSummary(config) { return { sites: config.sites.length, categories: config.categories.length, folders: config.folders.length, configVersion: config.version }; }
export function validateBackup(input) {
  if (!input || ![1, 2].includes(input.backupVersion) || ![2, 3].includes(input.portalConfig?.version)) throw new Error("备份版本不受支持。");
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
    const site = validateSite(item, { id, order }, { version: 3, sites: [], ...publicConfig });
    if (hasDuplicateSite(sites, site.url)) throw new Error("备份中包含重复的网站地址。");
    sites.push(site);
  });
  return { version: 3, sites, ...publicConfig };
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
export function reorderCategories(config, input) {
  const categoryIds = Array.isArray(input?.categoryIds) ? input.categoryIds : [];
  const currentIds = config.categories.map((category) => category.id);
  if (categoryIds.length !== currentIds.length || new Set(categoryIds).size !== categoryIds.length) throw new Error("排序列表与当前分类不一致，请刷新后重试。");
  const knownIds = new Set(currentIds);
  if (categoryIds.some((id) => typeof id !== "string" || !knownIds.has(id))) throw new Error("排序列表包含未知分类。");
  const orderById = new Map(categoryIds.map((id, order) => [id, order]));
  return { ...config, categories: config.categories.map((category) => ({ ...category, order: orderById.get(category.id) })) };
}
export function deleteEmptyFolder(config, folderId) {
  if (typeof folderId !== "string" || !folderId.trim()) throw new Error("请指定要删除的文件夹。");
  const folder = config.folders.find((item) => item.id === folderId);
  if (!folder) throw new Error("文件夹不存在，请刷新后重试。");
  if (config.sites.some((site) => site.folderId === folder.id)) {
    const error = new Error("文件夹内仍有网站，请先移动或删除其中的网站。");
    error.status = 409;
    throw error;
  }
  const folders = config.folders.filter((item) => item.id !== folder.id).sort((a, b) => a.order - b.order).map((item, order) => ({ ...item, order }));
  return { ...config, folders };
}
export function filterPublicConfig(config) {
  const categories = config.categories.filter((category) => category.visibility !== "private");
  const categoryIds = new Set(categories.map((category) => category.id));
  const sites = config.sites.filter((site) => site.visibility !== "private" && categoryIds.has(site.categoryId));
  const folderIds = new Set(sites.flatMap((site) => site.folderId ? [site.folderId] : []));
  return { ...config, categories, sites, folders: config.folders.filter((folder) => folderIds.has(folder.id)) };
}
export function bulkMoveSites(config, input) {
  const siteIds = Array.isArray(input?.siteIds) ? input.siteIds : [];
  if (!siteIds.length || new Set(siteIds).size !== siteIds.length) throw new Error("请选择互不重复的网站。");
  const knownIds = new Set(config.sites.map((site) => site.id));
  if (siteIds.some((id) => typeof id !== "string" || !knownIds.has(id))) throw new Error("包含未知网站，请刷新后重试。");
  const category = config.categories.find((item) => item.id === input.categoryId);
  if (!category) throw new Error("目标分类不存在。");
  const folder = input.folderId ? config.folders.find((item) => item.id === input.folderId && item.categoryId === category.id) : null;
  if (input.folderId && !folder) throw new Error("目标文件夹与分类不匹配。");
  const moving = new Set(siteIds);
  const movingOrder = new Map(siteIds.map((id, index) => [id, index]));
  const sites = config.sites.map((site) => moving.has(site.id) ? { ...site, category: category.name, categoryId: category.id, ...(folder ? { folderId: folder.id } : { folderId: undefined }) } : { ...site });
  const groups = new Map();
  sites.forEach((site) => { const key = `${site.pinned}:${site.categoryId}:${site.folderId ?? ""}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(site); });
  groups.forEach((group) => { const destination = group[0].categoryId === category.id && (group[0].folderId ?? "") === (folder?.id ?? ""); const ordered = group.sort((a, b) => destination && moving.has(a.id) !== moving.has(b.id) ? (moving.has(a.id) ? 1 : -1) : destination && moving.has(a.id) ? movingOrder.get(a.id) - movingOrder.get(b.id) : a.order - b.order); ordered.forEach((site, order) => { site.order = order; }); });
  return { ...config, sites };
}
export function deleteEmptyCategory(config, categoryId) {
  if (config.categories.length <= 1) { const error = new Error("至少保留一个分类。"); error.status = 409; throw error; }
  if (!config.categories.some((category) => category.id === categoryId)) { const error = new Error("分类不存在。"); error.status = 404; throw error; }
  if (config.sites.some((site) => site.categoryId === categoryId) || config.folders.some((folder) => folder.categoryId === categoryId)) { const error = new Error("分类内仍有网站或文件夹，请先清空。"); error.status = 409; throw error; }
  return { ...config, categories: config.categories.filter((category) => category.id !== categoryId).sort((a, b) => a.order - b.order).map((category, order) => ({ ...category, order })) };
}
export async function readConfig(env) { if (!env.HFDZ_NAVIGATION_KV) throw new Error("HFDZ_NAVIGATION_KV 尚未绑定。"); return migrateCatalog(await env.HFDZ_NAVIGATION_KV.get(CATALOG_KEY, "json")); }
export async function writeConfig(env, config) { if (!env.HFDZ_NAVIGATION_KV) throw new Error("HFDZ_NAVIGATION_KV 尚未绑定。"); await env.HFDZ_NAVIGATION_KV.put(CATALOG_KEY, JSON.stringify({ ...config, version: 3 })); }
export { BACKUP_VERSION, CATALOG_KEY, DEFAULT_CATEGORY, DEFAULT_SETTINGS, MAX_CATEGORIES, MAX_FOLDERS, MAX_SITES, ROLLBACK_KEY };
