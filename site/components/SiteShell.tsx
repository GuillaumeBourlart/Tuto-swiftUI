"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { ProgressProvider } from "./ProgressProvider";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <ProgressProvider>
      <MobileHeader isOpen={isOpen} onToggle={() => setIsOpen((o) => !o)} />
      {isOpen && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
        />
      )}
      <div className="flex">
        <Sidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
        <main className="flex-1 min-w-0 lg:ml-80 pt-14 lg:pt-0">
          <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 lg:py-14">
            {children}
          </div>
        </main>
      </div>
    </ProgressProvider>
  );
}
