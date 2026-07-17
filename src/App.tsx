import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Footer } from "./components/Footer";
import { AnalyticsBeacon } from "./components/AnalyticsBeacon";
import { Header } from "./components/Header";
import { useFavorites } from "./hooks/useFavorites";
import { HomePage } from "./pages/HomePage";
import { ResourcePage } from "./pages/ResourcePage";

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem("hfdz-navigation:theme") !== "light");
  const favorites = useFavorites();
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("hfdz-navigation:theme", dark ? "dark" : "light"); }, [dark]);
  return <div className="app-shell"><AnalyticsBeacon /><Header dark={dark} onTheme={() => setDark((value) => !value)} /><Routes><Route path="/" element={<HomePage favoriteIds={favorites.ids} toggleFavorite={favorites.toggle} setFavoriteIds={favorites.setIds} />} /><Route path="/resources/:id" element={<ResourcePage favoriteIds={favorites.ids} toggleFavorite={favorites.toggle} />} /></Routes><Footer /></div>;
}
