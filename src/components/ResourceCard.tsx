import { ExternalLink, Github, Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { Resource } from "../schemas/catalog";
import { getResourceCategory, getResourceTags } from "../lib/catalog";
import { BrandIcon } from "./BrandIcon";

const access = { direct: "直连", proxy: "需代理", unknown: "待验证" };
const difficulty = { easy: "容易", medium: "中等", advanced: "进阶" };
const pricing = { free: "免费", freemium: "免费增值", paid: "付费" };
export function ResourceCard({ resource, favorite, onToggleFavorite, variant = "default" }: { resource: Resource; favorite: boolean; onToggleFavorite: (id: string) => void; variant?: "featured" | "default" | "compact" }) {
  const category = getResourceCategory(resource); const tags = getResourceTags(resource).slice(0, variant === "compact" ? 1 : 2);
  return <article className={`resource-card ${variant}`}><div className="card-topline"><BrandIcon icon={resource.icon} name={resource.name} size="sm" /><div className="card-actions">{variant === "featured" && <span className="featured-mark"><Star size={14} fill="currentColor" /> 编辑精选</span>}<button className={`favorite-button ${favorite ? "active" : ""}`} onClick={() => onToggleFavorite(resource.id)} aria-label={favorite ? `取消收藏 ${resource.name}` : `收藏 ${resource.name}`}><Heart size={17} fill={favorite ? "currentColor" : "none"} /></button></div></div>
    <Link to={`/resources/${resource.id}`} className="card-title"><h3>{resource.name}</h3><span className={`rating rating-${resource.rating.toLowerCase()}`}>{resource.rating}</span></Link>{variant !== "compact" && <p>{variant === "featured" ? resource.editorial?.verdict : resource.description}</p>}
    <div className="tag-row"><span className={`category-chip ${category.color}`}>{category.name}</span>{tags.map((tag) => <span key={tag.id} className={`tag tag-${tag.color}`}>#{tag.name}</span>)}</div>
    {variant !== "compact" && <div className="card-meta"><span>{access[resource.networkAccess]}</span><span>{pricing[resource.pricing]}</span><span>{resource.license === "open-source" ? "开源" : "专有"}</span><span>{difficulty[resource.difficulty]}</span></div>}
    <div className="card-links"><span>{resource.platforms.join(" / ")}</span><a href={resource.links.website} target="_blank" rel="noreferrer" title="官网"><ExternalLink size={14} /> 官网</a>{resource.links.github && <a href={resource.links.github} target="_blank" rel="noreferrer" title="GitHub"><Github size={14} /></a>}</div>
  </article>;
}
