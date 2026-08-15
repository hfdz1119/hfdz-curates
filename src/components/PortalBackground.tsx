import { useEffect, useState } from "react";

type PortalBackgroundProps = {
  src: string;
  fallbackSrc?: string;
};

export function PortalBackground({ src, fallbackSrc }: PortalBackgroundProps) {
  const [loaded, setLoaded] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);

  useEffect(() => {
    setLoaded(false);
    setActiveSrc(src);
  }, [src]);

  return <div className={`portal-background${loaded ? " is-loaded" : ""}`} aria-hidden="true">
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
