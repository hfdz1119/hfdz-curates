import { useEffect, useState, type CSSProperties } from "react";
import type { PortalBackgroundConfig } from "../stores/portalBackground";
type Source = string | PortalBackgroundConfig | { type: "image" | "video"; url: string; poster?: string };
type Props = { src: Source; fallbackSrc?: string; mobileSrc?: string; preferences?: { backgroundOverlay?: number; backgroundBlur?: number; dynamicWallpaperEnabled?: boolean } };
export function PortalBackground({ src, fallbackSrc, mobileSrc, preferences }: Props) {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && matchMedia("(max-width: 620px)").matches);
  const [failed, setFailed] = useState(false); const [visible, setVisible] = useState(true);
  const config = typeof src === "object" && "url" in src && !("type" in src) ? src : null;
  const source = typeof src === "string" ? { type: "image" as const, url: mobile && mobileSrc ? mobileSrc : src } : "type" in src ? src : { type: "image" as const, url: src.url };
  const allowVideo = source.type === "video" && (!mobile || preferences?.dynamicWallpaperEnabled === true);
  const url = failed ? (source.poster || (mobile ? mobileSrc : fallbackSrc) || fallbackSrc || "") : source.url;
  useEffect(() => { const query = matchMedia("(max-width: 620px)"); const update = () => setMobile(query.matches); update(); query.addEventListener?.("change", update); return () => query.removeEventListener?.("change", update); }, []);
  useEffect(() => { setFailed(false); }, [source.url, source.poster, mobile]);
  useEffect(() => { const handler = () => setVisible(document.visibilityState === "visible"); document.addEventListener("visibilitychange", handler); return () => document.removeEventListener("visibilitychange", handler); }, []);
  const style = { "--portal-overlay-custom": `${(preferences?.backgroundOverlay ?? config?.overlay ?? 38) / 100}`, "--portal-bg-blur": `${preferences?.backgroundBlur ?? config?.imageBlur ?? 0}px`, ...(config ? { "--portal-bg-scale": `${config.scale / 100}`, "--portal-bg-x": `${config.positionX}%`, "--portal-bg-y": `${config.positionY}%` } : {}) } as CSSProperties;
  return <div className="portal-background is-loaded" data-glass-strength={config?.glassStrength} style={style} aria-hidden="true">{allowVideo && !failed ? <video src={url} poster={source.poster} autoPlay={visible} loop muted playsInline onError={() => setFailed(true)} /> : <img src={allowVideo ? (source.poster || fallbackSrc || url) : url} alt="" decoding="async" fetchPriority="high" onError={() => { if (!failed) setFailed(true); }} />}</div>;
}
