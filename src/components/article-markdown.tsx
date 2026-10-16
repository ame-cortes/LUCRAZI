import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AdSlot } from "@/components/ad-slot";
import { getMarkdownHeadings } from "@/lib/article-markdown";

function getComponents(lineOffset = 0): Components {
  return {
    h2: ({ children, node, ...props }) => {
      const line = node?.position?.start.line;
      return (
        <h2 {...props} id={line ? `secao-${line + lineOffset}` : undefined}>
          {children}
        </h2>
      );
    },
    blockquote: ({ children, ...props }) => (
      <aside className="article-note" {...props}>
        {children}
      </aside>
    ),
  };
}

export function ArticleMarkdown({
  content,
  insertAdAfterThirdSection = false,
}: {
  content: string;
  insertAdAfterThirdSection?: boolean;
}) {
  const lines = content.split(/\r?\n/);
  const headings = getMarkdownHeadings(content);
  const fourthHeadingLine = headings[3]?.line;
  const splitIndex = insertAdAfterThirdSection && headings.length >= 3
    ? fourthHeadingLine ? fourthHeadingLine - 1 : lines.length
    : null;

  return (
    <div className="article-markdown">
      {splitIndex === null ? (
        <ReactMarkdown components={getComponents()} remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      ) : (
        <>
          <ReactMarkdown components={getComponents()} remarkPlugins={[remarkGfm]}>
            {lines.slice(0, splitIndex).join("\n")}
          </ReactMarkdown>
          <AdSlot className="article-ad" />
          {splitIndex < lines.length && (
            <ReactMarkdown components={getComponents(splitIndex)} remarkPlugins={[remarkGfm]}>
              {lines.slice(splitIndex).join("\n")}
            </ReactMarkdown>
          )}
        </>
      )}
    </div>
  );
}
