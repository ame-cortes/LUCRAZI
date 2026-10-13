import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { siteUrl } from "@/lib/site-config";
import "./globals.css";

const adsenseClientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID;
const homeShareImage = "/images/articles/como-monetizar-blog-de-nicho.jpg";
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
    default: "Lucrazi — renda extra online com os pés no chão",
    template: "%s | Lucrazi",
  },
  description:
    "Primeiros passos para renda extra online, trabalho freelancer e projetos digitais, com informação prática e sem promessas de ganhos.",
  applicationName: "Lucrazi",
  category: "blog",
  icons: {
    icon: [
      { url: "/images/articles/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/articles/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/articles/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/images/articles/android-icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/articles/favicon.ico", type: "image/x-icon" },
    ],
    apple: [
      { url: "/images/articles/apple-icon-57x57.png", sizes: "57x57", type: "image/png" },
      { url: "/images/articles/apple-icon-60x60.png", sizes: "60x60", type: "image/png" },
      { url: "/images/articles/apple-icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/images/articles/apple-icon-76x76.png", sizes: "76x76", type: "image/png" },
      { url: "/images/articles/apple-icon-114x114.png", sizes: "114x114", type: "image/png" },
      { url: "/images/articles/apple-icon-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/images/articles/apple-icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/images/articles/apple-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/images/articles/apple-icon-180x180.png", sizes: "180x180", type: "image/png" },
      { url: "/images/articles/apple-icon.png", type: "image/png" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/images/articles/apple-icon-precomposed.png",
      },
    ],
  },
  manifest: "/images/articles/manifest.json",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Lucrazi",
    url: siteUrl.toString(),
    title: "Lucrazi — renda extra online com os pés no chão",
    description:
      "Primeiros passos para renda extra online, trabalho freelancer e projetos digitais, com informação prática e sem promessas de ganhos.",
    images: [
      {
        url: homeShareImage,
        width: 1600,
        height: 900,
        alt: "Notebook em uma mesa de trabalho para criar e planejar conteúdo digital",
      },
    ],
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
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    other: {
      "msvalidate.01": "CD15A6F7F97724359059462F811F942D",
    },
  },
  other: {
    "msapplication-TileColor": "#ffffff",
    "msapplication-TileImage": "/images/articles/ms-icon-144x144.png",
    "msapplication-config": "/images/articles/browserconfig.xml",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lucrazi — como ganhar dinheiro na internet",
    description:
      "Guias práticos de renda online, trabalho freelancer, marketing digital e produtos digitais. Sem promessas de ganhos.",
    images: [homeShareImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <meta property="og:logo" content={new URL("/icon.svg", siteUrl).toString()} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {adsenseClientId && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
