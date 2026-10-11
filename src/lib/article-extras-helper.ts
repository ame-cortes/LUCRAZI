import type { ArticleSection } from "./article-types";

export type ArticleExtra = {
  title: string;
  description: string;
  lead: ArticleSection;
  sections: ArticleSection[];
};

export const x = (
  title: string,
  description: string,
  checklist: string[],
  price: [string, string],
  note: string,
  channels: string[],
  faq: [string, string][],
): ArticleExtra => ({
  title,
  description,
  lead: {
    heading: "Checklist para começar",
    paragraphs: [],
    bullets: checklist,
  },
  sections: [
    { heading: "Quanto custa começar e como definir o preço", paragraphs: price, note },
    {
      heading: "Onde encontrar clientes e divulgar",
      paragraphs: [],
      bullets: channels,
    },
    { heading: "Perguntas frequentes", paragraphs: faq.map(([q, a]) => `${q} ${a}`) },
  ],
});
