// Renders icons/icon{16,32,48,128}.png from the SVG below with headless Chrome.
import { writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const root = new URL('..', import.meta.url).pathname;

// Green shield with a crossed-out eye.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <path d="M64 6 L114 24 V60 C114 92 92 114 64 122 C36 114 14 92 14 60 V24 Z" fill="#2e7d32"/>
  <path d="M30 64 C40 46 52 38 64 38 C76 38 88 46 98 64 C88 82 76 90 64 90 C52 90 40 82 30 64 Z" fill="#fff"/>
  <circle cx="64" cy="64" r="13" fill="#2e7d32"/>
  <line x1="36" y1="92" x2="92" y2="36" stroke="#2e7d32" stroke-width="14" stroke-linecap="round"/>
  <line x1="36" y1="92" x2="92" y2="36" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
</svg>`;

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true });
const page = await browser.newPage();
for (const size of [16, 32, 48, 128]) {
  await page.setViewport({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${SVG.replace('<svg ', `<svg width="${size}" height="${size}" `)}`);
  writeFileSync(`${root}icons/icon${size}.png`, await page.screenshot({ omitBackground: true }));
}
await browser.close();
console.log('icons written');
