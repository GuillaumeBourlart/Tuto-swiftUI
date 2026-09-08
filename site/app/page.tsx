import Link from "next/link";
import { sommaire, allFiches } from "@/lib/sommaire";
import { LearningDashboard } from "@/components/LearningDashboard";
import { ProgressBadge } from "@/components/LessonProgress";

const DOT: Record<string, string> = {
  "swiftui-only": "bg-amber-400",
  dual: "bg-indigo-400",
};

export default function HomePage() {
  return (
    <div>
      <section className="mb-10">
        <p className="text-sm font-mono uppercase tracking-widest text-accent mb-3">
          Cours SwiftUI + rappels UIKit
        </p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
          De UIKit à SwiftUI
        </h1>
        <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl">
          {allFiches.length} fiches en {sommaire.length} parties. Fondations
          Swift, SwiftUI, MVVM, async, réseau, backend, tests, sécurité et
          projet final — avec un rappel de la version UIKit quand elle existe.
        </p>
      </section>

      <LearningDashboard />
      <h2 className="text-2xl font-semibold mb-5">Toutes les fiches</h2>

      {/* Légende du classement */}
      <div className="mb-10 rounded-xl border border-bg-border bg-bg-surface px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
          Comment lire les fiches
        </p>
        <ul className="grid sm:grid-cols-3 gap-3 text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
            <span className="text-zinc-300">
              <span className="text-white font-medium">SwiftUI + rappel UIKit</span>{" "}
              — la fiche montre aussi l'équivalent UIKit.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-400 shrink-0" />
            <span className="text-zinc-300">
              <span className="text-white font-medium">SwiftUI uniquement</span>{" "}
              — pas d'équivalent UIKit.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-zinc-600 shrink-0" />
            <span className="text-zinc-300">
              <span className="text-white font-medium">Sans pastille</span> —
              transversal (vaut pour SwiftUI et UIKit).
            </span>
          </li>
        </ul>
      </div>

      <div className="space-y-10">
        {sommaire.map((partie) => (
          <section key={partie.num}>
            <header className="mb-4 flex items-baseline gap-3">
              <span className="font-mono text-xs text-accent">
                Partie {partie.num}
              </span>
              <h2 className="text-xl font-semibold text-white">
                {partie.title}
              </h2>
              <span className="ml-auto text-xs text-zinc-500">
                {partie.fiches.length} fiches
              </span>
            </header>
            <ul className="grid sm:grid-cols-2 gap-2">
              {partie.fiches.map((fiche) => (
                <li key={fiche.slug}>
                  <Link
                    href={`/fiche/${fiche.slug}/`}
                    className="group block rounded-lg border border-bg-border bg-bg-surface hover:bg-bg-subtle hover:border-zinc-700 transition px-4 py-3"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-zinc-500 group-hover:text-accent transition">
                        {fiche.num}
                      </span>
                      <span className="flex-1 text-sm text-zinc-200 group-hover:text-white transition leading-snug">
                        {fiche.title}
                      </span>
                      {fiche.track && (
                        <span
                          title={
                            fiche.track === "dual"
                              ? "SwiftUI + rappel UIKit"
                              : "SwiftUI uniquement"
                          }
                          className={`mt-1 h-2 w-2 rounded-full shrink-0 ${DOT[fiche.track]}`}
                        />
                      )}
                    </div>
                    <div className="mt-2"><ProgressBadge slug={fiche.slug} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
