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
            mudar quando novos recursos forem adicionados. Ela deve ser lida junto às opções
            de privacidade e consentimento apresentadas pelos serviços de terceiros.
          </p>
          <h2>Dados de navegação</h2>
          <p>
            Para entregar e proteger o site, a hospedagem pode processar dados técnicos como
            endereço IP, navegador, horário e páginas acessadas. A hospedagem atual é fornecida
            pela{" "}
            <a href="https://vercel.com/legal/privacy-policy">
              Vercel
            </a>
            . O Google AdSense também pode
            tratar dados do dispositivo, cookies e informações de interação com anúncios para
            exibir, medir e, conforme as opções disponíveis e as regras aplicáveis, personalizar
            publicidade. Esses fornecedores aplicam suas próprias políticas e prazos de retenção.
            Atualmente, o site não oferece cadastro de usuário nem formulário próprio de coleta
            de dados.
          </p>
          <h2>Cookies e anúncios</h2>
          <p>
            O Lucrazi usa Google AdSense para exibir anúncios. O Google e seus parceiros podem
            usar cookies ou tecnologias semelhantes para veicular anúncios com base em visitas
            anteriores a este site ou a outros sites, além de medir a publicidade, conforme as
            configurações disponíveis e as regras aplicáveis à sua região.
          </p>
          <p>
            Você pode consultar a{" "}
            <a href="https://policies.google.com/technologies/ads">
              política de publicidade do Google
            </a>{" "}
            e as opções para{" "}
            <a href="https://www.google.com/settings/ads">
              gerenciar a personalização de anúncios do Google
            </a>
            . Também é possível consultar{" "}
            <a href="https://www.aboutads.info/choices/">
              opções de publicidade baseada em interesses de terceiros
            </a>
            . Para mais informações sobre dados tratados pelo Google, veja as{" "}
            <a href="https://policies.google.com/privacy">
              informações de privacidade do Google
            </a>
            .
          </p>
          <p>
            As opções do navegador também permitem bloquear ou remover cookies, mas isso pode
            afetar recursos de terceiros. Quando a legislação ou as regras de uma plataforma
            exigirem consentimento ou outras escolhas, elas devem ser apresentadas pelo mecanismo
            de privacidade aplicável antes do tratamento correspondente.
          </p>
          <h2>Finalidades e fornecedores</h2>
          <p>
            Os dados técnicos são usados para disponibilizar e proteger o site. Dados relacionados
            à publicidade podem ser tratados pelo Google e seus parceiros para selecionar, exibir,
            medir e prevenir fraudes em anúncios, conforme as configurações e regras aplicáveis.
            O tratamento necessário à operação e à segurança pode se basear no legítimo interesse,
            observados os direitos e as expectativas das pessoas. Para cookies de publicidade,
            serão respeitadas as opções de consentimento e as demais bases legais exigidas para
            cada região e situação.
            A hospedagem e a publicidade são fornecidas por terceiros, que podem tratar dados em
            outros países conforme os mecanismos e condições informados por esses fornecedores.
            Os dados sob controle do site devem ser mantidos apenas pelo tempo necessário às
            finalidades descritas ou ao cumprimento de obrigações aplicáveis e, depois, eliminados
            ou anonimizados quando cabível. Cada fornecedor define também seus próprios prazos.
          </p>
          <h2>Links de terceiros</h2>
          <p>
            Os artigos podem apontar para sites externos, inclusive fontes oficiais. Esses sites
            têm práticas de privacidade próprias; consulte as políticas deles ao acessá-los.
          </p>
          <h2>Seus direitos e contato</h2>
          <p>
            O controlador dos dados tratados pelo site é Mateus Ferreira, responsável pela operação
            do Lucrazi, desenvolvedor e empreendedor. Perfil público:{" "}
            <a href="https://www.instagram.com/mateusprodev/">@mateusprodev no Instagram</a>.
          </p>
          <p>
            Nos termos da legislação aplicável, você pode solicitar confirmação da existência de
            tratamento, acesso e correção dos seus dados e, quando cabível, anonimização, bloqueio,
            eliminação, portabilidade, informação sobre compartilhamentos, oposição ao tratamento,
            revisão de decisões automatizadas e informações sobre consentimento e sua revogação.
            Alguns direitos têm condições e exceções legais. Para fazer uma solicitação ou tirar
            dúvidas, use o canal informado na <Link href="/contato">página de contato</Link>
            {contactEmail ? <> ou escreva para <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</> : "."}
          </p>
          <p>
            Este site não mantém conta de usuário nem formulário de contato próprio. Se isso mudar,
            ou se novas ferramentas de análise, publicidade ou outros serviços forem adicionados,
            esta política e as opções de privacidade devem ser atualizadas antes da coleta
            correspondente.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
