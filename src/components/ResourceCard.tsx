import { ExternalLink, Github, Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { Resource } from "../schemas/catalog";
import { getResourceCategory, getResourceTags } from "../lib/catalog";
import { BrandIcon } from "./BrandIcon";

type CardVariant = "catalog" | "featured-primary" | "featured-secondary" | "latest" | "favorite" | "default" | "featured" | "compact";
const dateFormatter = new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" });

export function ResourceCard({ resource, favorite, onToggleFavorite, variant = "catalog" }: { resource: Resource; favorite: boolean; onToggleFavorite: (id: string) => void; variant?: CardVariant }) {
  const category = getResourceCategory(resource);
  const tags = getResourceTags(resource).slice(0, variant === "catalog" || variant === "default" ? 2 : 1);
  const isFeatured = variant === "featured-primary" || variant === "featured-secondary" || variant === "featured";
  const isPrimary = variant === "featured-primary";
  const summary = isFeatured ? resource.editorial?.verdict ?? resource.description : resource.description;
  const isLatest = variant === "latest";

  return <article className={`resource-card ${variant} resource-card--${variant}`}>
    <div className="card-topline">
      <BrandIcon icon={resource.icon} name={resource.name} size="sm" />
      <div className="card-actions">
        {isFeatured && <span className="featured-mark"><Star size={13} fill="currentColor" /> {isPrimary ? "本期主荐" : "编辑推荐"}</span>}
        <button className={`favorite-button ${favorite ? "active" : ""}`} onClick={() => onToggleFavorite(resource.id)} aria-label={favorite ? `取消收藏 ${resource.name}` : `收藏 ${resource.name}`}>
          <Heart size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
    </div>

    <div className="card-content">
      <div className="card-title-row">
        <Link to={`/resources/${resource.id}`} className="card-title"><h3>{resource.name}</h3></Link>
        <span className={`rating rating-${resource.rating.toLowerCase()}`}>{resource.rating}</span>
      </div>
      {isLatest && <time className="latest-date" dateTime={resource.createdAt}>{dateFormatter.format(new Date(`${resource.createdAt}T00:00:00`))}</time>}
      {variant !== "compact" && <p>{summary}</p>}
    </div>

    <div className="card-footer">
      <div className="tag-row"><span className={`category-chip ${category.color}`}>{category.name}</span>{tags.map((tag) => <span key={tag.id} className={`tag tag-${tag.color}`}>#{tag.name}</span>)}</div>
      {variant === "compact" ? <div className="card-links"><span>{resource.platforms.join(" / ")}</span><a href={resource.links.website} target="_blank" rel="noreferrer" title="官网"><ExternalLink size={14} /> 官网</a>{resource.links.github && <a href={resource.links.github} target="_blank" rel="noreferrer" title="GitHub" aria-label={`${resource.name} GitHub`}><Github size={14} /></a>}</div> : <div className="card-links">
        <Link to={`/resources/${resource.id}`}>查看判断</Link>
        <a href={resource.links.website} target="_blank" rel="noreferrer" title={`访问 ${resource.name}`}><ExternalLink size={14} /> 访问</a>
        {resource.links.github && <a href={resource.links.github} target="_blank" rel="noreferrer" title={`${resource.name} GitHub`} aria-label={`${resource.name} GitHub`}><Github size={14} /></a>}
      </div>}
    </div>
  </article>;
}
