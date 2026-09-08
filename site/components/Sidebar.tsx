"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { sommaire, getPartieByFicheSlug } from "@/lib/sommaire";
import { ProgressBadge } from "./LessonProgress";

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const activeSlug = useMemo(() => {
    const m = pathname?.match(/\/fiche\/([^/]+)/);
    return m?.[1];
  }, [pathname]);

  const activePartieNum = activeSlug
    ? getPartieByFicheSlug(activeSlug)?.num
    : undefined;

  const [openParties, setOpenParties] = useState<Record<string, boolean>>(() => {
    return Object.fromEntries(sommaire.map((p) => [p.num, true]));
  });

  useEffect(() => {
    if (activePartieNum) {
      setOpenParties((prev) => ({ ...prev, [activePartieNum]: true }));
    }
  }, [activePartieNum]);

  const togglePartie = (num: string) =>
    setOpenParties((prev) => ({ ...prev, [num]: !prev[num] }));

  return (
    <aside
      className={[
        "fixed lg:fixed top-0 left-0 z-40 h-screen w-80 shrink-0",
        "bg-bg-surface border-r border-bg-border",
        "transition-transform duration-200 ease-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      <div className="h-14 px-5 flex items-center border-b border-bg-border">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex w-7 h-7 rounded-md bg-gradient-to-br from-accent to-indigo-500 items-center justify-center text-white text-xs font-bold">
            S
          </span>
          <span>Cours SwiftUI</span>
        </Link>
      </div>

      <nav
        aria-label="Sommaire"
        className="overflow-y-auto h-[calc(100vh-3.5rem)] px-3 py-4 scrollbar-thin"
      >
        <ul className="space-y-1">
          {sommaire.map((partie) => {
            const open = openParties[partie.num] ?? true;
            const isActivePartie = activePartieNum === partie.num;

            return (
              <li key={partie.num}>
                <button
                  type="button"
                  onClick={() => togglePartie(partie.num)}
                  aria-expanded={open}
                  className={[
                    "w-full group flex items-center gap-2 text-left px-2 py-1.5 rounded-md text-sm",
                    "hover:bg-bg-subtle transition",
                    isActivePartie ? "text-white" : "text-zinc-300",
                  ].join(" ")}
                >
                  <Chevron open={open} />
                  <span className="font-mono text-[11px] text-zinc-500 group-hover:text-zinc-300">
                    {partie.num}
                  </span>
                  <span className="font-medium truncate">{partie.title}</span>
                </button>

                {open && (
                  <ul className="ml-5 mt-0.5 mb-2 border-l border-bg-border space-y-0.5">
                    {partie.fiches.map((fiche) => {
                      const isActive = activeSlug === fiche.slug;
                      return (
                        <li key={fiche.slug}>
                          <Link
                            href={`/fiche/${fiche.slug}/`}
                            onClick={onClose}
                            aria-current={isActive ? "page" : undefined}
                            className={[
                              "block text-sm pl-3 pr-2 py-1.5 -ml-px border-l-2 transition",
                              isActive
                                ? "border-accent text-white bg-accent/5"
                                : "border-transparent text-zinc-400 hover:text-zinc-100 hover:border-zinc-600",
                            ].join(" ")}
                          >
                            <span className="font-mono text-[11px] text-zinc-500 mr-2">
                              {fiche.num}
                            </span>
                            {fiche.title}
                            <span className="block mt-1"><ProgressBadge slug={fiche.slug} /></span>
                            {fiche.track && (
                              <span
                                title={
                                  fiche.track === "dual"
                                    ? "SwiftUI + rappel UIKit"
                                    : "SwiftUI uniquement"
                                }
                                className={[
                                  "inline-block ml-1.5 h-1.5 w-1.5 rounded-full align-middle",
                                  fiche.track === "dual"
                                    ? "bg-indigo-400"
                                    : "bg-amber-400",
                                ].join(" ")}
                              />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-8 px-2 pb-4 text-xs text-zinc-600">
          {sommaire.reduce((acc, p) => acc + p.fiches.length, 0)} fiches —
          orienté emploi junior iOS
        </div>
      </nav>
    </aside>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={[
        "text-zinc-500 transition-transform shrink-0",
        open ? "rotate-90" : "",
      ].join(" ")}
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}
