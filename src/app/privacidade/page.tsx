import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o Lucrazi trata dados e cookies, inclusive tecnologias de publicidade quando anúncios estão habilitados.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="wrap info-page">
        <article className="info-page-content">
          <span className="eyebrow">TRANSPARÊNCIA</span>
          <h1>Política de privacidade.</h1>
          <p className="info-lead">Última atualização: 10 de outubro de 2026.</p>
          <p>
            Esta página explica, em linguagem simples, como o site Lucrazi pode tratar
            informações quando você navega por seus artigos. A configuração efetiva pode
            depender dos serviços habilitados no site.
          </p>
          <h2>Dados de navegação</h2>
          <p>
            O servidor e os serviços de hospedagem podem processar informações técnicas
            necessárias para entregar e proteger o site, como endereço IP, navegador,
            horário e páginas acessadas, conforme suas próprias políticas e prazos de retenção.
            Este projeto não oferece cadastro de usuário nem formulário de coleta de dados.
          </p>
          <h2>Cookies e anúncios</h2>
          <p>
            O Lucrazi pode usar Google AdSense para exibir publicidade. Quando essa integração
            estiver habilitada, o Google e seus parceiros poderão usar cookies ou tecnologias
            semelhantes para exibir, medir ou personalizar anúncios, conforme suas configurações
            e políticas aplicáveis. A publicidade só é carregada nas páginas quando os
            identificadores de anúncio são configurados.
          </p>
          <p>
            Consulte também a{" "}
            <a href="https://policies.google.com/technologies/ads">
              política de publicidade do Google
            </a>{" "}
            e as{" "}
            <a href="https://policies.google.com/privacy">
              informações de privacidade do Google
            </a>
            . A presença de anúncios e as opções de personalização dependem da configuração
            efetivamente habilitada e das regras aplicáveis à sua região.
          </p>
          <p>
            Você pode gerenciar cookies nas configurações do navegador e, quando disponível,
            nas opções de privacidade ou personalização de anúncios do Google. Desativar certos
            cookies pode afetar recursos oferecidos por terceiros. Antes de veicular anúncios,
            o responsável pelo site deve configurar os avisos e mecanismos de consentimento
            exigidos para o público e as regiões atendidas.
          </p>
          <h2>Links de terceiros</h2>
          <p>
            Os artigos podem apontar para sites externos, inclusive fontes oficiais. Esses sites
            têm práticas de privacidade próprias; consulte as políticas deles ao acessá-los.
          </p>
          <h2>Seus direitos e contato</h2>
          <p>
            Para dúvidas ou solicitações relativas a privacidade, use o canal informado na
            <Link href="/contato"> página de contato</Link>.
            {contactEmail ? ` E-mail: ${contactEmail}.` : ""}
          </p>
          <p>
            Esta política deve ser revisada quando novos formulários, ferramentas de análise,
            publicidade ou outros serviços forem adicionados ao site.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
