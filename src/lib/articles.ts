import { articles1 } from "./articles-1";
import { articles2 } from "./articles-2";
import { articles3 } from "./articles-3";
import { articles4 } from "./articles-4";
import { articles5 } from "./articles-5";
import { extras1 } from "./article-extras-1";
import { extras2 } from "./article-extras-2";
import { extras3 } from "./article-extras-3";
import { extras4 } from "./article-extras-4";
import { extras5 } from "./article-extras-5";
import { practiceSections1 } from "./article-practice-sections-1";
import { practiceSections2 } from "./article-practice-sections-2";
import { practiceSections3 } from "./article-practice-sections-3";
import { practiceSections4 } from "./article-practice-sections-4";
import { practiceSections5 } from "./article-practice-sections-5";
import { articleImageSources } from "./article-images";
import type { Article, ArticleWithImage } from "./article-types";

export type { Article, ArticleSection, ArticleWithImage } from "./article-types";
const articleContent = [...articles1, ...articles2, ...articles3, ...articles4, ...articles5];
const articleExtras = { ...extras1, ...extras2, ...extras3, ...extras4, ...extras5 };
const articlePracticeSections = {
  ...practiceSections1,
  ...practiceSections2,
  ...practiceSections3,
  ...practiceSections4,
  ...practiceSections5,
};

function withExtras(article: Article): Article {
  const extra = articleExtras[article.slug];
  if (!extra) return article;
  const practiceSection = articlePracticeSections[article.slug];
  if (!practiceSection) throw new Error(`Exemplo prático do artigo não encontrado: ${article.slug}`);

  return {
    ...article,
    title: extra.title,
    description: extra.description,
    sections: [extra.lead, ...article.sections, practiceSection, ...extra.sections],
  };
}

export const articles: ArticleWithImage[] = articleContent.map(withExtras).map((article) => {
  const image = articleImageSources[article.slug];
  if (!image) throw new Error(`Imagem do artigo não encontrada: ${article.slug}`);

  return {
    ...article,
    imageSrc: `/images/articles/${article.slug}.jpg`,
    imageAlt: image.alt,
    imageCreditUrl: image.creditUrl,
  };
});

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
