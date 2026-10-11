import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Sobre o Lucrazi",
  description: "Conheça Mateus Ferreira, fundador do Lucrazi, e a proposta de compartilhar caminhos práticos para quem está começando no digital.",
  alternates: { canonical: "/sobre" },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="wrap info-page">
        <article className="info-page-content">
          <span className="eyebrow">SOBRE O Lucrazi</span>
          <h1>Mais clareza para pensar em dinheiro.</h1>
          <p className="info-lead">
            O Lucrazi foi criado por Mateus Ferreira para democratizar o conhecimento sobre
            trabalho e empreendedorismo na internet, ajudando quem está no primeiro contato com
            o digital a entender por onde começar — sem vender a ideia de fórmula rápida para ganhar dinheiro.
          </p>
          <h2 id="mateus-ferreira">Quem está por trás do Lucrazi</h2>
          <p>
            Mateus é empreendedor digital e trabalha há cerca de 10 anos com projetos online.
            Nesse período, desenvolveu sites para negócios de turismo, barbearias e projetos SaaS,
            além de atuar com criativos, gestão de anúncios e suporte virtual para uma agência de turismo.
            Sua experiência prática orienta a proposta do Lucrazi: explicar possibilidades com clareza,
            especialmente para quem ainda está tentando dar o primeiro passo.
          </p>
          <p>
            Entre os projetos em que trabalhou estão{" "}
            <a href="https://passeiolegal.com" target="_blank" rel="noreferrer">Passeio Legal</a>,{" "}
            <a href="https://transferfortalezatur.com.br" target="_blank" rel="noreferrer">Transfer Fortaleza Tur</a>,{" "}
            <a href="https://barbeariasamuelabreu.com.br" target="_blank" rel="noreferrer">Barbearia Samuel Abreu</a>{" "}
            e <a href="https://devguardia.cloud" target="_blank" rel="noreferrer">Devguardia</a>.
            Você também pode acompanhar o trabalho de Mateus no{" "}
            <a href="https://www.instagram.com/mateusprodev/" target="_blank" rel="noreferrer">Instagram @mateusprodev</a>.
          </p>
          <h2>O que você encontra por aqui</h2>
          <p>
            Publicamos guias para dar os primeiros passos em uma renda extra, explorar ideias
            de negócio, organizar serviços freelance e cuidar melhor das decisões do dia a dia.
            Nosso foco é ajudar você a fazer perguntas melhores, comparar caminhos e pesquisar
            antes de investir tempo ou dinheiro.
          </p>
          <h2>Como tratamos o conteúdo</h2>
          <p>
            Os artigos são publicados pela Redação Lucrazi para fins informativos. A experiência
            profissional de Mateus não significa que cada artigo seja um relato pessoal ou uma
            garantia de resultado. Os textos não são
            promessa de resultados, recomendação de investimento nem substituem orientação
            financeira, jurídica ou contábil adequada à sua situação. Custos, regras e resultados
            podem variar; confira informações importantes em fontes oficiais e atualizadas.
          </p>
          <p>
            O site pode exibir anúncios para ajudar a financiar a produção editorial. Anúncios
            são identificados como publicidade e não determinam as orientações dos artigos.
            Saiba mais na nossa <Link href="/privacidade">política de privacidade</Link>.
          </p>
          <h2>Uma conversa aberta</h2>
          <p>
            Encontrou uma informação que precisa de correção ou tem uma sugestão de pauta?
            <Link href="/contato"> Entre em contato com a redação.</Link>
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
