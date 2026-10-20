import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { QrCodeGenerator } from "@/components/qr-code-generator";
import { isBrevoEmailConfigured } from "@/lib/newsletter-email";
import { qrCodeUrl, siteUrl } from "@/lib/site-config";

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
      "Não. O conteúdo codificado e o arquivo do logo não são persistidos. O e-mail, a autorização e os dados necessários para registrar e atender o pedido são tratados conforme a política de privacidade.",
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
          text: answer,
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
        </header>
        <Suspense fallback={<QrCodeGenerator emailDeliveryEnabled={false} />}>
          <QrCodeDelivery />
        </Suspense>
        <section aria-labelledby="qr-faq-heading" className="qr-faq">
          <span className="eyebrow">DÚVIDAS SOBRE O GERADOR</span>
          <h2 id="qr-faq-heading">Perguntas frequentes sobre QR Code</h2>
          <dl className="qr-faq-list">
            {qrFaq.map(({ question, answer }) => (
              <div className="qr-faq-item" key={question}>
                <dt>{question}</dt>
                <dd>{answer}</dd>
              </div>
            ))}
          </dl>
          <p className="qr-faq-privacy">
            Consulte também a <Link href="/privacidade">política de privacidade do Lucrazi</Link>.
          </p>
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
