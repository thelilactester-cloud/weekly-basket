// Copies the web app into dist/ for Capacitor (iOS / Android). Tests, docs and tooling are left out.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
const files = ['index.html', 'privacy.html', 'styles.css', 'manifest.webmanifest', 'icon.svg', 'icons', 'sw.js', 'js'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const f of files) cpSync(join(root, f), join(out, f), { recursive: true });
console.log(`Built ${files.length} entries into dist/`);
