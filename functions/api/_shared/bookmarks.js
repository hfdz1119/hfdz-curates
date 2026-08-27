import { MAX_CATEGORIES, MAX_FOLDERS, MAX_SITES, siteUrlKey, validateSite } from "./catalogV2.js";

const MAX_IMPORT_BOOKMARKS = 1000;
const MAX_BODY_BYTES = 1024 * 1024;

function text(value, maximum, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") throw new Error("字段格式不正确。");
  const output = value.trim();
  if (output.length > maximum) throw new Error("字段内容过长。");
  return output || fallback;
}

const nameKey = (value) => value.trim().toLocaleLowerCase();

export async function readBookmarkPayload(request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("书签导入数据不能超过 1 MB。");
  const source = await request.text();
  if (new TextEncoder().encode(source).byteLength > MAX_BODY_BYTES) throw new Error("书签导入数据不能超过 1 MB。");
  let payload;
  try { payload = JSON.parse(source); } catch { throw new Error("书签导入数据不是有效 JSON。"); }
  if (!Array.isArray(payload?.bookmarks)) throw new Error("书签导入数据不完整。");
  if (payload.bookmarks.length > MAX_IMPORT_BOOKMARKS) throw new Error(`一次最多读取 ${MAX_IMPORT_BOOKMARKS} 条书签。`);
  return payload.bookmarks;
}

export function prepareBookmarkImport(current, input) {
  const categories = current.categories.map((item) => ({ ...item }));
  const folders = current.folders.map((item) => ({ ...item }));
  const additions = [];
  const skipped = [];
  const destinations = new Map();
  const knownUrls = new Set(current.sites.map((site) => siteUrlKey(site.url)));
  const categoryByName = new Map(categories.map((category) => [nameKey(category.name), category]));
  const folderByName = new Map(folders.map((folder) => [`${folder.categoryId}:${nameKey(folder.name)}`, folder]));
  let nextCategoryOrder = Math.max(-1, ...categories.map((item) => item.order)) + 1;
  let nextFolderOrder = Math.max(-1, ...folders.map((item) => item.order)) + 1;
  let nextSiteOrder = Math.max(-1, ...current.sites.filter((site) => !site.pinned).map((item) => item.order)) + 1;

  input.forEach((item, index) => {
    const rawUrl = typeof item?.url === "string" ? item.url.trim() : "";
    try {
      if (!rawUrl || rawUrl.length > 2048) throw new Error("网址为空或过长");
      const parsedUrl = new URL(rawUrl);
      if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) throw new Error("只导入 HTTPS 网站");
      const urlKey = siteUrlKey(parsedUrl);
      if (knownUrls.has(urlKey)) { skipped.push({ index, name: text(item?.name, 80, parsedUrl.hostname), url: rawUrl, reason: "重复网址" }); return; }

      const categoryName = text(item?.categoryName, 40, "导入书签");
      const folderName = text(item?.folderName, 40);
      const siteName = text(item?.name, 80, parsedUrl.hostname);
      const description = text(item?.description, 180, `来自 ${parsedUrl.hostname} 的书签`);
      const iconValue = text(item?.iconUrl, 2048);
      let category = categoryByName.get(nameKey(categoryName));
      if (!category) {
        category = { id: `category-${crypto.randomUUID()}`, name: categoryName, order: nextCategoryOrder++, hidden: false, palette: "aurora", visibility: "public" };
        categories.push(category); categoryByName.set(nameKey(categoryName), category);
      }

      let folder;
      if (folderName) {
        const folderKey = `${category.id}:${nameKey(folderName)}`;
        folder = folderByName.get(folderKey);
        if (!folder) {
          folder = { id: `folder-${crypto.randomUUID()}`, name: folderName, categoryId: category.id, order: nextFolderOrder++ };
          folders.push(folder); folderByName.set(folderKey, folder);
        }
      }

      let iconUrl = "";
      if (iconValue) {
        try { const icon = new URL(iconValue); if (icon.protocol === "https:" && !icon.username && !icon.password) iconUrl = icon.href; } catch { /* Invalid imported icons fall back to the site's favicon. */ }
      }
      const site = validateSite({
        name: siteName,
        description,
        url: parsedUrl.href,
        iconUrl,
        categoryId: category.id,
        folderId: folder?.id,
        emphasis: "standard",
        access: "public",
        pinned: false,
        order: nextSiteOrder++,
      }, {}, { ...current, categories, folders });
      additions.push(site); knownUrls.add(urlKey);
      const destinationKey = `${category.name}\n${folder?.name ?? ""}`;
      destinations.set(destinationKey, { categoryName: category.name, folderName: folder?.name ?? null, count: (destinations.get(destinationKey)?.count ?? 0) + 1 });
    } catch (error) {
      skipped.push({ index, name: typeof item?.name === "string" ? item.name.slice(0, 80) : "未命名书签", url: rawUrl.slice(0, 2048), reason: error instanceof Error ? error.message : "记录无效" });
    }
  });

  const errors = [];
  if (current.sites.length + additions.length > MAX_SITES) errors.push(`导入后将有 ${current.sites.length + additions.length} 个网站，最多允许 ${MAX_SITES} 个。`);
  if (categories.length > MAX_CATEGORIES) errors.push(`导入后将有 ${categories.length} 个分类，最多允许 ${MAX_CATEGORIES} 个。`);
  if (folders.length > MAX_FOLDERS) errors.push(`导入后将有 ${folders.length} 个文件夹，最多允许 ${MAX_FOLDERS} 个。`);
  if (!additions.length) errors.push("没有可新增的 HTTPS 书签。");
  const config = { ...current, version: 3, categories, folders, sites: [...current.sites, ...additions] };
  return {
    config,
    summary: { source: input.length, addable: additions.length, skipped: skipped.length, duplicates: skipped.filter((item) => item.reason === "重复网址").length, invalid: skipped.filter((item) => item.reason !== "重复网址").length, newCategories: categories.length - current.categories.length, newFolders: folders.length - current.folders.length, finalSites: config.sites.length, blocked: errors.length > 0 },
    skipped: skipped.slice(0, 100),
    destinations: [...destinations.values()],
    errors,
  };
}

export { MAX_BODY_BYTES, MAX_IMPORT_BOOKMARKS };
