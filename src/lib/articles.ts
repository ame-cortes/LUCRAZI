import { articles1 } from "./articles-1";
import { articles2 } from "./articles-2";
import { articles3 } from "./articles-3";
import { articles4 } from "./articles-4";
import { articles5 } from "./articles-5";
import type { Article } from "./article-types";

export type { Article, ArticleSection } from "./article-types";
export const articles = [...articles1, ...articles2, ...articles3, ...articles4, ...articles5];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function getEstimatedReadTime(article: Article) {
  const content = [
    article.title,
    article.intro,
    ...article.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
      ...(section.bullets ?? []),
      section.note ?? "",
    ]),
    article.takeaway,
  ].join(" ");
  const wordCount = content.trim().split(/\s+/).length;

  return `${Math.max(1, Math.ceil(wordCount / 200))} min de leitura`;
}

export function formatArticleDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}
