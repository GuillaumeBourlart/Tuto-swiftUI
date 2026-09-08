"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";
import { Children, isValidElement, memo } from "react";
import { allFiches } from "@/lib/sommaire";
import { useProgress } from "./ProgressProvider";
import { remarkReadingHeadings } from "@/lib/reading-headings";
import { withBasePath } from "@/lib/site-url";

function headingText(children: React.ReactNode): string {
  return Children.toArray(children).map(child => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement<{ children?: React.ReactNode }>(child) ? headingText(child.props.children) : "";
  }).join("");
}

function ReadingMarker({ slug, id, title }: { slug: string; id: string; title: string }) {
  const { data, ready, update } = useProgress();
  const marked = data.entries[slug]?.bookmark?.id === id;
  return <button type="button" disabled={!ready} aria-pressed={marked}
    aria-label={`Mémoriser le passage : ${title}`} className="reading-marker"
    onClick={() => update(slug, { bookmark: { id, title: title.slice(0, 500) } })}>
    {marked ? "✓ Repère enregistré" : "Mémoriser ce passage"}
  </button>;
}

// Typing notes must not re-highlight the entire lesson on every keystroke.
export const MarkdownRenderer = memo(function MarkdownRenderer({ content, slug }: { content: string; slug: string }) {
  return (
    <div className="prose-fiche">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkReadingHeadings]}
        components={{
          h2({ children, id }) {
            return <h2 id={id} className="scroll-mt-20">{children}
              {id && <ReadingMarker slug={slug} id={id} title={headingText(children)} />}
            </h2>;
          },
          a({ href, children }) {
            const [file, hash] = (href ?? "").split("#");
            let decoded = file;
            try { decoded = decodeURI(file); } catch { /* Keep malformed URLs as literal links. */ }
            const fiche = allFiches.find(f => f.file === decoded.replace(/^\.\//, ""));
            const target = fiche ? `/fiche/${fiche.slug}/${hash ? `#${hash}` : ""}` : href;
            return <a href={target ? withBasePath(target) : undefined}>{children}</a>;
          },
          table({ children }) {
            return <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau défilant"><table>{children}</table></div>;
          },
          code(props) {
            const { className, children } = props as {
              className?: string;
              children?: React.ReactNode;
              inline?: boolean;
            };
            const inline = (props as { inline?: boolean }).inline;
            const text = String(children ?? "").replace(/\n$/, "");
            const langMatch = /language-(\w+)/.exec(className ?? "");

            if (!inline && langMatch) {
              return <CodeBlock language={langMatch[1]} code={text} />;
            }

            if (!inline && !langMatch && text.includes("\n")) {
              return <CodeBlock code={text} />;
            }

            return (
              <code className={className}>
                {children}
              </code>
            );
          },
          pre(props) {
            return <>{props.children}</>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
