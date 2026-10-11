import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    default: "Lucrazi — como ganhar dinheiro na internet",
    template: "%s | Lucrazi",
  },
  description:
    "Blog com guias práticos sobre como ganhar dinheiro na internet: trabalho freelancer, marketing digital, YouTube, produtos digitais e renda extra. Sem promessas de ganhos.",
  applicationName: "Lucrazi",
  category: "blog",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Lucrazi",
    url: siteUrl.toString(),
    title: "Lucrazi — como ganhar dinheiro na internet",
    description:
      "Blog com guias práticos de renda online, trabalho freelancer, marketing digital e produtos digitais — sem promessas de ganhos.",
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
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <meta property="og:logo" content={new URL("/icon.svg", siteUrl).toString()} />
        {adsenseClientId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
