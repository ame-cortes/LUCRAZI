import Link from "next/link";
import { articles } from "@/lib/articles";
import { AdSlot } from "@/components/ad-slot";
import { ArticleCard } from "@/components/article-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const topics = [
  { label: "Freelance", href: "/artigos/como-ganhar-dinheiro-como-redator-freelancer" },
  { label: "Produtos digitais", href: "/artigos/como-criar-e-vender-curso-online" },
  { label: "Comércio online", href: "/artigos/como-vender-produtos-usados-online" },
  { label: "Serviços locais", href: "/artigos/como-ganhar-dinheiro-como-pet-sitter" },
];

export default function Home() {
  const [featured, ...latest] = articles;
  return (<>
    <SiteHeader />
    <main>
      <section className="hero wrap">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> DINHEIRO, COM OS PÉS NO CHÃO</span>
          <h1>50 ideias.<br /><span>50 caminhos possíveis.</span></h1>
          <p>Guias práticos sobre renda extra, serviços, produtos digitais e pequenos negócios - sem fórmula mágica ou promessa de lucro.</p>
          <Link className="button button-dark" href="#ultimos-artigos">Explore os 50 artigos <span aria-hidden="true">↘</span></Link>
          <div className="hero-note"><span className="note-star" aria-hidden="true">✳</span><span>Teste pequeno. Aprenda. Só depois invista mais.</span></div>
        </div>
        <div className="hero-art" aria-label="Ilustração abstrata com formas e a palavra ideias">
          <div className="art-sun" /><div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="art-orbit" />
          <div className="art-label">50 ideias<br />para explorar<span>↗</span></div><div className="art-caption">UM PASSO DE CADA VEZ</div>
          <div className="art-spark art-spark-one">✳</div><div className="art-spark art-spark-two">✳</div>
        </div>
      </section>
      <section className="topic-bar" aria-label="Temas do blog"><div className="wrap topic-inner"><span className="topic-label">POR ONDE COMEÇAR</span><div className="topic-links">{topics.map((topic) => <Link href={topic.href} key={topic.label}>{topic.label}<span aria-hidden="true">↗</span></Link>)}</div></div></section>
      {featured && <section className="featured-section wrap"><div className="section-heading"><div><span className="eyebrow">ARTIGO 01 DE 50</span><h2>Comece por uma habilidade vendável.</h2></div><span className="section-index">01 - DESTAQUE</span></div><ArticleCard article={featured} featured /></section>}
      <section className="latest-section" id="ultimos-artigos"><div className="wrap"><div className="section-heading"><div><span className="eyebrow">BIBLIOTECA LUCrazi</span><h2>50 guias para pesquisar e testar.</h2></div><span className="section-index">IDEIAS REAIS, SEM GANHO GARANTIDO</span></div><div className="article-grid">{latest.map((article, index) => <ArticleCard article={article} key={article.slug} index={index + 2} />)}</div></div></section>
      <section className="newsletter-section wrap"><div className="newsletter-mark" aria-hidden="true">L.</div><div><span className="eyebrow">UMA NOTA IMPORTANTE</span><h2>Possibilidade não é promessa.</h2><p>Os resultados dependem de procura, preço, custos, experiência e região. Pesquise as regras da atividade e não arrisque dinheiro reservado para despesas essenciais.</p></div><Link className="text-link" href="/sobre">Conheça o Lucrazi <span aria-hidden="true">↗</span></Link></section>
      <AdSlot className="wrap home-ad" />
    </main>
    <SiteFooter />
  </>);
}
