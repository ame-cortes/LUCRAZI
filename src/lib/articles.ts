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
import { getDocs, collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "./firebase";
import type { Article, ArticleSection, ArticleWithImage } from "./article-types";

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

export type ArticleStatus = "draft" | "published" | "deleted";

export type ManagedArticle = ArticleWithImage & {
  status: ArticleStatus;
};

function isArticleSection(value: unknown): value is ArticleSection {
  if (!value || typeof value !== "object") return false;
  const section = value as Partial<ArticleSection>;
  return typeof section.heading === "string"
    && Array.isArray(section.paragraphs)
    && section.paragraphs.every((paragraph) => typeof paragraph === "string")
    && (section.bullets === undefined
      || (Array.isArray(section.bullets) && section.bullets.every((bullet) => typeof bullet === "string")))
    && (section.note === undefined || typeof section.note === "string");
}

function isArticleWithImage(value: unknown): value is ArticleWithImage {
  if (!value || typeof value !== "object") return false;
  const article = value as Partial<ArticleWithImage>;
  return typeof article.slug === "string"
    && typeof article.title === "string"
    && typeof article.description === "string"
    && typeof article.category === "string"
    && typeof article.intro === "string"
    && typeof article.takeaway === "string"
    && typeof article.publishedAt === "string"
    && typeof article.author === "string"
    && typeof article.imageSrc === "string"
    && (article.imageSrc.startsWith("/images/")
      || (URL.canParse(article.imageSrc) && new URL(article.imageSrc).protocol === "https:"))
    && typeof article.imageAlt === "string"
    && typeof article.imageCreditUrl === "string"
    && URL.canParse(article.imageCreditUrl)
    && new URL(article.imageCreditUrl).protocol === "https:"
    && ["mint", "yellow", "lavender", "peach"].includes(article.accent ?? "")
    && /^\d{4}-\d{2}-\d{2}$/.test(article.publishedAt)
    && Array.isArray(article.sections)
    && article.sections.every(isArticleSection);
}

function isArticleStatus(value: unknown): value is Exclude<ArticleStatus, "deleted"> {
  return value === "draft" || value === "published";
}

function getStoredArticle(data: Record<string, unknown>, documentId: string): ManagedArticle | null {
  if (data.slug !== documentId || !isArticleStatus(data.status) || !isArticleWithImage(data.article)) {
    console.error(`Documento Firestore ignorado por formato inválido: articles/${documentId}`);
    return null;
  }
  const updatedAt = typeof data.updatedAt === "string" && !Number.isNaN(Date.parse(data.updatedAt))
    ? data.updatedAt
    : undefined;
  return { ...data.article, ...(updatedAt ? { updatedAt } : {}), status: data.status };
}

class FirestoreRestError extends Error {
  constructor(readonly status: number) {
    super(`Cloud Firestore REST API respondeu com HTTP ${status}.`);
  }
}

type PublicDocument = {
  id: string;
  data: Record<string, unknown>;
};

function decodeFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return undefined;
  const fields = value as Record<string, unknown>;
  if (typeof fields.stringValue === "string") return fields.stringValue;
  if (typeof fields.timestampValue === "string") return fields.timestampValue;
  if (typeof fields.integerValue === "string") return Number(fields.integerValue);
  if (typeof fields.doubleValue === "number") return fields.doubleValue;
  if (typeof fields.booleanValue === "boolean") return fields.booleanValue;
  if (Array.isArray((fields.arrayValue as { values?: unknown[] } | undefined)?.values)) {
    return ((fields.arrayValue as { values: unknown[] }).values).map(decodeFirestoreValue);
  }
  const nested = (fields.mapValue as { fields?: Record<string, unknown> } | undefined)?.fields;
  if (nested && typeof nested === "object") {
    return Object.fromEntries(Object.entries(nested).map(([key, nestedValue]) => [
      key,
      decodeFirestoreValue(nestedValue),
    ]));
  }
  if ("nullValue" in fields) return null;
  return undefined;
}

function decodeFirestoreDocument(value: unknown): PublicDocument | null {
  if (!value || typeof value !== "object") return null;
  const documentValue = value as { name?: unknown; fields?: unknown };
  if (typeof documentValue.name !== "string" || !documentValue.fields || typeof documentValue.fields !== "object") {
    return null;
  }
  const id = documentValue.name.split("/").at(-1);
  if (!id) return null;
  return {
    id,
    data: Object.fromEntries(Object.entries(documentValue.fields as Record<string, unknown>).map(([key, field]) => [
      key,
      decodeFirestoreValue(field),
    ])),
  };
}

async function queryPublicDocuments(
  collectionId: "articles" | "deletedArticles",
  fieldFilters: { fieldPath: string; value: string }[] = [],
): Promise<PublicDocument[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) throw new Error("A configuração pública do Firebase está incompleta.");

  const filters = fieldFilters.map(({ fieldPath, value }) => ({
    fieldFilter: {
      field: { fieldPath },
      op: "EQUAL",
      value: { stringValue: value },
    },
  }));
  const whereClause = filters.length === 1
    ? filters[0]
    : filters.length > 1
      ? { compositeFilter: { op: "AND", filters } }
      : undefined;
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId }],
          ...(whereClause ? { where: whereClause } : {}),
        },
      }),
    },
  );
  if (!response.ok) throw new FirestoreRestError(response.status);
  const result: unknown = await response.json();
  if (!Array.isArray(result)) throw new Error("Resposta inválida do Cloud Firestore.");
  return result
    .map((row) => row && typeof row === "object" ? decodeFirestoreDocument((row as { document?: unknown }).document) : null)
    .filter((document): document is PublicDocument => document !== null);
}

