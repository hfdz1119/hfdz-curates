import Fuse from "fuse.js";
import categoriesData from "../data/categories.json";
import resourcesData from "../data/resources.json";
import tagsData from "../data/tags.json";
import { catalogSchema, type Category, type Platform, type Pricing, type Resource, type Tag } from "../schemas/catalog";

export const catalog = catalogSchema.parse({ categories: categoriesData, resources: resourcesData, tags: tagsData });
export const categories = catalog.categories;
export const resources = catalog.resources;
export const tags = catalog.tags;

const categoryById = new Map(categories.map((item) => [item.id, item]));
const tagById = new Map(tags.map((item) => [item.id, item]));
const resourceById = new Map(resources.map((item) => [item.id, item]));

function assertCatalogIntegrity() {
  const duplicates = (values: string[]) => new Set(values).size !== values.length;
  if (duplicates(resources.map((item) => item.id))) throw new Error("Duplicate resource id");
  if (duplicates(categories.map((item) => item.id))) throw new Error("Duplicate category id");
  if (duplicates(tags.map((item) => item.id))) throw new Error("Duplicate tag id");
  for (const resource of resources) {
    if (!categoryById.has(resource.categoryId)) throw new Error(`Unknown category: ${resource.categoryId}`);
    if (resource.tagIds.some((id) => !tagById.has(id))) throw new Error(`Unknown tag on: ${resource.id}`);
    if (duplicates(resource.tagIds)) throw new Error(`Duplicate tag on: ${resource.id}`);
    if (resource.updatedAt < resource.createdAt) throw new Error(`Invalid dates on: ${resource.id}`);
    if (resource.alternativeIds) {
      if (duplicates(resource.alternativeIds)) throw new Error(`Duplicate alternative on: ${resource.id}`);
      if (resource.alternativeIds.includes(resource.id)) throw new Error(`Self alternative on: ${resource.id}`);
      if (resource.alternativeIds.some((id) => !resourceById.has(id))) throw new Error(`Unknown alternative on: ${resource.id}`);
    }
    if (resource.featured && !resource.editorial?.verdict) throw new Error(`Featured resource needs editorial: ${resource.id}`);
  }
}
assertCatalogIntegrity();

export const getResource = (id: string) => resourceById.get(id);
export const getCategory = (id: string) => categoryById.get(id);
export const getTag = (id: string) => tagById.get(id);
export const getResourceCategory = (resource: Resource): Category => categoryById.get(resource.categoryId)!;
export const getResourceTags = (resource: Resource): Tag[] => resource.tagIds.map((id) => tagById.get(id)!);

const fuse = new Fuse(resources, {
  includeScore: true,
  threshold: 0.34,
  ignoreLocation: true,
  keys: ["name", "description", "categoryId", "tagIds", "platforms", "languages", "pricing", "rating"]
});

export type ResourceFilters = {
  query?: string;
  categoryId?: string;
  tagId?: string;
  rating?: Resource["rating"];
  platform?: Platform;
  pricing?: Pricing;
  license?: Resource["license"];
  difficulty?: Resource["difficulty"];
  networkAccess?: Resource["networkAccess"];
  favoriteIds?: string[];
};

export function filterResources(filters: ResourceFilters = {}): Resource[] {
  const query = filters.query?.trim();
  const base = query ? fuse.search(query).map((result) => result.item) : resources;
  return base.filter((resource) =>
    (!filters.categoryId || resource.categoryId === filters.categoryId) &&
    (!filters.tagId || resource.tagIds.includes(filters.tagId)) &&
    (!filters.rating || resource.rating === filters.rating) &&
    (!filters.platform || resource.platforms.includes(filters.platform)) &&
    (!filters.pricing || resource.pricing === filters.pricing) &&
    (!filters.license || resource.license === filters.license) &&
    (!filters.difficulty || resource.difficulty === filters.difficulty) &&
    (!filters.networkAccess || resource.networkAccess === filters.networkAccess) &&
    (!filters.favoriteIds || filters.favoriteIds.includes(resource.id))
  );
}

export const getFeatured = () => resources.filter((resource) => resource.featured).sort((a, b) => (a.featuredRank ?? 999) - (b.featuredRank ?? 999));
export const getLatest = (limit = 6) => [...resources].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

const ratingWeight = { S: 4, A: 3, B: 2, C: 1 };
export function getAlternatives(resource: Resource, limit = 3): Resource[] {
  return (resource.alternativeIds ?? []).slice(0, limit).map((id) => getResource(id)).filter((item): item is Resource => Boolean(item));
}
export function getRelated(resource: Resource, limit = 6): Resource[] {
  return resources
    .filter((candidate) => candidate.id !== resource.id)
    .map((candidate) => ({
      candidate,
      sameCategory: Number(candidate.categoryId === resource.categoryId),
      commonTags: candidate.tagIds.filter((tag) => resource.tagIds.includes(tag)).length
    }))
    .sort((a, b) =>
      b.sameCategory - a.sameCategory ||
      b.commonTags - a.commonTags ||
      ratingWeight[b.candidate.rating] - ratingWeight[a.candidate.rating] ||
      (a.candidate.featuredRank ?? 999) - (b.candidate.featuredRank ?? 999) ||
      b.candidate.createdAt.localeCompare(a.candidate.createdAt)
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
