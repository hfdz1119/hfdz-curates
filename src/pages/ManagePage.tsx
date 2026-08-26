import { ArrowDown, ArrowLeft, ArrowUp, Download, GripVertical, LibraryBig, LogOut, Pencil, Plus, RotateCcw, Save, ScanSearch, Trash2, Upload, X } from "lucide-react";
import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PortalBackground } from "../components/PortalBackground";
import { PortalBackgroundSettings } from "../components/PortalBackgroundSettings";
import { portalAppearance } from "../data/portalAppearance";
import { defaultPortalCategory, defaultPortalSettings, type ManagedPortalSite, type PortalCategory, type PortalConfig, type PortalFolder, type PortalSettings } from "../data/portalSites";
import { parseBookmarkFile, type BookmarkCandidate } from "../lib/bookmarkImport";
import { portalApi, type BackupSummary, type BookmarkImportPreview, type PortalBackup } from "../lib/portalApi";
import { portalBackgroundStore } from "../stores/portalBackground";
import { portalPaletteStore } from "../stores/portalPalette";

type Draft = Omit<ManagedPortalSite, "id" | "hostname" | "order">;
type PendingImport = { backup: PortalBackup; summary: BackupSummary };
type PendingBookmarks = { bookmarks: BookmarkCandidate[]; preview: BookmarkImportPreview; fileName: string };
const blankDraft = (category = defaultPortalCategory): Draft => ({ name: "", description: "", url: "", iconUrl: "", category: category.name, categoryId: category.id, folderId: undefined, emphasis: "standard", access: "public", pinned: false });

function toDraft(site: ManagedPortalSite): Draft { const { id: _id, hostname: _hostname, order: _order, ...draft } = site; return draft; }
function sortSites(sites: ManagedPortalSite[], pinned: boolean) { return sites.filter((site) => site.pinned === pinned).sort((a, b) => a.order - b.order); }
function withOrders(sites: ManagedPortalSite[], pinnedIds: string[], regularIds: string[]) { const orderById = new Map([...pinnedIds.map((id, order) => [id, order] as const), ...regularIds.map((id, order) => [id, order] as const)]); return sites.map((site) => ({ ...site, order: orderById.get(site.id) ?? site.order })); }

