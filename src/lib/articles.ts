import { articles1 } from "./articles-1";
import { articles2 } from "./articles-2";
import { articles3 } from "./articles-3";
import { articles4 } from "./articles-4";
import { articles5 } from "./articles-5";

export type { Article, ArticleSection } from "./article-types";
export const articles = [...articles1, ...articles2, ...articles3, ...articles4, ...articles5];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function formatArticleDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}
