import { type CSSProperties, useEffect, useState } from "react";
import type { PortalBackgroundConfig } from "../stores/portalBackground";

type PortalBackgroundProps = {
  src: string | PortalBackgroundConfig;
  fallbackSrc?: string;
};

export function PortalBackground({ src, fallbackSrc }: PortalBackgroundProps) {
  const [loaded, setLoaded] = useState(false);
  const config = typeof src === "string" ? null : src;
  const sourceUrl = typeof src === "string" ? src : src.url;
  const [activeSrc, setActiveSrc] = useState(sourceUrl);

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
        if (fallbackSrc && activeSrc !== fallbackSrc) setActiveSrc(fallbackSrc);
      }}
    />
  </div>;
}