export function ManagePage() {
  const [background, setBackground] = useState(() => portalBackgroundStore.get());
  const [palette] = useState(() => portalPaletteStore.get());
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [sites, setSites] = useState<ManagedPortalSite[]>([]);
  const [categories, setCategories] = useState<PortalCategory[]>([defaultPortalCategory]);
  const [folders, setFolders] = useState<PortalFolder[]>([]);
  const [settings, setSettings] = useState<PortalSettings>(defaultPortalSettings);
  const [categoryName, setCategoryName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [editing, setEditing] = useState<ManagedPortalSite | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [metadataBusy, setMetadataBusy] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingBookmarks, setPendingBookmarks] = useState<PendingBookmarks | null>(null);
  const [rollbackAvailable, setRollbackAvailable] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const bookmarkInput = useRef<HTMLInputElement>(null);
  const pinnedSites = useMemo(() => sortSites(sites, true), [sites]);
  const regularSites = useMemo(() => sortSites(sites, false), [sites]);

  useEffect(() => {
    void portalApi.session().then(({ authenticated: loggedIn }) => {
      setAuthenticated(loggedIn);
      if (loggedIn) void loadSites();
    }).catch(() => setAuthenticated(false));
  }, []);

  function applyConfig(config: PortalConfig) { setSites(config.sites); setCategories(config.categories); setFolders(config.folders); setSettings(config.settings); setEditing(null); setDraft(blankDraft(config.categories[0])); }

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
      setEditing(null); setDraft(blankDraft(categories[0]));
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
    const group = site.pinned ? pinnedSites : regularSites;
    const index = group.findIndex((item) => item.id === site.id);
    if (!group[index + direction] || busy) return;
    const ids = group.map((item) => item.id);
    [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    void persistOrder(site.pinned ? ids : pinnedSites.map((item) => item.id), site.pinned ? regularSites.map((item) => item.id) : ids);
  }

  function dragStart(event: DragEvent<HTMLButtonElement>, site: ManagedPortalSite) { if (busy) { event.preventDefault(); return; } event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", site.id); setDraggedId(site.id); }
  function dragOver(event: DragEvent<HTMLElement>, site: ManagedPortalSite) { const dragged = sites.find((item) => item.id === draggedId); if (!dragged || dragged.pinned !== site.pinned || dragged.id === site.id) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverId(site.id); }
  function drop(event: DragEvent<HTMLElement>, target: ManagedPortalSite) {
    event.preventDefault();
    const source = sites.find((item) => item.id === draggedId);
    if (!source || source.pinned !== target.pinned || source.id === target.id) { setDraggedId(null); setDragOverId(null); return; }
    const ids = (source.pinned ? pinnedSites : regularSites).map((item) => item.id).filter((id) => id !== source.id);
    ids.splice(ids.indexOf(target.id), 0, source.id);
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
      setPendingBookmarks({ bookmarks, preview, fileName: file.name });
      if (preview.errors.length) setMessage(preview.errors.join(" "));
    } catch (error) { setMessage(error instanceof Error ? error.message : "书签文件无法读取。"); }
    finally { setBusy(false); if (bookmarkInput.current) bookmarkInput.current.value = ""; }
  }

  async function applyBookmarks() {
    if (!pendingBookmarks || pendingBookmarks.preview.summary.blocked) return;
    setBusy(true); setMessage("");
    try {
      const result = await portalApi.applyBookmarks(pendingBookmarks.bookmarks);
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

  async function logout() { await portalApi.logout(); setAuthenticated(false); setSites([]); setEditing(null); setDraft(blankDraft(categories[0])); setPendingImport(null); setPendingBookmarks(null); setRollbackAvailable(false); }
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function savePortalConfig(nextCategories = categories, nextFolders = folders, nextSettings = settings) {
    setBusy(true); setMessage("");
    try { const saved = await portalApi.saveConfig({ categories: nextCategories, folders: nextFolders, settings: nextSettings }); applyConfig(saved); setMessage("首页配置已保存。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "配置保存失败。"); }
    finally { setBusy(false); }
  }

  function addCategory() { const name = categoryName.trim(); if (!name) return; const next = [...categories, { id: `category-${crypto.randomUUID()}`, name, order: categories.length, hidden: false, palette: "aurora" as const }]; setCategoryName(""); void savePortalConfig(next); }
  function addFolder() { const name = folderName.trim(); if (!name) return; const next = [...folders, { id: `folder-${crypto.randomUUID()}`, name, categoryId: categories[0].id, order: folders.length }]; setFolderName(""); void savePortalConfig(categories, next); }

  return <main className="portal-page portal-manage-page" id="main-content" data-portal-palette={palette}>
    <PortalBackground src={background ?? portalAppearance.backgroundImage} fallbackSrc={portalAppearance.backgroundImage} />
    <section className="portal-glass manage-glass" aria-labelledby="manage-title">
      {authenticated === null ? <p className="manage-loading">正在确认管理会话…</p> : !authenticated ? <form className="manage-login" onSubmit={login}>
        <p className="portal-kicker">Private management</p><h1 id="manage-title">管理入口</h1><p>登录后可在线维护首页网站；公开访客不会看到此页面的内容。</p>
        <label>管理密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {message && <p className="manage-message" role="alert">{message}</p>}
        <button className="manage-primary" disabled={busy}>{busy ? "正在登录…" : "进入管理"}</button>
      </form> : <>
        <header className="manage-header"><div><p className="portal-kicker">Private management</p><h1 id="manage-title">管理入口</h1><p>在线维护你的公开站点入口。</p></div><div className="manage-header-actions"><PortalBackgroundSettings currentUrl={background} onApply={(url) => setBackground(portalBackgroundStore.set(url))} onReset={() => { portalBackgroundStore.clear(); setBackground(null); }} /><Link className="manage-quiet" to="/"><ArrowLeft size={16} aria-hidden="true" />返回首页</Link><button className="manage-quiet" onClick={() => void logout()}><LogOut size={16} aria-hidden="true" />退出</button></div></header>
        <div className="manage-layout">
          <form className="manage-editor" onSubmit={save}>
            <div className="manage-editor-heading"><div><h2>{editing ? "编辑网站" : "添加网站"}</h2><p>保存后首页会立即读取新列表。</p></div>{editing && <button type="button" className="manage-icon-button" aria-label="取消编辑" onClick={() => { setEditing(null); setDraft(blankDraft(categories[0])); }}><X size={17} /></button>}</div>
            <label>网站地址<span className="manage-url-row"><input type="url" placeholder="https://example.com" value={draft.url} onChange={(event) => change("url", event.target.value)} required /><button type="button" onClick={() => void recognizeSite()} disabled={busy || metadataBusy || !draft.url.trim()}><ScanSearch size={16} />{metadataBusy ? "识别中…" : "识别网站"}</button></span></label>
            <label>网站名称<input maxLength={80} value={draft.name} onChange={(event) => change("name", event.target.value)} required /></label>
            <label>简介<input maxLength={180} value={draft.description} onChange={(event) => change("description", event.target.value)} required /></label>
            <div className="manage-field-row"><label>分类<select value={draft.categoryId} onChange={(event) => { const category = categories.find((item) => item.id === event.target.value) ?? categories[0]; setDraft((current) => ({ ...current, categoryId: category.id, category: category.name, folderId: undefined })); }}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>文件夹<select value={draft.folderId ?? ""} onChange={(event) => change("folderId", event.target.value || undefined)}><option value="">不放入文件夹</option>{folders.filter((folder) => folder.categoryId === draft.categoryId).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></div>
            <div className="manage-field-row"><label>展示方式<select value={draft.emphasis} onChange={(event) => change("emphasis", event.target.value as Draft["emphasis"])}><option value="standard">普通</option><option value="primary">重点</option></select></label><label>访问类型<select value={draft.access} onChange={(event) => change("access", event.target.value as Draft["access"])}><option value="public">公开</option><option value="authenticated">需要登录</option></select></label></div>
            <label>图标地址 <span>（可选）</span><input type="url" placeholder="留空则自动读取网站图标" value={draft.iconUrl} onChange={(event) => change("iconUrl", event.target.value)} /></label>
            <label className="manage-check"><input type="checkbox" checked={draft.pinned} onChange={(event) => change("pinned", event.target.checked)} />置顶显示</label>
            {message && <p className="manage-message" role="status">{message}</p>}
            <button className="manage-primary" disabled={busy || metadataBusy}><Save size={16} />{busy ? "正在保存…" : editing ? "保存修改" : "添加到首页"}</button>
          </form>
          <section className="manage-list" aria-label="已收录网站"><div className="manage-list-heading"><div><h2>已收录</h2><p>{sites.length} 个入口 · 可拖动排序</p></div><Plus size={18} aria-hidden="true" /></div>{[["置顶", pinnedSites], ["普通", regularSites]].map(([label, group]) => (group as ManagedPortalSite[]).length > 0 && <div className="manage-site-group" key={label as string}><p className="manage-site-group-label">{label as string}</p>{(group as ManagedPortalSite[]).map((site, index, currentGroup) => <article className={`manage-site${draggedId === site.id ? " is-dragging" : ""}${dragOverId === site.id ? " is-drag-over" : ""}`} key={site.id} onDragOver={(event) => dragOver(event, site)} onDrop={(event) => drop(event, site)}><button className="manage-drag-handle" type="button" draggable={!busy} onDragStart={(event) => dragStart(event, site)} onDragEnd={() => { setDraggedId(null); setDragOverId(null); }} aria-label={`拖动排序 ${site.name}`} title="拖动排序"><GripVertical size={16} /></button><div className="manage-site-copy"><strong>{site.name}</strong><span>{site.category} · {site.hostname}</span></div><div className="manage-site-actions"><button type="button" onClick={() => move(site, -1)} disabled={busy || index === 0} aria-label={`上移 ${site.name}`}><ArrowUp size={15} /></button><button type="button" onClick={() => move(site, 1)} disabled={busy || index === currentGroup.length - 1} aria-label={`下移 ${site.name}`}><ArrowDown size={15} /></button><button type="button" onClick={() => { setEditing(site); setDraft(toDraft(site)); setMessage(""); }} aria-label={`编辑 ${site.name}`}><Pencil size={15} /></button><button type="button" className="manage-delete" onClick={() => void remove(site)} aria-label={`移除 ${site.name}`}><Trash2 size={15} /></button></div></article>)}</div>)}</section>
        </div>
        <div className="manage-config-grid">
          <section className="manage-editor manage-config-section"><div className="manage-editor-heading"><div><h2>分类</h2><p>名称、显示状态和顺序</p></div></div><div className="manage-inline-add"><input aria-label="新分类名称" placeholder="新分类名称" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /><button type="button" onClick={addCategory} disabled={busy}><Plus size={16} />添加</button></div>{categories.slice().sort((a, b) => a.order - b.order).map((category, index, ordered) => <div className="manage-config-row" key={category.id}><input aria-label={`${category.name}分类名称`} value={category.name} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item))} /><select aria-label={`${category.name}配色`} value={category.palette} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, palette: event.target.value as PortalCategory["palette"] } : item))}><option value="aurora">Aurora</option><option value="sakura">Sakura</option><option value="lavender">Lavender</option><option value="sunset">Sunset</option></select><label className="manage-mini-check"><input type="checkbox" checked={!category.hidden} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, hidden: !event.target.checked } : item))} />显示</label><button type="button" aria-label={`上移 ${category.name}`} disabled={index === 0} onClick={() => { const next = [...ordered]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setCategories(next.map((item, order) => ({ ...item, order }))); }}><ArrowUp size={15} /></button><button type="button" aria-label={`下移 ${category.name}`} disabled={index === ordered.length - 1} onClick={() => { const next = [...ordered]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setCategories(next.map((item, order) => ({ ...item, order }))); }}><ArrowDown size={15} /></button></div>)}<button className="manage-primary" type="button" disabled={busy} onClick={() => void savePortalConfig()}><Save size={16} />保存分类</button></section>
          <section className="manage-editor manage-config-section"><div className="manage-editor-heading"><div><h2>文件夹</h2><p>仅支持单层文件夹</p></div></div><div className="manage-inline-add"><input aria-label="新文件夹名称" placeholder="新文件夹名称" value={folderName} onChange={(event) => setFolderName(event.target.value)} /><button type="button" onClick={addFolder} disabled={busy}><Plus size={16} />添加</button></div>{folders.slice().sort((a, b) => a.order - b.order).map((folder, index, ordered) => <div className="manage-config-row manage-folder-row" key={folder.id}><input aria-label={`${folder.name}文件夹名称`} value={folder.name} onChange={(event) => setFolders((current) => current.map((item) => item.id === folder.id ? { ...item, name: event.target.value } : item))} /><select aria-label={`${folder.name}所属分类`} value={folder.categoryId} onChange={(event) => setFolders((current) => current.map((item) => item.id === folder.id ? { ...item, categoryId: event.target.value } : item))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button type="button" aria-label={`上移 ${folder.name}`} disabled={index === 0} onClick={() => { const next = [...ordered]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setFolders(next.map((item, order) => ({ ...item, order }))); }}><ArrowUp size={15} /></button><button type="button" aria-label={`下移 ${folder.name}`} disabled={index === ordered.length - 1} onClick={() => { const next = [...ordered]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setFolders(next.map((item, order) => ({ ...item, order }))); }}><ArrowDown size={15} /></button></div>)}<button className="manage-primary" type="button" disabled={busy} onClick={() => void savePortalConfig()}><Save size={16} />保存文件夹</button></section>
          <section className="manage-editor manage-config-section"><div className="manage-editor-heading"><div><h2>首页组件</h2><p>天气会自动按访问位置显示，以下设置用于定位失败时回退</p></div></div><div className="manage-field-row"><label>回退城市<input value={settings.defaultCity} onChange={(event) => setSettings((current) => ({ ...current, defaultCity: event.target.value }))} /></label><label>布局密度<select value={settings.density} onChange={(event) => setSettings((current) => ({ ...current, density: event.target.value as PortalSettings["density"] }))}><option value="compact">紧凑</option><option value="comfortable">舒适</option></select></label></div><div className="manage-field-row"><label>回退纬度<input type="number" min="-90" max="90" step="any" value={settings.latitude} onChange={(event) => setSettings((current) => ({ ...current, latitude: Number(event.target.value) }))} /></label><label>回退经度<input type="number" min="-180" max="180" step="any" value={settings.longitude} onChange={(event) => setSettings((current) => ({ ...current, longitude: Number(event.target.value) }))} /></label></div><div className="manage-toggle-row"><label className="manage-check"><input type="checkbox" checked={settings.clockEnabled} onChange={(event) => setSettings((current) => ({ ...current, clockEnabled: event.target.checked }))} />显示时间</label><label className="manage-check"><input type="checkbox" checked={settings.weatherEnabled} onChange={(event) => setSettings((current) => ({ ...current, weatherEnabled: event.target.checked }))} />显示天气</label></div><button className="manage-primary" type="button" disabled={busy} onClick={() => void savePortalConfig()}><Save size={16} />保存首页设置</button></section>
          <section className="manage-editor manage-config-section manage-backup-section"><div className="manage-editor-heading"><div><h2>导入与备份</h2><p>合并浏览器书签，或备份整套首页配置</p></div></div><div className="manage-backup-actions"><button type="button" onClick={() => bookmarkInput.current?.click()} disabled={busy}><LibraryBig size={17} />导入书签</button><button type="button" onClick={() => void exportConfig()} disabled={busy}><Download size={17} />导出配置</button><button type="button" onClick={() => importInput.current?.click()} disabled={busy}><Upload size={17} />恢复配置</button>{rollbackAvailable && <button type="button" onClick={() => void rollbackImport()} disabled={busy}><RotateCcw size={17} />撤销最近导入</button>}<input ref={bookmarkInput} type="file" accept=".html,.htm,.xlsx,.xls,.csv,text/html,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void selectBookmarks(event.target.files?.[0])} /><input ref={importInput} type="file" accept="application/json,.json" onChange={(event) => void selectImport(event.target.files?.[0])} /></div>
            {pendingBookmarks && <div className={`manage-import-preview manage-bookmark-preview${pendingBookmarks.preview.summary.blocked ? " is-blocked" : ""}`} role="status"><div><strong>{pendingBookmarks.preview.summary.blocked ? "书签暂时不能导入" : "书签预览完成"}</strong><span>{pendingBookmarks.fileName} · 可新增 {pendingBookmarks.preview.summary.addable} · 重复 {pendingBookmarks.preview.summary.duplicates} · 无效 {pendingBookmarks.preview.summary.invalid}</span><span>新增分类 {pendingBookmarks.preview.summary.newCategories} · 新增文件夹 {pendingBookmarks.preview.summary.newFolders} · 导入后共 {pendingBookmarks.preview.summary.finalSites} 个网站</span>{pendingBookmarks.preview.destinations.length > 0 && <small>{pendingBookmarks.preview.destinations.slice(0, 5).map((item) => `${item.categoryName}${item.folderName ? ` / ${item.folderName}` : ""}（${item.count}）`).join(" · ")}</small>}{pendingBookmarks.preview.errors.map((error) => <small className="manage-import-error" key={error}>{error}</small>)}</div><div><button type="button" onClick={() => setPendingBookmarks(null)} disabled={busy}>取消</button>{!pendingBookmarks.preview.summary.blocked && <button type="button" onClick={() => void applyBookmarks()} disabled={busy}>确认导入书签</button>}</div></div>}
            {pendingImport && <div className="manage-import-preview" role="status"><div><strong>备份校验通过</strong><span>{pendingImport.summary.sites} 个网站 · {pendingImport.summary.categories} 个分类 · {pendingImport.summary.folders} 个文件夹 · 配置 v{pendingImport.summary.configVersion}</span></div><div><button type="button" onClick={() => setPendingImport(null)} disabled={busy}>取消</button><button className="is-danger" type="button" onClick={() => void applyImport()} disabled={busy}>确认覆盖当前配置</button></div></div>}
          </section>
        </div>
      </>}
    </section>
  </main>;
}
