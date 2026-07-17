import { z } from "zod";
import type { Resource } from "../schemas/catalog";

export const knowledgeIndexSchema = z.object({ version: z.literal(1), articles: z.array(z.object({ title: z.string(), tags: z.array(z.string()), aliases: z.array(z.string()), url: z.string().url() })) });
export type KnowledgeArticle = z.infer<typeof knowledgeIndexSchema>["articles"][number];
const INDEX_URL = "https://wiki.hfdz1119.top/knowledge-index.json";

export async function loadKnowledgeIndex(signal?: AbortSignal): Promise<KnowledgeArticle[]> {
  const response = await fetch(INDEX_URL, { signal });
  if (!response.ok) throw new Error("Knowledge index unavailable");
  return knowledgeIndexSchema.parse(await response.json()).articles;
}
export function matchKnowledge(resource: Resource, articles: KnowledgeArticle[]) { return articles.filter((article) => article.tags.some((tag) => resource.tagIds.includes(tag))).slice(0, 6); }
