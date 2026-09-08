"use client";

import { useEffect } from "react";
import Link from "next/link";
import { emptyEntry, STATUS_LABELS, Status } from "@/lib/progress";
import { getFicheBySlug } from "@/lib/sommaire";
import { learningPath } from "@/lib/learning-path";
import { useProgress } from "./ProgressProvider";

export function ProgressBadge({ slug }: { slug: string }) {
  const { data, ready } = useProgress();
  const status = ready ? data.entries[slug]?.status ?? "todo" : "todo";
  return <span className={`progress-badge status-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function LessonProgress({ slug }: { slug: string }) {
  const { data, ready, error, update, visit } = useProgress();
  useEffect(() => { if (ready) visit(slug); }, [ready, slug, visit]);
  const entry = data.entries[slug] ?? emptyEntry();
  return <section aria-label="Ma progression sur cette fiche" className="study-panel mb-8">
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor={`status-${slug}`} className="font-medium">Ma progression</label>
      <select id={`status-${slug}`} value={entry.status} disabled={!ready}
        onChange={e => update(slug, { status: e.target.value as Status })} className="study-input w-auto">
        {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <span className="text-sm text-zinc-400">{!ready ? "Chargement…" : error ? "Sauvegarde indisponible" : "Enregistré dans ce navigateur"}</span>
    </div>
    <p className="mt-3 text-sm text-zinc-400">Valide la fiche quand tu sais expliquer le principe et refaire l’exercice sans recopier.</p>
    {entry.bookmark && <p className="mt-3 text-sm">
      Repère : <a className="text-accent hover:underline" href={`#${entry.bookmark.id}`}>{entry.bookmark.title}</a>
      <button className="ml-3 text-zinc-400 hover:text-white" onClick={() => update(slug, { bookmark: null })}>Effacer le repère</button>
    </p>}
    <details className="mt-4">
      <summary className="cursor-pointer text-sm text-zinc-300">Mes notes {entry.notes && "•"}</summary>
      <label htmlFor={`notes-${slug}`} className="block mt-3 mb-2 text-sm text-zinc-400">Ce que j’ai compris, ce qui bloque, ce que je veux refaire</label>
      <textarea id={`notes-${slug}`} className="study-input min-h-32 w-full" maxLength={20000}
        disabled={!ready} value={entry.notes} onChange={e => update(slug, { notes: e.target.value })} />
      <p className="text-sm text-zinc-400 mt-1">Sauvegarde automatique • {entry.notes.length.toLocaleString("fr-FR")} / 20 000 caractères</p>
    </details>
  </section>;
}

export function LessonCompletion({ slug }: { slug: string }) {
  const { data, ready, update } = useProgress();
  const index = learningPath.indexOf(slug);
  const next = index >= 0 ? getFicheBySlug(learningPath[index + 1]) : undefined;
  return <section className="study-panel mt-10" aria-label="Terminer cette fiche">
    <p className="font-semibold mb-3">Avant de passer à la suite</p>
    <p className="text-sm text-zinc-400 mb-4">Explique l’idée à voix haute, puis modifie ou refais l’exemple dans Xcode. Si tu hésites, marque la fiche « À revoir ».</p>
    <div className="flex flex-wrap gap-3">
      <button disabled={!ready} className="study-button primary" onClick={() => update(slug, { status: "done" })}>
        {data.entries[slug]?.status === "done" ? "✓ Fiche validée" : "J’ai compris et pratiqué"}
      </button>
      <button disabled={!ready} className="study-button" onClick={() => update(slug, { status: "review" })}>À revoir</button>
      {next && <Link className="study-button" href={`/fiche/${next.slug}/`}>Suite du parcours : {next.num} →</Link>}
    </div>
  </section>;
}
