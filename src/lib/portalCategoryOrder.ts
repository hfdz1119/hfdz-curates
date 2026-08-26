import type { PortalCategory } from "../data/portalSites";

export function mergeVisibleCategoryOrder(categories: PortalCategory[], visibleIds: string[]) {
  const ordered = categories.slice().sort((a, b) => a.order - b.order);
  const visibleById = new Map(ordered.filter((category) => !category.hidden).map((category) => [category.id, category]));
  let visibleIndex = 0;
  return ordered.map((category) => category.hidden ? category : visibleById.get(visibleIds[visibleIndex++]) ?? category).map((category, order) => ({ ...category, order }));
}
