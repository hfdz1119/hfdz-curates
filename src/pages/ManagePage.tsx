import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronRight, Download, Folder, FolderTree, GripVertical, Image, LibraryBig, Link2, LogOut, Pencil, Plus, RotateCcw, Save, ScanSearch, Trash2, Upload, X } from "lucide-react";
import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PortalBackground } from "../components/PortalBackground";
import { PortalBackgroundSettings, PortalImageSettings } from "../components/PortalBackgroundSettings";
import { portalAppearance } from "../data/portalAppearance";
import { defaultPortalCategory, defaultPortalSettings, type ManagedPortalSite, type PortalCategory, type PortalConfig, type PortalFolder, type PortalSettings } from "../data/portalSites";
import { filterBookmarksByDestinations, groupBookmarkCandidates, parseBookmarkFile, type BookmarkCandidate } from "../lib/bookmarkImport";
import { portalApi, type BackupSummary, type BookmarkImportPreview, type PortalBackup } from "../lib/portalApi";
import { portalManageBackgroundStore } from "../stores/portalBackground";
import { portalPaletteStore } from "../stores/portalPalette";

type Draft = Omit<ManagedPortalSite, "id" | "hostname" | "order">;
type PendingImport = { backup: PortalBackup; summary: BackupSummary };
type PendingBookmarks = { bookmarks: BookmarkCandidate[]; preview: BookmarkImportPreview; fileName: string; selectedKeys: string[]; previewing: boolean };
type ManageSection = "sites" | "catalog" | "appearance" | "backup";
const blankDraft = (category = defaultPortalCategory): Draft => ({ name: "", description: "", url: "", iconUrl: "", category: category.name, categoryId: category.id, folderId: undefined, emphasis: "standard", access: "public", visibility: "public", pinned: false });

function toDraft(site: ManagedPortalSite): Draft { const { id: _id, hostname: _hostname, order: _order, ...draft } = site; return draft; }
function sortSites(sites: ManagedPortalSite[], pinned: boolean) { return sites.filter((site) => site.pinned === pinned).sort((a, b) => a.order - b.order); }
function withOrders(sites: ManagedPortalSite[], pinnedIds: string[], regularIds: string[]) { const orderById = new Map([...pinnedIds.map((id, order) => [id, order] as const), ...regularIds.map((id, order) => [id, order] as const)]); return sites.map((site) => ({ ...site, order: orderById.get(site.id) ?? site.order })); }
function sameSiteGroup(first: ManagedPortalSite, second: ManagedPortalSite) { return first.pinned === second.pinned && first.categoryId === second.categoryId && (first.folderId ?? "") === (second.folderId ?? ""); }

function BookmarkSelectionCheckbox({ label, count, checked, indeterminate, onChange }: { label: string; count: number; checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = Boolean(indeterminate); }, [indeterminate]);
  return <label className="manage-bookmark-check"><input ref={ref} type="checkbox" checked={checked} aria-checked={indeterminate ? "mixed" : checked} onChange={onChange} /><span>{label}</span><small>{count}</small></label>;
}

