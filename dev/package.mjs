// Builds the store packages into store/: one zip for the Chrome Web Store
// (also used for Edge) and one for Firefox Add-ons. Run the tests first.
import { readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const { version } = JSON.parse(readFileSync(`${root}manifest.json`, 'utf8'));
// The tracker lists' licences must ship with the code that contains them.
const extras = ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'vendor/LICENSE-trocker', 'vendor/LICENSE-simplify'];

const chromeZip = `${root}store/unseen-${version}-chrome.zip`;
rmSync(chromeZip, { force: true });
execFileSync('zip', ['-qr', chromeZip, 'manifest.json', 'icons', 'src', ...extras], { cwd: root });

execFileSync('node', [`${root}dev/build-firefox.mjs`]);
const firefoxDir = `${root}build/firefox/`;
for (const f of extras) execFileSync('install', ['-D', `${root}${f}`, `${firefoxDir}${f}`]);
const firefoxZip = `${root}store/unseen-${version}-firefox.zip`;
rmSync(firefoxZip, { force: true });
execFileSync('zip', ['-qr', firefoxZip, 'manifest.json', 'icons', 'src', ...extras], { cwd: firefoxDir });

console.log(`${chromeZip}\n${firefoxZip}`);
