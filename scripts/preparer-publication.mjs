import { access, cp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'site', 'out');
const destination = path.join(root, 'out');
const hosting = JSON.parse(await readFile(path.join(root, '.openai', 'hosting.json'), 'utf8'));

if (hosting.static?.directory !== 'out') {
  throw new Error('La configuration de publication doit utiliser le dossier out à la racine.');
}
await access(path.join(source, 'index.html'));
// Ce dossier ne contient que la copie générée pour la publication.
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
console.log('Publication préparée dans out/ depuis site/out/.');
