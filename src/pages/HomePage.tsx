import { Download, Heart, Upload } from "lucide-react";
import { useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { categories, filterResources, getFeatured, getLatest, resources, tags } from "../lib/catalog";
import { type Difficulty, type NetworkAccess, type Platform, type Pricing, type Resource } from "../schemas/catalog";
import { track } from "../stores/analytics";
import { favoritesStore } from "../stores/favorites";
import { ResourceCard } from "../components/ResourceCard";
import { SearchPanel } from "../components/SearchPanel";
import { ServiceStrip } from "../components/ServiceStrip";

type FilterState = { query: string; categoryId?: string; tagId?: string; rating?: Resource["rating"]; platform?: Platform; pricing?: Pricing; license?: Resource["license"]; difficulty?: Difficulty; networkAccess?: NetworkAccess };

export function HomePage({ favoriteIds, toggleFavorite, setFavoriteIds }: { favoriteIds: string[]; toggleFavorite: (id: string) => void; setFavoriteIds: (ids: string[]) => void }) {
  const [params, setParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const filters: FilterState = { query: params.get("q") ?? "", categoryId: params.get("category") ?? undefined, tagId: params.get("tag") ?? undefined, rating: params.get("rating") as Resource["rating"] | undefined, platform: params.get("platform") as Platform | undefined, pricing: params.get("pricing") as Pricing | undefined, license: params.get("license") as Resource["license"] | undefined, difficulty: params.get("difficulty") as Difficulty | undefined, networkAccess: params.get("network") as NetworkAccess | undefined };
  const visible = useMemo(() => filterResources(filters), [params]);
  const featured = getFeatured();
  const [primaryFeatured, ...secondaryFeatured] = featured;
  const latest = getLatest();
  const favorites = resources.filter((resource) => favoriteIds.includes(resource.id));
  const filtered = Boolean(filters.query || filters.categoryId || filters.tagId || filters.rating || filters.platform || filters.pricing || filters.license || filters.difficulty || filters.networkAccess);
  const update = (next: Partial<FilterState>) => { const merged = { ...filters, ...next }; const output = new URLSearchParams(); const keys: [keyof FilterState, string][] = [["query", "q"], ["categoryId", "category"], ["tagId", "tag"], ["rating", "rating"], ["platform", "platform"], ["pricing", "pricing"], ["license", "license"], ["difficulty", "difficulty"], ["networkAccess", "network"]]; keys.forEach(([key, param]) => { if (merged[key]) output.set(param, String(merged[key])); }); if (next.query && next.query !== filters.query) track("search_submit", { query: next.query }); setParams(output, { replace: true }); };
  const exportFavorites = () => { const blob = new Blob([favoritesStore.export()], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "hfdz-curates-favorites.json"; link.click(); URL.revokeObjectURL(url); };
  const importFavorites = async (file?: File) => { if (!file) return; try { setFavoriteIds(favoritesStore.import(await file.text(), new Set(resources.map((item) => item.id)))); } catch { alert("收藏文件无效，未导入任何内容。"); } };

  return <main>
    <section className="hero">
      <p className="eyebrow">会飞的猪精选</p>
      <h1>HFDZ Curates <span>| 会飞的猪</span></h1>
      <p>经过个人筛选，留下一些真正值得使用、值得回访的工具与知识资源。不追求数量，只推荐值得留下的资源。</p>
    </section>
    <SearchPanel {...filters} categories={categories} tags={tags} onChange={update} />
    <ServiceStrip />

    {!filtered && <>
      <section className="content-section featured-section">
        <SectionHeading kicker="编辑精选" title="Featured" caption="先说为什么值得，再决定是否访问" />
        {primaryFeatured && <div className="featured-layout">
          <ResourceCard resource={primaryFeatured} variant="featured-primary" favorite={favoriteIds.includes(primaryFeatured.id)} onToggleFavorite={toggleFavorite} />
          {secondaryFeatured.length > 0 && <div className="featured-secondary-list">{secondaryFeatured.slice(0, 4).map((resource) => <ResourceCard key={resource.id} resource={resource} variant="featured-secondary" favorite={favoriteIds.includes(resource.id)} onToggleFavorite={toggleFavorite} />)}</div>}
        </div>}
      </section>

      <section className="content-section latest-section">
        <SectionHeading kicker="近期收录" title="Latest" caption="最近加入的资源与判断" />
        <div className="latest-list">{latest.map((resource) => <ResourceCard key={resource.id} resource={resource} variant="latest" favorite={favoriteIds.includes(resource.id)} onToggleFavorite={toggleFavorite} />)}</div>
      </section>
    </>}

    {favorites.length > 0 && <section className="content-section favorites-section">
      <div className="section-heading favorites-heading"><div><p className="eyebrow">回访工具</p><h2><Heart size={20} fill="currentColor" /> 我的收藏</h2></div><div className="utility-actions"><button onClick={exportFavorites} title="导出收藏"><Download size={15} /> 导出</button><button onClick={() => fileRef.current?.click()} title="导入收藏"><Upload size={15} /> 导入</button><input ref={fileRef} type="file" accept="application/json" onChange={(event) => importFavorites(event.target.files?.[0])} /></div></div>
      <div className="favorites-list">{favorites.slice(0, 6).map((resource) => <ResourceCard key={resource.id} resource={resource} variant="favorite" favorite onToggleFavorite={toggleFavorite} />)}</div>
    </section>}

    <section className="content-section catalog-section">
      <SectionHeading kicker="资源目录" title={filtered ? `找到 ${visible.length} 条资源` : "All Resources"} caption={filtered ? "保留当前筛选结果" : "按判断、用途与条件继续浏览"} />
      <div className="resource-grid">{visible.map((resource) => <ResourceCard key={resource.id} resource={resource} variant="catalog" favorite={favoriteIds.includes(resource.id)} onToggleFavorite={toggleFavorite} />)}</div>
      {visible.length === 0 && <div className="empty-state">没有匹配的资源。尝试清除筛选或换一个关键词。</div>}
    </section>
  </main>;
}

function SectionHeading({ kicker, title, caption }: { kicker: string; title: string; caption: string }) {
  return <div className="section-heading"><div><p className="eyebrow">{kicker}</p><h2>{title}</h2></div><span>{caption}</span></div>;
}
