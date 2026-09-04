import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { DndContext, DragEndEvent, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowUpRight, Folder, LockKeyhole, Search, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { PortalBackground } from "../components/PortalBackground";
import { PortalBackgroundSettings } from "../components/PortalBackgroundSettings";
import { ManagedPortalIcon } from "../components/PortalIcon";
import { PortalPalettePicker } from "../components/PortalPalettePicker";
import { ClockWidget as EnhancedClockWidget, WeatherWidget as EnhancedWeatherWidget } from "../components/PortalWidgets";
import { initialPortalConfig, type PortalCategory, type PortalConfig } from "../data/portalSites";
import { portalAppearance } from "../data/portalAppearance";
import { portalApi } from "../lib/portalApi";
import { mergeVisibleCategoryOrder } from "../lib/portalCategoryOrder";
import { externalSearchUrl, matchesPortalSite, type SearchMode } from "../lib/portalSearch";
import { portalBackgroundStore } from "../stores/portalBackground";
import { portalPaletteStore } from "../stores/portalPalette";
import { defaultPortalHomePreferences, portalHomePreferencesStore, type PortalHomePreferences } from "../stores/portalHomePreferences";
import { PortalSettingsCenter } from "../components/PortalSettingsCenter";

const searchLabels: Record<SearchMode, string> = { local: "本地", google: "Google", bing: "Bing", duckduckgo: "DuckDuckGo" };

function SortableCategory({ category, active, enabled, onSelect }: { category: PortalCategory; active: boolean; enabled: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id, disabled: !enabled });
  return <button
    ref={setNodeRef}
    type="button"
    className={`${active ? "active" : ""}${enabled ? " is-sortable" : ""}${isDragging ? " is-dragging" : ""}`}
    style={{ transform: CSS.Transform.toString(transform), transition }}
    onClick={onSelect}
    title={enabled ? "长按拖动分类顺序" : undefined}
    {...attributes}
    {...listeners}
  >{category.name}</button>;
}

