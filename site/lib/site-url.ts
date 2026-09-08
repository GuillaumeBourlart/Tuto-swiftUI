// Next Link gère basePath ; les liens Markdown et téléchargements sont des <a> natifs.
export function withBasePath(href: string, basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""): string {
  if (!basePath || !href.startsWith("/") || href.startsWith("//")) return href;
  if (href === basePath || href.startsWith(`${basePath}/`)) return href;
  return `${basePath}${href}`;
}
