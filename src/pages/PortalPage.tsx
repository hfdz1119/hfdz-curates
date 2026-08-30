import { useEffect, useState } from "react";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { PortalBackground } from "../components/PortalBackground";
import { PortalBackgroundSettings } from "../components/PortalBackgroundSettings";
import { ManagedPortalIcon, PortalIcon } from "../components/PortalIcon";
import { PortalPalettePicker } from "../components/PortalPalettePicker";
import { portalAppearance } from "../data/portalAppearance";
import { portalSites, type ManagedPortalSite } from "../data/portalSites";
import { portalApi } from "../lib/portalApi";
import { portalBackgroundStore } from "../stores/portalBackground";
import { portalPaletteStore } from "../stores/portalPalette";

export function PortalPage() {
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState(() => portalBackgroundStore.get());
  const [palette, setPalette] = useState(() => portalPaletteStore.get());
  const [managedSites, setManagedSites] = useState<ManagedPortalSite[] | null>(null);

  useEffect(() => {
    void portalApi.publicSites().then(({ sites }) => {
      if (sites.length > 0) setManagedSites(sites);
    }).catch(() => {
      // The static list remains the reliable fallback while Cloudflare KV is unconfigured or unavailable.
    });
  }, []);

  const applyBackground = (config: Parameters<typeof portalBackgroundStore.set>[0]) => {
    setCustomBackgroundUrl(portalBackgroundStore.set(config));
  };

  const resetBackground = () => {
    portalBackgroundStore.clear();
    setCustomBackgroundUrl(null);
  };

  const changePalette = (nextPalette: Parameters<typeof portalPaletteStore.set>[0]) => {
    setPalette(portalPaletteStore.set(nextPalette));
  };

  return <main className="portal-page" id="main-content" data-portal-palette={palette}>
    <PortalBackground src={customBackgroundUrl ?? portalAppearance.backgroundImage} fallbackSrc={portalAppearance.backgroundImage} mobileSrc={portalAppearance.mobileBackgroundImage} />
    <section className="portal-glass" aria-labelledby="portal-title">
      <div className="portal-appearance-controls" aria-label="首页外观">
        <PortalPalettePicker value={palette} onChange={changePalette} />
        <PortalBackgroundSettings currentUrl={customBackgroundUrl} onApply={applyBackground} onReset={resetBackground} />
      </div>
      <header className="portal-intro">
        <p className="portal-kicker">会飞的猪的数字空间</p>
        <h1 id="portal-title">HFDZ <span>Home</span></h1>
        <p className="portal-statement">我的网页，都从这里进入。</p>
      </header>

      <nav className="portal-grid" aria-label="我的网页">
        {managedSites === null ? portalSites.map(({ id, name, description, url, hostname, icon, emphasis, access }) =>
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
        ) : managedSites.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.order - b.order).map(({ id, name, description, url, hostname, iconUrl, emphasis, access }) =>
          <a className={`portal-link portal-link-${id} ${emphasis === "primary" ? "portal-link-primary" : ""}`} href={url} key={id}>
            <span className="portal-icon" aria-hidden="true"><ManagedPortalIcon iconUrl={iconUrl} hostname={hostname} /></span>
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
