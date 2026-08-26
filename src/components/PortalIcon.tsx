import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import type { PortalIcon as PortalIconConfig } from "../data/portalSites";

export function PortalIcon({ icon, hostname }: { icon: PortalIconConfig; hostname: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [hostname, icon]);

  if (icon.mode === "lucide") {
    const Icon = icon.icon;
    return <Icon size={22} strokeWidth={1.7} />;
  }

  const Fallback = icon.fallback;
  if (failed) return <Fallback size={22} strokeWidth={1.7} />;

  const src = icon.mode === "custom" ? icon.src : `https://${hostname}/favicon.ico`;
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export function ManagedPortalIcon({ iconUrl, hostname }: { iconUrl?: string; hostname: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [iconUrl, hostname]);
  if (failed) return <Globe2 size={22} strokeWidth={1.7} aria-hidden="true" />;
  return <img src={iconUrl || `https://${hostname}/favicon.ico`} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
