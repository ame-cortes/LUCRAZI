import type { Article } from "./article-types";

export type ArticleMarkdownHeading = {
  id: string;
  line: number;
  text: string;
};

export function getMarkdownHeadings(markdown: string): ArticleMarkdownHeading[] {
  const headings: ArticleMarkdownHeading[] = [];
  let fence: string | null = null;

  markdown.split(/\r?\n/).forEach((line, index) => {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) {
        fence = marker;
      } else if (fence === marker) {
        fence = null;
      }
      return;
    }
    if (fence) return;

    const match = line.match(/^\s{0,3}##[ \t]+(.+?)[ \t]*#*[ \t]*$/);
    if (!match) return;

    const text = match[1]
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/(\*\*|__|~~|[*_])/g, "")
      .trim();
    if (text) headings.push({ id: `secao-${index + 1}`, line: index + 1, text });
  });

  return headings;
}

function sectionToMarkdown(section: Article["sections"][number]): string {
  const content = [
    section.heading ? `## ${section.heading}` : "",
    ...section.paragraphs,
    ...(section.bullets?.length ? section.bullets.map((bullet) => `- ${bullet}`) : []),
    ...(section.note ? [`> ${section.note}`] : []),
    ...(section.sources?.length
      ? section.sources.map((source) =>
        `> [${source.label}](${source.url}) — consultado em ${source.checkedAt}`,
      )
      : []),
  ].filter((part) => part.trim());

  return content.join("\n\n");
}

export function articleToMarkdown(article: Article): string {
  return [
    article.intro.trim(),
    ...article.sections.map(sectionToMarkdown),
    article.takeaway.trim() ? `## Para levar com você\n\n${article.takeaway.trim()}` : "",
  ].filter((part) => part.trim()).join("\n\n");
}
