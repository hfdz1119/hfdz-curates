export type BookmarkCandidate = {
  name?: string;
  url: string;
  description?: string;
  categoryName?: string;
  folderName?: string;
  iconUrl?: string;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const URL_HEADERS = ["网址", "url", "链接", "link"];
const NAME_HEADERS = ["名称", "标题", "name", "title"];
const DESCRIPTION_HEADERS = ["简介", "描述", "description", "desc"];
const CATEGORY_HEADERS = ["分类", "category"];
const FOLDER_HEADERS = ["文件夹", "目录", "folder"];
const ICON_HEADERS = ["图标", "图标地址", "icon", "iconurl"];

const cleanText = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const normalizeHeader = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s_-]+/g, "");
const directChild = (element: Element, tagName: string) => Array.from(element.children).find((child) => child.tagName.toLowerCase() === tagName);

function childrenWithoutParagraphWrapper(element: Element) {
  return Array.from(element.children).flatMap((child) => child.tagName.toLowerCase() === "p" ? Array.from(child.children) : [child]);
}

function childBookmarkList(entry: Element) {
  const nested = directChild(entry, "dl");
  if (nested) return nested;
  const sibling = entry.nextElementSibling;
  return sibling?.tagName.toLowerCase() === "dl" ? sibling : null;
}

export function parseChromeBookmarksHtml(html: string, parseDocument = (value: string) => new DOMParser().parseFromString(value, "text/html")) {
  const document = parseDocument(html);
  const root = document.querySelector("dl");
  if (!root) throw new Error("没有在文件中找到 Chrome 书签目录。");
  const bookmarks: BookmarkCandidate[] = [];

  const walk = (list: Element, path: string[]) => {
    for (const entry of childrenWithoutParagraphWrapper(list)) {
      if (entry.tagName.toLowerCase() !== "dt") continue;
      const anchor = directChild(entry, "a") as HTMLAnchorElement | undefined;
      if (anchor) {
        const icon = anchor.getAttribute("icon") ?? anchor.getAttribute("ICON") ?? "";
        bookmarks.push({
          name: anchor.textContent?.trim() || undefined,
          url: (anchor.getAttribute("href") ?? anchor.getAttribute("HREF"))?.trim() ?? "",
          categoryName: path[0] || "导入书签",
          folderName: path[1] || undefined,
          iconUrl: icon.startsWith("https://") ? icon : undefined,
        });
        continue;
      }
      const heading = directChild(entry, "h3");
      const nested = heading ? childBookmarkList(entry) : null;
      if (heading && nested) walk(nested, [...path, heading.textContent?.trim() || "未命名目录"]);
    }
  };

  walk(root, []);
  if (!bookmarks.length) throw new Error("书签文件中没有可读取的网址。");
  return bookmarks;
}

function pickColumn(row: Record<string, unknown>, aliases: string[]) {
  const aliasSet = new Set(aliases.map(normalizeHeader));
  const key = Object.keys(row).find((candidate) => aliasSet.has(normalizeHeader(candidate)));
  return key ? cleanText(row[key]) : "";
}

export async function parseSpreadsheetBuffer(buffer: ArrayBuffer) {
  const XLSX = await import("@e965/xlsx");
  const workbook = XLSX.read(buffer, { type: "array", dense: true });
  const bookmarks: BookmarkCandidate[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet?.["!ref"]) continue;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    if (!rows.length) continue;
    if (!Object.keys(rows[0]).some((header) => URL_HEADERS.map(normalizeHeader).includes(normalizeHeader(header)))) throw new Error(`工作表“${sheetName}”缺少网址/URL 列。`);
    rows.forEach((row) => {
      const url = pickColumn(row, URL_HEADERS);
      if (!url && Object.values(row).every((value) => !cleanText(value))) return;
      bookmarks.push({
        url,
        name: pickColumn(row, NAME_HEADERS) || undefined,
        description: pickColumn(row, DESCRIPTION_HEADERS) || undefined,
        categoryName: pickColumn(row, CATEGORY_HEADERS) || sheetName || "导入书签",
        folderName: pickColumn(row, FOLDER_HEADERS) || undefined,
        iconUrl: pickColumn(row, ICON_HEADERS) || undefined,
      });
    });
  }
  if (!bookmarks.length) throw new Error("表格中没有可读取的书签记录。");
  return bookmarks;
}

export async function parseBookmarkFile(file: File) {
  if (file.size > MAX_FILE_BYTES) throw new Error("书签文件不能超过 5 MB。");
  const extension = file.name.split(".").pop()?.toLocaleLowerCase();
  if (extension === "html" || extension === "htm") return parseChromeBookmarksHtml(await file.text());
  if (["xlsx", "xls", "csv"].includes(extension ?? "")) return parseSpreadsheetBuffer(await file.arrayBuffer());
  throw new Error("请选择 Chrome HTML、Excel 或 CSV 书签文件。");
}

export { MAX_FILE_BYTES };
