import { useEffect, useLayoutEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Footer } from "./components/Footer";
import { AnalyticsBeacon } from "./components/AnalyticsBeacon";
import { Header } from "./components/Header";
import { useFavorites } from "./hooks/useFavorites";
import { HomePage } from "./pages/HomePage";
import { PortalStartPage } from "./pages/PortalStartPage";
import { ManagePage } from "./pages/ManagePage";
import { ResourcePage } from "./pages/ResourcePage";
import { portalApi } from "./lib/portalApi";

const defaultBrandIconUrl = "/favicon.svg";

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("hfdz-navigation:theme") !== "light");
  const [brandIconUrl, setBrandIconUrl] = useState(defaultBrandIconUrl);
  const favorites = useFavorites();
  useLayoutEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("hfdz-navigation:theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => { let active = true; void portalApi.publicSites().then((config) => { if (active) setBrandIconUrl(config.settings.brandIconUrl ?? defaultBrandIconUrl); }).catch(() => undefined); return () => { active = false; }; }, []);
  useEffect(() => { const icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]'); if (!icon) return; icon.href = brandIconUrl; icon.onerror = () => { if (!icon.href.endsWith("/favicon.svg")) icon.href = defaultBrandIconUrl; }; return () => { icon.onerror = null; }; }, [brandIconUrl]);
  return <div className="app-shell"><a className="skip-link" href="#main-content">跳到主要内容</a><AnalyticsBeacon /><Header dark={dark} onTheme={() => setDark((value) => !value)} brandIconUrl={brandIconUrl} /><Routes><Route path="/" element={<PortalStartPage dark={dark} onTheme={() => setDark((value) => !value)} onBrandIconChange={setBrandIconUrl} />} /><Route path="/manage" element={<ManagePage onBrandIconChange={setBrandIconUrl} />} /><Route path="/curates" element={<HomePage favoriteIds={favorites.ids} toggleFavorite={favorites.toggle} setFavoriteIds={favorites.setIds} />} /><Route path="/resources/:id" element={<ResourcePage favoriteIds={favorites.ids} toggleFavorite={favorites.toggle} />} /></Routes><Footer /></div>;
}
