import type { ManagedPortalSite, PortalCategory } from "../data/portalSites";
export type SearchMode = "local" | "google" | "bing" | "duckduckgo";
export function matchesPortalSite(site: ManagedPortalSite, category: PortalCategory | undefined, query: string) { const needle = query.trim().toLocaleLowerCase(); if (!needle) return true; return [site.name, site.description, site.hostname, site.category, category?.name].some((value) => value?.toLocaleLowerCase().includes(needle)); }
export function externalSearchUrl(mode: Exclude<SearchMode, "local">, query: string) { const bases = { google: "https://www.google.com/search?q=", bing: "https://www.bing.com/search?q=", duckduckgo: "https://duckduckgo.com/?q=" }; return `${bases[mode]}${encodeURIComponent(query.trim())}`; }
