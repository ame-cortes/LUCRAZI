import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { QrCodeGenerator } from "@/components/qr-code-generator";
import { isBrevoEmailConfigured } from "@/lib/newsletter-email";
import { ebookUrl, qrCodeUrl, siteUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: {
    absolute: "Gerador de QR Code Grátis Online | Lucrazi",
  },
  description:
    "Crie QR Codes grátis para links e textos, personalize cores e adicione seu logo. Prévia online e download em PNG ou SVG após solicitar por e-mail.",
  alternates: { canonical: qrCodeUrl.toString() },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Lucrazi",
    url: qrCodeUrl.toString(),
    title: "Gerador de QR Code Grátis Online",
    description:
      "Crie QR Codes grátis para links e textos, personalize cores e adicione seu logo. Prévia online e download em PNG ou SVG após solicitar por e-mail.",
    images: [
      {
        url: new URL("/images/qr-generator-og.png", qrCodeUrl).toString(),
        width: 1200,
        height: 630,
        alt: "Gerador de QR Code personalizado do Lucrazi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gerador de QR Code Grátis Online | Lucrazi",
    description:
      "Crie QR Codes grátis para links e textos, personalize cores e adicione seu logo. Prévia online e download em PNG ou SVG após solicitar por e-mail.",
    images: [new URL("/images/qr-generator-og.png", qrCodeUrl).toString()],
  },
};

const qrFaq = [
  {
    question: "O gerador de QR Code é gratuito?",
    answer:
      "Sim. Você pode criar e personalizar o QR Code sem pagar. Para receber o arquivo por e-mail e liberar os downloads em PNG ou SVG, é necessário informar um e-mail e autorizar o uso dele para esse pedido.",
  },
  {
    question: "Que tipo de conteúdo posso colocar no QR Code?",
    answer:
      "Você pode criar um QR Code para um endereço web iniciado por http:// ou https:// ou para um texto de até 2.048 caracteres.",
  },
  {
    question: "Posso personalizar as cores e incluir minha marca?",
    answer:
      "Sim. Personalize a cor do código e do fundo e, se quiser, inclua um logo PNG ou JPEG de até 256 KB e 2.048 por 2.048 pixels.",
  },
  {
    question: "Como faço para baixar o QR Code?",
    answer:
      "Informe seu e-mail, confirme a autorização e solicite o envio. Depois que o envio for confirmado, os downloads locais em PNG e SVG são liberados na página; o arquivo PNG também é enviado como anexo.",
  },
  {
    question: "Meu e-mail será inscrito em campanhas?",
    answer:
      "Não. O e-mail é usado para registrar o pedido e enviar o QR Code solicitado. A autorização é pedida novamente a cada pedido e não inscreve você em campanhas.",
  },
  {
    question: "O conteúdo do QR Code e o logo enviado ficam armazenados?",
    answer:
      "O conteúdo e o logo usados apenas no gerador público não são persistidos. Se você criar uma conta e salvar um QR Code no painel, o nome, o conteúdo e as cores ficam armazenados para você poder editá-lo ou excluí-lo. O e-mail e os dados do pedido são tratados conforme a política de privacidade.",
  },
  {
    question: "O QR Code é dinâmico?",
    answer:
      "Não. Este gerador cria um QR Code estático: ele guarda o link ou texto informado no momento da criação. Se o link mudar, o código não muda junto; para apontar a outro destino, será preciso criar um novo QR Code.",
  },
] as const;

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${qrCodeUrl}#webapplication`,
      name: "Gerador de QR Code Grátis Online",
      url: qrCodeUrl.toString(),
      description: "Crie QR Codes grátis para links e textos, personalize cores e adicione seu logo. Solicite o envio por e-mail para baixar em PNG ou SVG.",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "JavaScript habilitado",
      inLanguage: "pt-BR",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "BRL",
      },
      isPartOf: {
        "@type": "WebSite",
        name: "Lucrazi",
        url: siteUrl.toString(),
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${qrCodeUrl}#faq`,
      mainEntity: qrFaq.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            answer
            + (question === "Que tipo de conteúdo posso colocar no QR Code?"
              ? " Para divulgar produtos ou serviços, conheça também nosso guia de marketing de afiliados."
              : ""),
        },
      })),
    },
  ],
};

async function QrCodeDelivery() {
  const emailDeliveryEnabled = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    && process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    && process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    && process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    && process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY
    && isBrevoEmailConfigured(),
  );

  return <QrCodeGenerator emailDeliveryEnabled={emailDeliveryEnabled} />;
}

