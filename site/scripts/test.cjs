const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const assert = require('node:assert/strict');
const test = require('node:test');

function loadTS(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod._compile(output, filename);
  return mod.exports;
}
const { parseProgress, mergeProgress, emptyProgress, emptyEntry } = loadTS('lib/progress.ts');
const { allFiches } = loadTS('lib/sommaire.ts');
const { learningPath } = loadTS('lib/learning-path.ts');
const { withBasePath } = loadTS('lib/site-url.ts');
const slugs = allFiches.map(f => f.slug);
const sample = (overrides = {}) => ({
  version: 1,
  entries: { '05-04': { ...emptyEntry(), status: 'review', notes: 'À refaire : Bool → détail 🧭',
    bookmark: { id: 'section-5-optional', title: '5. Optional' }, updatedAt: 1000, ...overrides } },
  lastVisited: { slug: '05-04', at: 1000 }
});

test('export/import preserves statuses, Unicode notes, reading marker and last page', () => {
  assert.deepEqual(parseProgress(JSON.stringify(sample()), slugs), sample());
});
test('GitHub Pages keeps lesson links, downloads and anchors inside the project path', () => {
  const base = '/Tuto-swiftUI-pages';
  for (const target of ['/fiche/05-04/#section-optional', '/exemples/NavigationLab/ContentView.swift', '/']) {
    assert.equal(withBasePath(target, base), base + target);
    assert.equal(withBasePath(target, ''), target);
  }
  for (const target of ['https://developer.apple.com/documentation/swiftui', '//example.com/path', '#section-etat', `${base}/fiche/05-04/`]) {
    assert.equal(withBasePath(target, base), target);
  }
});
test('bad backup never mutates the existing progress', () => {
  const local = sample();
  for (const raw of ['not JSON', '{}', JSON.stringify({ ...local, version: 2 }),
    JSON.stringify(sample({ status: 'admin' })), JSON.stringify(sample({ notes: 'x'.repeat(20001) })),
    JSON.stringify(sample({ bookmark: { id: 'javascript:bad', title: 'test' } })),
    JSON.stringify(sample({ updatedAt: -1 }))]) {
    assert.throws(() => parseProgress(raw, slugs));
  }
  assert.deepEqual(local, sample());
});
test('older import cannot erase newer local notes and status', () => {
  const local = sample({ notes: 'Mes notes récentes', updatedAt: 3000, status: 'done' });
  assert.deepEqual(mergeProgress(local, sample()).entries['05-04'], local.entries['05-04']);
});
test('newer import wins; equal timestamp preserves the local copy', () => {
  assert.equal(mergeProgress(sample(), sample({ notes: 'Plus récent', updatedAt: 3000 })).entries['05-04'].notes, 'Plus récent');
  assert.equal(mergeProgress(sample(), sample({ notes: 'Même date' })).entries['05-04'].notes, sample().entries['05-04'].notes);
});
test('merging retains other lessons and the latest visited page', () => {
  const local = sample();
  local.entries['01-01'] = { ...emptyEntry(), status: 'done', updatedAt: 4000 };
  local.lastVisited = { slug: '01-01', at: 4000 };
  assert.deepEqual(mergeProgress(local, sample()), local);
  assert.deepEqual(mergeProgress(emptyProgress(), sample()), sample());
});
test('unknown lesson IDs and prototype keys are ignored', () => {
  const raw = '{"version":1,"entries":{"__proto__":{"polluted":true},"99-99":{}},"lastVisited":{"slug":"99-99","at":0}}';
  assert.deepEqual(parseProgress(raw, slugs), emptyProgress());
  assert.equal({}.polluted, undefined);
});
test('all registered lessons and learning stages resolve; no duplicate slug/file', () => {
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(new Set(allFiches.map(f => f.file)).size, allFiches.length);
  assert.equal(new Set(learningPath).size, learningPath.length);
  for (const slug of learningPath) assert.ok(slugs.includes(slug), slug);
  for (const f of allFiches) {
    const content = fs.readFileSync(path.resolve(__dirname, '../..', f.file), 'utf8');
    assert.match(content, /^# /);
    assert.equal((content.match(/^```/gm) || []).length % 2, 0, `Unclosed code fence: ${f.file}`);
  }
});
test('local Markdown links and reader lesson links resolve', () => {
  const files = new Set(allFiches.map(f => f.file));
  for (const f of allFiches) {
    const content = fs.readFileSync(path.resolve(__dirname, '../..', f.file), 'utf8');
    for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (target.endsWith('.md') && !target.includes('://')) assert.ok(files.has(target.replace(/^\.\//, '')), `${f.file}: ${target}`);
      if (target.startsWith('/fiche/')) assert.ok(slugs.includes(target.split('/')[2]), target);
    }
  }
});

test('reading markers are unique and deterministic across server/client renders', () => {
  const { remarkReadingHeadings } = loadTS('lib/reading-headings.ts');
  const heading = (depth, value) => ({ type: 'heading', depth, children: [{ type: 'text', value }] });
  const tree = { type: 'root', children: [heading(1, 'Fiche'), heading(2, 'État'), heading(2, 'État'), heading(1, 'Exercice')] };
  const server = structuredClone(tree);
  const client = structuredClone(tree);
  remarkReadingHeadings()(server);
  remarkReadingHeadings()(client);
  assert.deepEqual(server, client);
  assert.equal(server.children[2].data.hProperties.id, 'section-etat-2');
  assert.equal(server.children[3].depth, 2);
  assert.equal(server.children[0].depth, 1);
});
