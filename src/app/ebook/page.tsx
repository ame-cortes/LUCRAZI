import type { Metadata } from "next";
import Link from "next/link";
import { EbookSignupForm } from "@/components/ebook-signup-form";
import { siteUrl } from "@/lib/site-config";

const ebookUrl = new URL("https://ebook.lucrazi.com.br");

export const metadata: Metadata = {
  title: {
    absolute: "E-book grátis: Como faturar seus primeiros R$ 1.000 na internet | Lucrazi",
  },
  description:
    "Baixe gratuitamente o e-book Como Faturar Seus Primeiros R$ 1.000 na Internet. Informe seu e-mail para liberar o PDF.",
  alternates: { canonical: ebookUrl },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Lucrazi",
    url: ebookUrl,
    title: "E-book grátis: Como faturar seus primeiros R$ 1.000 na internet",
    description:
      "Um guia gratuito do Lucrazi para quem está dando os primeiros passos na renda online.",
  },
  robots: { index: true, follow: true },
};

export default function EbookPage() {
  const privacyUrl = new URL("/privacidade#ebook", siteUrl).toString();
  const signupEnabled = process.env.NEXT_PUBLIC_EBOOK_SIGNUP_ENABLED === "true";
  const campaignsEnabled = process.env.NEXT_PUBLIC_NEWSLETTER_SIGNUP_ENABLED === "true";

  return (
    <div className="ebook-page">
      <header className="ebook-header">
        <Link aria-label="Lucrazi, site principal" className="ebook-wordmark" href={siteUrl.toString()}>
          lucr<span>a</span>zi<span className="ebook-wordmark-dot">.</span>
        </Link>
        <span className="ebook-header-note">
          <svg aria-hidden="true" fill="none" height="17" viewBox="0 0 17 17" width="17">
            <path d="M3.5 7V5a5 5 0 0 1 10 0v2m-10 0h10v8h-10V7Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
            <path d="M8.5 10v2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
          </svg>
          Material gratuito
        </span>
      </header>

      <main id="main-content">
        <section aria-labelledby="ebook-title" className="ebook-hero">
          <div className="ebook-hero-copy">
            <span className="ebook-eyebrow"><span /> UM GUIA GRATUITO DO LUCRAZI</span>
            <h1 id="ebook-title">
              Seus primeiros
              <br />
              <span>R$ 1.000</span> na internet.
            </h1>
            <p className="ebook-deck">
              Um e-book gratuito para ajudar você a dar os primeiros passos para faturar
              online, com informação prática e sem promessas milagrosas.
            </p>

            <EbookSignupForm
              campaignsEnabled={campaignsEnabled}
              privacyUrl={privacyUrl}
              signupEnabled={signupEnabled}
            />

            <p className="ebook-disclaimer">
              Cada jornada é diferente. O material é informativo e não garante ganhos.
            </p>
          </div>

          <div aria-label="Capa do e-book Como faturar seus primeiros R$ 1.000 na internet" className="ebook-hero-art" role="img">
            <div aria-hidden="true" className="ebook-art-note">
              <span>UM COMEÇO POSSÍVEL</span>
              <span>ideias, plano<br />e próximos passos <span className="ebook-art-arrow">↗</span></span>
            </div>
            <div aria-hidden="true" className="ebook-art-spark ebook-art-spark-one">✳</div>
            <div aria-hidden="true" className="ebook-art-spark ebook-art-spark-two">✳</div>
            <div className="ebook-cover">
              <span className="ebook-cover-brand">lucrazi<span>.</span></span>
              <span className="ebook-cover-label">GUIA GRATUITO</span>
              <strong>Como faturar<br />seus primeiros</strong>
              <strong className="ebook-cover-number">R$ 1.000</strong>
              <span className="ebook-cover-bottom">NA INTERNET</span>
              <span aria-hidden="true" className="ebook-cover-orbit ebook-cover-orbit-one" />
              <span aria-hidden="true" className="ebook-cover-orbit ebook-cover-orbit-two" />
              <span aria-hidden="true" className="ebook-cover-sun" />
            </div>
            <span aria-hidden="true" className="ebook-art-caption">UM PASSO DE CADA VEZ</span>
          </div>
        </section>

        <section aria-labelledby="ebook-about-title" className="ebook-about">
          <div className="ebook-section-heading">
            <span className="ebook-eyebrow">PARA COMEÇAR COM OS PÉS NO CHÃO</span>
            <h2 id="ebook-about-title">Um bom primeiro passo pode começar com uma leitura.</h2>
            <p>
              Um material direto para quem tem vontade de começar, mas quer organizar as
              ideias antes de dar o próximo passo.
            </p>
          </div>
          <div className="ebook-benefits">
            <article className="ebook-benefit">
              <span aria-hidden="true" className="ebook-benefit-number">01</span>
              <h3>Prático e direto</h3>
              <p>Leitura digital para consultar no seu ritmo, onde estiver.</p>
            </article>
            <article className="ebook-benefit">
              <span aria-hidden="true" className="ebook-benefit-number">02</span>
              <h3>Feito para começar</h3>
              <p>Um ponto de partida para pensar seus próximos passos online.</p>
            </article>
            <article className="ebook-benefit">
              <span aria-hidden="true" className="ebook-benefit-number">03</span>
              <h3>Gratuito, de verdade</h3>
              <p>Cadastre seu e-mail para liberar o download. Sem custo.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="ebook-footer">
        <Link aria-label="Lucrazi, site principal" className="ebook-wordmark ebook-wordmark-light" href={siteUrl.toString()}>
          lucr<span>a</span>zi<span className="ebook-wordmark-dot">.</span>
        </Link>
        <span>Informação prática, sem promessas de ganhos.</span>
        <Link href={privacyUrl}>Privacidade</Link>
      </footer>
    </div>
  );
}
