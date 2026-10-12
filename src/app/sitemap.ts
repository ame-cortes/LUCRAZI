import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { articleClusters } from "@/lib/article-clusters";
import { loadPublishedArticles } from "@/lib/articles";
import { siteUrl } from "@/lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const articles = await loadPublishedArticles();
  const pages = [
    { path: "", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/artigos", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/sobre", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/contato", changeFrequency: "monthly" as const, priority: 0.4 },
    { path: "/privacidade", changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  return [
    ...pages.map((page) => ({
      url: new URL(page.path, siteUrl).toString(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...articleClusters.map((cluster) => ({
      url: new URL(`/artigos/temas/${cluster.slug}`, siteUrl).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...articles.map((article) => ({
      url: new URL(`/artigos/${article.slug}`, siteUrl).toString(),
      lastModified: new Date(article.updatedAt ?? `${article.publishedAt}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [new URL(article.imageSrc, siteUrl).toString()],
    })),
  ];
}
