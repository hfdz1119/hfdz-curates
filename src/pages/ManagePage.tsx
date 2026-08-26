import { ArrowDown, ArrowUp, LogOut, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PortalBackground } from "../components/PortalBackground";
import { portalAppearance } from "../data/portalAppearance";
import { initialManagedPortalSites, type ManagedPortalSite } from "../data/portalSites";
import { portalApi } from "../lib/portalApi";
import { portalBackgroundStore } from "../stores/portalBackground";
import { portalPaletteStore } from "../stores/portalPalette";

type Draft = Omit<ManagedPortalSite, "id" | "hostname" | "order">;
const blankDraft = (): Draft => ({ name: "", description: "", url: "", iconUrl: "", category: "我的网页", emphasis: "standard", access: "public", pinned: false });

function toDraft(site: ManagedPortalSite): Draft { const { id: _id, hostname: _hostname, order: _order, ...draft } = site; return draft; }

export function ManagePage() {
  const [background] = useState(() => portalBackgroundStore.get());
  const [palette] = useState(() => portalPaletteStore.get());
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [sites, setSites] = useState<ManagedPortalSite[]>([]);
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
    const { sites: remoteSites } = await portalApi.sites();
    setSites(remoteSites.length > 0 ? remoteSites : initialManagedPortalSites);
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
      setEditing(null); setDraft(blankDraft());
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

  async function logout() { await portalApi.logout(); setAuthenticated(false); setSites([]); setEditing(null); setDraft(blankDraft()); }
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  return <main className="portal-page portal-manage-page" id="main-content" data-portal-palette={palette}>
    <PortalBackground src={background ?? portalAppearance.backgroundImage} fallbackSrc={portalAppearance.backgroundImage} />
    <section className="portal-glass manage-glass" aria-labelledby="manage-title">
      {authenticated === null ? <p className="manage-loading">正在确认管理会话…</p> : !authenticated ? <form className="manage-login" onSubmit={login}>
        <p className="portal-kicker">Private management</p><h1 id="manage-title">管理入口</h1><p>登录后可在线维护首页网站；公开访客不会看到此页面的内容。</p>
        <label>管理密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {message && <p className="manage-message" role="alert">{message}</p>}
        <button className="manage-primary" disabled={busy}>{busy ? "正在登录…" : "进入管理"}</button>
      </form> : <>
        <header className="manage-header"><div><p className="portal-kicker">Private management</p><h1 id="manage-title">管理入口</h1><p>在线维护你的公开站点入口。</p></div><button className="manage-quiet" onClick={() => void logout()}><LogOut size={16} />退出</button></header>
        <div className="manage-layout">
          <form className="manage-editor" onSubmit={save}>
            <div className="manage-editor-heading"><div><h2>{editing ? "编辑网站" : "添加网站"}</h2><p>保存后首页会读取新列表。</p></div>{editing && <button type="button" className="manage-icon-button" aria-label="取消编辑" onClick={() => { setEditing(null); setDraft(blankDraft()); }}><X size={17} /></button>}</div>
            <label>网站地址<input type="url" placeholder="https://example.com" value={draft.url} onChange={(event) => change("url", event.target.value)} required /></label>
            <label>网站名称<input maxLength={80} value={draft.name} onChange={(event) => change("name", event.target.value)} required /></label>
            <label>简介<input maxLength={180} value={draft.description} onChange={(event) => change("description", event.target.value)} required /></label>
            <div className="manage-field-row"><label>分类<input maxLength={40} value={draft.category} onChange={(event) => change("category", event.target.value)} required /></label><label>展示方式<select value={draft.emphasis} onChange={(event) => change("emphasis", event.target.value as Draft["emphasis"])}><option value="standard">普通</option><option value="primary">重点</option></select></label></div>
            <label>图标地址 <span>（可选）</span><input type="url" placeholder="留空则自动读取网站图标" value={draft.iconUrl} onChange={(event) => change("iconUrl", event.target.value)} /></label>
            <label className="manage-check"><input type="checkbox" checked={draft.pinned} onChange={(event) => change("pinned", event.target.checked)} />置顶显示</label>
            {message && <p className="manage-message" role="status">{message}</p>}
            <button className="manage-primary" disabled={busy}><Save size={16} />{busy ? "正在保存…" : editing ? "保存修改" : "添加到首页"}</button>
          </form>
          <section className="manage-list" aria-label="已收录网站"><div className="manage-list-heading"><div><h2>已收录</h2><p>{orderedSites.length} 个入口</p></div><Plus size={18} aria-hidden="true" /></div>{orderedSites.map((site, index) => <article className="manage-site" key={site.id}><div className="manage-site-copy"><strong>{site.name}</strong><span>{site.category} · {site.hostname}</span></div><div className="manage-site-actions"><button type="button" onClick={() => void move(site, -1)} disabled={busy || index === 0} aria-label={`上移 ${site.name}`}><ArrowUp size={15} /></button><button type="button" onClick={() => void move(site, 1)} disabled={busy || index === orderedSites.length - 1} aria-label={`下移 ${site.name}`}><ArrowDown size={15} /></button><button type="button" onClick={() => { setEditing(site); setDraft(toDraft(site)); setMessage(""); }} aria-label={`编辑 ${site.name}`}><Pencil size={15} /></button><button type="button" className="manage-delete" onClick={() => void remove(site)} aria-label={`移除 ${site.name}`}><Trash2 size={15} /></button></div></article>)}</section>
        </div>
      </>}
    </section>
  </main>;
}
