// Explicit allowlist: no server catalog, answer schedules, env files or ad scripts.
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const parent = path.resolve(process.argv[2] || path.join(root, '..'));
const sources = {
  word500turkce: ['index.html', 'logo.png', 'favicon.png'],
  trpuzzle1: ['index.html', 'favicon.png'],
  trpuzzle2: ['index.html', 'logo.png', 'favicon.png'],
  trpuzzle3: ['index.html', 'public/favicon.png', ...execFileSync('git', ['ls-files', 'src'], {cwd: path.join(parent, 'trpuzzle3'), encoding: 'utf8'}).trim().split('\n')],
  trpuzzle4: ['index.html', 'favicon.png'],
  trpuzzle6: ['index.html', 'favicon.png'],
  arala: ['index.html', 'favicon.png', 'kelimehavuzu.txt'],
  harfle: ['index.html', 'game.js', 'style.css', 'words.js', 'logo.png', 'favicon.png'],
  trpuzzlemain: ['index.html', 'assets/tilkile.png', 'assets/bagla.png', 'assets/favicon.png', 'assets/fonts/baloo2-700-latin.woff2', 'assets/fonts/baloo2-700-latin-ext.woff2', 'assets/game-clock.js', 'assets/game-security.js', 'assets/logo.png',
    'assets/fonts.css', 'assets/fonts/fraunces-600-latin.woff2', 'assets/fonts/fraunces-600-latin-ext.woff2',
    'assets/fonts/fraunces-700-latin.woff2', 'assets/fonts/fraunces-700-latin-ext.woff2']
};
const manifest = { format: 1, sources: {} };
for (const [repo, files] of Object.entries(sources)) {
  const directory = path.join(parent, repo);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain', '--', ...files], { cwd: directory, encoding: 'utf8' }).trim();
  if (dirty) throw new Error(`${repo}: commit the shared source changes before syncing`);
  manifest.sources[repo] = { repository: `bozkus24/${repo === 'harfle' ? 'trpuzzle5' : repo === 'arala' ? 'trpuzzle7' : repo}`, commit, files: {} };
  for (const file of files) {
    const data = await readFile(path.join(directory, file));
    const target = path.join(root, 'vendor', repo, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(directory, file), target);
    manifest.sources[repo].files[file] = createHash('sha256').update(data).digest('hex');
  }
}
await writeFile(path.join(root, 'vendor/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Shared game sources synced. Build verifies their hashes; edit mobile adapters in src/.');
