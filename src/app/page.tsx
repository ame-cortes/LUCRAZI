import Link from "next/link";
import { articles } from "@/lib/articles";
import { AdSlot } from "@/components/ad-slot";
import { ArticleCard } from "@/components/article-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const topics = [
  { label: "Renda extra", href: "/artigos/como-comecar-renda-extra" },
  { label: "Ideias de negócio", href: "/artigos/valide-sua-ideia-de-negocio" },
  { label: "Freelance", href: "/artigos/como-definir-preco-do-seu-servico" },
  { label: "Organização", href: "/artigos/organize-sua-primeira-renda-extra" },
];

export default function Home() {
  const [featured, ...latest] = articles;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> DINHEIRO, COM OS PÉS NO CHÃO</span>
            <h1>Mais ideias.<br /><span>Mais possibilidades.</span></h1>
            <p>
              Um guia independente para quem quer fazer o dinheiro render:
              ideias de renda extra, primeiros passos e escolhas mais conscientes.
            </p>
            <Link className="button button-dark" href="#ultimos-artigos">
              Explore os artigos <span aria-hidden="true">↘</span>
            </Link>
            <div className="hero-note">
              <span className="note-star" aria-hidden="true">✳</span>
              <span>Informação útil, sem fórmula mágica.</span>
            </div>
          </div>
          <div className="hero-art" aria-label="Ilustração abstrata com formas e a palavra ideias">
            <div className="art-sun" />
            <div className="art-ring art-ring-one" />
            <div className="art-ring art-ring-two" />
            <div className="art-orbit" />
            <div className="art-label">ideias que<br />viram planos<span>↗</span></div>
            <div className="art-caption">UM PASSO DE CADA VEZ</div>
            <div className="art-spark art-spark-one">✳</div>
            <div className="art-spark art-spark-two">✳</div>
          </div>
        </section>

        <section className="topic-bar" aria-label="Temas do blog">
          <div className="wrap topic-inner">
            <span className="topic-label">POR ONDE COMEÇAR</span>
            <div className="topic-links">
              {topics.map((topic) => (
                <Link href={topic.href} key={topic.label}>{topic.label}<span aria-hidden="true">↗</span></Link>
              ))}
            </div>
          </div>
        </section>

        {featured && (
          <section className="featured-section wrap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">PARA COMEÇAR</span>
                <h2>Uma ideia para tirar do papel.</h2>
              </div>
              <span className="section-index">01 — DESTAQUE</span>
            </div>
            <ArticleCard article={featured} featured />
          </section>
        )}

        <section className="latest-section" id="ultimos-artigos">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">LEITURAS RECENTES</span>
                <h2>Conteúdo para seguir em frente.</h2>
              </div>
              <span className="section-index">NOVAS PERSPECTIVAS, SEM PRESSA</span>
            </div>
            <div className="article-grid">
              {latest.map((article, index) => (
                <ArticleCard article={article} key={article.slug} index={index + 2} />
              ))}
            </div>
          </div>
        </section>

        <section className="newsletter-section wrap">
          <div className="newsletter-mark" aria-hidden="true">L.</div>
          <div>
            <span className="eyebrow">UMA NOTA IMPORTANTE</span>
            <h2>Dinheiro real. Expectativas reais.</h2>
            <p>
              Ideias de renda podem exigir tempo, investimento e tentativa.
              Aqui, a gente compartilha caminhos para pesquisar e decidir —
              sem prometer ganhos nem atalhos garantidos.
            </p>
          </div>
          <Link className="text-link" href="/sobre">Conheça o Lucrazi <span aria-hidden="true">↗</span></Link>
        </section>
        <AdSlot className="wrap home-ad" />
      </main>
      <SiteFooter />
    </>
  );
}
