import { FormEvent, useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowUpRight, Folder, LockKeyhole, Moon, Search, Settings, Sun } from "lucide-react";
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
  const [background, setBackground] = useState(() => portalBackgroundStore.get()); const [palette, setPalette] = useState(() => portalPaletteStore.get()); const [config, setConfig] = useState<PortalConfig>(initialPortalConfig); const [query, setQuery] = useState(""); const [categoryId, setCategoryId] = useState("all"); const [folderId, setFolderId] = useState<string | null>(null); const [categorySortingEnabled, setCategorySortingEnabled] = useState(false); const [categoryOrderSaving, setCategoryOrderSaving] = useState(false); const [categoryOrderMessage, setCategoryOrderMessage] = useState(""); const [mode, setMode] = useState<SearchMode>(() => { const saved = localStorage.getItem("hfdz-navigation:search-mode"); return saved && saved in searchLabels ? saved as SearchMode : "local"; });
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
  return <main className="portal-page portal-start-page" id="main-content" data-portal-palette={palette} data-density={config.settings.density}><PortalBackground src={background ?? portalAppearance.backgroundImage} fallbackSrc={portalAppearance.backgroundImage} mobileSrc={portalAppearance.mobileBackgroundImage} /><section className="portal-glass portal-start-glass" aria-label="HFDZ Home">
    <header className="portal-toolbar"><Link className="portal-brand" to="/" aria-label="HFDZ Home"><img src={config.settings.brandIconUrl ?? "/favicon.svg"} alt="" referrerPolicy="no-referrer" onError={(event) => { if (!event.currentTarget.src.endsWith("/favicon.svg")) event.currentTarget.src = "/favicon.svg"; }} /><strong>HFDZ</strong><span>Home</span></Link><form className="portal-search" onSubmit={submitSearch}><select aria-label="搜索方式" value={mode} onChange={(event) => chooseMode(event.target.value as SearchMode)}>{Object.entries(searchLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><Search size={18} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === "local" ? "搜索网站、域名或分类" : `使用 ${searchLabels[mode]} 搜索`} aria-label="搜索" /><button type="submit" aria-label="提交搜索"><ArrowUpRight size={17} /></button></form><div className="portal-tools"><PortalPalettePicker value={palette} onChange={(value) => setPalette(portalPaletteStore.set(value))} /><PortalBackgroundSettings currentUrl={background} onApply={(url) => setBackground(portalBackgroundStore.set(url))} onReset={() => { portalBackgroundStore.clear(); setBackground(null); }} /><button className="portal-tool-icon" type="button" onClick={onTheme} aria-label={dark ? "切换浅色模式" : "切换深色模式"}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><Link className="portal-tool-icon" to="/manage" aria-label="设置与管理网站" title="设置与管理网站"><Settings size={18} /></Link></div></header>
    {(config.settings.clockEnabled || config.settings.weatherEnabled) && <div className="portal-widgets">{config.settings.clockEnabled && <EnhancedClockWidget />}{config.settings.weatherEnabled && <EnhancedWeatherWidget config={config} />}</div>}
    <DndContext sensors={categorySensors} collisionDetection={closestCenter} onDragEnd={(event) => void finishCategoryDrag(event)}><nav className={`portal-categories${categorySortingEnabled && !categoryOrderSaving ? " is-sortable" : ""}`} aria-label="网站分类" aria-busy={categoryOrderSaving}><button className={categoryId === "all" ? "active" : ""} onClick={() => { setCategoryId("all"); setFolderId(null); }}>全部</button><SortableContext items={categories.map((category) => category.id)} strategy={horizontalListSortingStrategy}>{categories.map((category) => <SortableCategory category={category} active={categoryId === category.id} enabled={categorySortingEnabled && !categoryOrderSaving} key={category.id} onSelect={() => { setCategoryId(category.id); setFolderId(null); }} />)}</SortableContext></nav></DndContext>
    <p className="portal-category-status" aria-live="polite">{categoryOrderMessage}</p>
    {currentFolder && <div className="portal-breadcrumb"><button type="button" onClick={() => setFolderId(null)}><ArrowLeft size={16} />返回</button><span>/</span><strong>{currentFolder.name}</strong></div>}
    <div className="portal-grid portal-compact-grid" aria-live="polite">{visibleFolders.map((folder) => { const count = config.sites.filter((site) => site.folderId === folder.id).length; return <button className="portal-link portal-folder" key={folder.id} onClick={() => setFolderId(folder.id)}><span className="portal-icon"><Folder size={23} /></span><span className="portal-link-copy"><strong>{folder.name}</strong><span className="portal-description">{count} 个网站</span><span className="portal-hostname">打开文件夹</span></span><ArrowUpRight className="portal-link-arrow" size={17} /></button>; })}{visibleSites.map((site) => <a className="portal-link" href={site.url} key={site.id}><span className="portal-icon" aria-hidden="true"><ManagedPortalIcon iconUrl={site.iconUrl} hostname={site.hostname} /></span><span className="portal-link-copy"><span className="portal-link-heading"><strong>{site.name}</strong>{site.access === "authenticated" && <LockKeyhole size={12} aria-label="登录使用" />}</span><span className="portal-description">{site.description}</span><span className="portal-hostname">{site.hostname}</span></span><ArrowUpRight className="portal-link-arrow" size={17} aria-hidden="true" /></a>)}</div>{!visibleFolders.length && !visibleSites.length && <p className="portal-empty">没有找到匹配的网站。</p>}
  </section></main>;
}
