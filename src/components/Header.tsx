import { Github, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
export function Header({ dark, onTheme }: { dark: boolean; onTheme: () => void }) {
  return <header className="site-header">
    <Link className="wordmark" to="/" aria-label="HFDZ Curates 首页">
      <img className="brand-seal" src="/favicon.svg" alt="" />
      <span>HFDZ Curates</span>
    </Link>
    <nav aria-label="HFDZ 生态入口">
      <a href="https://hfdz1119.top">作品集</a>
      <a href="https://wiki.hfdz1119.top/">知识库</a>
      <a href="https://image.hfdz1119.top">图床</a>
      <a href="https://status.hfdz1119.top">状态页</a>
    </nav>
    <div className="header-actions">
      <a className="icon-button" href="https://github.com" target="_blank" rel="noreferrer" title="GitHub" aria-label="GitHub"><Github size={18} /></a>
      <button className="icon-button" onClick={onTheme} title={dark ? "切换浅色模式" : "切换深色模式"} aria-label={dark ? "切换浅色模式" : "切换深色模式"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
    </div>
  </header>;
}
