import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Sobre o Lucrazi",
  description: "Conheça Mateus Ferreira, desenvolvedor freelancer, e o Lucrazi: guias práticos para explorar renda online e projetos digitais com os pés no chão.",
  alternates: { canonical: "/sobre" },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="wrap info-page">
        <article className="info-page-content">
          <span className="eyebrow">SOBRE O LUCRAZI</span>
          <h1>Ideias digitais, explicadas com clareza.</h1>
          <p className="info-lead">
            O Lucrazi é um projeto editorial independente criado para ajudar você a entender
            caminhos de renda online, trabalho freelancer e pequenos negócios. Aqui, informação
            prática vem antes de promessas: cada jornada é diferente, e não existe fórmula mágica.
          </p>

          <h2 id="mateus-ferreira">Sobre mim</h2>
          <div className="about-profile">
            <Image
              className="about-profile-image"
              src="/images/articles/mateusprodev.jpg"
              alt="Mateus Ferreira, desenvolvedor freelancer"
              width={150}
              height={150}
            />
            <div>
              <p>
                Sou Mateus Ferreira, desenvolvedor freelancer e criador do Lucrazi. Trabalho há
                cerca de 10 anos com projetos online, desenvolvendo sites e soluções digitais
                para diferentes negócios.
              </p>
              <p>
                Também presto serviços para agências de turismo, em demandas pontuais ou
                parcerias recorrentes, adaptando o trabalho às necessidades de cada equipe.
                Ao longo da minha trajetória, colaborei com projetos como{" "}
                <a href="https://passeiolegal.com" target="_blank" rel="noreferrer">Passeio Legal</a>,{" "}
                <a href="https://transferfortalezatur.com.br" target="_blank" rel="noreferrer">Transfer Fortaleza Tur</a>,{" "}
                <a href="https://barbeariasamuelabreu.com.br" target="_blank" rel="noreferrer">Barbearia Samuel Abreu</a>{" "}
                e <a href="https://devguardia.cloud" target="_blank" rel="noreferrer">Devguardia</a>.
              </p>
              <p>
                Acompanhe meu trabalho no{" "}
                <a href="https://www.instagram.com/mateusprodev/" target="_blank" rel="noreferrer">
                  Instagram @mateusprodev
                </a>.
              </p>
            </div>
          </div>

          <h2>Sobre o Lucrazi</h2>
          <p>
            A experiência prática com projetos digitais me mostrou como é difícil saber por
            onde começar. O Lucrazi nasceu para tornar esse caminho mais simples: reunimos
            explicações acessíveis e ideias para quem quer explorar oportunidades na internet
            com planejamento e expectativas realistas.
          </p>
          <h2>O que você encontra por aqui</h2>
          <p>
            Você encontra guias sobre renda extra, serviços freelance, marketing digital,
            produtos digitais e pequenos negócios. A proposta é ajudar você a comparar
            possibilidades, fazer perguntas melhores e pesquisar antes de investir tempo ou dinheiro.
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
