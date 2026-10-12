export const articleClusters = [
  {
    slug: "servicos-freelance-criativos",
    title: "Serviços freelance e criativos",
    description: "Guias para transformar escrita, design, tecnologia e produção de conteúdo em serviços com escopo e preço claros.",
    articleSlugs: [
      "como-ganhar-dinheiro-como-redator-freelancer",
      "como-trabalhar-com-revisao-de-textos",
      "como-ganhar-dinheiro-com-traducao",
      "como-trabalhar-como-assistente-virtual",
      "como-gerenciar-redes-sociais",
      "como-ganhar-dinheiro-criando-artes-no-canva",
      "como-trabalhar-editando-videos-curtos",
      "como-editar-podcasts-para-clientes",
      "como-criar-sites-para-pequenos-negocios",
      "como-criar-apresentacoes-profissionais",
    ],
  },
  {
    slug: "produtos-digitais-e-ensino",
    title: "Produtos digitais e ensino",
    description: "Planeje aulas, cursos, e-books, planilhas e comunidades a partir de uma necessidade comprovada e de uma entrega viável.",
    articleSlugs: [
      "como-dar-aulas-particulares-online",
      "como-criar-e-vender-curso-online",
      "como-criar-e-vender-ebook",
      "como-vender-planilhas-prontas",
      "como-vender-modelos-editaveis",
      "como-criar-oficina-presencial-ou-online",
      "como-oferecer-consultoria",
      "como-criar-comunidade-por-assinatura",
      "como-vender-audiobooks-e-materiais-em-audio",
      "como-transformar-habilidade-manual-em-aulas",
    ],
  },
  {
    slug: "monetizacao-de-conteudo",
    title: "Monetização de conteúdo",
    description: "Compare caminhos para sustentar blogs, canais, podcasts e conteúdo de marca sem confundir audiência com receita garantida.",
    articleSlugs: [
      "como-monetizar-blog-de-nicho",
      "como-ganhar-dinheiro-com-marketing-de-afiliados",
      "como-ganhar-dinheiro-no-youtube",
      "como-monetizar-podcast",
      "como-trabalhar-com-conteudo-ugc",
    ],
  },
  {
    slug: "vendas-e-produtos",
    title: "Vendas e produtos",
    description: "Da produção e curadoria à fotografia, divulgação e entrega: organize a operação antes de ampliar o catálogo.",
    articleSlugs: [
      "como-vender-fotos-e-videos-em-bancos-de-midia",
      "como-ganhar-dinheiro-com-fotografia-de-produtos",
      "como-vender-ilustracoes-e-arte-digital",
      "como-ganhar-dinheiro-com-locucao",
      "como-vender-produtos-personalizados",
      "como-vender-produtos-usados-online",
      "como-abrir-brecho-online",
      "como-vender-artesanato-online",
      "como-montar-papelaria-personalizada",
      "como-vender-cestas-e-kits-para-presentes",
      "como-ganhar-dinheiro-revendendo-cosmeticos",
      "como-vender-alimentos-por-encomenda",
      "como-montar-negocio-de-marmitas",
      "como-vender-bolos-doces-e-salgados",
      "como-criar-loja-de-nicho",
    ],
  },
  {
    slug: "servicos-locais",
    title: "Serviços locais e pessoais",
    description: "Guias para estruturar atendimento, segurança, deslocamento, escopo e preços em serviços prestados na sua região.",
    articleSlugs: [
      "como-ganhar-dinheiro-como-pet-sitter",
      "como-trabalhar-passeando-com-caes",
      "como-oferecer-limpeza-residencial",
      "como-trabalhar-com-organizacao-profissional",
      "como-ganhar-dinheiro-montando-moveis",
      "como-oferecer-pequenos-reparos-residenciais",
      "como-prestar-servicos-de-jardinagem",
      "como-oferecer-beleza-em-domicilio",
      "como-ganhar-dinheiro-organizando-pequenas-festas",
      "como-trabalhar-com-turismo-local",
    ],
  },
] as const;

export type ArticleCluster = (typeof articleClusters)[number];

export function getArticleCluster(articleSlug: string) {
  return articleClusters.find((cluster) => cluster.articleSlugs.some(
    (slug) => slug === articleSlug,
  ));
}

export function getClusterArticles<T extends { slug: string }>(
  cluster: ArticleCluster,
  articles: T[],
  excludeSlug?: string,
) {
  const articlesBySlug = new Map(articles.map((article) => [article.slug, article]));
  return cluster.articleSlugs.flatMap((slug) => {
    const article = articlesBySlug.get(slug);
    return article && slug !== excludeSlug ? [article] : [];
  });
}
