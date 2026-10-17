import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a redação do Lucrazi para sugerir pautas, apontar correções e tratar de assuntos relacionados ao site.",
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
            O Lucrazi valoriza mensagens de leitores. Use os canais abaixo para sugerir temas,
            comunicar erros ou fazer perguntas sobre o conteúdo e o funcionamento do site.
          </p>
          <h2>Contato editorial</h2>
          {contactEmail ? (
            <p>
              Para falar com a redação, escreva para{" "}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Inclua o endereço da página
              relacionada e explique com clareza sua sugestão, dúvida ou correção. Ao apontar um
              dado incorreto, indique, se possível, a fonte confiável que confirma a informação.
            </p>
          ) : (
            <p>
              O endereço de e-mail editorial ainda não está disponível. Você pode entrar em
              contato pelo perfil{" "}
              <a href="https://www.instagram.com/mateusprodev/" target="_blank" rel="noreferrer">
                @mateusprodev no Instagram
              </a>
              . Inclua o endereço da página relacionada e explique com clareza sua sugestão, dúvida
              ou correção. Ao apontar um dado incorreto, indique, se possível, a fonte confiável
              que confirma a informação.
            </p>
          )}
          <h2>Privacidade e solicitações</h2>
          <p>
            Para dúvidas sobre dados pessoais, consentimento ou cancelamento da lista de novidades,
            consulte a <a href="/privacidade">política de privacidade</a> e escreva usando um dos
            canais acima. Não envie senhas, dados financeiros ou documentos pessoais por mensagem
            em redes sociais. O Lucrazi não oferece aconselhamento individual financeiro, jurídico
            ou contábil por esses canais.
          </p>
          <p>
            As mensagens são lidas pela equipe responsável pelo site. O envio de uma mensagem não
            garante publicação de pauta, resposta imediata ou aconselhamento personalizado.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
