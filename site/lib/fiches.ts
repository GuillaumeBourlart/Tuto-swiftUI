import fs from "node:fs";
import path from "node:path";
import { Fiche } from "./sommaire";

const CONTENT_ROOT = path.resolve(process.cwd(), "..");

export function loadFicheContent(fiche: Fiche): string {
  const filePath = path.join(CONTENT_ROOT, fiche.file);
  return fs.readFileSync(filePath, "utf-8");
}

export function extractObjective(markdown: string): string | undefined {
  const lines = markdown.split("\n");
  const objectiveIdx = lines.findIndex((line) => /^##\s+Objectif/i.test(line));
  if (objectiveIdx === -1) return undefined;
  const collected: string[] = [];
  for (let i = objectiveIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,6}\s+/.test(line)) break;
    if (line.trim().length > 0) collected.push(line.trim());
    if (collected.length >= 2) break;
  }
  return collected.join(" ").slice(0, 220);
}
