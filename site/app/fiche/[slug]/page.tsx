import Link from "next/link";
import { notFound } from "next/navigation";
import { allFiches, getAdjacentFiches, getFicheBySlug, getPartieByFicheSlug } from "@/lib/sommaire";
import { loadFicheContent } from "@/lib/fiches";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { TrackBadge } from "@/components/TrackBadge";
import { LessonProgress, LessonCompletion } from "@/components/LessonProgress";

export function generateStaticParams() {
  return allFiches.map((f) => ({ slug: f.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const fiche = getFicheBySlug(params.slug);
  if (!fiche) return {};
  return {
    title: `${fiche.num} — ${fiche.title} · Cours SwiftUI`,
    description: fiche.title,
  };
}

export default function FichePage({ params }: { params: { slug: string } }) {
  const fiche = getFicheBySlug(params.slug);
  if (!fiche) notFound();

  const partie = getPartieByFicheSlug(params.slug);
  const content = loadFicheContent(fiche);
  const { prev, next } = getAdjacentFiches(params.slug);

  return (
    <article>
      <nav className="text-xs font-mono text-zinc-500 mb-4 flex items-center gap-2">
        <Link href="/" className="hover:text-accent transition">
          Accueil
        </Link>
        {partie && (
          <>
            <span aria-hidden>/</span>
            <span>Partie {partie.num} — {partie.title}</span>
          </>
        )}
      </nav>

      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-mono uppercase tracking-wider text-accent">
          Fiche {fiche.num}
        </span>
        <TrackBadge track={fiche.track} />
      </div>

      <LessonProgress slug={fiche.slug} />
      <MarkdownRenderer content={content} slug={fiche.slug} />
      <LessonCompletion slug={fiche.slug} />

      <hr className="border-bg-border my-12" />

      <nav className="grid sm:grid-cols-2 gap-3">
        {prev ? (
          <Link
            href={`/fiche/${prev.slug}/`}
            className="group rounded-lg border border-bg-border bg-bg-surface hover:bg-bg-subtle hover:border-zinc-700 transition p-4"
          >
            <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
              <span aria-hidden>←</span> Précédent dans la bibliothèque
            </div>
            <div className="text-sm text-zinc-200 group-hover:text-white">
              <span className="font-mono text-zinc-500 mr-2">{prev.num}</span>
              {prev.title}
            </div>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/fiche/${next.slug}/`}
            className="group rounded-lg border border-bg-border bg-bg-surface hover:bg-bg-subtle hover:border-zinc-700 transition p-4 sm:text-right"
          >
            <div className="text-xs text-zinc-500 mb-1 flex sm:justify-end items-center gap-1">
              Suivant dans la bibliothèque <span aria-hidden>→</span>
            </div>
            <div className="text-sm text-zinc-200 group-hover:text-white">
              <span className="font-mono text-zinc-500 mr-2">{next.num}</span>
              {next.title}
            </div>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
