import { History, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Category, Difficulty, NetworkAccess, Platform, Pricing, Resource, Tag } from "../schemas/catalog";
import { searchHistoryStore } from "../stores/searchHistory";

type Filters = { query: string; categoryId?: string; tagId?: string; rating?: Resource["rating"]; platform?: Platform; pricing?: Pricing; license?: Resource["license"]; difficulty?: Difficulty; networkAccess?: NetworkAccess };
type Props = Filters & { categories: Category[]; tags: Tag[]; onChange: (value: Partial<Filters>) => void };
const suggestions = ["ChatGPT", "Cloudflare", "Telegram", "GitHub", "Cursor"];

export function SearchPanel({ query, categoryId, tagId, rating, platform, pricing, license, difficulty, networkAccess, categories, tags, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>(() => searchHistoryStore.get());
  const [open, setOpen] = useState(false);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "/" && document.activeElement?.tagName !== "INPUT") { event.preventDefault(); inputRef.current?.focus(); } if (event.key === "Escape") { onChange({ query: "" }); inputRef.current?.blur(); } }; document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onChange]);
  const choose = (value: string) => { setHistory(searchHistoryStore.add(value)); setOpen(false); onChange({ query: value }); };
  return <section className="search-panel" aria-label="资源搜索与筛选">
    <div className="search-field"><Search size={22} /><input ref={inputRef} value={query} onFocus={() => setOpen(true)} onChange={(event) => onChange({ query: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") choose(query); }} placeholder="搜索工具、标签、平台或用途" aria-label="搜索资源" />{query && <button className="icon-button" onClick={() => onChange({ query: "" })} aria-label="清除搜索"><X size={18} /></button>}
      {open && <div className="search-history">{!query && history.length > 0 && <><div><History size={14} /> 最近搜索 <button onClick={() => { searchHistoryStore.clear(); setHistory([]); }}>清除</button></div>{history.map((item) => <button key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}>{item}</button>)}</>}{!query && <div className="suggestions">{suggestions.map((item) => <button key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}>{item}</button>)}</div>}</div>}
    </div>
    <div className="category-row" aria-label="资源分类"><button className={!categoryId ? "active" : ""} onClick={() => onChange({ categoryId: "" })}>全部</button>{categories.map((category) => <button key={category.id} className={categoryId === category.id ? "active" : ""} onClick={() => onChange({ categoryId: category.id })}>{category.name}</button>)}</div>
    <details className="filter-menu"><summary><SlidersHorizontal size={16} /> 筛选</summary><div>
      <label>编辑评分<select value={rating ?? ""} onChange={(event) => onChange({ rating: event.target.value as Resource["rating"] })}><option value="">全部</option>{["S", "A", "B", "C"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>难度<select value={difficulty ?? ""} onChange={(event) => onChange({ difficulty: event.target.value as Difficulty })}><option value="">全部</option><option value="easy">容易</option><option value="medium">中等</option><option value="advanced">进阶</option></select></label>
      <label>网络<select value={networkAccess ?? ""} onChange={(event) => onChange({ networkAccess: event.target.value as NetworkAccess })}><option value="">全部</option><option value="direct">直连</option><option value="proxy">代理</option><option value="unknown">待验证</option></select></label>
      <label>标签<select value={tagId ?? ""} onChange={(event) => onChange({ tagId: event.target.value })}><option value="">全部</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></label>
      <label>平台<select value={platform ?? ""} onChange={(event) => onChange({ platform: event.target.value as Platform })}><option value="">全部</option>{["web", "mac", "windows", "linux", "ios", "android"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>价格<select value={pricing ?? ""} onChange={(event) => onChange({ pricing: event.target.value as Pricing })}><option value="">全部</option><option value="free">免费</option><option value="freemium">免费增值</option><option value="paid">付费</option></select></label>
      <label>授权<select value={license ?? ""} onChange={(event) => onChange({ license: event.target.value as Resource["license"] })}><option value="">全部</option><option value="open-source">开源</option><option value="proprietary">专有</option></select></label>
    </div></details>
  </section>;
}
