import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { portalSites } from "../data/portalSites";

export function PortalPage() {
  return <main className="portal-page" id="main-content">
    <section className="portal-intro" aria-labelledby="portal-title">
      <p className="portal-kicker">会飞的猪的数字空间</p>
      <h1 id="portal-title">HFDZ <span>Home</span></h1>
      <p className="portal-statement">我的网页，都从这里进入。</p>
    </section>

    <nav className="portal-grid" aria-label="我的网页">
      {portalSites.map(({ id, name, description, url, hostname, icon: Icon, emphasis, access }) =>
        <a className={`portal-link portal-link-${id} ${emphasis === "primary" ? "portal-link-primary" : ""}`} href={url} key={id}>
          <span className="portal-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.7} /></span>
          <span className="portal-link-copy">
            <span className="portal-link-heading">
              <strong>{name}</strong>
              {access === "authenticated" && <span className="portal-access"><LockKeyhole size={12} aria-hidden="true" />登录使用</span>}
            </span>
            <span className="portal-description">{description}</span>
          </span>
          <span className="portal-link-foot">
            <span>{hostname}</span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
        </a>
      )}
    </nav>
  </main>;
}
