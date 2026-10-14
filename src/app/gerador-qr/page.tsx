import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { QrCodeGenerator } from "@/components/qr-code-generator";
import { isBrevoEmailConfigured } from "@/lib/newsletter-email";
import { qrCodeUrl } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Gerador de QR Code personalizado",
  description:
    "Crie QR Codes para links e textos, personalize as cores, adicione seu logo e baixe em PNG ou SVG.",
  alternates: { canonical: qrCodeUrl.toString() },
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
          <h1>Seu QR Code, <span>com a sua marca.</span></h1>
          <p>
            Crie um código para um link ou texto, ajuste as cores e inclua um logo.
            Informe seu e-mail para recebê-lo e liberar os downloads em PNG e SVG.
          </p>
        </header>
        <Suspense fallback={<QrCodeGenerator emailDeliveryEnabled={false} />}>
          <QrCodeDelivery />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
