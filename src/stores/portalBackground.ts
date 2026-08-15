export const PORTAL_BACKGROUND_STORAGE_KEY = "hfdz-navigation:background-url";

export function normalizePortalBackgroundUrl(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) throw new Error("请粘贴图片的 HTTPS 链接。");

  let url: URL;
  try {
    url = new URL(trimmedValue);
  } catch {
    throw new Error("链接格式不正确，请粘贴完整的图片地址。");
  }

  if (url.protocol !== "https:") throw new Error("为了安全，背景图片必须使用 HTTPS 链接。");
  if (url.username || url.password) throw new Error("背景链接不能包含账号或密码。");

  return url.href;
}

function getStorage() {
  try {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

export const portalBackgroundStore = {
  get() {
    const storage = getStorage();
    if (!storage) return null;

    try {
      const value = storage.getItem(PORTAL_BACKGROUND_STORAGE_KEY);
      return value ? normalizePortalBackgroundUrl(value) : null;
    } catch {
      return null;
    }
  },
  set(value: string) {
    const normalizedUrl = normalizePortalBackgroundUrl(value);
    const storage = getStorage();
    if (!storage) throw new Error("当前浏览器无法保存背景设置。");
    storage.setItem(PORTAL_BACKGROUND_STORAGE_KEY, normalizedUrl);
    return normalizedUrl;
  },
  clear() {
    getStorage()?.removeItem(PORTAL_BACKGROUND_STORAGE_KEY);
  },
};
