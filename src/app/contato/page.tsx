import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Contato",
  description: "Entre em contato com a redação do Lucrazi para enviar sugestões ou apontar correções.",
  alternates: { canonical: "/contato" },
};

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="wrap info-page">
        <article className="info-page-content">
          <span className="eyebrow">FALE COM A GENTE</span>
          <h1>Uma ideia, dúvida ou correção?</h1>
          <p className="info-lead">
            Sugestões de pauta e correções ajudam a manter o conteúdo do Lucrazi útil e atualizado.
          </p>
          <h2>Contato editorial</h2>
          {contactEmail ? (
            <p>
              Escreva para <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
              Se possível, indique o link do artigo relacionado à sua mensagem.
            </p>
          ) : (
            <p>
              O canal de e-mail da redação será publicado aqui antes do lançamento.
              Enquanto isso, configure um endereço de contato no ambiente do site.
            </p>
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
