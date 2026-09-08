import { Track } from "@/lib/sommaire";

const STYLES: Record<
  NonNullable<Track>,
  { label: string; className: string }
> = {
  "swiftui-only": {
    label: "SwiftUI uniquement",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  dual: {
    label: "SwiftUI + rappel UIKit",
    className: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
};

export function TrackBadge({
  track,
  size = "md",
}: {
  track?: Track;
  size?: "sm" | "md";
}) {
  if (!track) return null;
  const s = STYLES[track];
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${pad} ${s.className}`}
    >
      {s.label}
    </span>
  );
}
