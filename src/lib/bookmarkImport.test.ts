import { utils, write } from "@e965/xlsx";
import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import { filterBookmarksByDestinations, groupBookmarkCandidates, parseChromeBookmarksHtml, parseSpreadsheetBuffer } from "./bookmarkImport";

const parseDocument = (html: string) => parseHTML(html).document as unknown as Document;

describe("Chrome bookmark parsing", () => {
  it("maps top folders to categories and the second level to a single folder", () => {
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p>
      <DT><A HREF="https://root.example/">Root</A>
      <DT><H3>工作</H3><DL><p>
        <DT><A HREF="https://work.example/">Work</A>
        <DT><H3>开发</H3><DL><p>
          <DT><A HREF="https://dev.example/">Dev</A>
          <DT><H3>前端</H3><DL><p><DT><A HREF="https://deep.example/">Deep</A></DL>
        </DL>
      </DL>
    </DL>`;
    expect(parseChromeBookmarksHtml(html, parseDocument)).toEqual([
      { name: "Root", url: "https://root.example/", categoryName: "导入书签", folderName: undefined, iconUrl: undefined },
      { name: "Work", url: "https://work.example/", categoryName: "工作", folderName: undefined, iconUrl: undefined },
      { name: "Dev", url: "https://dev.example/", categoryName: "工作", folderName: "开发", iconUrl: undefined },
      { name: "Deep", url: "https://deep.example/", categoryName: "工作", folderName: "开发", iconUrl: undefined },
    ]);
  });

  it("rejects HTML without bookmark links", () => {
    expect(() => parseChromeBookmarksHtml("<html><body>empty</body></html>", parseDocument)).toThrow("Chrome 书签目录");
  });
});

describe("spreadsheet bookmark parsing", () => {
  it("reads Chinese and English headers from every sheet", async () => {
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, utils.json_to_sheet([{ 网址: "https://cn.example/", 名称: "中文", 分类: "资料", 文件夹: "阅读" }]), "中文表");
    utils.book_append_sheet(workbook, utils.json_to_sheet([{ URL: "https://en.example/", Title: "English", Description: "Docs" }]), "English");
    const output = write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    await expect(parseSpreadsheetBuffer(output)).resolves.toEqual([
      { url: "https://cn.example/", name: "中文", description: undefined, categoryName: "资料", folderName: "阅读", iconUrl: undefined },
      { url: "https://en.example/", name: "English", description: "Docs", categoryName: "English", folderName: undefined, iconUrl: undefined },
    ]);
  });

  it("requires a URL column in each non-empty sheet", async () => {
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, utils.json_to_sheet([{ 名称: "Missing URL" }]), "错误表");
    const output = write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    await expect(parseSpreadsheetBuffer(output)).rejects.toThrow("缺少网址/URL 列");
  });
});

describe("bookmark destination selection", () => {
  const bookmarks = [
    { name: "Root", url: "https://root.example/", categoryName: "工作" },
    { name: "Dev", url: "https://dev.example/", categoryName: "工作", folderName: "开发" },
    { name: "Case", url: "https://case.example/", categoryName: "工作", folderName: "开发" },
    { name: "Read", url: "https://read.example/", categoryName: "阅读", folderName: "稍后" },
  ];

  it("groups bookmarks by category and folder without splitting case variants", () => {
    expect(groupBookmarkCandidates(bookmarks)).toMatchObject([
      { name: "工作", count: 3, destinations: [{ name: "未分文件夹", count: 1 }, { name: "开发", count: 2 }] },
      { name: "阅读", count: 1, destinations: [{ name: "稍后", count: 1 }] },
    ]);
  });

  it("filters the payload to selected destination groups", () => {
    const groups = groupBookmarkCandidates(bookmarks);
    expect(filterBookmarksByDestinations(bookmarks, [groups[0].destinations[1].key]).map((item) => item.name)).toEqual(["Dev", "Case"]);
  });
});
