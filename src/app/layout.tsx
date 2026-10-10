import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
