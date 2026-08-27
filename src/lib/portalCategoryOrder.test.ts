import { describe, expect, it } from "vitest";
import type { PortalCategory } from "../data/portalSites";
import { mergeVisibleCategoryOrder } from "./portalCategoryOrder";

const categories: PortalCategory[] = [
  { id: "visible-a", name: "A", order: 0, hidden: false, palette: "aurora", visibility: "public" },
  { id: "hidden", name: "Hidden", order: 1, hidden: true, palette: "sakura", visibility: "public" },
  { id: "visible-b", name: "B", order: 2, hidden: false, palette: "lavender", visibility: "public" },
];

describe("visible portal category ordering", () => {
  it("reorders visible categories while preserving hidden slots", () => {
    expect(mergeVisibleCategoryOrder(categories, ["visible-b", "visible-a"]).map(({ id, order }) => ({ id, order }))).toEqual([
      { id: "visible-b", order: 0 },
      { id: "hidden", order: 1 },
      { id: "visible-a", order: 2 },
    ]);
  });
});
