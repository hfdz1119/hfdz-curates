import { z } from "zod";

export const platformSchema = z.enum(["web", "mac", "windows", "linux", "ios", "android"]);
export const languageSchema = z.enum(["zh", "en", "multilingual"]);
export const difficultySchema = z.enum(["easy", "medium", "advanced"]);
export const networkAccessSchema = z.enum(["direct", "proxy", "unknown"]);
export const resourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().min(8).max(120),
  icon: z.string().min(1),
  categoryId: z.string().min(1),
  tagIds: z.array(z.string()).min(1),
  featured: z.boolean(),
  featuredRank: z.number().int().positive().optional(),
  createdAt: z.string().date(),
  updatedAt: z.string().date(),
  rating: z.enum(["S", "A", "B", "C"]),
  difficulty: difficultySchema,
  networkAccess: networkAccessSchema,
  networkAccessCheckedAt: z.string().date().optional(),
  platforms: z.array(platformSchema).min(1),
  languages: z.array(languageSchema).min(1),
  pricing: z.enum(["free", "freemium", "paid"]),
  license: z.enum(["open-source", "proprietary"]),
  links: z.object({ website: z.string().url(), github: z.string().url().optional(), docs: z.string().url().optional() }),
  detailPath: z.string().regex(/^[a-z0-9-]+\.md$/).optional(),
  alternativeIds: z.array(z.string()).optional(),
  editorial: z.object({ verdict: z.string().min(8), tutorials: z.array(z.object({ title: z.string().min(1), url: z.string().url() })) }).optional(),
  relatedKnowledge: z.array(z.string().url()).optional(),
  popularity: z.number().nonnegative().optional()
});

export const categorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  color: z.enum(["violet", "blue", "cyan", "rose", "amber", "green"])
});

export const tagSchema = z.object({ id: z.string().regex(/^[a-z0-9-]+$/), name: z.string().min(1), color: z.enum(["green", "blue", "cyan", "sky", "pink", "yellow", "purple", "gray"]).default("gray") });
export const catalogSchema = z.object({
  categories: z.array(categorySchema).min(1),
  tags: z.array(tagSchema).min(1),
  resources: z.array(resourceSchema).min(1)
});

export type Resource = z.infer<typeof resourceSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Tag = z.infer<typeof tagSchema>;
export type Platform = z.infer<typeof platformSchema>;
export type Pricing = Resource["pricing"];
export type Difficulty = Resource["difficulty"];
export type NetworkAccess = Resource["networkAccess"];
