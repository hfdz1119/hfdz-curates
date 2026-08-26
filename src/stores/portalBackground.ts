export const PORTAL_BACKGROUND_STORAGE_KEY = "hfdz-navigation:background-url";
export const PORTAL_MANAGE_BACKGROUND_STORAGE_KEY = "hfdz-navigation:manage-background-url";

export function normalizePortalImageUrl(value: string, subject = "背景图片") {
  const trimmedValue = value.trim();
  if (!trimmedValue) throw new Error("请粘贴图片的 HTTPS 链接。");

  let url: URL;
  try {
    url = new URL(trimmedValue);
  } catch {
    throw new Error("链接格式不正确，请粘贴完整的图片地址。");
  }

  if (url.protocol !== "https:") throw new Error(`为了安全，${subject}必须使用 HTTPS 链接。`);
  if (url.username || url.password) throw new Error(`${subject}链接不能包含账号或密码。`);

  return url.href;
}

export const normalizePortalBackgroundUrl = (value: string) => normalizePortalImageUrl(value, "背景图片");

function getStorage() {
  try {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

function createPortalBackgroundStore(storageKey: string) {
  return {
  get() {
    const storage = getStorage();
    if (!storage) return null;

    try {
      const value = storage.getItem(storageKey);
      return value ? normalizePortalBackgroundUrl(value) : null;
    } catch {
      return null;
    }
  },
  set(value: string) {
    const normalizedUrl = normalizePortalBackgroundUrl(value);
    const storage = getStorage();
    if (!storage) throw new Error("当前浏览器无法保存背景设置。");
    storage.setItem(storageKey, normalizedUrl);
    return normalizedUrl;
  },
  clear() {
    getStorage()?.removeItem(storageKey);
  },
  };
}

export const portalBackgroundStore = createPortalBackgroundStore(PORTAL_BACKGROUND_STORAGE_KEY);
export const portalManageBackgroundStore = createPortalBackgroundStore(PORTAL_MANAGE_BACKGROUND_STORAGE_KEY);
