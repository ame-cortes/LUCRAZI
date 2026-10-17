import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Condições de uso do site Lucrazi, seus conteúdos, links externos e serviços digitais.",
  alternates: { canonical: "/termos-de-uso" },
};

export default function TermsOfUsePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="wrap info-page">
        <article className="info-page-content">
          <span className="eyebrow">TRANSPARÊNCIA</span>
          <h1>Termos de uso.</h1>
          <p className="info-lead">Última atualização: 17 de outubro de 2026.</p>
          <p>
            Estes termos explicam as condições de acesso e uso do site Lucrazi, incluindo seus
            artigos, ferramentas e formulários. Ao navegar pelo site, você concorda em respeitar
            estas condições e a legislação aplicável. Se não concordar, interrompa o uso.
          </p>

          <h2>Conteúdo informativo</h2>
          <p>
            O Lucrazi publica conteúdo educativo sobre trabalho, empreendedorismo e possibilidades
            de renda. Os materiais são informativos, não constituem recomendação financeira,
            jurídica, contábil ou profissional e não substituem uma análise adequada à sua situação.
            Custos, regras e resultados variam. Verifique informações importantes com fontes
            oficiais e profissionais qualificados antes de tomar decisões.
          </p>
          <p>
            Não há promessa ou garantia de ganhos, aprovação em plataformas, contratação, vendas
            ou qualquer resultado específico. Você é responsável por avaliar riscos, verificar a
            atualidade das informações e decidir como aplicá-las.
          </p>

          <h2>Uso permitido do site</h2>
          <p>
            Você pode consultar e compartilhar links para o conteúdo para fins pessoais e
            informativos. Não use o site para atividades ilegais, tentativas de acesso não
            autorizado, envio de código malicioso, interferência nos serviços ou violação de
            direitos de terceiros. Não copie ou redistribua artigos, imagens ou outros materiais
            como se fossem seus; peça autorização quando o uso exceder o permitido pela legislação.
          </p>
          <p>
            As ferramentas públicas devem ser usadas conforme as instruções apresentadas em cada
            página. Você é responsável pelos dados e arquivos que decide inserir nelas e por
            verificar se o resultado atende à finalidade pretendida.
          </p>

          <h2>Publicidade e links externos</h2>
          <p>
            O site pode exibir anúncios de terceiros, identificados como publicidade. A presença
            de um anúncio não significa recomendação ou garantia do Lucrazi sobre o anunciante,
            produto ou serviço. Links externos são fornecidos para conveniência; seus conteúdos,
            disponibilidade, termos e políticas são responsabilidade dos respectivos operadores.
          </p>

          <h2>Disponibilidade e alterações</h2>
          <p>
            Buscamos manter informações e serviços disponíveis e atualizados, mas não garantimos
            acesso ininterrupto nem ausência de erros. Podemos corrigir, atualizar ou remover
            páginas e recursos quando necessário. Estes termos também podem ser revisados; a data
            no início da página indica a versão mais recente.
          </p>

          <h2>Privacidade e contato</h2>
          <p>
            O tratamento de dados e o uso de cookies estão descritos na{" "}
            <Link href="/privacidade">política de privacidade</Link>. Para dúvidas sobre estes
            termos, correções ou outros assuntos, use a página de{" "}
            <Link href="/contato">contato</Link>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
