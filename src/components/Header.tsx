import { Moon, Plus, Sun } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
export function Header({ dark, onTheme }: { dark: boolean; onTheme: () => void }) {
  const { pathname } = useLocation();

  if (pathname === "/") return null;

  return <header className="site-header">
    <Link className="wordmark" to="/" aria-label="HFDZ Home 首页">
      <img className="brand-seal" src="/favicon.svg" alt="" />
      <span>HFDZ Home</span>
    </Link>
    <div className="header-actions">
      {pathname === "/" && <Link className="header-manage-link" to="/manage" aria-label="添加网站">
        <Plus size={17} aria-hidden="true" />
        <span>添加网站</span>
      </Link>}
      <button className="icon-button" onClick={onTheme} title={dark ? "切换浅色模式" : "切换深色模式"} aria-label={dark ? "切换浅色模式" : "切换深色模式"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
    </div>
  </header>;
}
