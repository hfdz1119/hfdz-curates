import { type CSSProperties, useEffect, useState } from "react";
import type { PortalBackgroundConfig } from "../stores/portalBackground";

type PortalBackgroundProps = {
  src: string | PortalBackgroundConfig;
  fallbackSrc?: string;
  mobileSrc?: string;
};

export function PortalBackground({ src, fallbackSrc, mobileSrc }: PortalBackgroundProps) {
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 620px)").matches);
  const config = typeof src === "string" ? null : src;
  const sourceUrl = typeof src === "string" ? (isMobile && mobileSrc ? mobileSrc : src) : src.url;
  const [activeSrc, setActiveSrc] = useState(sourceUrl);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 620px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    setLoaded(false);
    setActiveSrc(sourceUrl);
  }, [sourceUrl]);

  return <div className={`portal-background${loaded ? " is-loaded" : ""}`} data-glass-strength={config?.glassStrength} aria-hidden="true" style={config ? { "--portal-bg-scale": `${config.scale / 100}`, "--portal-bg-x": `${config.positionX}%`, "--portal-bg-y": `${config.positionY}%`, "--portal-bg-blur": `${config.imageBlur}px`, "--portal-overlay-custom": `${config.overlay / 100}` } as CSSProperties : undefined}>
    <img
      src={activeSrc}
      alt=""
      decoding="async"
      fetchPriority="high"
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false);
        const fallback = isMobile && mobileSrc ? mobileSrc : fallbackSrc;
        if (fallback && activeSrc !== fallback) setActiveSrc(fallback);
      }}
    />
  </div>;
}
