import { Activity, BookOpen, Image, NotebookPen, UserRound, type LucideIcon } from "lucide-react";

export type PortalIcon =
  | { mode: "custom"; src: string; fallback: LucideIcon }
  | { mode: "auto"; fallback: LucideIcon }
  | { mode: "lucide"; icon: LucideIcon };

export type PortalSite = {
  id: string;
  name: string;
  description: string;
  url: string;
  hostname: string;
  icon: PortalIcon;
  emphasis: "primary" | "standard";
  access: "public" | "authenticated";
};

/** The JSON-safe shape persisted by the private Cloudflare management API. */
export type ManagedPortalSite = {
  id: string;
  name: string;
  description: string;
  url: string;
  hostname: string;
  iconUrl?: string;
  category: string;
  categoryId: string;
  folderId?: string;
  emphasis: "primary" | "standard";
  access: "public" | "authenticated";
  pinned: boolean;
  order: number;
};

export type PortalCategory = { id: string; name: string; order: number; hidden: boolean; palette: "aurora" | "sakura" | "lavender" | "sunset" };
export type PortalFolder = { id: string; name: string; categoryId: string; order: number };
export type PortalSettings = { clockEnabled: boolean; weatherEnabled: boolean; defaultCity: string; latitude: number; longitude: number; density: "compact" | "comfortable" };
export type PortalConfig = { version: 2; sites: ManagedPortalSite[]; categories: PortalCategory[]; folders: PortalFolder[]; settings: PortalSettings };

export const defaultPortalCategory: PortalCategory = { id: "category-default", name: "我的网页", order: 0, hidden: false, palette: "aurora" };
export const defaultPortalSettings: PortalSettings = { clockEnabled: true, weatherEnabled: true, defaultCity: "香港", latitude: 22.3193, longitude: 114.1694, density: "compact" };

export const portalSites: PortalSite[] = [
  {
    id: "portfolio",
    name: "个人主页",
    description: "作品、经历与关于我的一切。",
    url: "https://me.hfdz1119.top",
    hostname: "me.hfdz1119.top",
    icon: { mode: "custom", src: "/favicon.svg", fallback: UserRound },
    emphasis: "primary",
    access: "public",
  },
  {
    id: "notes",
    name: "私人笔记",
    description: "写作、整理与沉淀想法的私人空间。",
    url: "https://kb.hfdz1119.top",
    hostname: "kb.hfdz1119.top",
    icon: { mode: "auto", fallback: NotebookPen },
    emphasis: "standard",
    access: "authenticated",
  },
  {
    id: "knowledge",
    name: "公开知识库",
    description: "经过筛选后公开分享的知识与记录。",
    url: "https://wiki.hfdz1119.top",
    hostname: "wiki.hfdz1119.top",
    icon: { mode: "auto", fallback: BookOpen },
    emphasis: "standard",
    access: "public",
  },
  {
    id: "images",
    name: "图片管理",
    description: "上传、管理并获取稳定的图片链接。",
    url: "https://image.hfdz1119.top",
    hostname: "image.hfdz1119.top",
    icon: { mode: "auto", fallback: Image },
    emphasis: "standard",
    access: "public",
  },
  {
    id: "status",
    name: "服务状态",
    description: "查看网站与服务当前是否正常运行。",
    url: "https://status.hfdz1119.top",
    hostname: "status.hfdz1119.top",
    icon: { mode: "auto", fallback: Activity },
    emphasis: "standard",
    access: "public",
  },
];

export const initialManagedPortalSites: ManagedPortalSite[] = portalSites.map((site, index) => ({
  id: site.id,
  name: site.name,
  description: site.description,
  url: site.url,
  hostname: site.hostname,
  iconUrl: site.icon.mode === "custom" ? site.icon.src : undefined,
  category: "我的网页",
  categoryId: defaultPortalCategory.id,
  emphasis: site.emphasis,
  access: site.access,
  pinned: site.emphasis === "primary",
  order: index,
}));

export const initialPortalConfig: PortalConfig = { version: 2, sites: initialManagedPortalSites, categories: [defaultPortalCategory], folders: [], settings: defaultPortalSettings };
