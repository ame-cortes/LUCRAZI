import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/article-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { articleClusters, getClusterArticles } from "@/lib/article-clusters";
import { loadPublishedArticles } from "@/lib/articles";

type TopicPageProps = {
  params: Promise<{ tema: string }>;
};

export const instant = false;

export function generateStaticParams() {
  return articleClusters.map(({ slug }) => ({ tema: slug }));
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { tema } = await params;
  const cluster = articleClusters.find((item) => item.slug === tema);
  if (!cluster) return { title: "Tema não encontrado | Lucrazi", robots: { index: false, follow: true } };

  return {
    title: `${cluster.title} | Guias Lucrazi`,
    description: cluster.description,
    alternates: { canonical: `/artigos/temas/${cluster.slug}` },
  };
}

export default async function ArticleTopicPage({ params }: TopicPageProps) {
  await connection();
  const { tema } = await params;
  const cluster = articleClusters.find((item) => item.slug === tema);
  if (!cluster) notFound();

  const articles = getClusterArticles(cluster, await loadPublishedArticles());
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="catalog-hero">
          <div className="wrap catalog-hero-inner">
            <nav className="breadcrumbs" aria-label="Trilha de navegação">
              <Link href="/">Início</Link><span aria-hidden="true">/</span>
              <Link href="/artigos">Todos os guias</Link><span aria-hidden="true">/</span>
              <span>{cluster.title}</span>
            </nav>
            <span className="eyebrow"><span className="eyebrow-dot" /> COLEÇÃO DE GUIAS</span>
            <h1>{cluster.title}</h1>
            <p>{cluster.description}</p>
            <div className="catalog-note">
              <span aria-hidden="true">✳</span>
              {articles.length} guias publicados nesta coleção. Compare as opções e escolha um próximo passo viável.
            </div>
          </div>
        </header>
        <section className="catalog-section">
          <div className="wrap">
            <div className="catalog-section-heading">
              <h2>Guias desta coleção</h2>
              <Link className="text-link" href="/artigos">Ver todos os temas <span aria-hidden="true">↗</span></Link>
            </div>
            {articles.length > 0 ? (
              <div className="article-grid catalog-grid">
                {articles.map((article, index) => (
                  <ArticleCard article={article} index={index + 1} key={article.slug} />
                ))}
              </div>
            ) : <p className="catalog-empty">Ainda não há artigos publicados nesta coleção.</p>}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
