const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../out');
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const pages = fs.readdirSync(path.join(root, 'fiche'));
assert.equal(pages.length, 130, 'Les 130 fiches doivent être exportées.');
let checked = 0;
for (const file of ['index.html', ...pages.map(slug => `fiche/${slug}/index.html`)]) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    const target = match[1].split('?')[0];
    if (!target.startsWith('/') || target.startsWith('//')) continue;
    assert.ok(!basePath || target === basePath || target.startsWith(`${basePath}/`), `${file} : préfixe absent sur ${target}`);
    const relative = decodeURIComponent(target.slice(basePath.length)).replace(/^\//, '');
    const destination = path.join(root, relative);
    assert.ok(fs.existsSync(destination), `${file} : cible absente ${target}`);
    if (fs.statSync(destination).isDirectory()) assert.ok(fs.existsSync(path.join(destination, 'index.html')), target);
    checked++;
  }
}
const workshop = fs.readFileSync(path.join(root, 'fiche/05-06/index.html'), 'utf8');
assert.ok(workshop.includes(`href="${basePath}/exemples/NavigationLab/ContentView.swift"`));
console.log(`Export vérifié : 130 fiches et ${checked} liens/ressources locaux, préfixe « ${basePath || '/'} ».`);
