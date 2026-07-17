import { describe, expect, it } from "vitest";
import { categories, filterResources, getAlternatives, getFeatured, getLatest, getRelated, getResource, resources, tags } from "./catalog";
import { resourceSchema } from "../schemas/catalog";

describe("catalog", () => {
  it("has a validated, long-lived initial catalog", () => {
    expect(resources.length).toBeGreaterThanOrEqual(40);
    expect(resources.length).toBeLessThanOrEqual(60);
    expect(new Set(resources.map((resource) => resource.id)).size).toBe(resources.length);
    expect(new Set(categories.map((category) => category.id)).size).toBe(categories.length);
    expect(new Set(tags.map((tag) => tag.id)).size).toBe(tags.length);
  });

  it("searches and filters across catalog fields", () => {
    expect(filterResources({ query: "Cloudflare" }).map((resource) => resource.id)).toContain("cloudflare");
    expect(filterResources({ platform: "linux", pricing: "free" }).every((resource) => resource.platforms.includes("linux") && resource.pricing === "free")).toBe(true);
    expect(resourceSchema.parse({ ...resources[0], rating: "C" }).rating).toBe("C");
    expect(filterResources({ rating: "C" })).toEqual([]);
    expect(filterResources({ difficulty: "advanced" }).every((resource) => resource.difficulty === "advanced")).toBe(true);
    expect(filterResources({ networkAccess: "unknown" })).toHaveLength(resources.length);
    expect(filterResources({ license: "open-source" }).every((resource) => resource.license === "open-source")).toBe(true);
  });

  it("orders featured and latest resources deterministically", () => {
    expect(getFeatured().every((resource) => resource.featured)).toBe(true);
    expect(getFeatured()[0].id).toBe("chatgpt");
    expect(getLatest(2)[0].createdAt >= getLatest(2)[1].createdAt).toBe(true);
  });

  it("returns related resources without returning the current resource", () => {
    const cloudflare = getResource("cloudflare")!;
    const related = getRelated(cloudflare);
    expect(related).toHaveLength(6);
    expect(related.map((resource) => resource.id)).not.toContain("cloudflare");
    expect(related[0].categoryId).toBe("development");
  });

  it("keeps explicit alternatives separate from automatic related resources", () => {
    const chatgpt = getResource("chatgpt")!;
    expect(getAlternatives(chatgpt).map((resource) => resource.id)).toEqual(["claude", "gemini"]);
    expect(getFeatured().every((resource) => Boolean(resource.editorial?.verdict))).toBe(true);
    expect(resources.every((resource) => resource.updatedAt >= resource.createdAt)).toBe(true);
  });
});
