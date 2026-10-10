import { Fragment, type ReactNode } from "react";

const highlightedTokenPattern =
  /(“[^”]+”|"[^"]+"|(?<![\p{L}\p{N}_])(?:R\$\s*)?\d+(?:[.,]\d+)*(?:\s?%|\s?(?:minutos?|horas?|dias?|semanas?|meses?|anos?|palavras?|laudas?|posts?|itens?|pessoas?|alunos?|clientes?))?(?![\p{L}\p{N}_]))/giu;

export function ArticleText({ text }: { text: string }) {
  return text.split(highlightedTokenPattern).map((part, index) => {
    let content: ReactNode = part;
    if (part.startsWith("“") || part.startsWith('"')) {
      content = <em className="article-quote">{part}</em>;
    } else if (/^(?:R\$\s*)?\d/u.test(part)) {
      content = <span className="article-number">{part}</span>;
    }
    return <Fragment key={index}>{content}</Fragment>;
  });
}
