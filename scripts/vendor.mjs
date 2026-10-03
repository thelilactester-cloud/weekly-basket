// Bundles the Firebase SDK (accounts) into js/vendor/firebase.js as the global `FirebaseSDK`.
// Run after changing the firebase version: npm run vendor
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
await build({
  entryPoints: [join(root, 'scripts/firebase-entry.js')],
  outfile: join(root, 'js/vendor/firebase.js'),
  bundle: true, format: 'iife', globalName: 'FirebaseSDK', minify: true, target: 'es2020', legalComments: 'none',
  banner: { js: '/* Firebase JavaScript SDK (Apache-2.0), bundled by scripts/vendor.mjs */' },
});
console.log('Wrote js/vendor/firebase.js');
