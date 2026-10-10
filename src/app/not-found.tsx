import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="wrap info-page">
        <article className="info-page-content">
          <span className="eyebrow">ERRO 404</span>
          <h1>Esta página não foi encontrada.</h1>
          <p className="info-lead">
            O endereço pode ter mudado ou não existir. Volte ao início ou explore os guias publicados.
          </p>
          <p>
            <Link href="/">Ir para a página inicial</Link>{" "}
            ou <Link href="/artigos">ver todos os guias</Link>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
