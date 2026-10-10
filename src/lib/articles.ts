export type ArticleSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  note?: string;
};

export type Article = {
  slug: string;
  category: string;
  title: string;
  description: string;
  readTime: string;
  publishedAt: string;
  author: string;
  accent: "mint" | "yellow" | "lavender" | "peach";
  intro: string;
  sections: ArticleSection[];
  takeaway: string;
};

export const articles: Article[] = [
  {
    slug: "como-comecar-renda-extra",
    category: "Renda extra",
    title: "Como começar uma renda extra com o que você já sabe fazer",
    description:
      "Um caminho realista para transformar uma habilidade em um primeiro serviço, testar a procura e começar sem apostar dinheiro que você não pode perder.",
    readTime: "6 min de leitura",
    publishedAt: "2026-10-09",
    author: "Redação Lucrazi",
    accent: "mint",
    intro:
      "Uma renda extra pode começar com uma habilidade simples — cozinhar, consertar, ensinar, organizar ou criar. Antes de comprar equipamentos ou fazer um curso caro, descubra se existe alguém disposto a pagar pelo que você oferece.",
    sections: [
      {
        heading: "1. Faça um inventário do que você já sabe",
        paragraphs: [
          "Anote tarefas que as pessoas já pedem para você fazer ou nas quais você costuma ajudar. Pense em conhecimentos do trabalho, de casa, de um hobby e até em ferramentas que você já domina.",
          "Uma boa primeira oferta costuma resolver um problema específico. “Faço de tudo” é difícil de entender; “preparo marmitas caseiras para a semana” deixa mais claro o que a pessoa pode contratar.",
        ],
      },
      {
        heading: "2. Escolha um público e uma oferta pequena",
        paragraphs: [
          "Tente completar esta frase: “Eu ajudo [tipo de pessoa] a [resolver um problema] com [serviço ou produto]”. Não precisa encontrar a ideia perfeita: escolha uma versão simples que você consiga entregar bem e com segurança.",
        ],
        bullets: [
          "Aulas de reforço para uma matéria específica.",
          "Revisão de currículos para quem está procurando emprego.",
          "Bolos ou refeições sob encomenda, respeitando as regras locais.",
          "Pequenos serviços de organização, manutenção ou criação digital.",
        ],
      },
      {
        heading: "3. Converse com possíveis clientes antes de investir",
        paragraphs: [
          "Fale com pessoas que poderiam usar a oferta e pergunte como resolvem esse problema hoje, o que é mais difícil e o que valorizam ao contratar. Procure sinais de interesse real, não só elogios à ideia.",
          "Uma conversa não garante vendas, mas ajuda a ajustar o serviço e a evitar gastos prematuros. Se fizer sentido, ofereça um primeiro teste com escopo e preço combinados com clareza.",
        ],
      },
      {
        heading: "4. Calcule se o trabalho vale a pena",
        paragraphs: [
          "Some materiais, deslocamento, taxas e o tempo gasto — incluindo conversa com cliente, preparação, entrega e possíveis ajustes. Compare o resultado com o valor recebido e com o tempo disponível na sua rotina.",
          "Preço baixo pode atrair os primeiros clientes, mas não deve esconder prejuízo ou horas que você não consegue sustentar. Registre o que gastou e reveja o preço depois dos primeiros trabalhos.",
        ],
      },
      {
        heading: "5. Divulgue com uma mensagem clara",
        paragraphs: [
          "Explique o que está oferecendo, para quem, como funciona e qual é o próximo passo para pedir informações. Um exemplo do seu trabalho e um depoimento autorizado podem ajudar mais do que promessas de resultado.",
          "Comece por canais que você já usa e por indicações de pessoas próximas. Evite pagar por anúncios antes de entender se a oferta tem procura e se o valor cobrado cobre os custos.",
        ],
      },
      {
        heading: "6. Organize a rotina e acompanhe os números",
        paragraphs: [
          "Separe o dinheiro do trabalho das despesas pessoais, anote receitas e custos e reserve horários realistas para atender. Quando a atividade começar a ficar frequente, pesquise obrigações fiscais e regras aplicáveis ao seu tipo de serviço.",
        ],
        note: "Nenhuma renda é garantida: a procura, o tempo de retorno e os custos variam conforme a atividade e a região.",
      },
    ],
    takeaway:
      "O melhor primeiro passo é testar uma oferta pequena com pessoas reais, aprender com as respostas e só então decidir quanto investir.",
  },
  {
    slug: "valide-sua-ideia-de-negocio",
    category: "Ideias de negócio",
    title: "Como validar uma ideia de negócio antes de gastar dinheiro",
    description:
      "Cinco testes simples para investigar se uma ideia resolve um problema real antes de investir em estoque, ferramentas ou anúncios.",
    readTime: "5 min de leitura",
    publishedAt: "2026-10-09",
    author: "Redação Lucrazi",
    accent: "yellow",
    intro:
      "Uma ideia parece promissora quando resolve um problema que as pessoas realmente têm — e pelo qual podem escolher pagar. Você pode buscar evidências disso antes de assumir custos altos.",
    sections: [
      {
        heading: "Comece pelo problema, não pelo produto",
        paragraphs: [
          "Descreva a dificuldade que você quer resolver em uma frase. Depois identifique quem sente esse problema, com que frequência aparece e o que essas pessoas fazem hoje para lidar com ele.",
          "Se você ainda não consegue apontar um público específico, converse com potenciais clientes antes de desenhar marca, comprar estoque ou contratar uma plataforma.",
        ],
      },
      {
        heading: "Faça entrevistas curtas e sem induzir a resposta",
        paragraphs: [
          "Pergunte sobre experiências recentes: “Quando foi a última vez que isso aconteceu?” ou “Como você resolveu?”. Perguntas sobre o que a pessoa já fez tendem a trazer mais informação do que perguntar se ela “gostaria” de uma ideia hipotética.",
          "Converse com pessoas que representam o público pretendido, não apenas amigos que podem querer agradar. Anote palavras recorrentes, soluções existentes e objeções.",
        ],
      },
      {
        heading: "Monte o teste mais simples possível",
        paragraphs: [
          "Uma amostra, uma página explicativa, uma demonstração ou um lote pequeno pode ajudar a observar interesse. Deixe claro quando algo ainda está em teste e não aceite pagamentos sem condições, prazos e entrega definidos.",
          "Defina antes o que contaria como sinal para continuar: pedidos de orçamento, inscrições qualificadas ou compras que você consiga atender. Curtidas e elogios, sozinhos, não comprovam demanda.",
        ],
      },
      {
        heading: "Entenda os custos e os riscos",
        paragraphs: [
          "Liste os gastos para produzir, entregar e divulgar a oferta, além do seu tempo. Considere taxas, impostos, devoluções e períodos sem vendas. Faça uma estimativa conservadora e limite o valor do teste ao que cabe no seu orçamento.",
          "Não use dinheiro de aluguel, alimentação ou contas essenciais para testar um negócio. Crédito e promessas de retorno rápido aumentam o risco e não tornam uma ideia mais validada.",
        ],
      },
      {
        heading: "Decida com base no que aprendeu",
        paragraphs: [
          "Se as pessoas não entendem a oferta, ajuste a comunicação. Se reconhecem o problema mas não compram, investigue preço, confiança e alternativas. Se há procura e você consegue entregar com margem, considere um próximo teste — ainda pequeno.",
          "Validar não é provar que o negócio terá sucesso; é reduzir incertezas antes de comprometer mais recursos.",
        ],
      },
    ],
    takeaway:
      "Converse com potenciais clientes, teste uma versão simples e estabeleça um limite de gastos antes de começar.",
  },
  {
    slug: "como-definir-preco-do-seu-servico",
    category: "Freelance",
    title: "Como definir o preço do seu serviço sem esquecer os custos",
    description:
      "Aprenda a listar custos, contabilizar seu tempo e explicar o escopo para montar um preço inicial mais consciente para serviços freelance.",
    readTime: "7 min de leitura",
    publishedAt: "2026-10-09",
    author: "Redação Lucrazi",
    accent: "lavender",
    intro:
      "Definir preço não é apenas escolher um número parecido com o de outras pessoas. Para avaliar se um serviço é viável, considere custos, tempo, impostos e o que está incluído na entrega.",
    sections: [
      {
        heading: "Liste os custos ligados ao trabalho",
        paragraphs: [
          "Comece pelos gastos diretos: materiais, deslocamento, taxas de pagamento e ferramentas usadas para aquele projeto. Depois pense em custos que ajudam a manter a atividade, como internet, equipamento e divulgação.",
          "Não é preciso acertar cada centavo no primeiro orçamento. O importante é não confundir o valor recebido com o que efetivamente sobra depois dos gastos.",
        ],
      },
      {
        heading: "Conte o tempo além da execução",
        paragraphs: [
          "Inclua reuniões, mensagens, preparação, pesquisa, revisão e entrega. Uma tarefa que parece levar duas horas pode ocupar mais tempo quando você considera todo o atendimento.",
          "Você pode começar estimando um valor por hora que faça sentido para sua realidade e usar essa conta como referência. Depois compare com o escopo e o valor que o serviço entrega ao cliente.",
        ],
      },
      {
        heading: "Escreva o escopo com clareza",
        paragraphs: [
          "Descreva o que será entregue, o prazo, quantas revisões estão incluídas e o que fica de fora. Combine também como mudanças de escopo serão tratadas. Isso reduz mal-entendidos e ajuda você a estimar projetos futuros.",
        ],
        bullets: [
          "Qual é o resultado combinado?",
          "Quais materiais ou informações o cliente precisa fornecer?",
          "Quantas revisões e encontros estão incluídos?",
          "Como serão definidos prazo, pagamento e alterações?",
        ],
      },
      {
        heading: "Use uma conta de referência, não uma promessa",
        paragraphs: [
          "Uma forma de estimar um preço inicial é somar os custos previstos ao valor do tempo de trabalho e considerar as obrigações e despesas da atividade. Pesquise as regras fiscais aplicáveis ao seu caso; elas podem variar por ocupação e localidade.",
          "Pesquise serviços comparáveis para entender o mercado, mas não copie um preço sem saber se o escopo, a experiência e os custos são equivalentes.",
        ],
        note: "Este exemplo é educativo e não substitui orientação contábil. Obrigações e tributos dependem da atividade e podem mudar.",
      },
      {
        heading: "Revise o preço depois de cada projeto",
        paragraphs: [
          "Anote o tempo real, os gastos e as solicitações que surgiram fora do combinado. Se vários trabalhos levam mais horas do que o estimado, ajuste o escopo, o processo ou o preço nos próximos orçamentos.",
          "Explicar como o orçamento foi construído ajuda o cliente a comparar propostas pelo que está incluído, não apenas pelo menor número.",
        ],
      },
    ],
    takeaway:
      "Um bom orçamento é claro sobre entrega e limites, cobre os custos previstos e permite revisar as estimativas com a experiência.",
  },
  {
    slug: "organize-sua-primeira-renda-extra",
    category: "Organização financeira",
    title: "Primeira renda extra: como organizar ganhos e despesas desde o início",
    description:
      "Um método simples para registrar entradas, custos e tempo de trabalho quando você começa a vender um produto ou serviço por conta própria.",
    readTime: "5 min de leitura",
    publishedAt: "2026-10-09",
    author: "Redação Lucrazi",
    accent: "peach",
    intro:
      "Quando o dinheiro começa a entrar, pode ser difícil saber quanto veio do trabalho e quanto realmente sobrou. Um registro simples desde o primeiro serviço ajuda a enxergar custos e tomar decisões melhores.",
    sections: [
      {
        heading: "Registre cada entrada e saída",
        paragraphs: [
          "Use uma planilha, caderno ou aplicativo confiável para anotar data, descrição, valor e forma de pagamento. Registre também compras pequenas: embalagens, transporte e taxas podem se acumular.",
          "Guarde comprovantes e evite misturar gastos pessoais com os da atividade. Se ainda não usa uma conta separada, mantenha ao menos um registro que permita identificar cada lançamento.",
        ],
      },
      {
        heading: "Calcule o resultado, não só o faturamento",
        paragraphs: [
          "Faturamento é o total recebido; ele não mostra quanto ficou depois dos custos. Some despesas relacionadas ao trabalho e acompanhe o tempo dedicado para entender se a atividade está compensando.",
          "Compare períodos equivalentes e considere que a procura pode oscilar. Um mês bom não garante que o mesmo resultado se repetirá.",
        ],
      },
      {
        heading: "Planeje o uso do dinheiro",
        paragraphs: [
          "Antes de contar toda entrada como renda disponível, considere pagamentos pendentes, reposição de materiais, taxas e obrigações que se aplicam à sua atividade. Se possível, forme uma reserva compatível com a sua realidade.",
          "Uma divisão fixa não serve igualmente para todo mundo. Primeiro observe seus números por alguns meses e escolha uma regra que respeite suas contas essenciais e os custos do trabalho.",
        ],
      },
      {
        heading: "Revise a atividade periodicamente",
        paragraphs: [
          "Uma vez por mês, veja quais ofertas tiveram procura, quais consumiram mais tempo e quais despesas podem ser reduzidas sem comprometer a qualidade. Use essas informações para decidir o que manter, alterar ou interromper.",
          "Se a atividade se tornar recorrente, pesquise formalização, emissão de documentos e obrigações aplicáveis diretamente em fontes oficiais ou com um profissional qualificado.",
        ],
      },
    ],
    takeaway:
      "Anotar valores desde o começo transforma uma sensação de movimento em informação para decidir os próximos passos.",
  },
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function formatArticleDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
