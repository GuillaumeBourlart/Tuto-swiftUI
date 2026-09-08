"use client";

import Link from "next/link";
import { useState } from "react";
import { allFiches, getFicheBySlug } from "@/lib/sommaire";
import { learningPath, learningStages } from "@/lib/learning-path";
import { parseProgress, Progress } from "@/lib/progress";
import { useProgress } from "./ProgressProvider";
import { ProgressBadge } from "./LessonProgress";

export function LearningDashboard() {
  const { data, ready, importBackup } = useProgress();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Progress | null>(null);
  const completed = allFiches.filter(f => data.entries[f.slug]?.status === "done").length;
  const pathCompleted = learningPath.filter(slug => data.entries[slug]?.status === "done").length;
  const nextSlug = learningPath.find(slug => data.entries[slug]?.status !== "done");
  const next = nextSlug ? getFicheBySlug(nextSlug) : undefined;
  const last = data.lastVisited ? getFicheBySlug(data.lastVisited.slug) : undefined;
  const bookmark = last ? data.entries[last.slug]?.bookmark : null;
  const review = allFiches.filter(f => data.entries[f.slug]?.status === "review");

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progression-swiftui-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Export téléchargé : conserve ce fichier pour retrouver tes notes et ta progression.");
  }

  async function selectBackup(file?: File) {
    setPending(null);
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("Fichier trop volumineux (5 Mo maximum).");
      const parsed = parseProgress(await file.text(), allFiches.map(f => f.slug));
      setPending(parsed);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de lire ce fichier.");
    }
  }

  return <div className="mb-10 space-y-5">
    <section className="study-panel border-accent/40" aria-label="Mon apprentissage">
      <div className="flex flex-wrap justify-between gap-2 mb-3">
        <h2 className="text-xl font-semibold">Mon apprentissage</h2>
        <span className="text-sm text-zinc-400">{completed} / {allFiches.length} fiches validées</span>
      </div>
      <label htmlFor="path-progress" className="text-sm text-zinc-300">Parcours UIKit → SwiftUI : {pathCompleted} / {learningPath.length}</label>
      <progress id="path-progress" className="study-progress mt-2 mb-4" value={pathCompleted} max={learningPath.length} />
      <div className="flex flex-wrap gap-3">
        {last && <Link className="study-button primary" href={`/fiche/${last.slug}/${bookmark ? `#${bookmark.id}` : ""}`}>Reprendre {last.num}{bookmark ? " au repère" : ""} →</Link>}
        {next && <Link className={`study-button ${last ? "" : "primary"}`} href={`/fiche/${next.slug}/`}>{last ? "Prochaine fiche du parcours" : "Commencer mon parcours"} : {next.num} →</Link>}
        {!next && <p>Parcours validé. Reviens sur tes points à revoir et présente ton projet.</p>}
      </div>
      {last && <p className="mt-3 text-sm text-zinc-400">Dernière fiche : {last.title}</p>}
      <p className="mt-4 text-sm text-zinc-400">Statuts, notes et repères restent dans ce navigateur, à cette adresse. Exporte une copie avant de changer d’appareil, de navigateur ou d’effacer ses données. Pas de synchronisation entre appareils.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button disabled={!ready} className="study-button" onClick={exportBackup}>Exporter ma progression</button>
        <label className={`study-button cursor-pointer ${!ready ? "opacity-50" : ""}`}>Importer une sauvegarde
          <input className="sr-only" type="file" accept="application/json,.json" disabled={!ready}
            onChange={e => { void selectBackup(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {pending && <div className="mt-4 border-t border-bg-border pt-4">
        <p className="text-sm mb-3">{Object.keys(pending.entries).length} fiches reconnues. Pour chaque fiche, la version modifiée le plus récemment sera conservée, notes comprises. Exporte d’abord si tu souhaites garder les deux versions.</p>
        <div className="flex gap-3">
          <button className="study-button primary" onClick={() => {
            const saved = importBackup(pending);
            setPending(null);
            setMessage(saved ? "Sauvegarde fusionnée et enregistrée." : "Import conservé dans cet onglet seulement. Exporte-le avant de fermer.");
          }}>Fusionner la sauvegarde</button>
          <button className="study-button" onClick={() => setPending(null)}>Annuler</button>
        </div>
      </div>}
      <p role="status" className="text-sm mt-3 text-zinc-300">{message}</p>
    </section>
    {review.length > 0 && <section className="study-panel" aria-label="Fiches à revoir">
      <h2 className="font-semibold mb-3">À revoir · {review.length}</h2>
      <ul className="space-y-2 text-sm">{review.map(f => <li key={f.slug}><Link className="text-accent hover:underline" href={`/fiche/${f.slug}/`}>{f.num} — {f.title}</Link></li>)}</ul>
    </section>}
    <section aria-label="Parcours conseillé">
      <h2 className="text-xl font-semibold mb-2">Ton parcours depuis UIKit</h2>
      <p className="text-zinc-400 text-sm mb-4">Commence par ces étapes. Les rappels Swift et les autres fiches restent disponibles dans la bibliothèque, selon tes besoins.</p>
      <div className="space-y-2">{learningStages.map((stage, i) => {
        const done = stage.slugs.filter(slug => data.entries[slug]?.status === "done").length;
        return <details key={stage.title} className="study-panel" open={i === 0 ? true : undefined}>
          <summary className="cursor-pointer font-medium">{stage.title} <span className="text-sm text-zinc-400">({done}/{stage.slugs.length})</span></summary>
          <p className="text-sm text-zinc-400 mt-3 mb-3">{stage.goal}</p>
          <ol className="space-y-2">{stage.slugs.map(slug => {
            const f = getFicheBySlug(slug);
            return f && <li key={slug}><Link href={`/fiche/${slug}/`} className="flex flex-wrap gap-2 items-baseline text-sm hover:text-accent">
              <span className="text-zinc-400 font-mono">{f.num}</span><span className="flex-1 min-w-40">{f.title}</span><ProgressBadge slug={slug} />
            </Link></li>;
          })}</ol>
        </details>;
      })}</div>
    </section>
  </div>;
}