export default function QrCodePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="qr-page wrap">
        <header className="qr-page-heading">
          <span className="eyebrow"><span className="eyebrow-dot" /> FERRAMENTA GRATUITA</span>
          <h1>Gerador de QR Code grátis <span>online e personalizado.</span></h1>
          <p>
            Crie um QR Code grátis para um link ou texto, personalize as cores e inclua seu
            logo. Confira a prévia e solicite o envio por e-mail para liberar os downloads em
            PNG ou SVG.
          </p>
          <Link className="button button-dark qr-account-entry" href="/minha-conta">
            Salvar e gerenciar meus QR Codes <span aria-hidden="true">↗</span>
          </Link>
        </header>
        <Suspense fallback={<QrCodeGenerator emailDeliveryEnabled={false} />}>
          <QrCodeDelivery />
        </Suspense>
        <section aria-labelledby="qr-guide-heading" className="qr-guide">
          <span className="eyebrow">ENTENDA E APROVEITE MELHOR</span>
          <h2 id="qr-guide-heading">QR Code: como funciona e como criar o seu</h2>
          <div className="qr-guide-grid">
            <article className="qr-guide-card">
              <h3>O que é um QR Code e para que serve?</h3>
              <p>
                QR Code é um código de barras bidimensional que pode ser lido pela câmera
                de um celular. Ele pode guardar um endereço de internet ou um texto curto,
                facilitando o acesso a uma informação sem precisar digitá-la.
              </p>
              <p>
                Restaurantes podem usá-lo para abrir um cardápio, profissionais podem
                compartilhá-lo em cartões de visita e empresas podem incluí-lo em materiais
                de marketing ou em links de afiliados. Em qualquer caso, confira se o destino
                está correto e acessível antes de divulgar o código.
              </p>
            </article>
            <article className="qr-guide-card">
              <h3>Como usar o Gerador de QR Code do Lucrazi</h3>
              <ol>
                <li>Insira um link iniciado por http:// ou https://, ou escreva seu texto.</li>
                <li>Escolha as cores do código e do fundo; o logo é opcional.</li>
                <li>Confira a prévia e teste o QR Code com a câmera do celular.</li>
                <li>Informe seu e-mail, autorize o pedido e solicite o envio.</li>
                <li>Após a confirmação do envio, baixe o arquivo em PNG ou SVG.</li>
              </ol>
              <p>
                Para links, prefira um endereço curto e confira o contraste entre as cores
                para facilitar a leitura. O gerador cria códigos estáticos: se o destino
                mudar, será necessário gerar outro QR Code.
              </p>
            </article>
            <article className="qr-guide-card">
              <h3>Por que usar um QR Code personalizado?</h3>
              <p>
                Cores alinhadas à identidade visual e um logo podem ajudar as pessoas a
                reconhecer a marca e entender de onde veio o material. A personalização,
                porém, não garante mais leituras: mantenha bom contraste, deixe o código
                desobstruído e teste o arquivo impresso ou exibido em diferentes telas.
              </p>
              <p>
                Se você atende negócios locais, veja também o guia{" "}
                <Link href="/artigos/como-criar-sites-para-pequenos-negocios">
                  Como criar sites para pequenos negócios
                </Link>
                , com orientações para estruturar uma presença online.
              </p>
            </article>
          </div>
        </section>
        <section aria-labelledby="qr-faq-heading" className="qr-faq">
          <span className="eyebrow">DÚVIDAS SOBRE O GERADOR</span>
          <h2 id="qr-faq-heading">Perguntas frequentes sobre QR Code</h2>
          <dl className="qr-faq-list">
            {qrFaq.map(({ question, answer }) => (
              <div className="qr-faq-item" key={question}>
                <dt>{question}</dt>
                <dd>
                  {answer}
                  {question === "Que tipo de conteúdo posso colocar no QR Code?" && (
                    <>
                      {" "}Para divulgar produtos ou serviços, conheça também nosso guia de{" "}
                      <Link href="/artigos/como-ganhar-dinheiro-com-marketing-de-afiliados">
                        marketing de afiliados
                      </Link>
                      .
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="qr-faq-privacy">
            Consulte também a <Link href="/privacidade">política de privacidade do Lucrazi</Link>.
          </p>
        </section>
        <section aria-labelledby="qr-next-steps-heading" className="qr-next-steps">
          <div>
            <span className="eyebrow">CONTINUE EXPLORANDO</span>
            <h2 id="qr-next-steps-heading">Mais ideias para colocar seus planos em prática</h2>
            <p>
              Explore outros conteúdos gratuitos do Lucrazi e encontre orientações para o
              próximo passo da sua jornada.
            </p>
          </div>
          <div className="qr-next-steps-actions">
            <Link className="button button-dark" href="/artigos">
              Explorar guias gratuitos <span aria-hidden="true">↗</span>
            </Link>
            <Link className="button button-light" href={ebookUrl.pathname}>
              Baixar o e-book grátis <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <SiteFooter />
    </>
  );
}
