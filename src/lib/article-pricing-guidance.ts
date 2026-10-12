import type { ArticleSection } from "./article-types";

const checkedAt = "2026-10-12";
const sources = {
  adsense: [{
    label: "Google AdSense: participação na receita",
    url: "https://support.google.com/adsense/answer/180195?hl=pt-BR",
    checkedAt,
  }],
  youtube: [{
    label: "Ajuda do YouTube: participação na receita",
    url: "https://support.google.com/youtube/answer/72902?hl=pt-BR",
    checkedAt,
  }],
  kdp: [{
    label: "Amazon KDP: opções de royalties para eBooks",
    url: "https://kdp.amazon.com/pt_BR/help/topic/G200644210",
    checkedAt,
  }],
  registry: [{
    label: "Registro.br: preço de domínios",
    url: "https://registro.br/dominio/preco/",
    checkedAt,
  }],
};

type PricingGuidance = Pick<ArticleSection, "paragraphs" | "sources">;

export const articlePricingGuidance: Record<string, PricingGuidance> = {
  "como-ganhar-dinheiro-como-redator-freelancer": {
    paragraphs: [
      "Não existe uma tarifa nacional confiável para redação freelancer. Monte o orçamento a partir do escopo: briefing, pesquisa, estrutura, escrita, SEO, revisões e prazo. Cronometre trabalhos comparáveis, some custos, tributos e taxas reais e divida pela quantidade de horas que consegue faturar; apresente o preço por projeto com limites de revisão definidos.",
    ],
  },
  "como-trabalhar-com-revisao-de-textos": {
    paragraphs: [
      "Não há preço nacional verificável por lauda. Faça uma amostra para medir densidade de erros e tempo por página; especifique se a entrega cobre ortografia, gramática, estilo, referências ou formatação. Calcule o piso com seu tempo efetivo e custos, e só então converta para lauda ou palavra com uma definição de lauda explícita.",
    ],
  },
  "como-ganhar-dinheiro-com-traducao": {
    paragraphs: [
      "Não há uma tarifa única que represente traduções de todos os idiomas e áreas. Orce com base no par de idiomas, especialidade, volume, formato, prazo, pesquisa terminológica e revisão; separe tradução juramentada, localização e direitos de uso quando forem aplicáveis. Use seu tempo registrado em trabalhos do mesmo tipo, não uma faixa genérica de internet.",
    ],
  },
  "como-trabalhar-como-assistente-virtual": {
    paragraphs: [
      "Não existe tabela nacional confiável para assistência virtual. Antes de cotar, delimite tarefas, canais, horários de disponibilidade, volume, ferramentas e responsabilidade por dados. Registre o tempo gasto com execução, alinhamentos e retrabalho; some seus custos e taxas efetivos e ofereça um escopo mensal com limite e regra para demandas extras.",
    ],
  },
  "como-gerenciar-redes-sociais": {
    paragraphs: [
      "Não trate um pacote de redes sociais como preço de mercado sem fonte. Descreva quantos canais, peças e formatos serão entregues, se captação de vídeo, resposta a comentários, impulsionamento e relatório estão incluídos, e quais revisões cabem. Estime horas por tarefa usando sua própria produção e apresente mídia paga como verba separada do serviço.",
    ],
  },
  "como-ganhar-dinheiro-criando-artes-no-canva": {
    paragraphs: [
      "Não há tarifa nacional confiável para artes feitas no Canva. Orce cada conjunto conforme formatos, variações, preparação dos arquivos, revisões e licença dos elementos usados; confira se o cliente pode editar ou redistribuir os arquivos conforme os termos vigentes do Canva. Registre seu tempo por tipo de peça para calcular um piso próprio.",
    ],
  },
  "como-trabalhar-editando-videos-curtos": {
    paragraphs: [
      "Não há preço nacional verificável por vídeo curto. Compare o escopo, não só a duração final: seleção de material bruto, cortes, legendas, identidade visual, versões por plataforma, trilha licenciada e revisões. Meça o tempo de edição real e discrimine captação, urgência e entregas adicionais no orçamento.",
    ],
  },
  "como-editar-podcasts-para-clientes": {
    paragraphs: [
      "Não existe tarifa nacional confiável por episódio. O orçamento depende da duração bruta, número de faixas, limpeza de áudio, edição de conteúdo, vinheta, transcrição, cortes para redes, masterização e prazo. Faça um teste cronometrado com material do cliente e especifique no contrato quantas revisões e formatos de exportação estão incluídos.",
    ],
  },
  "como-criar-sites-para-pequenos-negocios": {
    paragraphs: [
      "O Registro.br informa o preço de R$ 40,00 por ano para um domínio .br; confira a tabela oficial antes de contratar, pois o valor pode mudar. Isso é apenas o registro do domínio, não inclui hospedagem, e-mail, manutenção ou criação do site. Para o serviço, delimite páginas, conteúdo, integrações, acessibilidade, suporte e custos recorrentes separadamente.",
      "Para calcular seu honorário, cronometre projeto, reuniões, ajustes e publicação; some ferramentas e tributos efetivos e defina o que será cobrado à parte. Não apresente o custo do domínio como preço de criação ou como orçamento completo.",
    ],
    sources: sources.registry,
  },
  "como-criar-apresentacoes-profissionais": {
    paragraphs: [
      "Não há valor nacional confiável por apresentação ou slide. Orce conforme pesquisa e roteiro, quantidade de telas, gráficos, tratamento de dados, identidade visual, animações, arquivo editável, prazo e rodadas de revisão. Separe a criação do conteúdo da diagramação quando o cliente fornecer ou não o texto final.",
    ],
  },
  "como-dar-aulas-particulares-online": {
    paragraphs: [
      "Não existe preço nacional verificável para aulas particulares: matéria, nível, cidade e experiência mudam o escopo. Inclua preparação, correção de exercícios, material, duração, deslocamento quando presencial e regras de falta/remarcação. Use o tempo total de atendimento, não apenas os minutos da chamada, para calcular seu valor mínimo.",
    ],
  },
  "como-criar-e-vender-curso-online": {
    paragraphs: [
      "Não use uma taxa presumida de plataforma nem um número fictício de alunos para calcular retorno. Levante custos reais de gravação, edição, ferramentas, suporte, tributos e taxa vigente da plataforma escolhida; divida o investimento pelo número de matrículas efetivamente pagas para acompanhar o ponto de equilíbrio. Atualize o cálculo com os extratos de vendas e reembolsos.",
    ],
  },
  "como-criar-e-vender-ebook": {
    paragraphs: [
      "No Kindle Direct Publishing, a documentação oficial prevê opções de royalties de 35% ou 70% para eBooks, mas a opção de 70% depende de elegibilidade, território e outras condições; custos de entrega e impostos também podem ser descontados. Essas são regras específicas do KDP, não uma margem garantida para todo eBook ou loja. Confira a simulação e os termos vigentes para o título e o território antes de fixar o preço.",
    ],
    sources: sources.kdp,
  },
  "como-vender-planilhas-prontas": {
    paragraphs: [
      "Não há uma margem padrão verificável para planilhas digitais. Considere horas de modelagem, testes, documentação, suporte, atualização e taxa efetiva do canal de venda; avalie também se a licença permite uso individual ou comercial. Baseie a decisão em custos e vendas registrados, e não em um preço ou volume presumido.",
    ],
  },
  "como-vender-modelos-editaveis": {
    paragraphs: [
      "Não existe preço nacional verificável para modelos editáveis. Diferencie o valor pelo escopo da licença, formatos incluídos, possibilidade de uso comercial, documentação e suporte; confirme os direitos de fontes, imagens e elementos gráficos. Some os custos reais do canal e acompanhe vendas líquidas, reembolsos e atendimento antes de alterar o preço.",
    ],
  },
  "como-criar-oficina-presencial-ou-online": {
    paragraphs: [
      "Calcule a oficina com custos confirmados, não com uma lotação presumida: espaço ou plataforma, materiais por pessoa, deslocamento, divulgação, taxas, tributos e horas de preparação e condução. Divida os custos fixos pela quantidade mínima de participantes pagantes que você realmente precisa para realizar a turma; informe previamente as condições de cancelamento e reembolso.",
    ],
  },
  "como-oferecer-consultoria": {
    paragraphs: [
      "Não há tarifa nacional confiável para consultoria. Defina problema, diagnóstico, reuniões, entregáveis, acesso posterior e limite de revisões; registre preparação e acompanhamento além das horas com o cliente. Apresente proposta por escopo e prazo, com despesas e trabalho adicional claramente separados.",
    ],
  },
  "como-criar-comunidade-por-assinatura": {
    paragraphs: [
      "Não estime receita recorrente com um número de membros presumido. Some produção, moderação, suporte, ferramentas, tributos e as taxas reais de cobrança; acompanhe no painel assinaturas ativas, cancelamentos, reembolsos e receita líquida por período. O preço e a frequência de conteúdo devem ser avaliados com dados da própria comunidade.",
    ],
  },
  "como-vender-audiobooks-e-materiais-em-audio": {
    paragraphs: [
      "Não há royalty único aplicável a todo audiobook: a remuneração e os direitos dependem do distribuidor, contrato, território e modelo de venda. Antes de gravar, confira por escrito a base de cálculo, deduções, exclusividade, prazo e direitos de reprodução; some gravação, edição, revisão e masterização com seus custos reais.",
    ],
  },
  "como-transformar-habilidade-manual-em-aulas": {
    paragraphs: [
      "Orce a aula pela atividade concreta: materiais consumíveis por aluno, ferramentas compartilhadas, preparação, limpeza, espaço e tempo de acompanhamento. Confirme capacidade segura e custo por participante antes de divulgar; defina se cada pessoa leva o material e como será tratada a reposição ou o desperdício.",
    ],
  },
  "como-monetizar-blog-de-nicho": {
    paragraphs: [
      "No AdSense para conteúdo, o Google informa que o editor recebe 80% após a taxa da plataforma de compra; quando anúncios de display são comprados via Google Ads, a parcela informada ao editor é cerca de 68% da receita. Isso descreve a divisão da receita, não um RPM nem uma previsão de ganhos. Para estimar o seu resultado, use o RPM e as visualizações do seu próprio relatório no mesmo período e desconte seus custos.",
    ],
    sources: sources.adsense,
  },
  "como-ganhar-dinheiro-com-marketing-de-afiliados": {
    paragraphs: [
      "Não use uma porcentagem fixa como comissão de afiliado: cada programa pode variar por categoria, campanha, prazo de atribuição e regras de cancelamento. Consulte a tabela oficial da oferta antes de publicar; acompanhe cliques, pedidos aprovados, devoluções e comissão efetivamente liberada no painel. Avise o leitor, perto do link, quando houver remuneração.",
    ],
  },
  "como-ganhar-dinheiro-no-youtube": {
    paragraphs: [
      "O YouTube informa participação de 55% da receita líquida de anúncios da página de exibição, 45% da receita alocada ao criador no pool de Shorts e 70% da receita líquida de recursos como Clubes dos canais e Super Chat, sob os termos e módulos aplicáveis. Essas porcentagens não são RPM por mil visualizações nem garantem renda. Para RPM, use o Analytics do próprio canal e indique o período.",
    ],
    sources: sources.youtube,
  },
  "como-monetizar-podcast": {
    paragraphs: [
      "Não há tarifa nacional verificável de patrocínio por episódio ou download. Monte um mídia kit com downloads e retenção observados na plataforma, período medido, perfil da audiência e entregas exatas; separe produção, inserção, menção, exclusividade e reaproveitamento do conteúdo no contrato. Atualize qualquer proposta com os dados reais mais recentes.",
    ],
  },
  "como-trabalhar-com-conteudo-ugc": {
    paragraphs: [
      "Não trate valores de UGC sem fonte como padrão de mercado. Separe a produção do vídeo dos direitos de uso: canais, duração, território, impulsionamento, exclusividade, arquivos brutos e prazo de veiculação. Some briefing, roteiro, gravação, edição e revisões, e descreva cada direito licenciado na proposta.",
    ],
  },
  "como-vender-fotos-e-videos-em-bancos-de-midia": {
    paragraphs: [
      "Royalties de foto e vídeo variam por agência, tipo de licença, plano de assinatura, território e contrato do colaborador; não há taxa universal confiável. Confira os termos atuais da agência para cada modalidade e use o extrato do próprio portfólio para calcular receita líquida. Não confunda downloads ou licenças com valor recebido.",
    ],
  },
  "como-ganhar-dinheiro-com-fotografia-de-produtos": {
    paragraphs: [
      "Não há preço nacional verificável por sessão de fotografia de produto. No orçamento, detalhe quantidade e tamanho dos itens, preparação, cenário, iluminação, edição, prazo, deslocamento, formatos e licença de uso das imagens. Meça o tempo integral do trabalho e discrimine produção adicional e uso em campanhas pagas.",
    ],
  },
  "como-vender-ilustracoes-e-arte-digital": {
    paragraphs: [
      "Não existe valor nacional confiável por ilustração. Precifique o escopo criativo, pesquisa, complexidade, formatos finais, revisões e licença — incluindo mídias, território, duração, exclusividade e possibilidade de adaptação. Separe cessão ou ampliação de direitos do trabalho de criação e mantenha registro do tempo e dos custos.",
    ],
  },
  "como-ganhar-dinheiro-com-locucao": {
    paragraphs: [
      "Não há tarifa nacional verificável por minuto de locução. Orce texto e dificuldade, captação, edição, limpeza, prazo, quantidade de versões e direito de uso; publicidade, mídia, território, período e exclusividade podem exigir licenças diferentes. Registre o tempo de preparação e gravação, não apenas a duração do áudio final.",
    ],
  },
  "como-vender-produtos-personalizados": {
    paragraphs: [
      "Não aplique uma margem presumida a produtos personalizados. Apure por pedido o material, impressão, preparação, perdas, embalagem, mão de obra, frete, tributos e taxas atuais do canal; inclua refação por erro de produção e política de troca. O custo do lote piloto deve vir de notas e medições reais.",
    ],
  },
  "como-vender-produtos-usados-online": {
    paragraphs: [
      "Não desconte uma comissão fixa sem consultar a plataforma e a categoria usadas: taxas, frete e serviços podem mudar. Compare o estado, modelo e acessórios com anúncios equivalentes e, quando houver dados disponíveis, vendas concluídas; registre o valor líquido após taxas e embalagem. Para itens pessoais, diferencie preço de revenda de lucro comercial.",
    ],
  },
  "como-abrir-brecho-online": {
    paragraphs: [
      "Calcule cada peça por origem: custo de compra ou comissão de consignação, higienização, reparos, armazenamento, embalagem e taxa vigente do canal. Compare peças da mesma marca, condição e tamanho; anúncios ativos não provam que aquele preço foi vendido. Controle o valor líquido e o tempo até a venda por lote.",
    ],
  },
  "como-vender-artesanato-online": {
    paragraphs: [
      "Para cada peça, meça o consumo real de materiais e tempo de produção; some acabamento, perdas, embalagem, taxas atuais, tributos e frete que você absorve. Não use uma margem genérica: confira se o preço cobre o custo total e remunera o trabalho. Em encomendas, descreva variações, prazo e custo de personalização.",
    ],
  },
  "como-montar-papelaria-personalizada": {
    paragraphs: [
      "Monte o custo por lote com papel, impressão, tinta, corte, acabamento, perdas, embalagem, mão de obra e taxas efetivas do canal. Divida o custo pelos itens vendáveis, não pela quantidade inicialmente impressa, e registre defeitos e sobras. Personalização, prova de arte e alterações devem aparecer como etapas explícitas do orçamento.",
    ],
  },
  "como-vender-cestas-e-kits-para-presentes": {
    paragraphs: [
      "Apure o custo real de cada cesta: itens, embalagem, montagem, perdas de produtos perecíveis, taxa de pagamento, entrega e tempo de preparação. Especifique substituições e validade; para datas de alta procura, só prometa estoque e prazo que fornecedores e logística já confirmaram.",
    ],
  },
  "como-ganhar-dinheiro-revendendo-cosmeticos": {
    paragraphs: [
      "Não presuma margem padrão na revenda de cosméticos. Use nota e custo de aquisição do fornecedor autorizado, prazo de validade, frete, tributos, taxa do canal, amostras e perdas; compare o preço final com ofertas atuais do mesmo produto. Registre margem líquida por item e não anuncie produto sem procedência ou regularização aplicável.",
    ],
  },
  "como-vender-alimentos-por-encomenda": {
    paragraphs: [
      "Faça ficha técnica com quantidade e custo dos ingredientes realmente consumidos, rendimento aproveitável, perdas, embalagem, energia, entrega, taxas e horas de trabalho. Divida o custo do lote pelo número de porções vendáveis, e não pelo rendimento teórico; valide regras sanitárias locais e condições de conservação antes de aceitar encomendas.",
    ],
  },
  "como-montar-negocio-de-marmitas": {
    paragraphs: [
      "Calcule o custo por marmita usando pesagem dos ingredientes, rendimento após preparo, embalagem, energia, perdas, entrega, taxas e mão de obra. Registre custos por cardápio e tamanho de porção; não aplique uma margem presumida nem misture o faturamento com o que sobra após despesas. Confirme exigências sanitárias do município.",
    ],
  },
  "como-vender-bolos-doces-e-salgados": {
    paragraphs: [
      "Use ficha técnica por receita: custo dos ingredientes, rendimento real, gás ou energia, embalagem, decoração, perdas, entrega, taxa de pagamento e tempo de produção. Para encomendas personalizadas, detalhe tamanho, acabamento, alterações e prazo; calcule com compras e consumo registrados, não com uma margem genérica.",
    ],
  },
  "como-criar-loja-de-nicho": {
    paragraphs: [
      "Não conte a margem da loja com taxas presumidas. Apure por venda o custo de aquisição, frete de entrada, tributos, embalagem, pagamento, plataforma, devoluções e atendimento; confirme os valores vigentes de cada fornecedor e canal. Acompanhe conversão, estoque parado e receita líquida com dados reais antes de ampliar compras.",
    ],
  },
  "como-ganhar-dinheiro-como-pet-sitter": {
    paragraphs: [
      "Não há tarifa nacional verificável para pet sitter. Defina a unidade do serviço e inclua duração da visita, deslocamento, número de animais, alimentação, medicação autorizada, atualizações ao tutor e responsabilidade por chaves. Para hospedagem ou feriados, calcule capacidade, limpeza e disponibilidade separadamente; confirme tudo por escrito antes da reserva.",
    ],
  },
  "como-trabalhar-passeando-com-caes": {
    paragraphs: [
      "Não existe preço nacional confiável para dog walker. Delimite duração do passeio, distância até o ponto de encontro, quantidade e compatibilidade dos cães, clima, transporte e protocolo de emergência. Registre o tempo porta a porta e custos do equipamento; não transforme um pacote presumido em previsão de renda mensal.",
    ],
  },
  "como-oferecer-limpeza-residencial": {
    paragraphs: [
      "Não há tarifa nacional comparável de faxina: área, estado do imóvel, tarefas, materiais, deslocamento e cidade alteram o serviço. Faça perguntas ou vistoria antes da cotação e liste o que está incluído, como janelas, forno, roupa e limpeza pós-obra. Use seus tempos reais por tipo de imóvel para chegar ao piso do orçamento.",
    ],
  },
  "como-trabalhar-com-organizacao-profissional": {
    paragraphs: [
      "Não há preço nacional verificável para organização profissional. Orce por ambiente e escopo após diagnóstico; diferencie triagem, categorização, etiquetagem, compras de organizadores, descarte e acompanhamento. Some visita, planejamento, deslocamento e execução com base em tempos medidos, e deixe compras e materiais identificados como despesas do cliente.",
    ],
  },
  "como-ganhar-dinheiro-montando-moveis": {
    paragraphs: [
      "Não existe tarifa nacional confiável por móvel montado. O orçamento depende do modelo e estado do produto, instruções, fixação na parede, acesso ao imóvel, deslocamento, ferramentas e necessidade de ajudante. Solicite fotos e marca/modelo antes de cotar, liste serviços excluídos e combine por escrito como lidar com peças faltantes ou avarias prévias.",
    ],
  },
  "como-oferecer-pequenos-reparos-residenciais": {
    paragraphs: [
      "Não há tabela nacional verificável para pequenos reparos. Faça diagnóstico e separe mão de obra, deslocamento, materiais, descarte e eventual retorno; especifique o que não está incluído e não aceite serviço fora da sua competência ou das exigências profissionais aplicáveis. Use preços reais de materiais e tempo observado, sem estimativas de mercado inventadas.",
    ],
  },
  "como-prestar-servicos-de-jardinagem": {
    paragraphs: [
      "Não existe preço nacional único para jardinagem. Avalie área, vegetação, frequência, poda, ferramentas, transporte, retirada de resíduos e riscos do local; deixe claro se plantas e insumos estão no orçamento. Registre o tempo por tipo de manutenção e confira regras locais para descarte de resíduos verdes.",
    ],
  },
  "como-oferecer-beleza-em-domicilio": {
    paragraphs: [
      "Não há faixa nacional confiável para beleza em domicílio. Orce procedimento, duração, produtos consumidos, higienização, deslocamento, montagem do espaço e retoques; informe o que a pessoa cliente precisa preparar. Considere as regras sanitárias e profissionais aplicáveis, e use o custo real por atendimento em vez de um valor presumido.",
    ],
  },
  "como-ganhar-dinheiro-organizando-pequenas-festas": {
    paragraphs: [
      "Faça orçamento com cotações confirmadas de fornecedores, equipe, transporte, montagem, desmontagem, materiais, taxas e contingências; separe esses desembolsos da sua coordenação. Defina número de convidados, local, duração e plano de chuva antes de fechar. O ponto de equilíbrio deve usar participantes e custos efetivamente contratados, não lotação presumida.",
    ],
  },
  "como-trabalhar-com-turismo-local": {
    paragraphs: [
      "Não há preço nacional verificável para roteiro turístico local. Monte a cotação com duração, transporte, ingressos, licenças, seguros quando aplicáveis, tamanho máximo seguro do grupo e época do ano. Confirme autorizações exigidas para a atividade e discrimine o que está incluso; compare ofertas locais apenas quando itinerário e serviços forem equivalentes.",
    ],
  },
};
