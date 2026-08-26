import { ArrowDown, ArrowLeft, ArrowUp, LogOut, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalBackground } from "../components/PortalBackground";
import { portalAppearance } from "../data/portalAppearance";
import { defaultPortalCategory, defaultPortalSettings, initialManagedPortalSites, type ManagedPortalSite, type PortalCategory, type PortalFolder, type PortalSettings } from "../data/portalSites";
import { portalApi } from "../lib/portalApi";
import { portalBackgroundStore } from "../stores/portalBackground";
import { portalPaletteStore } from "../stores/portalPalette";

type Draft = Omit<ManagedPortalSite, "id" | "hostname" | "order">;
const blankDraft = (category = defaultPortalCategory): Draft => ({ name: "", description: "", url: "", iconUrl: "", category: category.name, categoryId: category.id, folderId: undefined, emphasis: "standard", access: "public", pinned: false });

function toDraft(site: ManagedPortalSite): Draft { const { id: _id, hostname: _hostname, order: _order, ...draft } = site; return draft; }

export function ManagePage() {
  const [background] = useState(() => portalBackgroundStore.get());
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
  const orderedSites = useMemo(() => sites.slice().sort((a, b) => a.order - b.order), [sites]);

  useEffect(() => {
    void portalApi.session().then(({ authenticated: loggedIn }) => {
      setAuthenticated(loggedIn);
      if (loggedIn) void loadSites();
    }).catch(() => setAuthenticated(false));
  }, []);

  async function loadSites() {
    const { sites: remoteSites, categories: remoteCategories, folders: remoteFolders, settings: remoteSettings } = await portalApi.sites();
    setSites(remoteSites.length > 0 ? remoteSites : initialManagedPortalSites);
    setCategories(remoteCategories.length ? remoteCategories : [defaultPortalCategory]); setFolders(remoteFolders); setSettings(remoteSettings);
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

  async function remove(site: ManagedPortalSite) {
    if (!window.confirm(`确定移除“${site.name}”吗？`)) return;
    setBusy(true); setMessage("");
    try { await portalApi.remove(site.id); setSites((current) => current.filter((item) => item.id !== site.id)); setMessage("已移除。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "删除失败，请稍后重试。"); }
    finally { setBusy(false); }
  }

  async function move(site: ManagedPortalSite, direction: -1 | 1) {
    const index = orderedSites.findIndex((item) => item.id === site.id);
    const partner = orderedSites[index + direction];
    if (!partner) return;
    setBusy(true); setMessage("");
    try {
      const moved = { ...site, order: partner.order };
      const swapped = { ...partner, order: site.order };
      await portalApi.update(moved); await portalApi.update(swapped);
      setSites((current) => current.map((item) => item.id === moved.id ? moved : item.id === swapped.id ? swapped : item));
    } catch (error) { setMessage(error instanceof Error ? error.message : "排序保存失败。"); }
    finally { setBusy(false); }
  }

  async function logout() { await portalApi.logout(); setAuthenticated(false); setSites([]); setEditing(null); setDraft(blankDraft(categories[0])); }
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function savePortalConfig(nextCategories = categories, nextFolders = folders, nextSettings = settings) {
    setBusy(true); setMessage("");
    try { const saved = await portalApi.saveConfig({ categories: nextCategories, folders: nextFolders, settings: nextSettings }); setCategories(saved.categories); setFolders(saved.folders); setSettings(saved.settings); setSites(saved.sites); setMessage("首页配置已保存。"); }
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
        <header className="manage-header"><div><p className="portal-kicker">Private management</p><h1 id="manage-title">管理入口</h1><p>在线维护你的公开站点入口。</p></div><div className="manage-header-actions"><Link className="manage-quiet" to="/"><ArrowLeft size={16} aria-hidden="true" />返回首页</Link><button className="manage-quiet" onClick={() => void logout()}><LogOut size={16} aria-hidden="true" />退出</button></div></header>
        <div className="manage-layout">
          <form className="manage-editor" onSubmit={save}>
            <div className="manage-editor-heading"><div><h2>{editing ? "编辑网站" : "添加网站"}</h2><p>保存后首页会立即读取新列表。</p></div>{editing && <button type="button" className="manage-icon-button" aria-label="取消编辑" onClick={() => { setEditing(null); setDraft(blankDraft(categories[0])); }}><X size={17} /></button>}</div>
            <label>网站地址<input type="url" placeholder="https://example.com" value={draft.url} onChange={(event) => change("url", event.target.value)} required /></label>
            <label>网站名称<input maxLength={80} value={draft.name} onChange={(event) => change("name", event.target.value)} required /></label>
            <label>简介<input maxLength={180} value={draft.description} onChange={(event) => change("description", event.target.value)} required /></label>
            <div className="manage-field-row"><label>分类<select value={draft.categoryId} onChange={(event) => { const category = categories.find((item) => item.id === event.target.value) ?? categories[0]; setDraft((current) => ({ ...current, categoryId: category.id, category: category.name, folderId: undefined })); }}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>文件夹<select value={draft.folderId ?? ""} onChange={(event) => change("folderId", event.target.value || undefined)}><option value="">不放入文件夹</option>{folders.filter((folder) => folder.categoryId === draft.categoryId).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></div>
            <div className="manage-field-row"><label>展示方式<select value={draft.emphasis} onChange={(event) => change("emphasis", event.target.value as Draft["emphasis"])}><option value="standard">普通</option><option value="primary">重点</option></select></label><label>访问类型<select value={draft.access} onChange={(event) => change("access", event.target.value as Draft["access"])}><option value="public">公开</option><option value="authenticated">需要登录</option></select></label></div>
            <label>图标地址 <span>（可选）</span><input type="url" placeholder="留空则自动读取网站图标" value={draft.iconUrl} onChange={(event) => change("iconUrl", event.target.value)} /></label>
            <label className="manage-check"><input type="checkbox" checked={draft.pinned} onChange={(event) => change("pinned", event.target.checked)} />置顶显示</label>
            {message && <p className="manage-message" role="status">{message}</p>}
            <button className="manage-primary" disabled={busy}><Save size={16} />{busy ? "正在保存…" : editing ? "保存修改" : "添加到首页"}</button>
          </form>
          <section className="manage-list" aria-label="已收录网站"><div className="manage-list-heading"><div><h2>已收录</h2><p>{orderedSites.length} 个入口</p></div><Plus size={18} aria-hidden="true" /></div>{orderedSites.map((site, index) => <article className="manage-site" key={site.id}><div className="manage-site-copy"><strong>{site.name}</strong><span>{site.category} · {site.hostname}</span></div><div className="manage-site-actions"><button type="button" onClick={() => void move(site, -1)} disabled={busy || index === 0} aria-label={`上移 ${site.name}`}><ArrowUp size={15} /></button><button type="button" onClick={() => void move(site, 1)} disabled={busy || index === orderedSites.length - 1} aria-label={`下移 ${site.name}`}><ArrowDown size={15} /></button><button type="button" onClick={() => { setEditing(site); setDraft(toDraft(site)); setMessage(""); }} aria-label={`编辑 ${site.name}`}><Pencil size={15} /></button><button type="button" className="manage-delete" onClick={() => void remove(site)} aria-label={`移除 ${site.name}`}><Trash2 size={15} /></button></div></article>)}</section>
        </div>
        <div className="manage-config-grid">
          <section className="manage-editor manage-config-section"><div className="manage-editor-heading"><div><h2>分类</h2><p>名称、显示状态和顺序</p></div></div><div className="manage-inline-add"><input aria-label="新分类名称" placeholder="新分类名称" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /><button type="button" onClick={addCategory} disabled={busy}><Plus size={16} />添加</button></div>{categories.slice().sort((a, b) => a.order - b.order).map((category, index, ordered) => <div className="manage-config-row" key={category.id}><input aria-label={`${category.name}分类名称`} value={category.name} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item))} /><select aria-label={`${category.name}配色`} value={category.palette} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, palette: event.target.value as PortalCategory["palette"] } : item))}><option value="aurora">Aurora</option><option value="sakura">Sakura</option><option value="lavender">Lavender</option><option value="sunset">Sunset</option></select><label className="manage-mini-check"><input type="checkbox" checked={!category.hidden} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, hidden: !event.target.checked } : item))} />显示</label><button type="button" aria-label={`上移 ${category.name}`} disabled={index === 0} onClick={() => { const next = [...ordered]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setCategories(next.map((item, order) => ({ ...item, order }))); }}><ArrowUp size={15} /></button><button type="button" aria-label={`下移 ${category.name}`} disabled={index === ordered.length - 1} onClick={() => { const next = [...ordered]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setCategories(next.map((item, order) => ({ ...item, order }))); }}><ArrowDown size={15} /></button></div>)}<button className="manage-primary" type="button" disabled={busy} onClick={() => void savePortalConfig()}><Save size={16} />保存分类</button></section>
          <section className="manage-editor manage-config-section"><div className="manage-editor-heading"><div><h2>文件夹</h2><p>仅支持单层文件夹</p></div></div><div className="manage-inline-add"><input aria-label="新文件夹名称" placeholder="新文件夹名称" value={folderName} onChange={(event) => setFolderName(event.target.value)} /><button type="button" onClick={addFolder} disabled={busy}><Plus size={16} />添加</button></div>{folders.slice().sort((a, b) => a.order - b.order).map((folder, index, ordered) => <div className="manage-config-row manage-folder-row" key={folder.id}><input aria-label={`${folder.name}文件夹名称`} value={folder.name} onChange={(event) => setFolders((current) => current.map((item) => item.id === folder.id ? { ...item, name: event.target.value } : item))} /><select aria-label={`${folder.name}所属分类`} value={folder.categoryId} onChange={(event) => setFolders((current) => current.map((item) => item.id === folder.id ? { ...item, categoryId: event.target.value } : item))}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button type="button" aria-label={`上移 ${folder.name}`} disabled={index === 0} onClick={() => { const next = [...ordered]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setFolders(next.map((item, order) => ({ ...item, order }))); }}><ArrowUp size={15} /></button><button type="button" aria-label={`下移 ${folder.name}`} disabled={index === ordered.length - 1} onClick={() => { const next = [...ordered]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setFolders(next.map((item, order) => ({ ...item, order }))); }}><ArrowDown size={15} /></button></div>)}<button className="manage-primary" type="button" disabled={busy} onClick={() => void savePortalConfig()}><Save size={16} />保存文件夹</button></section>
          <section className="manage-editor manage-config-section"><div className="manage-editor-heading"><div><h2>首页组件</h2><p>默认天气城市与布局</p></div></div><div className="manage-field-row"><label>默认城市<input value={settings.defaultCity} onChange={(event) => setSettings((current) => ({ ...current, defaultCity: event.target.value }))} /></label><label>布局密度<select value={settings.density} onChange={(event) => setSettings((current) => ({ ...current, density: event.target.value as PortalSettings["density"] }))}><option value="compact">紧凑</option><option value="comfortable">舒适</option></select></label></div><div className="manage-field-row"><label>纬度<input type="number" min="-90" max="90" step="any" value={settings.latitude} onChange={(event) => setSettings((current) => ({ ...current, latitude: Number(event.target.value) }))} /></label><label>经度<input type="number" min="-180" max="180" step="any" value={settings.longitude} onChange={(event) => setSettings((current) => ({ ...current, longitude: Number(event.target.value) }))} /></label></div><div className="manage-toggle-row"><label className="manage-check"><input type="checkbox" checked={settings.clockEnabled} onChange={(event) => setSettings((current) => ({ ...current, clockEnabled: event.target.checked }))} />显示时间</label><label className="manage-check"><input type="checkbox" checked={settings.weatherEnabled} onChange={(event) => setSettings((current) => ({ ...current, weatherEnabled: event.target.checked }))} />显示天气</label></div><button className="manage-primary" type="button" disabled={busy} onClick={() => void savePortalConfig()}><Save size={16} />保存首页设置</button></section>
        </div>
      </>}
    </section>
  </main>;
}
