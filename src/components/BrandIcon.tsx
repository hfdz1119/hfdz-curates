import { useState } from "react";

export function BrandIcon({ icon, name, size = "md" }: { icon: string; name: string; size?: "sm" | "md" }) {
  const [missing, setMissing] = useState(false);
  return <span className={`brand-icon ${size}`} aria-hidden="true">
    {!missing && <img src={`/icons/${icon}.svg`} alt="" onError={() => setMissing(true)} />}
    {missing && <b>{name.slice(0, 1).toUpperCase()}</b>}
  </span>;
}
