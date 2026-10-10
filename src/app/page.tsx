import Link from "next/link";
import { articles } from "@/lib/articles";
import { ArticleCard } from "@/components/article-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const topics = [
  { label: "Freelance", href: "/artigos/como-ganhar-dinheiro-como-redator-freelancer" },
  { label: "Produtos digitais", href: "/artigos/como-criar-e-vender-curso-online" },
  { label: "Comércio online", href: "/artigos/como-vender-produtos-usados-online" },
  { label: "Serviços locais", href: "/artigos/como-ganhar-dinheiro-como-pet-sitter" },
];

export default function Home() {
  const featuredArticles = articles.slice(0, 3);

  return (<>
    <SiteHeader />
    <main>
      <section className="hero wrap">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> DINHEIRO, COM OS PÉS NO CHÃO</span>
          <h1>Mais renda.<br /><span>Novos caminhos.</span></h1>
          <p>Ideias práticas para explorar formas de renda, avaliar possibilidades e dar os primeiros passos com mais clareza — sem fórmula mágica.</p>
          <Link className="button button-dark" href="#guias-iniciais">Conheça os guias <span aria-hidden="true">↘</span></Link>
          <div className="hero-note"><span className="note-star" aria-hidden="true">✳</span><span>Teste pequeno. Aprenda. Só depois invista mais.</span></div>
        </div>
        <div className="hero-art" aria-label="Ilustração abstrata com formas e a palavra ideias">
          <div className="art-sun" /><div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="art-orbit" />
          <div className="art-label">ideias que<br />viram planos<span>↗</span></div><div className="art-caption">UM PASSO DE CADA VEZ</div>
          <div className="art-spark art-spark-one">✳</div><div className="art-spark art-spark-two">✳</div>
        </div>
      </section>
      <section className="topic-bar" aria-label="Temas do blog"><div className="wrap topic-inner"><span className="topic-label">POR ONDE COMEÇAR</span><div className="topic-links">{topics.map((topic) => <Link href={topic.href} key={topic.label}>{topic.label}<span aria-hidden="true">↗</span></Link>)}</div></div></section>
      <section className="latest-section" id="guias-iniciais">
        <div className="wrap">
          <div className="section-heading">
            <div><span className="eyebrow">PARA COMEÇAR COM CALMA</span><h2>Três ideias para dar o primeiro passo.</h2></div>
            <Link className="text-link" href="/artigos">Ver todos os 50 guias <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="article-grid home-guides-grid">
            {featuredArticles.map((article, index) => <ArticleCard article={article} key={article.slug} index={index + 1} />)}
          </div>
        </div>
      </section>
      <section className="newsletter-section wrap"><div className="newsletter-mark" aria-hidden="true">L.</div><div><span className="eyebrow">UMA NOTA IMPORTANTE</span><h2>Possibilidade não é promessa.</h2><p>Os resultados dependem de procura, preço, custos, experiência e região. Pesquise as regras da atividade e não arrisque dinheiro reservado para despesas essenciais.</p></div><Link className="text-link" href="/sobre">Conheça o Lucrazi <span aria-hidden="true">↗</span></Link></section>
    </main>
    <SiteFooter />
  </>);
}
