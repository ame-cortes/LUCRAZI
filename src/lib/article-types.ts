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
  publishedAt: string;
  author: string;
  accent: "mint" | "yellow" | "lavender" | "peach";
  intro: string;
  sections: ArticleSection[];
  takeaway: string;
};

export type ArticleWithImage = Article & {
  imageSrc: string;
  imageAlt: string;
  imageCreditUrl: string;
};
