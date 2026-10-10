import Link from "next/link";
import { formatArticleDate, type Article } from "@/lib/articles";

type ArticleCardProps = {
  article: Article;
  featured?: boolean;
  index?: number;
};

export function ArticleCard({ article, featured = false, index }: ArticleCardProps) {
  return (
    <article className={`article-card${featured ? " article-card-featured" : ""}`}>
      <Link className="card-art" href={`/artigos/${article.slug}`} aria-label={article.title}>
        <div className={`card-art-inner art-${article.accent}`}>
          {featured ? (
            <>
              <span className="art-big-number">01</span>
              <span className="art-big-word">comece<br />pequeno<span>.</span></span>
              <span className="art-corner-label">UM GUIA LUCrazi</span>
              <span className="art-asterisk" aria-hidden="true">✳</span>
            </>
          ) : (
            <>
              <span className="card-art-number">{String(index ?? 1).padStart(2, "0")}</span>
              <span className="card-art-mark" aria-hidden="true">{article.accent === "yellow" ? "↗" : article.accent === "lavender" ? "✳" : "＋"}</span>
              <span className="card-art-caption">LUC<strong>RAZI</strong> / IDEIAS</span>
            </>
          )}
        </div>
      </Link>
      <div className="card-copy">
        <div className="card-meta">
          <span>{article.category}</span>
          <span>{article.readTime}</span>
        </div>
        <h3><Link href={`/artigos/${article.slug}`}>{article.title}</Link></h3>
        <p>{article.description}</p>
        <div className="card-bottom">
          <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
          <Link className="round-arrow" href={`/artigos/${article.slug}`} aria-label={`Ler: ${article.title}`}>↗</Link>
        </div>
      </div>
    </article>
  );
}
