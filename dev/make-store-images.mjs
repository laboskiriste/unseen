// Renders store screenshots (1280×800) and the small promo tile (440×280)
// from dev/store-shot.html into store/.
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const root = new URL('..', import.meta.url).pathname;
const out = `${root}store/`;
mkdirSync(out, { recursive: true });

const shots = [
  ['screenshot-1', 1280, 800, '1'],
  ['screenshot-2', 1280, 800, '2'],
  ['screenshot-3', 1280, 800, '3'],
  ['promo-small', 440, 280, 'promo'],
];

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: true,
  args: ['--allow-file-access-from-files', '--force-color-profile=srgb'],
});
const page = await browser.newPage();
for (const [name, width, height, scene] of shots) {
  await page.setViewport({ width, height });
  await page.goto(`file://${root}dev/store-shot.html?scene=${scene}`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${out}${name}.png` });
}
await browser.close();
console.log(`written to ${out}`);