export function PortalStartPage({ dark, onTheme, onBrandIconChange }: { dark: boolean; onTheme: () => void; onBrandIconChange: (url: string) => void }) {
  const [background, setBackground] = useState(() => portalBackgroundStore.get()); const [palette, setPalette] = useState(() => portalPaletteStore.get()); const [preferences, setPreferences] = useState<PortalHomePreferences>(() => portalHomePreferencesStore.get()); const [settingsOpen, setSettingsOpen] = useState(false); const [config, setConfig] = useState<PortalConfig>(initialPortalConfig); const [query, setQuery] = useState(""); const [categoryId, setCategoryId] = useState("all"); const [folderId, setFolderId] = useState<string | null>(null); const [categorySortingEnabled, setCategorySortingEnabled] = useState(false); const [categoryOrderSaving, setCategoryOrderSaving] = useState(false); const [categoryOrderMessage, setCategoryOrderMessage] = useState(""); const [mode, setMode] = useState<SearchMode>(() => { const saved = localStorage.getItem("hfdz-navigation:search-mode"); return saved && saved in searchLabels ? saved as SearchMode : "local"; });
  const [, setClockTick] = useState(0); useEffect(() => { const timer = window.setInterval(() => setClockTick(value => value + 1), 1000); return () => window.clearInterval(timer); }, []);
  const updatePreferences = (patch: Partial<PortalHomePreferences>) => { const next = portalHomePreferencesStore.set(patch); setPreferences(next); setPalette(next.accent); document.documentElement.dataset.theme = next.theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next.theme; };
  const categorySensors = useSensors(useSensor(MouseSensor, { activationConstraint: { delay: 350, tolerance: 8 } }), useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  useEffect(() => { void portalApi.publicSites().then((value) => { setConfig(value); onBrandIconChange(value.settings.brandIconUrl ?? "/favicon.svg"); }).catch(() => undefined); }, [onBrandIconChange]);
  useEffect(() => { void portalApi.session().then(({ authenticated }) => setCategorySortingEnabled(authenticated)).catch(() => setCategorySortingEnabled(false)); }, []);
  const categories = useMemo(() => config.categories.filter((item) => !item.hidden).sort((a, b) => a.order - b.order), [config.categories]); const currentFolder = config.folders.find((item) => item.id === folderId);
  const visibleSites = useMemo(() => { const visibleCategoryIds = new Set(categories.map((item) => item.id)); return config.sites.filter((site) => visibleCategoryIds.has(site.categoryId) && (categoryId === "all" || site.categoryId === categoryId) && (!folderId ? !site.folderId : site.folderId === folderId) && matchesPortalSite(site, config.categories.find((item) => item.id === site.categoryId), query)).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.order - b.order); }, [config, categories, categoryId, folderId, query]);
  const visibleFolders = useMemo(() => folderId ? [] : config.folders.filter((folder) => (categoryId === "all" || folder.categoryId === categoryId) && config.sites.some((site) => site.folderId === folder.id && matchesPortalSite(site, config.categories.find((item) => item.id === site.categoryId), query))).sort((a, b) => a.order - b.order), [config, categoryId, folderId, query]);
  const submitSearch = (event: FormEvent) => { event.preventDefault(); if (mode !== "local" && query.trim()) window.location.assign(externalSearchUrl(mode, query)); }; const chooseMode = (next: SearchMode) => { setMode(next); localStorage.setItem("hfdz-navigation:search-mode", next); };
  const finishCategoryDrag = async ({ active, over }: DragEndEvent) => {
    if (!categorySortingEnabled || categoryOrderSaving || !over || active.id === over.id) return;
    const previousCategories = config.categories;
    const oldIndex = categories.findIndex((category) => category.id === active.id);
    const newIndex = categories.findIndex((category) => category.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextVisible = arrayMove(categories, oldIndex, newIndex);
    const nextCategories = mergeVisibleCategoryOrder(previousCategories, nextVisible.map((category) => category.id));
    setConfig((current) => ({ ...current, categories: nextCategories }));
    setCategoryOrderSaving(true);
    setCategoryOrderMessage("正在保存分类顺序…");
    try {
      const result = await portalApi.reorderCategories(nextCategories.slice().sort((a, b) => a.order - b.order).map((category) => category.id));
      setConfig((current) => ({ ...current, categories: result.categories }));
      setCategoryOrderMessage("分类顺序已保存。");
    } catch (error) {
      setConfig((current) => ({ ...current, categories: previousCategories }));
      setCategoryOrderMessage(error instanceof Error ? error.message : "分类排序保存失败。");
      if ((error as Error & { status?: number }).status === 401) setCategorySortingEnabled(false);
    } finally { setCategoryOrderSaving(false); }
  };
  const backgroundSource = preferences.background?.url ? preferences.background : background ?? portalAppearance.backgroundImage;
  return <main className="portal-page portal-start-page" id="main-content" data-portal-palette={preferences.accent} data-density={preferences.density} style={{ "--portal-icon-size": `${preferences.iconSize}px`, "--portal-icon-radius": `${preferences.iconRadius}px`, "--portal-icon-gap": `${preferences.iconGap}px`, "--portal-card-opacity": `${preferences.cardOpacity / 100}` } as React.CSSProperties}><PortalBackground src={backgroundSource} fallbackSrc={portalAppearance.backgroundImage} mobileSrc={portalAppearance.mobileBackgroundImage} preferences={preferences} /><section className={`portal-shell${preferences.sidebarVisible ? " has-sidebar" : ""}`} aria-label="HFDZ Home"><aside className="portal-sidebar"><Link className="portal-brand" to="/" aria-label="HFDZ Home"><img src={config.settings.brandIconUrl ?? "/favicon.svg"} alt="" /><strong>HFDZ</strong><span>Home</span></Link><nav className="portal-categories" aria-label="网站分类"><button className={categoryId === "all" ? "active" : ""} onClick={() => { setCategoryId("all"); setFolderId(null); }}>全部</button>{categories.map(category => <button className={categoryId === category.id ? "active" : ""} key={category.id} onClick={() => { setCategoryId(category.id); setFolderId(null); }}>{category.name}</button>)}</nav><button className="portal-settings-trigger" type="button" onClick={() => setSettingsOpen(true)} aria-label="打开设置中心"><Settings size={18} />设置</button></aside><section className="portal-main"><header className="portal-toolbar"><div className="portal-time">{preferences.clockEnabled && <time>{new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time>}{preferences.dateEnabled && <small>{new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}</small>}</div><form className="portal-search" onSubmit={submitSearch}><select aria-label="搜索方式" value={mode} onChange={e => chooseMode(e.target.value as SearchMode)}><option value="local">本地</option><option value="bing">Bing</option><option value="google">Google</option><option value="duckduckgo">百度</option></select><Search size={18} aria-hidden="true" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索网站、域名或分类" aria-label="搜索" /><button type="submit" aria-label="提交搜索"><ArrowUpRight size={17} /></button></form></header>{preferences.weatherEnabled && <div className="portal-widgets"><EnhancedWeatherWidget config={config} /></div>}<h1 className="portal-home-title">{categoryId === "all" ? "全部入口" : categories.find(c => c.id === categoryId)?.name}</h1>{currentFolder && <div className="portal-breadcrumb"><button type="button" onClick={() => setFolderId(null)}><ArrowLeft size={16} />返回</button><span>/</span><strong>{currentFolder.name}</strong></div>}<div className="portal-grid portal-compact-grid" aria-live="polite">{visibleFolders.map(folder => <button className="portal-link portal-folder" key={folder.id} onClick={() => setFolderId(folder.id)}><span className="portal-icon"><Folder size={23} /></span><span className="portal-link-copy"><strong>{folder.name}</strong><span className="portal-description">{config.sites.filter(s => s.folderId === folder.id).length} 个网站</span></span></button>)}{visibleSites.map(site => <a className="portal-link" href={site.url} key={site.id}><span className="portal-icon"><ManagedPortalIcon iconUrl={site.iconUrl} hostname={site.hostname} /></span><span className="portal-link-copy">{preferences.showNames && <span className="portal-link-heading"><strong>{site.name}</strong>{site.access === "authenticated" && <LockKeyhole size={12} />}</span>}{preferences.showDescriptions && <span className="portal-description">{site.description}</span>}<span className="portal-hostname">{site.hostname}</span></span><ArrowUpRight className="portal-link-arrow" size={17} /></a>)}</div>{!visibleFolders.length && !visibleSites.length && <p className="portal-empty">没有找到匹配的网站。</p>}</section></section><PortalSettingsCenter open={settingsOpen} preferences={preferences} onChange={updatePreferences} onClose={() => setSettingsOpen(false)} onReset={() => { setPreferences(defaultPortalHomePreferences); updatePreferences(defaultPortalHomePreferences); }} /></main>;
}
