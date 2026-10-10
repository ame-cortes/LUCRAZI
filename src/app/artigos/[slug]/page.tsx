import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdSlot } from "@/components/ad-slot";
import { ArticleCard } from "@/components/article-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { articles, formatArticleDate, getArticle, getEstimatedReadTime } from "@/lib/articles";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Artigo não encontrado | Lucrazi" };

  return {
    title: article.title,
    description: article.description,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      publishedTime: new Date(article.publishedAt).toISOString(),
      authors: [article.author],
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
  const { slug } = await params;
  const article = getArticle(slug);
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
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: { "@type": "Organization", name: article.author },
    publisher: { "@type": "Organization", name: "Lucrazi" },
    ...(process.env.NEXT_PUBLIC_SITE_URL
      ? { mainEntityOfPage: new URL(`/artigos/${article.slug}`, process.env.NEXT_PUBLIC_SITE_URL).toString() }
      : {}),
  };

  return (
    <>
      <SiteHeader />
      <main className="article-page">
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
                <span aria-hidden="true">·</span>
                <span>{getEstimatedReadTime(article)}</span>
              </div>
            </header>
            <div className={`article-cover art-${article.accent}`} aria-hidden="true">
              <span className="cover-brand">L.</span>
              <span className="cover-shape cover-shape-one" />
              <span className="cover-shape cover-shape-two" />
              <span className="cover-caption">{article.category} / LUCrazi</span>
            </div>
            <div className="article-body">
              <p className="article-intro">{article.intro}</p>
              <div className="article-toc">
                <span>NESTE ARTIGO</span>
                <ol>
                  {article.sections.map((section, index) => (
                    <li key={section.heading}>
                      <a href={`#secao-${index + 1}`}>{section.heading}</a>
                    </li>
                  ))}
                </ol>
              </div>
              {article.sections.map((section, index) => (
                <div key={section.heading}>
                  <section className="article-content-section" id={`secao-${index + 1}`}>
                    <h2>{section.heading}</h2>
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    {section.bullets && (
                      <ul>
                        {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                      </ul>
                    )}
                    {section.note && <aside className="article-note">{section.note}</aside>}
                  </section>
                  {index === 2 && <AdSlot className="article-ad" />}
                </div>
              ))}
              <aside className="article-takeaway">
                <span>PARA LEVAR COM VOCÊ</span>
                <p>{article.takeaway}</p>
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
