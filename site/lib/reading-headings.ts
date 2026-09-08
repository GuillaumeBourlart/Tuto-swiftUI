type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, unknown> };
};

function plainText(node: MarkdownNode): string {
  return node.value ?? node.children?.map(plainText).join("") ?? "";
}

// Assign IDs in the Markdown AST, never during a React component render.
// This keeps duplicate headings stable across SSR, hydration and StrictMode.
export function remarkReadingHeadings() {
  return (tree: unknown) => {
    const counts = new Map<string, number>();
    let titleSeen = false;
    function visit(node: MarkdownNode) {
      if (node.type === "heading") {
        if (node.depth === 1) {
          if (titleSeen) node.depth = 2;
          else titleSeen = true;
        }
        if (node.depth === 2) {
          const base = plainText(node).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200) || "titre";
          const count = (counts.get(base) ?? 0) + 1;
          counts.set(base, count);
          node.data = { ...node.data, hProperties: { ...node.data?.hProperties,
            id: `section-${base}${count > 1 ? `-${count}` : ""}`,
          } };
        }
      }
      node.children?.forEach(visit);
    }
    visit(tree as MarkdownNode);
  };
}
