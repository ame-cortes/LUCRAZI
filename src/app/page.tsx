import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { loadFeaturedArticleSlugs, loadPublishedArticles, maxFeaturedArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/article-card";
import { AdSlot } from "@/components/ad-slot";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { siteUrl } from "@/lib/site-config";

const topics = [
  { label: "Freelance", href: "/artigos/como-ganhar-dinheiro-como-redator-freelancer" },
  { label: "Produtos digitais", href: "/artigos/como-criar-e-vender-curso-online" },
  { label: "Comércio online", href: "/artigos/como-vender-produtos-usados-online" },
  { label: "Serviços locais", href: "/artigos/como-ganhar-dinheiro-como-pet-sitter" },
];

const homeFaq = [
  {
    question: "Por onde começar para ganhar dinheiro na internet?",
    answer:
      "Comece entendendo as opções e escolhendo uma que combine com seu tempo, suas habilidades e seus recursos. Nossos guias ajudam a comparar caminhos; avance aos poucos e pesquise antes de investir.",
    link: { label: "Ver todos os guias.", href: "/artigos" },
  },
  {
    question: "O Lucrazi garante ganhos ou resultados?",
    answer:
      "Não. O conteúdo é informativo e não promete resultados. Custos, regras e resultados variam, então confira informações importantes em fontes oficiais e atualizadas.",
    link: null,
  },
  {
    question: "Os guias substituem orientação profissional?",
    answer:
      "Não. Os artigos não são recomendação de investimento nem substituem orientação financeira, jurídica ou contábil adequada à sua situação.",
    link: null,
  },
  {
    question: "Como posso sugerir uma pauta ou corrigir uma informação?",
    answer: "Envie sua sugestão ou correção para a redação.",
    link: { label: "Entre em contato.", href: "/contato" },
  },
] as const;

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
      founder: { "@id": `${siteUrl}#mateus-ferreira` },
    },
    {
      "@type": "Person",
      "@id": `${siteUrl}#mateus-ferreira`,
      name: "Mateus Ferreira",
      jobTitle: "Desenvolvedor freelancer e fundador do Lucrazi",
      url: `${siteUrl}sobre#mateus-ferreira`,
      sameAs: ["https://www.instagram.com/mateusprodev/"],
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
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}#faq`,
      mainEntity: homeFaq.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ],
};

export const instant = false;

export default async function Home() {
  await connection();
  const [articles, featuredArticleSlugs] = await Promise.all([
    loadPublishedArticles(),
    loadFeaturedArticleSlugs(),
  ]);
  const homeArticles = featuredArticleSlugs
    .map((slug) => articles.find((item) => item.slug === slug))
    .filter((article) => article !== undefined)
    .slice(0, maxFeaturedArticles);

  return (<>
    <SiteHeader />
    <main id="main-content">
      <section className="hero wrap">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> DINHEIRO, COM OS PÉS NO CHÃO</span>
          <h1>Como ganhar dinheiro<br /><span>na internet.</span></h1>
          <p>Ideias e orientações para quem está começando: renda extra online, trabalho freelancer, marketing digital e pequenos negócios, sem fórmula mágica.</p>
          <Link className="button button-dark" href="#guias-iniciais">Conheça os guias <span aria-hidden="true">↘</span></Link>
          <div className="hero-note"><span className="note-star" aria-hidden="true">✳</span><span>Resultados variam. Comece pequeno e não comprometa despesas essenciais.</span></div>
          <p className="hero-byline">Criado por <Link href="/sobre#mateus-ferreira">Mateus Ferreira</Link>, empreendedor digital.</p>
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
            <div><span className="eyebrow">{homeArticles.length} GUIAS PARA EXPLORAR</span><h2>Encontre seu próximo passo.</h2></div>
            <Link className="text-link" href="/artigos">Ver todos os guias <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="article-grid home-guides-grid">
            {homeArticles.map((article, index) => <ArticleCard article={article} key={article.slug} index={index + 1} />)}
          </div>
        </div>
      </section>
      <div className="wrap">
        <AdSlot className="home-display-ad" slotId="2358805021" />
      </div>
      <section aria-labelledby="home-tools-heading" className="home-tools-section">
        <div className="wrap home-tools-inner">
          <span className="eyebrow">FERRAMENTAS GRATUITAS</span>
          <h2 id="home-tools-heading">Recursos práticos para colocar suas ideias em ação.</h2>
          <div className="home-tool-card">
            <div className="home-tool-icon" aria-hidden="true">QR</div>
            <div className="home-tool-copy">
              <h3>Gerador de QR Code grátis</h3>
              <p>
                Crie um QR Code para seu link ou texto, personalize as cores e adicione
                seu logo. A prévia é gratuita; solicite o envio por e-mail para liberar
                os downloads em PNG e SVG.
              </p>
            </div>
            <Link className="button button-dark home-tool-button" href="/gerador-qr">
              Criar QR Code <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
      <section aria-labelledby="home-faq-heading" className="home-faq">
        <div className="wrap home-faq-inner">
          <span className="eyebrow">DÚVIDAS FREQUENTES</span>
          <h2 id="home-faq-heading">Antes de dar o próximo passo.</h2>
          <div className="home-faq-list">
            {homeFaq.map(({ question, answer, link }) => (
              <details className="home-faq-item" key={question}>
                <summary>
                  <span>{question}</span>
                  <span aria-hidden="true" className="home-faq-icon">+</span>
                </summary>
                <p>{answer} {link && <Link href={link.href}>{link.label}</Link>}</p>
              </details>
            ))}
          </div>
          <p className="home-faq-about">
            Saiba mais sobre a <Link href="/sobre">proposta editorial do Lucrazi</Link>.
          </p>
        </div>
      </section>
      <section aria-labelledby="home-author-heading" className="home-author-section">
        <div className="wrap">
          <div className="home-author-card">
            <Image
              className="home-author-image"
              src="/images/articles/mateusprodev.jpg"
              alt="Mateus Ferreira, criador do Lucrazi e desenvolvedor freelancer"
              width={150}
              height={150}
            />
            <div className="home-author-copy">
              <span className="eyebrow">QUEM ESTÁ POR TRÁS DO LUCRAZI</span>
              <h2 id="home-author-heading">Mateus Ferreira</h2>
              <p>
                Sou desenvolvedor freelancer e criador do Lucrazi. Trabalho com projetos
                digitais e presto serviços pontuais e recorrentes para agências de turismo.
                Criei este espaço para compartilhar informação prática sobre trabalho e
                oportunidades online, sem promessas de ganhos.
              </p>
              <Link className="home-author-link" href="/sobre#mateus-ferreira">
                Conheça minha história <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <NewsletterSignup />
    </main>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
    />
    <SiteFooter />
  </>);
}