function isFirestoreSetupError(error: unknown) {
  if (error instanceof FirestoreRestError) {
    return [403, 404, 429, 500, 503].includes(error.status);
  }
  return error instanceof TypeError;
}

function logFirestoreFallback(error: unknown) {
  console.error(
    "Não foi possível ler os artigos do Firestore. O site continuará exibindo o conteúdo inicial até o banco e as regras serem configurados.",
    error,
  );
}

export async function loadPublishedArticles(): Promise<ArticleWithImage[]> {
  if (!isFirebaseConfigured()) return articles;

  const snapshots = await Promise.all([
    queryPublicDocuments("articles", [{ fieldPath: "status", value: "published" }]),
    queryPublicDocuments("deletedArticles"),
  ]).catch((error: unknown) => {
    if (!isFirestoreSetupError(error)) throw error;
    logFirestoreFallback(error);
    return null;
  });
  if (!snapshots) return articles;
  const [snapshot, deletedSnapshot] = snapshots;
  const overrides = new Map<string, ManagedArticle>();
  const deletedSlugs = new Set<string>();

  for (const articleDoc of snapshot) {
    const storedArticle = getStoredArticle(articleDoc.data, articleDoc.id);
    if (storedArticle) overrides.set(articleDoc.id, storedArticle);
  }
  for (const deletedDoc of deletedSnapshot) {
    if (deletedDoc.data.slug === deletedDoc.id) deletedSlugs.add(deletedDoc.id);
    else console.error(`Marcador de exclusão inválido: deletedArticles/${deletedDoc.id}`);
  }

  const merged = articles
    .filter((article) => !deletedSlugs.has(article.slug))
    .map((article) => {
      const override = overrides.get(article.slug);
      return override ?? article;
    });
  const knownSlugs = new Set(articles.map((article) => article.slug));

  for (const storedArticle of overrides.values()) {
    if (!knownSlugs.has(storedArticle.slug)) {
      merged.push(storedArticle);
    }
  }
  return merged.filter((article) => !deletedSlugs.has(article.slug));
}

export async function loadArticle(slug: string): Promise<ArticleWithImage | undefined> {
  if (!isFirebaseConfigured()) return articles.find((article) => article.slug === slug);

  const snapshots = await Promise.all([
    queryPublicDocuments("articles", [
      { fieldPath: "slug", value: slug },
      { fieldPath: "status", value: "published" },
    ]),
    queryPublicDocuments("deletedArticles", [{ fieldPath: "slug", value: slug }]),
  ]).catch((error: unknown) => {
    if (!isFirestoreSetupError(error)) throw error;
    logFirestoreFallback(error);
    return null;
  });
  if (!snapshots) return articles.find((article) => article.slug === slug);
  const [snapshot, deletedDoc] = snapshots;
  if (deletedDoc.length > 0) return undefined;
  if (snapshot.length === 0) return articles.find((article) => article.slug === slug);

  const storedArticle = getStoredArticle(snapshot[0].data, snapshot[0].id);
  return storedArticle ?? articles.find((article) => article.slug === slug);
}

export async function loadManagedArticles(): Promise<ManagedArticle[]> {
  const db = getFirebaseDb();
  const [snapshot, deletedSnapshot] = await Promise.all([
    getDocs(collection(db, "articles")),
    getDocs(collection(db, "deletedArticles")),
  ]);
  const stored = snapshot.docs
    .map((articleDoc) => getStoredArticle(articleDoc.data(), articleDoc.id))
    .filter((article): article is ManagedArticle => article !== null);
  const managed = new Map(stored.map((article) => [article.slug, article]));

  for (const article of articles) {
    if (!managed.has(article.slug)) managed.set(article.slug, { ...article, status: "published" });
  }
  for (const deletedDoc of deletedSnapshot.docs) {
    const slug = deletedDoc.data().slug;
    if (typeof slug !== "string" || slug !== deletedDoc.id) {
      console.error(`Marcador de exclusão inválido: deletedArticles/${deletedDoc.id}`);
      continue;
    }
    const existing = managed.get(slug);
    if (existing?.status === "draft") continue;
    const baseline = articles.find((article) => article.slug === slug);
    const template = existing ?? baseline ?? {
      ...articles[0],
      slug,
      category: "Excluídos",
      title: `Artigo removido: ${slug}`,
      description: "Registro sem conteúdo publicado.",
      intro: "",
      sections: [],
      takeaway: "",
    };
    managed.set(slug, { ...template, status: "deleted" });
  }
  return [...managed.values()].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

export async function deleteManagedArticle(article: ManagedArticle) {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, "articles", article.slug));
  batch.set(doc(db, "deletedArticles", article.slug), {
    slug: article.slug,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

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

export function formatArticleUpdatedDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}
