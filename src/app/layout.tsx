import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site-config";
import "./globals.css";

const adsenseClientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID;
if (adsenseClientId && !/^ca-pub-\d+$/.test(adsenseClientId)) {
  throw new Error("NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID precisa ter o formato ca-pub- seguido por números.");
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Lucrazi — ideias para fazer o dinheiro render",
    template: "%s | Lucrazi",
  },
  description:
    "Guias práticos sobre renda extra, ideias de negócio, trabalho freelance e organização financeira. Informação útil, sem fórmula mágica.",
  applicationName: "Lucrazi",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Lucrazi",
    title: "Lucrazi — ideias para fazer o dinheiro render",
    description:
      "Ideias de renda extra e conteúdo prático para construir suas possibilidades financeiras, com os pés no chão.",
  },
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  twitter: {
    card: "summary",
    title: "Lucrazi — ideias para fazer o dinheiro render",
    description:
      "Ideias de renda extra e conteúdo prático para construir suas possibilidades financeiras, com os pés no chão.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {adsenseClientId && (
        <Script
          id="google-adsense"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      )}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
