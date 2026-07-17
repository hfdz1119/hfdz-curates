import { useEffect } from "react";

export function AnalyticsBeacon() {
  const token = import.meta.env.VITE_CF_ANALYTICS_TOKEN;
  useEffect(() => {
    if (!token || document.querySelector("script[data-navigation-analytics]")) return;
    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.dataset.cfBeacon = JSON.stringify({ token });
    script.dataset.navigationAnalytics = "true";
    document.head.appendChild(script);
  }, [token]);
  return null;
}
