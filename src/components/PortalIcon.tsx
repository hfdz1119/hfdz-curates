import { useEffect, useState } from "react";
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
