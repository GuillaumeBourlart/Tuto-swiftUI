"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const LANGUAGE_LABELS: Record<string, string> = {
  swift: "Swift",
  ts: "TypeScript",
  typescript: "TypeScript",
  js: "JavaScript",
  javascript: "JavaScript",
  json: "JSON",
  bash: "Shell",
  sh: "Shell",
  zsh: "Shell",
  text: "Texte",
  plain: "Texte",
  yml: "YAML",
  yaml: "YAML",
};

export function CodeBlock({
  language,
  code,
}: {
  language?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable; fallback to selection
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const lang = (language ?? "text").toLowerCase();
  const displayLang = LANGUAGE_LABELS[lang] ?? lang;
  const prismLang = lang === "text" || lang === "plain" ? "" : lang;

  return (
    <div className="not-prose my-5 rounded-xl overflow-hidden border border-bg-border bg-[#1e1e1e] shadow-lg shadow-black/20">
      <div className="flex items-center justify-between bg-zinc-900/90 px-4 py-2 border-b border-bg-border">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
          {displayLang}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copier le code"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-white px-2 py-1 rounded-md hover:bg-bg-subtle transition"
        >
          {copied ? (
            <>
              <CheckIcon /> Copié
            </>
          ) : (
            <>
              <CopyIcon /> Copier
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <SyntaxHighlighter
          language={prismLang || undefined}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "1rem 1.25rem",
            background: "transparent",
            fontSize: "0.85rem",
            lineHeight: "1.6",
          }}
          codeTagProps={{
            style: {
              fontFamily:
                "var(--font-mono), ui-monospace, SF Mono, Menlo, monospace",
            },
          }}
          PreTag="div"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-emerald-400"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
