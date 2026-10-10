import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArticleCard } from "@/components/article-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { loadPublishedArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Todos os guias",
  description:
    "Explore os guias do Lucrazi sobre renda extra, serviços, produtos digitais, comércio e pequenos negócios.",
  alternates: { canonical: "/artigos" },
};

export const instant = false;

export default async function ArticlesPage() {
  await connection();
  const articles = await loadPublishedArticles();
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="catalog-hero">
          <div className="wrap catalog-hero-inner">
            <nav className="breadcrumbs" aria-label="Trilha de navegação">
              <Link href="/">Início</Link><span aria-hidden="true">/</span><span>Todos os guias</span>
            </nav>
            <span className="eyebrow"><span className="eyebrow-dot" /> BIBLIOTECA LUCrazi</span>
            <h1>Ideias para explorar.<br /><span>Guias para começar.</span></h1>
            <p>
              {articles.length} guias práticos para pesquisar diferentes formas de renda
              e avaliar os próximos passos com calma. Escolha um tema que faça sentido para você.
            </p>
            <div className="catalog-note">
              <span aria-hidden="true">✳</span>
              Conteúdo informativo. Resultados e oportunidades variam para cada pessoa.
            </div>
          </div>
        </header>
        <section className="catalog-section">
          <div className="wrap">
            <div className="catalog-section-heading">
              <h2>Todos os guias</h2>
              <span>{articles.length} leituras</span>
            </div>
            <div className="article-grid catalog-grid">
              {articles.map((article, index) => (
                <ArticleCard article={article} index={index + 1} key={article.slug} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
