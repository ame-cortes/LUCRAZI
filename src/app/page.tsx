import Link from "next/link";
import { connection } from "next/server";
import { loadPublishedArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/article-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { siteUrl } from "@/lib/site-config";

const topics = [
  { label: "Freelance", href: "/artigos/como-ganhar-dinheiro-como-redator-freelancer" },
  { label: "Produtos digitais", href: "/artigos/como-criar-e-vender-curso-online" },
  { label: "Comércio online", href: "/artigos/como-vender-produtos-usados-online" },
  { label: "Serviços locais", href: "/artigos/como-ganhar-dinheiro-como-pet-sitter" },
];

const featuredArticleSlugs = [
  "como-ganhar-dinheiro-com-marketing-de-afiliados",
  "como-ganhar-dinheiro-no-youtube",
  "como-vender-produtos-usados-online",
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
      name: "Lucrazi",
      description:
        "Projeto editorial independente com guias práticos sobre renda online, trabalho freelancer, marketing digital e pequenos negócios.",
      url: siteUrl.toString(),
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: "Lucrazi",
      url: siteUrl.toString(),
      inLanguage: "pt-BR",
      publisher: { "@id": `${siteUrl}#organization` },
    },
    {
      "@type": "Blog",
      "@id": `${siteUrl}#blog`,
      name: "Lucrazi",
      description:
        "Blog sobre como ganhar dinheiro na internet, com guias de trabalho freelancer, marketing digital, YouTube, produtos digitais e renda extra.",
      url: siteUrl.toString(),
      inLanguage: "pt-BR",
      publisher: { "@id": `${siteUrl}#organization` },
      isPartOf: { "@id": `${siteUrl}#website` },
    },
  ],
};

export const instant = false;

export default async function Home() {
  await connection();
  const articles = await loadPublishedArticles();
  const preferredArticles = featuredArticleSlugs
    .map((slug) => articles.find((item) => item.slug === slug))
    .filter((article) => article !== undefined);
  const preferredSlugs = new Set(preferredArticles.map((article) => article.slug));
  const featuredArticles = [
    ...preferredArticles,
    ...articles.filter((article) => !preferredSlugs.has(article.slug)),
  ].slice(0, 3);

  return (<>
    <SiteHeader />
    <main id="main-content">
      <section className="hero wrap">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> DINHEIRO, COM OS PÉS NO CHÃO</span>
          <h1>Como ganhar dinheiro<br /><span>na internet.</span></h1>
          <p>Guias práticos de renda online, trabalho freelancer, marketing digital e produtos digitais. Também exploramos serviços e pequenos negócios, sem promessas de ganhos.</p>
          <Link className="button button-dark" href="#guias-iniciais">Conheça os guias <span aria-hidden="true">↘</span></Link>
          <div className="hero-note"><span className="note-star" aria-hidden="true">✳</span><span>Teste pequeno. Aprenda. Só depois invista mais.</span></div>
        </div>
        <div className="hero-art" aria-hidden="true">
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
            <Link className="text-link" href="/artigos">Ver todos os guias <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="article-grid home-guides-grid">
            {featuredArticles.map((article, index) => <ArticleCard article={article} key={article.slug} index={index + 1} />)}
          </div>
        </div>
      </section>
      <section className="newsletter-section wrap"><div className="newsletter-mark" aria-hidden="true">L.</div><div><span className="eyebrow">UMA NOTA IMPORTANTE</span><h2>Possibilidade não é promessa.</h2><p>Os resultados dependem de procura, preço, custos, experiência e região. Pesquise as regras da atividade e não arrisque dinheiro reservado para despesas essenciais.</p></div><Link className="text-link" href="/sobre">Conheça o Lucrazi <span aria-hidden="true">↗</span></Link></section>
    </main>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
    />
    <SiteFooter />
  </>);
}
