import { useState } from "react";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { PortalBackground } from "../components/PortalBackground";
import { PortalBackgroundSettings } from "../components/PortalBackgroundSettings";
import { PortalIcon } from "../components/PortalIcon";
import { portalAppearance } from "../data/portalAppearance";
import { portalSites } from "../data/portalSites";
import { portalBackgroundStore } from "../stores/portalBackground";

export function PortalPage() {
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState(() => portalBackgroundStore.get());

  const applyBackground = (url: string) => {
    const normalizedUrl = portalBackgroundStore.set(url);
    setCustomBackgroundUrl(normalizedUrl);
  };

  const resetBackground = () => {
    portalBackgroundStore.clear();
    setCustomBackgroundUrl(null);
  };

  return <main className="portal-page" id="main-content">
    <PortalBackground src={customBackgroundUrl ?? portalAppearance.backgroundImage} fallbackSrc={portalAppearance.backgroundImage} />
    <section className="portal-glass" aria-labelledby="portal-title">
      <PortalBackgroundSettings currentUrl={customBackgroundUrl} onApply={applyBackground} onReset={resetBackground} />
      <header className="portal-intro">
        <p className="portal-kicker">会飞的猪的数字空间</p>
        <h1 id="portal-title">HFDZ <span>Home</span></h1>
        <p className="portal-statement">我的网页，都从这里进入。</p>
      </header>

      <nav className="portal-grid" aria-label="我的网页">
        {portalSites.map(({ id, name, description, url, hostname, icon, emphasis, access }) =>
          <a className={`portal-link portal-link-${id} ${emphasis === "primary" ? "portal-link-primary" : ""}`} href={url} key={id}>
            <span className="portal-icon" aria-hidden="true"><PortalIcon icon={icon} hostname={hostname} /></span>
            <span className="portal-link-copy">
              <span className="portal-link-heading">
                <strong>{name}</strong>
                {access === "authenticated" && <span className="portal-access"><LockKeyhole size={12} aria-hidden="true" />登录使用</span>}
              </span>
              <span className="portal-description">{description}</span>
              <span className="portal-hostname">{hostname}</span>
            </span>
            <span className="portal-link-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
          </a>
        )}
      </nav>
    </section>
  </main>;
}
