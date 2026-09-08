"use client";

import Link from "next/link";

export function MobileHeader({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-bg-base/80 backdrop-blur border-b border-bg-border flex items-center px-4 gap-3">
      <button
        type="button"
        aria-label={isOpen ? "Fermer le sommaire" : "Ouvrir le sommaire"}
        aria-expanded={isOpen}
        onClick={onToggle}
        className="p-2 -ml-2 rounded-md text-zinc-300 hover:text-white hover:bg-bg-subtle"
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <Logo />
        <span>Cours SwiftUI</span>
      </Link>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Logo() {
  return (
    <span className="inline-flex w-7 h-7 rounded-md bg-gradient-to-br from-accent to-indigo-500 items-center justify-center text-white text-xs font-bold">
      S
    </span>
  );
}
