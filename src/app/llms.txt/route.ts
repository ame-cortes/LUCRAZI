import { connection } from "next/server";
import { loadPublishedArticles } from "@/lib/articles";
import { siteUrl } from "@/lib/site-config";

export async function GET() {
  await connection();
  const articles = await loadPublishedArticles();
  const lines = [
    "# Lucrazi",
    "",
    "> Guias práticos em português sobre renda online, trabalho freelancer, produtos digitais, serviços e pequenos negócios. Conteúdo informativo, sem promessas de ganhos.",
    "",
    "## Páginas principais",
    "",
    `- [Todos os guias](${new URL("/artigos", siteUrl)}): catálogo dos artigos publicados.`,
    `- [Sobre o Lucrazi](${new URL("/sobre", siteUrl)}): proposta editorial e critérios de conteúdo.`,
    `- [Contato](${new URL("/contato", siteUrl)}): sugestões e correções editoriais.`,
    "",
    "## Artigos publicados",
    "",
    ...articles.map(
      (article) =>
        `- [${article.title}](${new URL(`/artigos/${article.slug}`, siteUrl)}): ${article.description}`,
    ),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
