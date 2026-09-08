export const STORAGE_KEY = "swiftui-cours.progress.v1";
export const STATUS_LABELS = {
  todo: "À faire",
  started: "En cours",
  review: "À revoir",
  done: "Validée",
} as const;
export type Status = keyof typeof STATUS_LABELS;
export type Entry = {
  status: Status;
  notes: string;
  bookmark: { id: string; title: string } | null;
  updatedAt: number;
};
export type Progress = {
  version: 1;
  entries: Record<string, Entry>;
  lastVisited: { slug: string; at: number } | null;
};
export const emptyProgress = (): Progress => ({ version: 1, entries: {}, lastVisited: null });
export const emptyEntry = (): Entry => ({ status: "todo", notes: "", bookmark: null, updatedAt: 0 });
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function timestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Date.now() + 86400000;
}

// Validate before writing: an invalid backup never replaces existing progress.
export function parseProgress(raw: string, knownSlugs: readonly string[]): Progress {
  if (raw.length > 5_000_000) throw new Error("Sauvegarde trop volumineuse (5 Mo maximum).");
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.version !== 1 || !record(value.entries)) {
    throw new Error("Format de sauvegarde incompatible. Choisis un export de ce cours (version 1).");
  }
  const result = emptyProgress();
  for (const [slug, entry] of Object.entries(value.entries)) {
    if (!knownSlugs.includes(slug)) continue;
    if (!record(entry) || typeof entry.status !== "string" ||
        !Object.hasOwn(STATUS_LABELS, entry.status) || typeof entry.notes !== "string" ||
        entry.notes.length > 20000 || !timestamp(entry.updatedAt)) {
      throw new Error(`Données invalides pour la fiche ${slug}.`);
    }
    const b = entry.bookmark;
    if (b !== null && (!record(b) || typeof b.id !== "string" ||
        !/^section-[a-z0-9-]+$/.test(b.id) || b.id.length > 250 ||
        typeof b.title !== "string" || b.title.length > 500)) {
      throw new Error(`Repère de lecture invalide pour ${slug}.`);
    }
    result.entries[slug] = {
      status: entry.status as Status, notes: entry.notes,
      bookmark: b as Entry["bookmark"], updatedAt: entry.updatedAt,
    };
  }
  if (value.lastVisited !== null) {
    if (!record(value.lastVisited) || typeof value.lastVisited.slug !== "string" || !timestamp(value.lastVisited.at)) {
      throw new Error("Dernière lecture invalide.");
    }
    if (knownSlugs.includes(value.lastVisited.slug)) {
      result.lastVisited = { slug: value.lastVisited.slug, at: value.lastVisited.at };
    }
  }
  return result;
}

// The most recently edited entry wins; ties preserve this browser's entry.
export function mergeProgress(local: Progress, incoming: Progress): Progress {
  const entries = { ...local.entries };
  for (const [slug, entry] of Object.entries(incoming.entries)) {
    if (!entries[slug] || entry.updatedAt > entries[slug].updatedAt) entries[slug] = entry;
  }
  const lastVisited = !local.lastVisited || (incoming.lastVisited && incoming.lastVisited.at > local.lastVisited.at)
    ? incoming.lastVisited : local.lastVisited;
  return { version: 1, entries, lastVisited };
}
