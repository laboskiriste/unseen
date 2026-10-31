// Builds the Firefox copy. Only the manifest differs: Firefox runs the
// background as a script instead of a service worker and needs an add-on id.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const out = `${root}build/firefox/`;
const manifest = JSON.parse(readFileSync(`${root}manifest.json`, 'utf8'));

delete manifest.minimum_chrome_version;
manifest.background = { scripts: ['src/license.js', 'src/pro.js', 'src/background.js'] };
manifest.browser_specific_settings = {
  gecko: {
    id: 'unseen@laboskiriste',
    strict_min_version: '140.0',
    data_collection_permissions: { required: ['none'] },
  },
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(`${root}icons`, `${out}icons`, { recursive: true });
cpSync(`${root}src`, `${out}src`, { recursive: true });
writeFileSync(`${out}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(out);
