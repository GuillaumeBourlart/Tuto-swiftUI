"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { allFiches } from "@/lib/sommaire";
import { emptyEntry, emptyProgress, Entry, mergeProgress, parseProgress, Progress, STORAGE_KEY } from "@/lib/progress";

const slugs = allFiches.map(f => f.slug);
type ProgressContextValue = {
  data: Progress; ready: boolean; error: string;
  update: (slug: string, patch: Partial<Omit<Entry, "updatedAt">>) => void;
  visit: (slug: string) => void;
  importBackup: (incoming: Progress) => boolean;
};
const ProgressContext = createContext<ProgressContextValue | null>(null);
export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("ProgressProvider manquant");
  return value;
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Progress>(emptyProgress);
  const current = useRef(data);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const accept = useCallback((value: Progress) => {
    current.current = value;
    setData(value);
  }, []);

  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        accept(raw ? parseProgress(raw, slugs) : emptyProgress());
        setError("");
      } catch {
        setError("La sauvegarde de ce navigateur est inaccessible ou invalide. Elle reste intacte. Exporte tes notes avant de fermer cette page.");
      }
      setReady(true);
    }
    read();
    const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) read(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [accept]);

  const commit = useCallback((change: (value: Progress) => Progress) => {
    let base = current.current;
    let canWrite = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) base = mergeProgress(base, parseProgress(raw, slugs));
    } catch { canWrite = false; }
    const next = change(base);
    accept(next);
    try {
      if (!canWrite) throw new Error("Lecture impossible");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setError("");
      return true;
    } catch {
      setError("Enregistrement impossible : tes changements restent dans cet onglet. Exporte-les avant de le fermer (stockage bloqué, plein ou sauvegarde invalide).");
      return false;
    }
  }, [accept]);

  const update = useCallback((slug: string, patch: Partial<Omit<Entry, "updatedAt">>) => {
    if (!slugs.includes(slug)) return;
    commit(base => ({ ...base, entries: { ...base.entries, [slug]: {
      ...(base.entries[slug] ?? emptyEntry()), ...patch, updatedAt: Date.now(),
    } } }));
  }, [commit]);

  const visit = useCallback((slug: string) => {
    if (!slugs.includes(slug)) return;
    commit(base => ({ ...base, lastVisited: { slug, at: Date.now() }, entries: {
      ...base.entries,
      // Visiting never validates a lesson, or resets a learner's chosen status.
      [slug]: base.entries[slug] ?? { ...emptyEntry(), status: "started", updatedAt: Date.now() },
    } }));
  }, [commit]);

  const importBackup = useCallback((incoming: Progress) => commit(base => mergeProgress(base, incoming)), [commit]);
  return <ProgressContext.Provider value={{ data, ready, error, update, visit, importBackup }}>
    {error && <div role="alert" className="storage-warning">{error}</div>}
    {children}
  </ProgressContext.Provider>;
}