export function ManagePage({ onBrandIconChange }: { onBrandIconChange: (url: string) => void }) {
  const [background, setBackground] = useState(() => portalManageBackgroundStore.get());
  const [palette] = useState(() => portalPaletteStore.get());
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [sites, setSites] = useState<ManagedPortalSite[]>([]);
  const [categories, setCategories] = useState<PortalCategory[]>([defaultPortalCategory]);
  const [folders, setFolders] = useState<PortalFolder[]>([]);
  const [settings, setSettings] = useState<PortalSettings>(defaultPortalSettings);
  const [categoryName, setCategoryName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderCategoryId, setFolderCategoryId] = useState(defaultPortalCategory.id);
  const [manageSection, setManageSection] = useState<ManageSection>("sites");
  const [configError, setConfigError] = useState("");
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [editing, setEditing] = useState<ManagedPortalSite | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [metadataBusy, setMetadataBusy] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingBookmarks, setPendingBookmarks] = useState<PendingBookmarks | null>(null);
  const [rollbackAvailable, setRollbackAvailable] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [rootOnly, setRootOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [targetCategoryId, setTargetCategoryId] = useState(defaultPortalCategory.id);
  const [targetFolderId, setTargetFolderId] = useState("");
  const importInput = useRef<HTMLInputElement>(null);
  const bookmarkInput = useRef<HTMLInputElement>(null);
  const editorPanel = useRef<HTMLFormElement>(null);
  const bookmarkPreviewRequest = useRef(0);
  const pinnedSites = useMemo(() => sortSites(sites, true), [sites]);
  const regularSites = useMemo(() => sortSites(sites, false), [sites]);
  const bookmarkGroups = useMemo(() => pendingBookmarks ? groupBookmarkCandidates(pendingBookmarks.bookmarks) : [], [pendingBookmarks?.bookmarks]);
  const selectedBookmarkCount = useMemo(() => pendingBookmarks ? filterBookmarksByDestinations(pendingBookmarks.bookmarks, pendingBookmarks.selectedKeys).length : 0, [pendingBookmarks]);
  const filteredSites = useMemo(() => { const needle = filterQuery.trim().toLocaleLowerCase(); return sites.filter((site) => { const folder = folders.find((item) => item.id === site.folderId); const category = categories.find((item) => item.id === site.categoryId); return (filterCategoryId === "all" || site.categoryId === filterCategoryId) && (!rootOnly || !site.folderId) && (!needle || [site.name, site.description, site.hostname, category?.name, folder?.name].some((value) => value?.toLocaleLowerCase().includes(needle))); }); }, [sites, folders, categories, filterQuery, filterCategoryId, rootOnly]);
  const filteredSiteIds = useMemo(() => new Set(filteredSites.map((site) => site.id)), [filteredSites]);

  useEffect(() => {
    void portalApi.session().then(({ authenticated: loggedIn }) => {
      setAuthenticated(loggedIn);
      if (loggedIn) void loadSites();
    }).catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    if (!editorOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) setEditorOpen(false); };
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => editorPanel.current?.querySelector<HTMLInputElement>('input[type="url"]')?.focus());
    window.addEventListener("keydown", closeOnEscape);
    return () => { window.cancelAnimationFrame(focusFrame); window.removeEventListener("keydown", closeOnEscape); document.documentElement.style.overflow = previousOverflow; };
  }, [editorOpen, busy]);

  function applyConfig(config: PortalConfig) { setSites(config.sites); setCategories(config.categories); setFolders(config.folders); setSettings(config.settings); setTargetCategoryId((current) => config.categories.some((category) => category.id === current) ? current : config.categories[0].id); setFolderCategoryId((current) => config.categories.some((category) => category.id === current) ? current : config.categories[0].id); setSelectedIds(new Set()); onBrandIconChange(config.settings.brandIconUrl ?? "/favicon.svg"); setEditing(null); setEditorOpen(false); setDraft(blankDraft(config.categories[0])); }

  function applyConfigPreservingContext(config: PortalConfig) {
    setSites(config.sites); setCategories(config.categories); setFolders(config.folders); setSettings(config.settings);
    setTargetCategoryId((current) => config.categories.some((category) => category.id === current) ? current : config.categories[0].id);
    setFolderCategoryId((current) => config.categories.some((category) => category.id === current) ? current : config.categories[0].id);
    onBrandIconChange(config.settings.brandIconUrl ?? "/favicon.svg");
    if (editing) {
      const savedSite = config.sites.find((site) => site.id === editing.id);
      if (savedSite) setEditing(savedSite);
    }
  }

  async function loadSites() {
    applyConfig(await portalApi.sites());
    const rollback = await portalApi.rollbackStatus().catch(() => ({ available: false, createdAt: null }));
    setRollbackAvailable(rollback.available);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try { await portalApi.login(password); setPassword(""); setAuthenticated(true); await loadSites(); }
    catch { setMessage("密码不正确，或管理服务还没有配置完成。"); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      if (editing) {
        const { site } = await portalApi.update({ ...editing, ...draft });
        setSites((current) => current.map((item) => item.id === site.id ? site : item));
        setMessage("已保存。");
      } else {
        const { site } = await portalApi.create(draft);
        setSites((current) => [...current, site]);
        setMessage("网站已加入首页。");
      }
      setEditing(null); setDraft(blankDraft(categories[0])); setEditorOpen(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败，请稍后重试。"); }
    finally { setBusy(false); }
  }

  async function recognizeSite() {
    if (!draft.url.trim()) return;
    setMetadataBusy(true); setMessage("");
    try {
      const metadata = await portalApi.metadata(draft.url.trim());
      setDraft((current) => ({ ...current, name: current.name || metadata.title, description: current.description || metadata.description, iconUrl: current.iconUrl || metadata.iconUrl }));
      setMessage(metadata.title || metadata.description || metadata.iconUrl ? "网站信息已识别，已有内容保持不变。" : "网站没有提供可用的名称、简介或图标。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "网站信息识别失败，你仍可手动填写。"); }
    finally { setMetadataBusy(false); }
  }

  async function remove(site: ManagedPortalSite) {
    if (!window.confirm(`确定移除“${site.name}”吗？`)) return;
    setBusy(true); setMessage("");
    try { await portalApi.remove(site.id); setSites((current) => current.filter((item) => item.id !== site.id)); setMessage("已移除。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "删除失败，请稍后重试。"); }
    finally { setBusy(false); }
  }

  async function persistOrder(nextPinnedIds: string[], nextRegularIds: string[]) {
    const previous = sites;
    setSites(withOrders(previous, nextPinnedIds, nextRegularIds)); setBusy(true); setMessage("");
    try { const result = await portalApi.reorder(nextPinnedIds, nextRegularIds); setSites(result.sites); setMessage("网站顺序已保存。"); }
    catch (error) { setSites(previous); setMessage(error instanceof Error ? error.message : "排序保存失败。"); }
    finally { setBusy(false); setDraggedId(null); setDragOverId(null); }
  }

  function move(site: ManagedPortalSite, direction: -1 | 1) {
    const group = (site.pinned ? pinnedSites : regularSites).filter((item) => sameSiteGroup(item, site));
    const index = group.findIndex((item) => item.id === site.id);
    if (!group[index + direction] || busy) return;
    const groupIds = group.map((item) => item.id);
    [groupIds[index], groupIds[index + direction]] = [groupIds[index + direction], groupIds[index]];
    const source = site.pinned ? pinnedSites : regularSites;
    let replacementIndex = 0;
    const ids = source.map((item) => sameSiteGroup(item, site) ? groupIds[replacementIndex++] : item.id);
    void persistOrder(site.pinned ? ids : pinnedSites.map((item) => item.id), site.pinned ? regularSites.map((item) => item.id) : ids);
  }

  function dragStart(event: DragEvent<HTMLButtonElement>, site: ManagedPortalSite) { if (busy) { event.preventDefault(); return; } event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", site.id); setDraggedId(site.id); }
  function dragOver(event: DragEvent<HTMLElement>, site: ManagedPortalSite) { const dragged = sites.find((item) => item.id === draggedId); if (!dragged || !sameSiteGroup(dragged, site) || dragged.id === site.id) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverId(site.id); }
  function drop(event: DragEvent<HTMLElement>, target: ManagedPortalSite) {
    event.preventDefault();
    const source = sites.find((item) => item.id === draggedId);
    if (!source || !sameSiteGroup(source, target) || source.id === target.id) { setDraggedId(null); setDragOverId(null); return; }
    const allGroup = (source.pinned ? pinnedSites : regularSites);
    const groupIds = allGroup.filter((item) => sameSiteGroup(item, source)).map((item) => item.id).filter((id) => id !== source.id);
    groupIds.splice(groupIds.indexOf(target.id), 0, source.id);
    let replacementIndex = 0;
    const ids = allGroup.map((item) => sameSiteGroup(item, source) ? groupIds[replacementIndex++] : item.id);
    void persistOrder(source.pinned ? ids : pinnedSites.map((item) => item.id), source.pinned ? regularSites.map((item) => item.id) : ids);
  }

  async function exportConfig() {
    setBusy(true); setMessage("");
    try {
      const backup = await portalApi.exportConfig();
      const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = blobUrl; link.download = `hfdz-home-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(blobUrl);
      setMessage("配置备份已导出。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "导出失败。"); }
    finally { setBusy(false); }
  }

  async function selectImport(file?: File) {
    if (!file) return;
    setBusy(true); setMessage(""); setPendingImport(null);
    try {
      if (file.size > 1024 * 1024) throw new Error("备份文件不能超过 1 MB。");
      const backup = JSON.parse(await file.text()) as PortalBackup;
      const { summary } = await portalApi.previewImport(backup);
      setPendingImport({ backup, summary });
    } catch (error) { setMessage(error instanceof Error ? error.message : "备份文件无效。"); }
    finally { setBusy(false); if (importInput.current) importInput.current.value = ""; }
  }

  async function applyImport() {
    if (!pendingImport) return;
    setBusy(true); setMessage("");
    try { const result = await portalApi.applyImport(pendingImport.backup); applyConfig(result.config); setPendingImport(null); setRollbackAvailable(result.rollbackAvailable); setMessage("备份已恢复，可在 24 小时内撤销本次导入。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "备份恢复失败。"); }
    finally { setBusy(false); }
  }

  async function selectBookmarks(file?: File) {
    if (!file) return;
    setBusy(true); setMessage(""); setPendingBookmarks(null);
    try {
      const bookmarks = await parseBookmarkFile(file);
      const preview = await portalApi.previewBookmarks(bookmarks);
      const selectedKeys = groupBookmarkCandidates(bookmarks).flatMap((category) => category.destinations.map((destination) => destination.key));
      setPendingBookmarks({ bookmarks, preview, fileName: file.name, selectedKeys, previewing: false });
      if (preview.errors.length) setMessage(preview.errors.join(" "));
    } catch (error) { setMessage(error instanceof Error ? error.message : "书签文件无法读取。"); }
    finally { setBusy(false); if (bookmarkInput.current) bookmarkInput.current.value = ""; }
  }

  async function refreshBookmarkPreview(selectedKeys: string[]) {
    if (!pendingBookmarks) return;
    const requestId = ++bookmarkPreviewRequest.current;
    const bookmarks = filterBookmarksByDestinations(pendingBookmarks.bookmarks, selectedKeys);
    setPendingBookmarks((current) => current ? { ...current, selectedKeys, previewing: true } : current);
    setMessage("");
    try {
      const preview = await portalApi.previewBookmarks(bookmarks);
      if (requestId !== bookmarkPreviewRequest.current) return;
      setPendingBookmarks((current) => current ? { ...current, selectedKeys, preview, previewing: false } : current);
      if (preview.errors.length) setMessage(preview.errors.join(" "));
    } catch (error) {
      if (requestId !== bookmarkPreviewRequest.current) return;
      setPendingBookmarks((current) => current ? { ...current, previewing: false, preview: { ...current.preview, summary: { ...current.preview.summary, source: bookmarks.length, addable: 0, blocked: true }, errors: ["书签预览更新失败，请重试。"] } } : current);
      setMessage(error instanceof Error ? error.message : "书签预览更新失败。");
    }
  }

  function toggleBookmarkDestination(key: string) {
    if (!pendingBookmarks) return;
    const selected = new Set(pendingBookmarks.selectedKeys);
    if (selected.has(key)) selected.delete(key); else selected.add(key);
    void refreshBookmarkPreview([...selected]);
  }

  function toggleBookmarkCategory(keys: string[]) {
    if (!pendingBookmarks) return;
    const selected = new Set(pendingBookmarks.selectedKeys);
    if (keys.every((key) => selected.has(key))) keys.forEach((key) => selected.delete(key)); else keys.forEach((key) => selected.add(key));
    void refreshBookmarkPreview([...selected]);
  }

  async function applyBookmarks() {
    if (!pendingBookmarks || pendingBookmarks.preview.summary.blocked || pendingBookmarks.previewing) return;
    setBusy(true); setMessage("");
    try {
      const result = await portalApi.applyBookmarks(filterBookmarksByDestinations(pendingBookmarks.bookmarks, pendingBookmarks.selectedKeys));
      applyConfig(result.config); setPendingBookmarks(null); setRollbackAvailable(result.rollbackAvailable);
      setMessage(`已导入 ${result.summary.addable} 个书签，可在 24 小时内撤销本次导入。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "书签导入失败。"); }
    finally { setBusy(false); }
  }

  async function rollbackImport() {
    if (!window.confirm("确定撤销最近一次配置导入吗？")) return;
    setBusy(true); setMessage("");
    try { const result = await portalApi.rollbackImport(); applyConfig(result.config); setRollbackAvailable(false); setMessage("已恢复到导入前的配置。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "无法撤销导入。"); }
    finally { setBusy(false); }
  }

  async function logout() { await portalApi.logout(); setAuthenticated(false); setSites([]); setEditing(null); setEditorOpen(false); setDraft(blankDraft(categories[0])); setPendingImport(null); setPendingBookmarks(null); setRollbackAvailable(false); }
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function savePortalConfig(nextCategories = categories, nextFolders = folders, nextSettings = settings) {
    setBusy(true); setMessage("");
    try { const saved = await portalApi.saveConfig({ categories: nextCategories, folders: nextFolders, settings: nextSettings }); applyConfigPreservingContext(saved); setMessage("首页配置已保存。"); return saved; }
    catch (error) { setMessage(error instanceof Error ? error.message : "配置保存失败。"); }
    finally { setBusy(false); }
  }

  async function saveBrandIcon(brandIconUrl?: string) {
    setBusy(true); setMessage("");
    try {
      const nextSettings = { ...settings, brandIconUrl };
      const saved = await portalApi.saveConfig({ categories, folders, settings: nextSettings });
      applyConfig(saved); setMessage(brandIconUrl ? "品牌头像已更新。" : "品牌头像已恢复默认。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "品牌头像保存失败。");
      throw error;
    } finally { setBusy(false); }
  }

  async function removeFolder(folder: PortalFolder) {
    if (!window.confirm(`确定删除文件夹“${folder.name}”吗？文件夹必须为空。`)) return;
    setBusy(true); setMessage("");
    try { const saved = await portalApi.deleteFolder(folder.id); applyConfig(saved); setExpandedFolders((current) => { const next = new Set(current); next.delete(folder.id); return next; }); setMessage("空文件夹已删除。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "文件夹删除失败。"); }
    finally { setBusy(false); }
  }

  async function bulkMove(siteIds: string[], categoryId: string, folderId?: string | null) {
    if (!siteIds.length) return;
    setBusy(true); setMessage("");
    try { const result = await portalApi.bulkMove(siteIds, categoryId, folderId); applyConfig(result.config); setMessage(`已移动 ${siteIds.length} 个网站。`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "网站移动失败。"); }
    finally { setBusy(false); setDraggedId(null); setDragOverId(null); }
  }

  async function removeCategory(category: PortalCategory) {
    if (!window.confirm(`确定删除空分类“${category.name}”吗？`)) return;
    setBusy(true); setMessage("");
    try { const result = await portalApi.deleteCategory(category.id); applyConfig(result.config); setMessage("空分类已删除。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "分类删除失败。"); }
    finally { setBusy(false); }
  }

  function dropInto(event: DragEvent<HTMLElement>, categoryId: string, folderId?: string) { event.preventDefault(); const id = draggedId || event.dataTransfer.getData("text/plain"); if (id) void bulkMove([id], categoryId, folderId || null); }
  function toggleSelection(id: string) { setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  function renderSiteGroup(groupSites: ManagedPortalSite[], groupKey: string) {
    return ([true, false] as const).map((pinned) => {
      const ordered = groupSites.filter((site) => site.pinned === pinned && filteredSiteIds.has(site.id)).sort((a, b) => a.order - b.order);
      if (!ordered.length) return null;
      return <div className="manage-site-priority" key={`${groupKey}-${pinned}`}><p className="manage-site-group-label">{pinned ? "置顶" : "普通"}</p>{ordered.map((site, index) => <article className={`manage-site${draggedId === site.id ? " is-dragging" : ""}${dragOverId === site.id ? " is-drag-over" : ""}`} key={site.id} onDragOver={(event) => dragOver(event, site)} onDrop={(event) => drop(event, site)}><label className="manage-site-select"><input type="checkbox" checked={selectedIds.has(site.id)} onChange={() => toggleSelection(site.id)} aria-label={`选择 ${site.name}`} /></label><button className="manage-drag-handle" type="button" draggable={!busy} onDragStart={(event) => dragStart(event, site)} onDragEnd={() => { setDraggedId(null); setDragOverId(null); }} aria-label={`拖动排序 ${site.name}`} title="拖动排序"><GripVertical size={16} /></button><div className="manage-site-copy"><strong>{site.name}{site.visibility === "private" && <small>私密</small>}</strong><span>{site.hostname}</span></div><div className="manage-site-actions"><button type="button" onClick={() => move(site, -1)} disabled={busy || index === 0} aria-label={`上移 ${site.name}`}><ArrowUp size={15} /></button><button type="button" onClick={() => move(site, 1)} disabled={busy || index === ordered.length - 1} aria-label={`下移 ${site.name}`}><ArrowDown size={15} /></button><button type="button" onClick={() => { setEditing(site); setDraft(toDraft(site)); setMessage(""); setEditorOpen(true); }} aria-label={`编辑 ${site.name}`} title="编辑"><Pencil size={15} /></button><button type="button" className="manage-delete" onClick={() => void remove(site)} aria-label={`移除 ${site.name}`} title="删除"><Trash2 size={15} /></button></div></article>)}</div>;
    });
  }

  async function addCategory() {
    const name = categoryName.trim();
    if (!name) { setConfigError("请输入分类名称。"); return; }
    if (categories.some((category) => category.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) { setConfigError("已经存在同名分类。"); return; }
    setConfigError("");
    const next = [...categories, { id: `category-${crypto.randomUUID()}`, name, order: categories.length, hidden: false, palette: "aurora" as const, visibility: "public" as const }];
    const saved = await savePortalConfig(next);
    if (saved) { setCategoryName(""); setFolderCategoryId(next[next.length - 1].id); setMessage(`分类“${name}”已添加。`); }
  }

  async function addFolder() {
    const name = folderName.trim();
    if (!name) { setConfigError("请输入文件夹名称。"); return; }
    if (!categories.some((category) => category.id === folderCategoryId)) { setConfigError("请选择有效的所属分类。"); return; }
    if (folders.some((folder) => folder.categoryId === folderCategoryId && folder.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) { setConfigError("这个分类中已经存在同名文件夹。"); return; }
    setConfigError("");
    const next = [...folders, { id: `folder-${crypto.randomUUID()}`, name, categoryId: folderCategoryId, order: folders.length }];
    const saved = await savePortalConfig(categories, next);
    if (saved) { setFolderName(""); setExpandedFolders((current) => new Set(current).add(next[next.length - 1].id)); setMessage(`文件夹“${name}”已添加。`); }
  }

  function changeFolderCategory(folder: PortalFolder, categoryId: string) {
    if (folder.categoryId === categoryId) return;
    if (sites.some((site) => site.folderId === folder.id)) { setConfigError(`文件夹“${folder.name}”中仍有网站，请先移动这些网站。`); return; }
    setConfigError("");
    setFolders((current) => current.map((item) => item.id === folder.id ? { ...item, categoryId } : item));
  }

  return <main className="portal-page portal-manage-page" id="main-content" data-portal-palette={palette} data-root-only={rootOnly || undefined} data-manage-section={manageSection}>
    <PortalBackground src={background ?? portalAppearance.backgroundImage} fallbackSrc={portalAppearance.backgroundImage} mobileSrc={portalAppearance.mobileBackgroundImage} />
    <section className="portal-glass manage-glass" aria-labelledby="manage-title">
      {authenticated === null ? <p className="manage-loading">正在确认管理会话…</p> : !authenticated ? <form className="manage-login" onSubmit={login}>
        <p className="portal-kicker">Private management</p><h1 id="manage-title">管理入口</h1><p>登录后可在线维护首页网站；公开访客不会看到此页面的内容。</p>
        <label>管理密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {message && <p className="manage-message" role="alert">{message}</p>}
        <button className="manage-primary" disabled={busy}>{busy ? "正在登录…" : "进入管理"}</button>
      </form> : <>
        <header className="manage-header"><div><p className="portal-kicker">Private management</p><h1 id="manage-title">管理入口</h1><p>在线维护你的公开站点入口。</p></div><div className="manage-header-actions"><PortalBackgroundSettings target="管理页" currentUrl={background} onApply={(url) => setBackground(portalManageBackgroundStore.set(url))} onReset={() => { portalManageBackgroundStore.clear(); setBackground(null); }} /><PortalImageSettings currentUrl={settings.brandIconUrl ?? null} onApply={(url) => saveBrandIcon(url)} onReset={() => saveBrandIcon()} triggerLabel="品牌头像" dialogTitle="设置品牌头像" dialogDescription="这个头像会同步到 HFDZ 顶栏和浏览器标签。" helpText="仅接受 HTTPS；保存到首页配置后会同步所有访客和设备。" emptyPreviewText="粘贴图片直链后可先预览" previewAlt="HFDZ 品牌头像预览" applyLabel="应用头像" previewShape="square" validationLabel="品牌头像" /><Link className="manage-quiet" to="/"><ArrowLeft size={16} aria-hidden="true" />返回首页</Link><button className="manage-quiet" onClick={() => void logout()}><LogOut size={16} aria-hidden="true" />退出</button></div></header>
        <nav className="manage-sidebar" aria-label="管理分区">{([["sites", "网站入口", Link2], ["catalog", "分类与文件夹", FolderTree], ["appearance", "外观设置", Image], ["backup", "导入与备份", Download]] as const).map(([id, label, Icon]) => <button type="button" key={id} className={manageSection === id ? "is-active" : ""} aria-current={manageSection === id ? "page" : undefined} onClick={() => setManageSection(id)}><Icon size={17} aria-hidden="true" /><span>{label}</span><small>{id === "sites" ? sites.length : id === "catalog" ? categories.length + folders.length : ""}</small></button>)}</nav>
        {configError && <p className="manage-config-error" role="alert">{configError}</p>}
        {manageSection === "sites" && <button type="button" className="manage-primary manage-add-site manage-add-site-top" onClick={() => { setEditing(null); setDraft(blankDraft(categories[0])); setMessage(""); setEditorOpen(true); }}><Plus size={16} />添加网站</button>}
        <div className={`manage-workspace manage-section-${manageSection}`}>
        <div className="manage-list-tools"><div className="manage-filter-bar"><input type="search" value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder="搜索网站、域名、分类或文件夹" aria-label="搜索网站" /><select value={filterCategoryId} onChange={(event) => setFilterCategoryId(event.target.value)} aria-label="按分类筛选"><option value="all">全部分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name} · {sites.filter((site) => site.categoryId === category.id).length}</option>)}</select><label className="manage-check"><input type="checkbox" checked={rootOnly} onChange={(event) => setRootOnly(event.target.checked)} />只看未分文件夹</label><button type="button" onClick={() => setSelectedIds(new Set(filteredSites.map((site) => site.id)))} disabled={!filteredSites.length}>选择当前结果</button><button type="button" onClick={() => setSelectedIds(new Set())} disabled={!selectedIds.size}>清空选择</button></div>{selectedIds.size > 0 && <div className="manage-bulk-bar"><strong>已选择 {selectedIds.size} 个网站</strong><select value={targetCategoryId} onChange={(event) => { setTargetCategoryId(event.target.value); setTargetFolderId(""); }} aria-label="目标分类">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select value={targetFolderId} onChange={(event) => setTargetFolderId(event.target.value)} aria-label="目标文件夹"><option value="">根目录</option>{folders.filter((folder) => folder.categoryId === targetCategoryId).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select><button type="button" className="manage-primary" onClick={() => void bulkMove([...selectedIds], targetCategoryId, targetFolderId || null)} disabled={busy}>移动</button></div>}</div>
        <div className="manage-move-targets" aria-label="拖放移动目标">{categories.map((category) => <div key={category.id}><strong>{category.name} {sites.filter((site) => site.categoryId === category.id).length}</strong><button type="button" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropInto(event, category.id)}>未分文件夹 {sites.filter((site) => site.categoryId === category.id && !site.folderId).length}</button>{folders.filter((folder) => folder.categoryId === category.id).map((folder) => <button type="button" key={folder.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropInto(event, category.id, folder.id)}>{folder.name} {sites.filter((site) => site.folderId === folder.id).length}</button>)}</div>)}</div>
        <div className="manage-layout">
          {editorOpen && <button className="manage-drawer-backdrop" type="button" aria-label="关闭网站编辑面板" onClick={() => { if (!busy) setEditorOpen(false); }} />}
          <form ref={editorPanel} className={`manage-editor manage-site-editor${editorOpen ? " is-open" : ""}`} onSubmit={save} aria-hidden={!editorOpen} role="dialog" aria-modal={editorOpen || undefined} aria-label={editing ? "编辑网站" : "添加网站"}>
            <div className="manage-editor-heading"><div><p className="manage-editor-eyebrow">网站入口</p><h2>{editing ? "编辑网站" : "添加网站"}</h2><p>保存后首页会立即读取新列表。</p></div><button type="button" className="manage-icon-button" aria-label="关闭编辑面板" onClick={() => { if (!busy) { setEditing(null); setEditorOpen(false); setDraft(blankDraft(categories[0])); } }}><X size={17} /></button></div>
            <label>网站地址<span className="manage-url-row"><input type="url" placeholder="https://example.com" value={draft.url} onChange={(event) => change("url", event.target.value)} required /><button type="button" onClick={() => void recognizeSite()} disabled={busy || metadataBusy || !draft.url.trim()}><ScanSearch size={16} />{metadataBusy ? "识别中…" : "识别网站"}</button></span></label>
            <label>网站名称<input maxLength={80} value={draft.name} onChange={(event) => change("name", event.target.value)} required /></label>
            <label>简介<input maxLength={180} value={draft.description} onChange={(event) => change("description", event.target.value)} required /></label>
            <div className="manage-field-row"><label>分类<select value={draft.categoryId} onChange={(event) => { const category = categories.find((item) => item.id === event.target.value) ?? categories[0]; setDraft((current) => ({ ...current, categoryId: category.id, category: category.name, folderId: undefined })); }}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>文件夹<select value={draft.folderId ?? ""} onChange={(event) => change("folderId", event.target.value || undefined)}><option value="">不放入文件夹</option>{folders.filter((folder) => folder.categoryId === draft.categoryId).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></div>
            <div className="manage-field-row"><label>展示方式<select value={draft.emphasis} onChange={(event) => change("emphasis", event.target.value as Draft["emphasis"])}><option value="standard">普通</option><option value="primary">重点</option></select></label><label>目标网站访问<select value={draft.access} onChange={(event) => change("access", event.target.value as Draft["access"])}><option value="public">无需登录</option><option value="authenticated">需要登录</option></select></label></div>
            <label>首页可见性<select value={draft.visibility} onChange={(event) => change("visibility", event.target.value as Draft["visibility"])}><option value="public">公开</option><option value="private">私密，仅管理页可见</option></select></label>
            <label>图标地址 <span>（可选）</span><input type="url" placeholder="留空则自动读取网站图标" value={draft.iconUrl} onChange={(event) => change("iconUrl", event.target.value)} /></label>
            <label className="manage-check"><input type="checkbox" checked={draft.pinned} onChange={(event) => change("pinned", event.target.checked)} />置顶显示</label>
            {message && <p className="manage-message" role="status">{message}</p>}
            <button className="manage-primary" disabled={busy || metadataBusy}><Save size={16} />{busy ? "正在保存…" : editing ? "保存修改" : "添加到首页"}</button>
          </form>
          <section className="manage-list" aria-label="已收录网站"><div className="manage-list-heading"><div><h2>已收录</h2><p>{sites.length} 个入口 · 按分类和文件夹收纳</p></div><Folder size={18} aria-hidden="true" /></div><div className="manage-catalog-groups">{categories.slice().sort((a, b) => a.order - b.order).map((category) => { const categorySites = sites.filter((site) => site.categoryId === category.id); const categoryFolders = folders.filter((folder) => folder.categoryId === category.id).sort((a, b) => a.order - b.order); const rootSites = categorySites.filter((site) => !site.folderId); if (!categorySites.length && !categoryFolders.length) return null; return <section className="manage-category-group" key={category.id} aria-labelledby={`manage-category-${category.id}`}><header><h3 id={`manage-category-${category.id}`}>{category.name}</h3><span>{categorySites.length} 个网站</span></header>{rootSites.length > 0 && <div className="manage-folder-group is-expanded"><div className="manage-folder-heading is-static"><span><Folder size={16} aria-hidden="true" />未分文件夹</span><small>{rootSites.length}</small></div><div className="manage-folder-sites">{renderSiteGroup(rootSites, `${category.id}-root`)}</div></div>}{categoryFolders.map((folder) => { const folderSites = categorySites.filter((site) => site.folderId === folder.id); const expanded = expandedFolders.has(folder.id); return <div className={`manage-folder-group${expanded ? " is-expanded" : ""}`} key={folder.id}><div className="manage-folder-heading"><button type="button" aria-expanded={expanded} aria-controls={`manage-folder-sites-${folder.id}`} onClick={() => setExpandedFolders((current) => { const next = new Set(current); if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id); return next; })}>{expanded ? <ChevronDown size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}<Folder size={16} aria-hidden="true" /><span>{folder.name}</span><small>{folderSites.length}</small></button><button type="button" className="manage-folder-delete" aria-label={`删除文件夹 ${folder.name}`} title="删除空文件夹" disabled={busy} onClick={() => void removeFolder(folder)}><Trash2 size={15} aria-hidden="true" /></button></div>{expanded && <div className="manage-folder-sites" id={`manage-folder-sites-${folder.id}`}>{folderSites.length ? renderSiteGroup(folderSites, folder.id) : <p className="manage-folder-empty">这个文件夹是空的。</p>}</div>}</div>; })}</section>; })}</div></section>
        </div></div>
        <section className="manage-editor manage-category-privacy"><div className="manage-editor-heading"><div><h2>分类可见性与删除</h2><p>私密分类及其网站和文件夹不会从公开 API 返回。</p></div></div>{categories.map((category) => { const count = sites.filter((site) => site.categoryId === category.id).length; const folderCount = folders.filter((folder) => folder.categoryId === category.id).length; const empty = count === 0 && folderCount === 0; return <div className="manage-category-privacy-row" key={category.id}><strong>{category.name} <small>{count} 个网站</small></strong><select value={category.visibility} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, visibility: event.target.value as PortalCategory["visibility"] } : item))}><option value="public">公开</option><option value="private">私密</option></select><button type="button" className="manage-delete" disabled={busy || !empty || categories.length === 1} title={!empty ? "请先清空分类中的网站和文件夹" : categories.length === 1 ? "至少保留一个分类" : "删除空分类"} onClick={() => void removeCategory(category)}><Trash2 size={15} />删除</button></div>; })}<button className="manage-primary" type="button" disabled={busy} onClick={() => void savePortalConfig()}><Save size={16} />保存可见性</button></section>
        <div className="manage-config-grid">
          <section className="manage-editor manage-config-section"><div className="manage-editor-heading"><div><h2>分类</h2><p>名称、显示状态和顺序</p></div></div><div className="manage-inline-add"><input aria-label="新分类名称" placeholder="新分类名称" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /><button type="button" onClick={() => void addCategory()} disabled={busy}><Plus size={16} />添加</button></div>{categories.slice().sort((a, b) => a.order - b.order).map((category, index, ordered) => <div className="manage-config-row" key={category.id}><input aria-label={`${category.name}分类名称`} value={category.name} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item))} /><select aria-label={`${category.name}配色`} value={category.palette} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, palette: event.target.value as PortalCategory["palette"] } : item))}><option value="aurora">Aurora</option><option value="sakura">Sakura</option><option value="lavender">Lavender</option><option value="sunset">Sunset</option></select><label className="manage-mini-check"><input type="checkbox" checked={!category.hidden} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, hidden: !event.target.checked } : item))} />显示</label><button type="button" aria-label={`上移 ${category.name}`} disabled={index === 0} onClick={() => { const next = [...ordered]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setCategories(next.map((item, order) => ({ ...item, order }))); }}><ArrowUp size={15} /></button><button type="button" aria-label={`下移 ${category.name}`} disabled={index === ordered.length - 1} onClick={() => { const next = [...ordered]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setCategories(next.map((item, order) => ({ ...item, order }))); }}><ArrowDown size={15} /></button></div>)}<button className="manage-primary" type="button" disabled={busy} onClick={() => void savePortalConfig()}><Save size={16} />保存分类</button></section>
          <section className="manage-editor manage-config-section"><div className="manage-editor-heading"><div><h2>文件夹</h2><p>仅支持单层文件夹；删除前必须清空</p></div></div><div className="manage-inline-add"><input aria-label="新文件夹名称" placeholder="新文件夹名称" value={folderName} onChange={(event) => setFolderName(event.target.value)} /><select aria-label="新文件夹所属分类" value={folderCategoryId} onChange={(event) => setFolderCategoryId(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button type="button" onClick={() => void addFolder()} disabled={busy}><Plus size={16} />添加</button></div>{folders.slice().sort((a, b) => a.order - b.order).map((folder, index, ordered) => <div className="manage-config-row manage-folder-row" key={folder.id}><input aria-label={`${folder.name}文件夹名称`} value={folder.name} onChange={(event) => setFolders((current) => current.map((item) => item.id === folder.id ? { ...item, name: event.target.value } : item))} /><select aria-label={`${folder.name}所属分类`} value={folder.categoryId} onChange={(event) => changeFolderCategory(folder, event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button type="button" aria-label={`上移 ${folder.name}`} disabled={index === 0} onClick={() => { const next = [...ordered]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setFolders(next.map((item, order) => ({ ...item, order }))); }}><ArrowUp size={15} /></button><button type="button" aria-label={`下移 ${folder.name}`} disabled={index === ordered.length - 1} onClick={() => { const next = [...ordered]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setFolders(next.map((item, order) => ({ ...item, order }))); }}><ArrowDown size={15} /></button><button type="button" className="manage-delete" aria-label={`删除文件夹 ${folder.name}`} disabled={busy} onClick={() => void removeFolder(folder)}><Trash2 size={15} /></button></div>)}<button className="manage-primary" type="button" disabled={busy} onClick={() => void savePortalConfig()}><Save size={16} />保存文件夹</button></section>
          <section className="manage-editor manage-config-section"><div className="manage-editor-heading"><div><h2>首页组件</h2><p>天气会自动按访问位置显示，以下设置用于定位失败时回退</p></div></div><div className="manage-field-row"><label>回退城市<input value={settings.defaultCity} onChange={(event) => setSettings((current) => ({ ...current, defaultCity: event.target.value }))} /></label><label>布局密度<select value={settings.density} onChange={(event) => setSettings((current) => ({ ...current, density: event.target.value as PortalSettings["density"] }))}><option value="compact">紧凑</option><option value="comfortable">舒适</option></select></label></div><div className="manage-field-row"><label>回退纬度<input type="number" min="-90" max="90" step="any" value={settings.latitude} onChange={(event) => setSettings((current) => ({ ...current, latitude: Number(event.target.value) }))} /></label><label>回退经度<input type="number" min="-180" max="180" step="any" value={settings.longitude} onChange={(event) => setSettings((current) => ({ ...current, longitude: Number(event.target.value) }))} /></label></div><div className="manage-toggle-row"><label className="manage-check"><input type="checkbox" checked={settings.clockEnabled} onChange={(event) => setSettings((current) => ({ ...current, clockEnabled: event.target.checked }))} />显示时间</label><label className="manage-check"><input type="checkbox" checked={settings.weatherEnabled} onChange={(event) => setSettings((current) => ({ ...current, weatherEnabled: event.target.checked }))} />显示天气</label></div><button className="manage-primary" type="button" disabled={busy} onClick={() => void savePortalConfig()}><Save size={16} />保存首页设置</button></section>
          <section className="manage-editor manage-config-section manage-backup-section"><div className="manage-editor-heading"><div><h2>导入与备份</h2><p>合并浏览器书签，或备份整套首页配置</p></div></div><div className="manage-backup-actions"><button type="button" onClick={() => bookmarkInput.current?.click()} disabled={busy}><LibraryBig size={17} />导入书签</button><button type="button" onClick={() => void exportConfig()} disabled={busy}><Download size={17} />导出配置</button><button type="button" onClick={() => importInput.current?.click()} disabled={busy}><Upload size={17} />恢复配置</button>{rollbackAvailable && <button type="button" onClick={() => void rollbackImport()} disabled={busy}><RotateCcw size={17} />撤销最近导入</button>}<input ref={bookmarkInput} type="file" accept=".html,.htm,.xlsx,.xls,.csv,text/html,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void selectBookmarks(event.target.files?.[0])} /><input ref={importInput} type="file" accept="application/json,.json" onChange={(event) => void selectImport(event.target.files?.[0])} /></div>
            {pendingBookmarks && <div className={`manage-import-preview manage-bookmark-preview${pendingBookmarks.preview.summary.blocked ? " is-blocked" : ""}`}>
              <div className="manage-bookmark-summary" aria-live="polite">
                <strong>{pendingBookmarks.previewing ? "正在重新计算…" : pendingBookmarks.preview.summary.blocked ? "书签暂时不能导入" : "书签预览完成"}</strong>
                <span>{pendingBookmarks.fileName} · 已选择 {selectedBookmarkCount} · 可新增 {pendingBookmarks.preview.summary.addable} · 重复 {pendingBookmarks.preview.summary.duplicates} · 无效 {pendingBookmarks.preview.summary.invalid}</span>
                <span>新增分类 {pendingBookmarks.preview.summary.newCategories} · 新增文件夹 {pendingBookmarks.preview.summary.newFolders} · 导入后共 {pendingBookmarks.preview.summary.finalSites} 个网站 · 剩余 {Math.max(0, 100 - pendingBookmarks.preview.summary.finalSites)} 个名额</span>
                {pendingBookmarks.preview.errors.map((error) => <small className="manage-import-error" key={error}>{error}</small>)}
              </div>
              <div className="manage-bookmark-selector" aria-label="选择要导入的书签分组">
                {bookmarkGroups.map((category) => { const keys = category.destinations.map((destination) => destination.key); const selectedCount = keys.filter((key) => pendingBookmarks.selectedKeys.includes(key)).length; return <fieldset key={category.key}><legend><BookmarkSelectionCheckbox label={category.name} count={category.count} checked={selectedCount === keys.length} indeterminate={selectedCount > 0 && selectedCount < keys.length} onChange={() => toggleBookmarkCategory(keys)} /></legend><div>{category.destinations.map((destination) => <BookmarkSelectionCheckbox key={destination.key} label={destination.name} count={destination.count} checked={pendingBookmarks.selectedKeys.includes(destination.key)} onChange={() => toggleBookmarkDestination(destination.key)} />)}</div></fieldset>; })}
              </div>
              <div className="manage-bookmark-actions"><button type="button" onClick={() => setPendingBookmarks(null)} disabled={busy}>取消</button>{!pendingBookmarks.preview.summary.blocked && <button type="button" onClick={() => void applyBookmarks()} disabled={busy || pendingBookmarks.previewing}>确认导入书签</button>}</div>
            </div>}
            {pendingImport && <div className="manage-import-preview" role="status"><div><strong>备份校验通过</strong><span>{pendingImport.summary.sites} 个网站 · {pendingImport.summary.categories} 个分类 · {pendingImport.summary.folders} 个文件夹 · 配置 v{pendingImport.summary.configVersion}</span></div><div><button type="button" onClick={() => setPendingImport(null)} disabled={busy}>取消</button><button className="is-danger" type="button" onClick={() => void applyImport()} disabled={busy}>确认覆盖当前配置</button></div></div>}
          </section>
        </div>
      </>}
    </section>
  </main>;
}
