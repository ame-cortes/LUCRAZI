import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Sobre o Lucrazi",
  description: "Conheça a proposta editorial do Lucrazi: informação prática sobre renda extra e dinheiro, sem promessas de ganhos.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap info-page">
        <article className="info-page-content">
          <span className="eyebrow">SOBRE O LUCrazi</span>
          <h1>Mais clareza para pensar em dinheiro.</h1>
          <p className="info-lead">
            Lucrazi nasceu da vontade de falar sobre renda extra e possibilidades de trabalho
            de um jeito acessível, prático e honesto — sem vender a ideia de que existe fórmula
            rápida para ganhar dinheiro.
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
            Os artigos são produzidos pela Redação Lucrazi para fins informativos. Não são
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
