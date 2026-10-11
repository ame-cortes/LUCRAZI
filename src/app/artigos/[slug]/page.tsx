import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { AdSlot } from "@/components/ad-slot";
import { ArticleCard } from "@/components/article-card";
import { ArticleText } from "@/components/article-text";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import {
  formatArticleDate,
  formatArticleUpdatedDate,
  getEstimatedReadTime,
  loadArticle,
  loadPublishedArticles,
} from "@/lib/articles";
import { siteUrl } from "@/lib/site-config";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

const maxSeoTitleLength = 59;

function getSeoTitle(title: string): string {
  const normalizedTitle = title.trim().replace(/\s+/g, " ");
  if (normalizedTitle.length <= maxSeoTitleLength) return normalizedTitle;

  const truncatedTitle = normalizedTitle.slice(0, maxSeoTitleLength - 1);
  const lastWordBoundary = truncatedTitle.lastIndexOf(" ");
  const titleWithoutPartialWord = lastWordBoundary > 0
    ? truncatedTitle.slice(0, lastWordBoundary)
    : truncatedTitle;

  return `${titleWithoutPartialWord}…`;
}

export const instant = false;

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) {
    return {
      title: "Artigo não encontrado | Lucrazi",
      robots: { index: false, follow: true },
    };
  }

  const seoTitle = getSeoTitle(article.title);

  return {
    title: seoTitle,
    description: article.description,
    alternates: { canonical: `/artigos/${article.slug}` },
    openGraph: {
      type: "article",
      title: seoTitle,
      description: article.description,
      url: new URL(`/artigos/${article.slug}`, siteUrl).toString(),
      publishedTime: new Date(article.publishedAt).toISOString(),
      modifiedTime: article.updatedAt ? new Date(article.updatedAt).toISOString() : undefined,
      authors: [article.author],
      images: [
        {
          url: new URL(article.imageSrc, siteUrl).toString(),
          width: 1600,
          height: 900,
          alt: article.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: article.description,
      images: [new URL(article.imageSrc, siteUrl).toString()],
    },
  };
}

export default function ArticlePage({ params }: ArticlePageProps) {
  return (
    <Suspense fallback={<div className="wrap article-wrap article-loading" aria-busy="true">Carregando artigo…</div>}>
      <ArticleContent params={params} />
    </Suspense>
  );
}

async function ArticleContent({ params }: ArticlePageProps) {
  await connection();
  const { slug } = await params;
  const articles = await loadPublishedArticles();
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();

  const sameCategory = articles.filter(
    (item) => item.slug !== article.slug && item.category === article.category,
  );
  const relatedArticles = [
    ...sameCategory,
    ...articles.filter(
      (item) => item.slug !== article.slug && item.category !== article.category,
    ),
  ].slice(0, 2);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: article.title,
        description: article.description,
        image: new URL(article.imageSrc, siteUrl).toString(),
        datePublished: article.publishedAt,
        dateModified: article.updatedAt ?? article.publishedAt,
        inLanguage: "pt-BR",
        author: {
          "@type": "Organization",
          name: article.author,
          url: new URL("/sobre", siteUrl).toString(),
        },
        publisher: {
          "@type": "Organization",
          "@id": `${siteUrl}#organization`,
          name: "Lucrazi",
          url: siteUrl.toString(),
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": new URL(`/artigos/${article.slug}`, siteUrl).toString(),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: siteUrl.toString() },
          { "@type": "ListItem", position: 2, name: "Guias", item: new URL("/artigos", siteUrl).toString() },
          {
            "@type": "ListItem",
            position: 3,
            name: article.title,
            item: new URL(`/artigos/${article.slug}`, siteUrl).toString(),
          },
        ],
      },
    ],
  };

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="article-page">
        <div className="wrap article-wrap">
          <nav className="breadcrumbs" aria-label="Trilha de navegação">
            <Link href="/">Início</Link><span aria-hidden="true">/</span>
            <Link href="/artigos">Guias</Link><span aria-hidden="true">/</span>
            <span>{article.category}</span>
          </nav>
          <article>
            <header className="article-header">
              <span className="article-category">{article.category}</span>
              <h1>{article.title}</h1>
              <p className="article-deck">{article.description}</p>
              <div className="article-byline">
                <span className="author-avatar">L.</span>
                <span>Por <strong>{article.author}</strong></span>
                <span aria-hidden="true">·</span>
                <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
                {article.updatedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <time dateTime={article.updatedAt}>
                      Atualizado em {formatArticleUpdatedDate(article.updatedAt)}
                    </time>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{getEstimatedReadTime(article)}</span>
              </div>
            </header>
            <figure className={`article-cover art-${article.accent}`}>
              <Image
                src={article.imageSrc}
                alt={article.imageAlt}
                fill
                preload
                sizes="(max-width: 800px) 100vw, 1000px"
                className="article-cover-image"
              />
              <figcaption className="cover-caption">
                Foto:{" "}
                <a href={article.imageCreditUrl} target="_blank" rel="noreferrer">
                  Unsplash
                </a>
              </figcaption>
            </figure>
            <div className="article-body">
              <p className="article-intro"><ArticleText text={article.intro} /></p>
              <nav className="article-toc" aria-label="Neste artigo">
                <span aria-hidden="true">NESTE ARTIGO</span>
                <ol>
                  {article.sections.map((section, index) => (
                    <li key={section.heading}>
                      <a href={`#secao-${index + 1}`}>{section.heading}</a>
                    </li>
                  ))}
                </ol>
              </nav>
              {article.sections.map((section, index) => (
                <div key={`section-${index}`}>
                  <section className="article-content-section" id={`secao-${index + 1}`}>
                    <h2><ArticleText text={section.heading} /></h2>
                    {section.paragraphs.map((paragraph, paragraphIndex) => (
                      <p key={`paragraph-${paragraphIndex}`}><ArticleText text={paragraph} /></p>
                    ))}
                    {section.bullets && (
                      <ul>
                        {section.bullets.map((bullet, bulletIndex) => (
                          <li key={`bullet-${bulletIndex}`}><ArticleText text={bullet} /></li>
                        ))}
                      </ul>
                    )}
                    {section.note && <aside className="article-note"><ArticleText text={section.note} /></aside>}
                  </section>
                  {index === 2 && <AdSlot className="article-ad" />}
                </div>
              ))}
              <aside className="article-takeaway">
                <span>PARA LEVAR COM VOCÊ</span>
                <p><ArticleText text={article.takeaway} /></p>
              </aside>
              <p className="editorial-note">
                Este conteúdo é informativo e não representa promessa de ganhos ou aconselhamento financeiro,
                jurídico ou contábil. Pesquise as condições e regras aplicáveis à sua realidade antes de tomar decisões.
              </p>
            </div>
          </article>
        </div>
        <section className="related-section">
          <div className="wrap">
            <div className="section-heading">
              <div><span className="eyebrow">CONTINUE EXPLORANDO</span><h2>Mais ideias para você.</h2></div>
              <Link className="text-link" href="/artigos">Todos os guias <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="article-grid related-grid">
              {relatedArticles.map((related, index) => (
                <ArticleCard article={related} index={index + 2} key={related.slug} />
              ))}
            </div>
          </div>
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
